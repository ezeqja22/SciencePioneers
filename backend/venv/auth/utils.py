import os
from datetime import datetime, timedelta
from passlib.hash import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()  # loads .env

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", 24))

SECRET_KEY = "your-secret-key"  # store in .env later

def hash_password(password: str) -> str:
    return bcrypt.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)

def create_jwt(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)  # token expires in 24h
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    # PyJWT returns a str in modern versions
    return token




