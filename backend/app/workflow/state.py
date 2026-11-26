from typing import TypedDict, List, Dict, Optional


class AgentState(TypedDict, total=False):
    query: str
    conversation_id: int
    user_id: int
    history: List[Dict[str, str]]
    category: str
    response_content: str
    troubleshooting_steps: Optional[str]
    suggest_ticket: bool
    saved_message_id: Optional[int]
