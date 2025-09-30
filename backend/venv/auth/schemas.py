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

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class ProblemCreate(BaseModel):
    title: str
    description: str
    tags: Optional[str] = None
    subject: str
    level: Optional[str] = "Any Level"
    year: Optional[int] = None

class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    tags: Optional[str]
    subject: str
    level: Optional[str]
    year: Optional[int]
    author_id: int
    comment_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    author: Optional[dict] = None

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
    updated_at: Optional[datetime] = None


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

class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    problem_id: int
    created_at: datetime
    problem: ProblemResponse

    class Config:
        from_attributes = True