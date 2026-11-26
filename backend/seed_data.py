import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, init_db
from app.models import (
    User,
    UserRole,
    Conversation,
    Message,
    Ticket,
    TicketStatus,
    TicketPriority,
)
from app.auth import get_password_hash


def seed_database():
    print("Initializing database tables...")
    init_db()

    db = SessionLocal()
    try:
        # 1. Create Default Users if not exist
        admin = db.query(User).filter(User.email == "admin@company.com").first()
        if not admin:
            admin = User(
                email="admin@company.com",
                full_name="IT Operations Administrator",
                hashed_password=get_password_hash("adminpassword123"),
                role=UserRole.ADMIN.value,
                department="IT Operations",
            )
            db.add(admin)
            print("Created Admin user: admin@company.com / adminpassword123")

        employee1 = db.query(User).filter(User.email == "employee@company.com").first()
        if not employee1:
            employee1 = User(
                email="employee@company.com",
                full_name="Alex Johnson",
                hashed_password=get_password_hash("employeepassword123"),
                role=UserRole.EMPLOYEE.value,
                department="Finance & Operations",
            )
            db.add(employee1)
            print("Created Employee user: employee@company.com / employeepassword123")

        employee2 = db.query(User).filter(User.email == "sarah.dev@company.com").first()
        if not employee2:
            employee2 = User(
                email="sarah.dev@company.com",
                full_name="Sarah Chen",
                hashed_password=get_password_hash("employeepassword123"),
                role=UserRole.EMPLOYEE.value,
                department="Engineering",
            )
            db.add(employee2)
            print("Created Employee user: sarah.dev@company.com / employeepassword123")

        db.commit()
        db.refresh(admin)
        db.refresh(employee1)
        db.refresh(employee2)

        # 2. Create Sample Conversation if none exists
        if db.query(Conversation).count() == 0:
            sample_conv = Conversation(
                user_id=employee1.id,
                title="Outlook OST Sync Troubleshooting",
                status="resolved",
                is_resolved=True,
            )
            db.add(sample_conv)
            db.commit()
            db.refresh(sample_conv)

            u_msg = Message(
                conversation_id=sample_conv.id,
                sender="user",
                content="How can I fix Outlook synchronization problems with my mailbox?",
            )
            a_msg = Message(
                conversation_id=sample_conv.id,
                sender="assistant",
                content=(
                    "Your Outlook client may have corrupted its local cached data file (.ost).\n"
                    "1. Close Outlook completely.\n"
                    "2. Navigate to `%localappdata%\\Microsoft\\Outlook`\n"
                    "3. Rename your `.ost` file to `.ost.old`.\n"
                    "4. Reopen Outlook; it will automatically rebuild a clean cache from Exchange."
                ),
                troubleshooting_steps="1. Close Outlook. 2. Rename .ost file in %localappdata%\\Microsoft\\Outlook. 3. Restart Outlook.",
            )
            db.add(u_msg)
            db.add(a_msg)
            db.commit()
            print("Created sample resolved IT support conversation.")

        # 3. Create Sample Support Tickets
        ticket_count = db.query(Ticket).count()
        if ticket_count == 0:
            t1 = Ticket(
                ticket_number="TICK-2026-1042",
                user_id=employee1.id,
                title="VPN Connection Fails with Gateway Unreachable",
                description="GlobalProtect VPN gives error 'Gateway Unreachable' after working fine yesterday morning. Checked home Wi-Fi and it's working.",
                category="VPN",
                priority=TicketPriority.HIGH.value,
                status=TicketStatus.OPEN.value,
            )
            t2 = Ticket(
                ticket_number="TICK-2026-1025",
                user_id=employee2.id,
                title="Docker Desktop Enterprise License Activation",
                description="Requesting Docker Desktop license key for local containerized development in Project Mercury.",
                category="Software Installation",
                priority=TicketPriority.MEDIUM.value,
                status=TicketStatus.IN_PROGRESS.value,
            )
            t3 = Ticket(
                ticket_number="TICK-2026-0980",
                user_id=employee1.id,
                title="Floor 2 HP Color Printer Offline",
                description="Spooler service was stopped on the print server. Restarted print spooler and confirmed test page print.",
                category="Hardware & Printers",
                priority=TicketPriority.LOW.value,
                status=TicketStatus.RESOLVED.value,
                resolution_notes="Restarted print spooler and re-added driver for Floor 2 printer.",
                resolved_by_admin_id=admin.id,
            )
            db.add_all([t1, t2, t3])
            db.commit()
            print("Created 3 initial sample IT support tickets (OPEN, IN_PROGRESS, RESOLVED).")

        print("Database seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
