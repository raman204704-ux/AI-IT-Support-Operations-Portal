from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.config import settings
from app.database import SessionLocal
from app.models import User, Conversation
from app.workflow.graph import process_query_node, generate_response_node, run_support_workflow


def test_query_category_classification():
    assert process_query_node({"query": "Wi-Fi is connected but DNS fails"})["category"] == "Network"
    assert process_query_node({"query": "GlobalProtect VPN cannot connect"})["category"] == "VPN"
    assert process_query_node({"query": "Outlook OST not syncing"})["category"] == "Email / Outlook"
    assert process_query_node({"query": "My password is locked"})["category"] == "Access & Permissions"
    assert process_query_node({"query": "Floor 2 printer spooler stuck"})["category"] == "Hardware & Printers"
    assert process_query_node({"query": "Need to install Slack"})["category"] == "Software Installation"


def test_groq_llm_invocation_when_key_present(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_test_key_123")
    monkeypatch.setattr(settings, "GROQ_MODEL", "llama-3.1-8b-instant")
    monkeypatch.setattr(settings, "GROQ_BASE_URL", "https://api.groq.com/openai/v1")

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="1. Run ipconfig /flushdns\n2. Reconnect Wi-Fi"))]
    )

    with patch("openai.OpenAI", return_value=mock_client) as openai_cls:
        result = generate_response_node(
            {
                "query": "My Wi-Fi has no internet",
                "category": "Network",
                "history": [{"sender": "user", "content": "Hello"}],
            }
        )

    openai_cls.assert_called_once_with(
        api_key="gsk_test_key_123",
        base_url="https://api.groq.com/openai/v1",
    )
    mock_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == "llama-3.1-8b-instant"
    assert "ipconfig /flushdns" in result["response_content"]
    assert result["suggest_ticket"] is True


def test_langgraph_workflow_execution():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == "employee").first()
        assert user is not None

        conv = Conversation(user_id=user.id, title="Test Wi-Fi Issue", status="active")
        db.add(conv)
        db.commit()
        db.refresh(conv)

        final_state = run_support_workflow(
            db=db,
            user_id=user.id,
            conversation_id=conv.id,
            query="My laptop is connected to Wi-Fi, but the internet is not working.",
        )

        assert final_state is not None
        assert "response_content" in final_state
        assert len(final_state["response_content"]) > 20
        assert final_state.get("suggest_ticket") is True
        assert final_state.get("saved_message_id") is not None
    finally:
        db.close()
