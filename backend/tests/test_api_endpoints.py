from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"


def test_auth_and_chat_flow():
    # 1. Login as employee
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@company.com", "password": "employeepassword123"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Send IT question
    chat_res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "My laptop is connected to Wi-Fi, but the internet is not working."}
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "conversation_id" in data
    assert len(data["content"]) > 10
    assert data["suggest_ticket"] is True
    assert "sources" not in data
    conv_id = data["conversation_id"]

    # 3. Employee sends feedback: problem still exists
    fb_res = client.post(
        "/api/v1/chat/feedback",
        headers=headers,
        json={"conversation_id": conv_id, "resolved": False}
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["suggest_ticket"] is True

    # 4. Employee raises a support ticket linked to conversation
    ticket_res = client.post(
        "/api/v1/tickets",
        headers=headers,
        json={
            "conversation_id": conv_id,
            "title": "Wi-Fi Connected but Internet Unavailable",
            "description": "Ran ipconfig flushdns and renew, but intranet and external websites still fail to load.",
            "category": "Network",
            "priority": "MEDIUM"
        }
    )
    assert ticket_res.status_code == 201
    ticket_data = ticket_res.json()
    assert ticket_data["conversation_id"] == conv_id
    assert ticket_data["status"] == "OPEN"
    ticket_id = ticket_data["id"]

    # 5. Login as admin
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.com", "password": "adminpassword123"}
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 6. Admin inspects dashboard stats
    stats_res = client.get("/api/v1/admin/dashboard/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_tickets"] > 0
    assert stats["total_conversations"] > 0
    assert "knowledge_documents" not in stats
    assert "verified_solutions" not in stats

    # 7. Admin updates ticket status to IN_PROGRESS
    update_res = client.patch(
        f"/api/v1/admin/tickets/{ticket_id}",
        headers=admin_headers,
        json={"status": "IN_PROGRESS", "resolution_notes": "Investigating DHCP scope and DNS gateway."}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"

    # 8. Confirm removed knowledge endpoints return 404
    kb_res = client.get("/api/v1/admin/knowledge/documents", headers=admin_headers)
    assert kb_res.status_code == 404
