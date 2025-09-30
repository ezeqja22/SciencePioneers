import asyncio
import schedule
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import get_db
from models import User

def cleanup_expired_users():
    """Clean up unverified users older than 1 hour"""
    db = next(get_db())
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        expired_users = db.query(User).filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        count = len(expired_users)
        for user in expired_users:
            db.delete(user)
        
        db.commit()
        print(f"Auto-cleanup: Deleted {count} expired unverified users")
        
    except Exception as e:
        print(f"Auto-cleanup error: {e}")
    finally:
        db.close()

def start_cleanup_scheduler():
    """Start the background cleanup scheduler"""
    # Run cleanup every 30 minutes
    schedule.every(30).minutes.do(cleanup_expired_users)
    
    print("Auto-cleanup scheduler started - running every 30 minutes")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    start_cleanup_scheduler()
