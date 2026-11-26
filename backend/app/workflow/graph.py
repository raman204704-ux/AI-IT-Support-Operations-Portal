import logging
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Message, Conversation
from app.workflow.state import AgentState

logger = logging.getLogger(__name__)


CATEGORY_FALLBACK_STEPS: Dict[str, str] = {
    "Network": (
        "1. Verify Wi-Fi is connected to the corporate SSID or check your Ethernet cable.\n"
        "2. Flush the DNS cache (`ipconfig /flushdns` on Windows or `sudo dscacheutil -flushcache` on macOS).\n"
        "3. Renew your IP lease (`ipconfig /release` followed by `ipconfig /renew`).\n"
        "4. Test connectivity by opening an internal and external webpage or running `ping 8.8.8.8`."
    ),
    "VPN": (
        "1. Confirm your local internet connection is active before connecting to the VPN.\n"
        "2. Close and reopen the VPN client (e.g., GlobalProtect / Cisco AnyConnect), then reconnect.\n"
        "3. Verify your MFA/SSO prompt has been approved on your mobile authenticator.\n"
        "4. Try switching to an alternate VPN gateway if available."
    ),
    "Email / Outlook": (
        "1. Check the bottom status bar in Outlook to see if it displays 'Disconnected' or 'Working Offline'.\n"
        "2. Restart Outlook completely and verify your Microsoft 365 credentials.\n"
        "3. Test logging in via Outlook on the Web (`outlook.office.com`) to confirm account health.\n"
        "4. If local sync remains stuck, recreate your local `.ost` cache or Outlook profile."
    ),
    "Access & Permissions": (
        "1. Verify Caps Lock is off and confirm your corporate email address is entered accurately.\n"
        "2. Try signing into the company SSO portal in a private/incognito browser window.\n"
        "3. Check your MFA authenticator app for pending approval requests or time-sync issues.\n"
        "4. If your account is locked out, wait 15 minutes or request an IT password/MFA reset."
    ),
    "Hardware & Printers": (
        "1. Check power, USB/display cables, and network status lights on the device.\n"
        "2. Restart your laptop and power-cycle the printer or docking station.\n"
        "3. On Windows, open Services and restart the **Print Spooler** service if print jobs are stuck.\n"
        "4. Re-add the printer from Settings > Bluetooth & devices > Printers & scanners."
    ),
    "Software Installation": (
        "1. Open the company Software Center / Self-Service portal to check if the app is pre-approved.\n"
        "2. Ensure you have sufficient disk space and no pending OS reboot blocking installations.\n"
        "3. Close conflicting applications and retry the installer.\n"
        "4. If administrator elevation or a license key is required, raise an IT support ticket."
    ),
}


# -------------------------------------------------------------
# Node 1: Query Processing
# -------------------------------------------------------------
def process_query_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("query", "").strip()
    q_lower = query.lower()

    category = "General"
    if any(k in q_lower for k in ["wifi", "wi-fi", "internet", "dns", "ping", "lan", "network"]):
        category = "Network"
    elif any(k in q_lower for k in ["vpn", "anyconnect", "forticlient", "openvpn", "globalprotect"]):
        category = "VPN"
    elif any(k in q_lower for k in ["outlook", "email", "mail", "mailbox", "sync", "pst", "ost"]):
        category = "Email / Outlook"
    elif any(k in q_lower for k in ["password", "login", "locked", "sso", "mfa", "2fa", "access"]):
        category = "Access & Permissions"
    elif any(k in q_lower for k in ["printer", "print", "scanner", "paper", "spooler"]):
        category = "Hardware & Printers"
    elif any(k in q_lower for k in ["install", "update", "slack", "zoom", "teams", "software", "license"]):
        category = "Software Installation"

    return {"category": category}


