#!/usr/bin/env python3
"""
Script to create the first admin user.
Run this script once to bootstrap the admin system.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from auth.utils import hash_password

def create_first_admin():
    """Create the first admin user"""
    db = SessionLocal()
    try:
        # Check if any admin exists
        existing_admin = db.query(User).filter(User.role == 'admin').first()
        if existing_admin:
            print("❌ Admin already exists!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            return
        
        # Create first admin
        admin_user = User(
            username="admin",
            email="admin@olimpiada.com",  # CHANGE TO YOUR EMAIL
            password_hash=hash_password("albytemilioner!"),  # CHANGE TO YOUR SECURE PASSWORD
            role="admin",
            is_active=True,
            is_verified=True,
            is_superuser=True
        )
        
        db.add(admin_user)
        db.commit()
        
        print("✅ First admin created successfully!")
        print("=" * 50)
        print("🔐 ADMIN CREDENTIALS:")
        print(f"   Username: admin")
        print(f"   Email: admin@olimpiada.com")
        print(f"   Password: albytemilioner!")
        print("=" * 50)
        print("⚠️  IMPORTANT SECURITY NOTES:")
        print("   1. CHANGE THE PASSWORD IMMEDIATELY!")
        print("   2. Update the email to your real email")
        print("   3. Consider changing the username")
        print("   4. This is a temporary password - use it to login and change it")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creating first admin user...")
    create_first_admin()
