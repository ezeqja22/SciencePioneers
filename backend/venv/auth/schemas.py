from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    email_notifications: bool = False  # Default to False, user opts in
    marketing_emails: bool = False    # Default to False, user opts in

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    profile_picture: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class PasswordVerifyRequest(BaseModel):
    old_password: str

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProblemCreate(BaseModel):
    title: str
    description: str
    tags: Optional[str] = None
    subject: str
    level: Optional[str] = "Any Level"
    year: Optional[int] = None
    forum_id: Optional[int] = None  # Link to forum if posted in forum

class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    tags: Optional[str]
    subject: str
    level: Optional[str]
    year: Optional[int]
    author_id: int
    forum_id: Optional[int] = None
    comment_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    author: Optional[dict] = None

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    text: str
    parent_comment_id: Optional[int] = None

class CommentResponse(BaseModel):
    id: int
    text: str
    author_id: int
    problem_id: int
    parent_comment_id: Optional[int] = None
    is_solution: bool = False
    created_at: datetime
    author: UserOut
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ThreadedCommentResponse(CommentResponse):
    replies: Optional[List['ThreadedCommentResponse']] = []

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

# Notification schemas
class NotificationPreferencesCreate(BaseModel):
    email_likes: bool = True
    email_comments: bool = True
    email_follows: bool = True
    email_marketing: bool = False
    email_forum_invitations: bool = True
    email_forum_join_requests: bool = True
    email_forum_deleted: bool = True
    in_app_likes: bool = True
    in_app_comments: bool = True
    in_app_follows: bool = True
    in_app_forum_deleted: bool = True

class NotificationPreferencesResponse(BaseModel):
    id: int
    user_id: int
    email_likes: bool
    email_comments: bool
    email_follows: bool
    email_marketing: bool
    email_forum_invitations: bool
    email_forum_join_requests: bool
    email_forum_deleted: bool
    in_app_likes: bool
    in_app_comments: bool
    in_app_follows: bool
    in_app_forum_deleted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    data: Optional[dict] = None  # Add the missing data field
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    user_id: int
    type: str
    title: str
    message: str

# Forum Schemas
class ForumBase(BaseModel):
    title: str
    description: str = None
    is_private: bool = False
    max_members: int = 100
    # Badge fields
    subject: Optional[str] = None
    level: Optional[str] = None
    tags: Optional[str] = None  # Comma-separated string of up to 5 tags

class ForumCreate(ForumBase):
    pass

class ForumUpdate(BaseModel):
    title: str = None
    description: str = None
    is_private: bool = None
    # Badge fields
    subject: Optional[str] = None
    level: Optional[str] = None
    tags: Optional[str] = None

class Forum(ForumBase):
    id: int
    creator_id: int
    created_at: datetime
    last_activity: datetime
    member_count: int = 0
    is_member: Optional[bool] = None
    user_role: Optional[str] = None
    has_pending_request: Optional[bool] = None
    
    class Config:
        from_attributes = True

class ForumMembershipBase(BaseModel):
    forum_id: int
    user_id: int
    role: str = "member"

class ForumMembershipCreate(ForumMembershipBase):
    pass

class ForumMembership(ForumMembershipBase):
    id: int
    joined_at: datetime
    is_active: bool = True
    user: Optional[UserOut] = None
    
    class Config:
        from_attributes = True


class ForumMessageBase(BaseModel):
    content: str
    message_type: str = "text"
    problem_id: Optional[int] = None

class ForumMessageCreate(ForumMessageBase):
    pass

class ForumMessage(ForumMessageBase):
    id: int
    forum_id: int
    author_id: int
    created_at: datetime
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    author: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

# Forum Invitation Schemas
class ForumInvitationBase(BaseModel):
    forum_id: int
    invitee_id: int

class ForumInvitationCreate(ForumInvitationBase):
    pass

class ForumInvitation(ForumInvitationBase):
    id: int
    inviter_id: int
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    inviter: Optional[UserOut] = None
    invitee: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

class ForumInvitationResponse(BaseModel):
    id: int
    forum_id: int
    inviter_id: int
    invitee_id: int
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    forum: Optional[Forum] = None
    inviter: Optional[UserOut] = None
    invitee: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

# Forum Join Request Schemas
class ForumJoinRequestBase(BaseModel):
    forum_id: int
    user_id: int

class ForumJoinRequestCreate(ForumJoinRequestBase):
    pass

class ForumJoinRequest(ForumJoinRequestBase):
    id: int
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    response_message: Optional[str] = None
    user: Optional[UserOut] = None
    forum: Optional[Forum] = None
    
    class Config:
        from_attributes = True

class ForumJoinRequestResponse(BaseModel):
    id: int
    forum_id: int
    user_id: int
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    response_message: Optional[str] = None
    forum: Optional[Forum] = None
    user: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

class DraftCreate(BaseModel):
    title: str
    description: str
    subject: str
    level: Optional[str] = "Any Level"
    year: Optional[int] = None
    tags: Optional[str] = None

class DraftUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    level: Optional[str] = None
    year: Optional[int] = None
    tags: Optional[str] = None

class DraftResponse(BaseModel):
    id: int
    title: str
    description: str
    subject: str
    level: Optional[str]
    year: Optional[int]
    tags: Optional[str]
    author_id: int
    created_at: datetime
    updated_at: datetime
    author: Optional[UserOut] = None
    
    class Config:
        from_attributes = True