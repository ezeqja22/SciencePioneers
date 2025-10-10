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
        
        # Site settings loaded
        
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

@app.get("/test-settings")
async def test_settings_simple():
    """Simple test endpoint without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        settings = db.query(SystemSettings).filter(
            SystemSettings.key.in_([
                'site_name', 'site_description', 'maintenance_mode', 
                'forums_enabled', 'problems_enabled', 'registration_enabled',
                'smtp_server', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_use_tls',
                'email_from_name', 'email_from_address'
            ])
        ).all()
        
        settings_dict = {setting.key: setting.value for setting in settings}
        
        return {
            "message": "Settings test completed",
            "results": {
                "settings_loaded": len(settings_dict) > 0,
                "site_name": settings_dict.get('site_name', 'Not Set'),
                "maintenance_mode": settings_dict.get('maintenance_mode') == 'true',
                "forums_enabled": settings_dict.get('forums_enabled') == 'true',
                "problems_enabled": settings_dict.get('problems_enabled') == 'true',
                "registration_enabled": settings_dict.get('registration_enabled') == 'true',
                "smtp_server": settings_dict.get('smtp_server', 'Not Set'),
                "smtp_port": settings_dict.get('smtp_port', 'Not Set'),
                "smtp_username": settings_dict.get('smtp_username', 'Not Set'),
                "smtp_password": 'Set' if settings_dict.get('smtp_password') else 'Not Set',
                "smtp_use_tls": settings_dict.get('smtp_use_tls') == 'true',
                "email_from_name": settings_dict.get('email_from_name', 'Not Set'),
                "email_from_address": settings_dict.get('email_from_address', 'Not Set'),
                "total_settings": len(settings_dict)
            },
            "all_settings": settings_dict
        }
    except Exception as e:
        return {
            "message": f"Settings test failed: {str(e)}",
            "error": str(e)
        }

@app.get("/get-settings")
async def get_all_settings():
    """Get all settings without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        all_settings = db.query(SystemSettings).all()
        
        # Organize settings by category
        settings_by_category = {
            'site': {},
            'email': {},
            'security': {},
            'content': {},
            'forum': {},
            'notification': {},
            'analytics': {},
            'maintenance': {},
            'feature': {},
            'privacy': {},
            'integration': {},
            'advanced': {}
        }
        
        for setting in all_settings:
            key = setting.key
            value = setting.value
            
            # Categorize settings
            if key.startswith('site_'):
                settings_by_category['site'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('smtp_') or key.startswith('email_'):
                # Don't return password in API response
                if key == 'smtp_password':
                    settings_by_category['email'][key] = {
                        'value': 'ENCRYPTED',
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                        'updated_by': setting.updater.username if setting.updater else None
                    }
                else:
                    settings_by_category['email'][key] = {
                        'value': value,
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                        'updated_by': setting.updater.username if setting.updater else None
                    }
            elif key.startswith('password_') or key.startswith('session_') or key.startswith('max_login_') or key.startswith('lockout_'):
                settings_by_category['security'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('forum_') or key.startswith('max_forum_') or key.startswith('max_members_'):
                settings_by_category['forum'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('max_') and ('problem' in key or 'comment' in key):
                settings_by_category['content'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('notification_') or key.startswith('email_notifications_') or key.startswith('push_notifications_'):
                settings_by_category['notification'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('analytics_') or key.startswith('track_') or key.startswith('data_retention_') or key.startswith('export_'):
                settings_by_category['analytics'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('maintenance_') or key.startswith('backup_') or key.startswith('auto_'):
                settings_by_category['maintenance'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.endswith('_enabled') or key.startswith('registration_') or key.startswith('auto_'):
                settings_by_category['feature'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('gdpr_') or key.startswith('profile_') or key.startswith('show_') or key.startswith('allow_'):
                settings_by_category['privacy'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('google_') or key.startswith('facebook_') or key.startswith('twitter_') or key.startswith('discord_'):
                settings_by_category['integration'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            else:
                settings_by_category['advanced'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
        
        return settings_by_category
        
    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/save-settings")
async def save_settings_simple(settings_data: dict):
    """Simple save endpoint without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        settings = settings_data.get('settings', {})
        
        # Saving settings
        
        updated_count = 0
        for key, value in settings.items():
            # Encrypt password fields
            if key == 'smtp_password' and value:
                import base64
                value = base64.b64encode(str(value).encode('utf-8')).decode('utf-8')
            
            # Find existing setting or create new one
            setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
            if setting:
                setting.value = str(value)
                setting.updated_at = datetime.utcnow()
            else:
                new_setting = SystemSettings(
                    key=key,
                    value=str(value),
                    updated_at=datetime.utcnow()
                )
                db.add(new_setting)
            updated_count += 1
        
        db.commit()
        
        return {
            "message": f"Settings saved successfully! Updated {updated_count} settings.",
            "updated_count": updated_count
        }
    except Exception as e:
        return {
            "message": f"Failed to save settings: {str(e)}",
            "error": str(e)
        }
