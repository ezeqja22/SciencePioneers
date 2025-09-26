from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        orm_mode = True

class ProblemCreate(BaseModel):
    title: str
    description: str
    tags: Optional[str] = None
    subject: str

class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    tags: Optional[str]
    subject: str
    author_id: int

    class Config:
        orm_mode = True