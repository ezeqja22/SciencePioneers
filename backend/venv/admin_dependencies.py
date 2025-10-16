from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth.dependencies import get_current_user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role to access admin endpoints"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user

def require_moderator(current_user: User = Depends(get_current_user)) -> User:
    """Require moderator or admin role to access moderation endpoints"""
    if current_user.role not in ['admin', 'moderator']:
        raise HTTPException(
            status_code=403,
            detail="Moderator access required"
        )
    return current_user

def require_admin_or_moderator(current_user: User = Depends(get_current_user)) -> User:
    """Require admin or moderator role"""
    if current_user.role not in ['admin', 'moderator']:
        raise HTTPException(
            status_code=403,
            detail="Admin or moderator access required"
        )
    return current_user
