import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import models
from database import engine, get_db
from fastapi.staticfiles import StaticFiles
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic endpoints
@app.get("/")
async def root():
    return {"message": "Science Pioneers API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/site-info")
async def get_site_info():
    """Get public site information"""
    return {
        "site_name": "Science Pioneers",
        "site_description": "A platform for science enthusiasts",
        "maintenance_mode": False,
        "maintenance_message": "Site under maintenance",
        "forums_enabled": True,
        "registration_enabled": True,
        "notifications_enabled": True,
        "comments_enabled": True,
        "voting_enabled": True,
        "bookmarks_enabled": True,
        "following_enabled": True,
        "reports_enabled": True,
        "profile_visibility": "public"
    }

# Auto-cleanup function
async def cleanup_expired_users():
    """Clean up unverified users older than 1 hour"""
    try:
        db = next(get_db())
        cutoff_time = datetime.utcnow() - timedelta(minutes=15)  # 15 minutes expiry
        expired_users = db.query(User).filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        count = len(expired_users)
        for user in expired_users:
            db.delete(user)
        
        db.commit()
        db.close()
        
    except Exception as e:
        pass

# Background task for cleanup
@app.on_event("startup")
async def startup_event():
    """Start background cleanup task"""
    asyncio.create_task(periodic_cleanup())

async def periodic_cleanup():
    """Run cleanup every 5 minutes"""
    while True:
        await asyncio.sleep(300)  # 5 minutes
        await cleanup_expired_users()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
