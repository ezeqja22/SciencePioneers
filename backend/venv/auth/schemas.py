from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

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
        from_attributes = True

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
        from_attributes = True

class CommentCreate(BaseModel):
    text: str

class CommentResponse(BaseModel):
    id: int
    text: str
    author_id: int
    problem_id: int
    created_at: datetime
    author: UserOut

    class Config:
        from_attributes = True

class VoteCreate(BaseModel):
    vote_type: str

class VoteResponse(BaseModel):
    id: int
    user_id: int
    problem_id: int
    vote_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class VoteStatusResponse(BaseModel):
    user_vote: Optional[str] = None
    like_count: int
    dislike_count: int