# -------------------------------------------------------------
# Node 2: Groq LLM Response Generation
# -------------------------------------------------------------
def generate_response_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("query", "")
    category = state.get("category", "General")
    history = state.get("history", [])

    # Format recent conversation history
    history_str = ""
    if history:
        history_lines = [
            f"{msg.get('sender', 'user').capitalize()}: {msg.get('content', '')}"
            for msg in history[-6:]
        ]
        history_str = "\n".join(history_lines)

    ai_model_used = settings.GROQ_MODEL

    # Call Groq LLM via OpenAI-compatible API when GROQ_API_KEY is configured
    if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("mock-"):
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
            )

            system_prompt = (
                "You are the company's Internal AI IT Support Assistant. "
                "Your objective is to help employees resolve IT issues quickly and accurately with clear, step-by-step troubleshooting guidance.\n\n"
                "GUIDELINES:\n"
                "1. Identify the likely root cause of the employee's IT issue based on their query, category, and conversation history.\n"
                "2. Provide a brief, polite explanation of the probable cause.\n"
                "3. Provide clear, numbered, safe, industry-standard step-by-step troubleshooting instructions.\n"
                "4. Mention relevant diagnostic commands or settings paths where helpful.\n"
                "5. Always conclude with: 'Did this resolve your issue? If not, you can easily raise an IT support ticket below.'"
            )

            user_prompt = (
                f"DETECTED IT CATEGORY: {category}\n\n"
                f"RECENT CONVERSATION HISTORY:\n{history_str or 'None'}\n\n"
                f"EMPLOYEE QUERY:\n{query}\n\n"
                f"Please provide clear, step-by-step IT troubleshooting instructions."
            )

            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            response_content = completion.choices[0].message.content
            return {
                "response_content": response_content,
                "troubleshooting_steps": response_content,
                "suggest_ticket": True,
                "ai_model": ai_model_used,
            }
        except Exception as e:
            logger.warning(f"Groq completion call failed ({e}). Using intelligent fallback generation.")

    # Offline / missing-key fallback so the portal stays functional before GROQ_API_KEY is set
    fallback_steps = CATEGORY_FALLBACK_STEPS.get(
        category,
        (
            "1. Save your current work and restart the affected application.\n"
            "2. Verify network connectivity and ensure your corporate credentials are up to date.\n"
            "3. Check for any pending system updates or permission prompts.\n"
            "4. Reboot your workstation if the issue persists."
        ),
    )
    response_content = (
        f"I have analyzed your **{category}** request regarding: **{query}**.\n\n"
        f"**Recommended Troubleshooting Steps:**\n"
        f"{fallback_steps}\n\n"
        f"Did this resolve your issue? If not, you can easily raise an IT support ticket below."
    )

    return {
        "response_content": response_content,
        "troubleshooting_steps": response_content,
        "suggest_ticket": True,
        "ai_model": "fallback",
    }


# -------------------------------------------------------------
# Node 3: Save Conversation (persists category + ai_model)
# -------------------------------------------------------------
def save_conversation_node(state: AgentState, db: Session) -> Dict[str, Any]:
    conversation_id = state.get("conversation_id")
    response_content = state.get("response_content", "")
    troubleshooting_steps = state.get("troubleshooting_steps", "")
    category = state.get("category", "General")
    ai_model = state.get("ai_model", "fallback")
    suggest_ticket = state.get("suggest_ticket", False)

    assistant_msg = Message(
        conversation_id=conversation_id,
        sender="assistant",
        content=response_content,
        troubleshooting_steps=troubleshooting_steps,
        category=category,
        ai_model=ai_model,
        suggest_ticket=suggest_ticket,
    )
    db.add(assistant_msg)

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv and conv.title == "New IT Support Chat" and state.get("query"):
        conv.title = state["query"][:50].strip()

    db.commit()
    db.refresh(assistant_msg)

    return {"saved_message_id": assistant_msg.id}


# -------------------------------------------------------------
# LangGraph Workflow Construction
# -------------------------------------------------------------
def build_it_support_graph(db: Session):
    """
    Builds and compiles the LangGraph workflow:
    Query -> Process Query -> Generate Groq LLM Response -> Save -> END
    """
    workflow = StateGraph(AgentState)

    workflow.add_node("process_query", process_query_node)
    workflow.add_node("generate_response", generate_response_node)
    workflow.add_node("save_conversation", lambda s: save_conversation_node(s, db=db))

    workflow.set_entry_point("process_query")
    workflow.add_edge("process_query", "generate_response")
    workflow.add_edge("generate_response", "save_conversation")
    workflow.add_edge("save_conversation", END)

    return workflow.compile()


def run_support_workflow(
    db: Session,
    user_id: int,
    conversation_id: int,
    query: str,
    history: list = None,
) -> Dict[str, Any]:
    """Executes the complete LangGraph workflow for an employee question."""
    graph = build_it_support_graph(db)

    initial_state: AgentState = {
        "query": query,
        "conversation_id": conversation_id,
        "user_id": user_id,
        "history": history or [],
        "response_content": "",
        "troubleshooting_steps": None,
        "suggest_ticket": False,
        "ai_model": None,
    }

    final_state = graph.invoke(initial_state)
    return final_state
