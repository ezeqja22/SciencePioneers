from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from datetime import datetime, timedelta
from database import get_db
from models import User, SystemSettings
from auth.utils import SECRET_KEY

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                     db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account has been deactivated")
        if user.is_banned:
            raise HTTPException(status_code=403, detail=f"Account has been banned. Reason: {user.ban_reason or 'No reason provided'}")
        
        # Check session timeout
        session_timeout_hours = 24  # default
        session_settings = db.query(SystemSettings).filter(SystemSettings.key == 'session_timeout_hours').first()
        if session_settings:
            session_timeout_hours = int(session_settings.value) if session_settings.value else 24
        
        # Check if session has expired
        if user.last_login is not None:
            session_expiry = user.last_login + timedelta(hours=session_timeout_hours)
            if datetime.utcnow() > session_expiry:
                raise HTTPException(status_code=401, detail="Session expired. Please login again.")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and ensure they are verified"""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please verify your email to access your account."
        )
    return current_user