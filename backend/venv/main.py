from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from auth.routes import router as auth_router
from fastapi.staticfiles import StaticFiles
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User

app = FastAPI()
app.mount("/static", StaticFiles(directory="uploads"), name="static")
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])

# Auto-cleanup function
async def cleanup_expired_users():
    """Clean up unverified users older than 1 hour"""
    from database import get_db
    db = next(get_db())
    try:
        cutoff_time = datetime.utcnow() - timedelta(minutes=15)  # 15 minutes expiry
        expired_users = db.query(User).filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        count = len(expired_users)
        for user in expired_users:
            db.delete(user)
        
        db.commit()
        if count > 0:
            print(f"Auto-cleanup: Deleted {count} expired unverified users")
        
    except Exception as e:
        print(f"Auto-cleanup error: {e}")
    finally:
        db.close()

# Background task for cleanup - TEMPORARILY DISABLED
# @app.on_event("startup")
# async def startup_event():
#     """Start background cleanup task"""
#     asyncio.create_task(periodic_cleanup())

# async def periodic_cleanup():
#     """Run cleanup every 5 minutes"""
#     while True:
#         await asyncio.sleep(300)  # 5 minutes
#         await cleanup_expired_users()

@app.get("/")
def read_root():
    return {"message": "Hello, Science Pioneers with PostgreSQL!"}
