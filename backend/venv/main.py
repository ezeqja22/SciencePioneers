from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import models
from database import engine, get_db
from auth.routes import router as auth_router
from admin_routes import router as admin_router
from fastapi.staticfiles import StaticFiles
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User
from dotenv import load_dotenv
import os
from settings_service import get_settings_service

# Load environment variables
load_dotenv()

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

# Settings middleware
@app.middleware("http")
async def settings_middleware(request: Request, call_next):
    """Apply settings-based restrictions"""
    try:
        # Skip middleware for site-info endpoint to avoid auth issues
        if request.url.path == "/admin/settings/site-info":
            response = await call_next(request)
            return response
            
        db = next(get_db())
        settings_service = get_settings_service(db)
        
        # Check maintenance mode
        if settings_service.is_maintenance_mode():
            # Allow admin access to admin routes
            if not request.url.path.startswith("/admin"):
                return JSONResponse(
                    status_code=503,
                    content={
                        "message": settings_service.get_setting('maintenance_message', 'Site under maintenance'),
                        "maintenance": True
                    }
                )
        
        # Check feature toggles
        if request.url.path.startswith("/forums") and not settings_service.is_feature_enabled("forums"):
            return JSONResponse(
                status_code=404,
                content={"message": "Forums are currently disabled"}
            )
        
        if request.url.path.startswith("/problems") and not settings_service.is_feature_enabled("problems"):
            return JSONResponse(
                status_code=404,
                content={"message": "Problems are currently disabled"}
            )
        
        response = await call_next(request)
        return response
        
    except Exception as e:
        print(f"Settings middleware error: {e}")
        response = await call_next(request)
        return response

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, tags=["admin"])

# Public site info endpoint (no auth required)
@app.get("/site-info")
async def get_site_info():
    """Get public site information (no auth required)"""
    try:
        from settings_service import get_settings_service
        db = next(get_db())
        settings_service = get_settings_service(db)
        site_settings = settings_service.get_site_settings()
        
        print("Site settings from service:", site_settings)
        
        result = {
            "site_name": site_settings.get('name', 'Science Pioneers'),
            "site_description": site_settings.get('description', 'A platform for science enthusiasts'),
            "site_logo": site_settings.get('logo', ''),
            "site_favicon": site_settings.get('favicon', ''),
            "site_theme": site_settings.get('theme', 'light'),
            "maintenance_mode": site_settings.get('maintenance_mode', False),
            "maintenance_message": site_settings.get('maintenance_message', 'Site under maintenance')
        }
        
        print("Returning site info:", result)
        return result
    except Exception as e:
        print("Error fetching site info:", str(e))
        # Return defaults if settings service fails
        return {
            "site_name": "Science Pioneers",
            "site_description": "A platform for science enthusiasts",
            "site_logo": "",
            "site_favicon": "",
            "site_theme": "light",
            "maintenance_mode": False,
            "maintenance_message": "Site under maintenance"
        }

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

@app.get("/")
def read_root():
    return {"message": "Hello, Science Pioneers with PostgreSQL!"}
