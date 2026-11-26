"""
Bootstrap Admin Creator
-----------------------
Creates an admin account that bypasses the public registration lock.

Usage:
  python create_admin.py --email admin@yourcompany.com --name "IT Admin" --password "YourStrong@Pass1"

Or run interactively (no args):
  python create_admin.py
"""
import sys
import os
import argparse
import getpass

# Ensure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.auth import get_password_hash


def create_admin(email: str, full_name: str, password: str, department: str = "IT"):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower().strip()).first()
        if existing:
            if existing.role == UserRole.ADMIN.value:
                print(f"[!] Admin account already exists: {email}")
            else:
                # Upgrade to admin
                existing.role = UserRole.ADMIN.value
                existing.hashed_password = get_password_hash(password)
                existing.is_active = True
                db.commit()
                print(f"[+] Upgraded existing user to admin: {email}")
            return

        admin = User(
            email=email.lower().strip(),
            full_name=full_name.strip(),
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN.value,
            department=department,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[+] Admin account created successfully!")
        print(f"    Email    : {admin.email}")
        print(f"    Name     : {admin.full_name}")
        print(f"    Role     : {admin.role}")
        print(f"    ID       : {admin.id}")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create an IT admin account.")
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--name", help="Admin full name")
    parser.add_argument("--password", help="Admin password (min 8 chars)")
    parser.add_argument("--department", default="IT", help="Department (default: IT)")
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    name = args.name or input("Full name: ").strip()
    password = args.password or getpass.getpass("Password (hidden): ")

    if len(password) < 8:
        print("[!] Password must be at least 8 characters.")
        sys.exit(1)

    create_admin(email, name, password, args.department)


if __name__ == "__main__":
    main()
