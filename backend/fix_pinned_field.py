#!/usr/bin/env python3
"""
Script to fix the is_pinned field for existing messages
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from models import ForumMessage
from sqlalchemy.orm import Session

def fix_pinned_field():
    """Update all existing messages to have is_pinned = False instead of NULL"""
    db = next(get_db())
    
    try:
        # Update all messages where is_pinned is NULL to False
        result = db.query(ForumMessage).filter(
            ForumMessage.is_pinned.is_(None)
        ).update({"is_pinned": False})
        
        db.commit()
        print(f"Updated {result} messages to have is_pinned = False")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_pinned_field()
