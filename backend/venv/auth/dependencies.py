from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from database import get_db
from models import User
from auth.utils import SECRET_KEY

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                     db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
#        user = db.query(User).get(user_id)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account has been deactivated")
        if user.is_banned:
            raise HTTPException(status_code=403, detail=f"Account has been banned. Reason: {user.ban_reason or 'No reason provided'}")
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