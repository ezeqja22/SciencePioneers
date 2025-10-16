from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth.utils import verify_password
from auth.schemas import LoginRequest, TokenResponse
from auth.dependencies import create_jwt, get_current_user
from datetime import datetime, timedelta
import jwt
from auth.dependencies import SECRET_KEY

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Simple login endpoint without settings service dependency"""
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Email not verified")
    
    if user.is_banned:
        raise HTTPException(
            status_code=403,
            detail=f"Account has been banned. Reason: {user.ban_reason or 'No reason provided'}"
        )
    
    # Create JWT token
    token = create_jwt(user.id)
    return {"token": token}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user
