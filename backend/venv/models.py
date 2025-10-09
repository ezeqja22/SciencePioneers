from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="user")  # 'admin', 'moderator', 'user'
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile_picture = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_expires = Column(DateTime, nullable=True)
    marketing_emails = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    is_banned = Column(Boolean, default=False)
    banned_at = Column(DateTime, nullable=True)
    ban_reason = Column(String, nullable=True)
    problems = relationship("Problem", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")
    notifications = relationship("Notification", back_populates="user")
    notification_preferences = relationship("NotificationPreferences", back_populates="user", uselist=False)
    sent_invitations = relationship("ForumInvitation", foreign_keys="ForumInvitation.inviter_id", back_populates="inviter")
    received_invitations = relationship("ForumInvitation", foreign_keys="ForumInvitation.invitee_id", back_populates="invitee")
    forum_join_requests = relationship("ForumJoinRequest", back_populates="user")
    drafts = relationship("Draft", back_populates="author")

class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    tags = Column(String)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    year = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)
    author_id = Column(Integer, ForeignKey("users.id"))
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=True)  # Link to forum if posted in forum
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="problems")
    forum = relationship("Forum", back_populates="problems")
    comments = relationship("Comment", back_populates="problem")
    votes = relationship("Vote", back_populates="problem")
    bookmarks = relationship("Bookmark", back_populates="problem")
    images = relationship("ProblemImage", back_populates="problem")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    is_solution = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="comments")
    problem = relationship("Problem", back_populates="comments")
    parent_comment = relationship("Comment", remote_side=[id], backref="replies")

class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uix_user_problem"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    vote_type = Column(String, nullable=False)
    user = relationship("User", back_populates="votes")
    problem = relationship("Problem", back_populates="votes")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uix_user_problem_bookmark"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="bookmarks")
    problem = relationship("Problem", back_populates="bookmarks")

class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uix_follower_following"),)
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))  # User who is following
    following_id = Column(Integer, ForeignKey("users.id"))  # User being followed
    created_at = Column(DateTime, default=datetime.utcnow)
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

class ProblemImage(Base):
    __tablename__ = "problem_images"
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    problem = relationship("Problem", back_populates="images")

class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    email_likes = Column(Boolean, default=True)
    email_comments = Column(Boolean, default=True)
    email_follows = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    # Forum notification preferences
    email_forum_invitations = Column(Boolean, default=True)
    email_forum_join_requests = Column(Boolean, default=True)
    email_forum_deleted = Column(Boolean, default=True)
    in_app_likes = Column(Boolean, default=True)
    in_app_comments = Column(Boolean, default=True)
    in_app_follows = Column(Boolean, default=True)
    # Forum in-app notifications (invitations and join requests are always on)
    in_app_forum_deleted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notification_preferences")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False)  # 'like', 'comment', 'follow', etc.
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    data = Column(JSON, nullable=True)  # Additional data for notifications
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")

# Forum Models
class Forum(Base):
    __tablename__ = "forums"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_private = Column(Boolean, default=False)
    max_members = Column(Integer, default=100)
    # Badge fields
    subject = Column(String, nullable=True)  # Primary subject badge
    level = Column(String, nullable=True)    # Level badge
    tags = Column(String, nullable=True)    # Up to 5 tags as comma-separated string
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    members = relationship("ForumMembership", back_populates="forum")
    problems = relationship("Problem", back_populates="forum")
    invitations = relationship("ForumInvitation", back_populates="forum")
    join_requests = relationship("ForumJoinRequest", back_populates="forum")

class ForumMembership(Base):
    __tablename__ = "forum_memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")  # 'creator', 'moderator', 'member'
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)  # Temporarily commented out until migration is applied
    
    # Relationships
    forum = relationship("Forum", back_populates="members")
    user = relationship("User")
    
    # Unique constraint to prevent duplicate memberships
    __table_args__ = (UniqueConstraint('forum_id', 'user_id', name='unique_forum_membership'),)

class ForumMessage(Base):
    __tablename__ = "forum_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_type = Column(String, default="text")  # 'text', 'problem', 'system'
    content = Column(String, nullable=False)  # For text messages
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=True)  # For problem messages
    created_at = Column(DateTime, default=datetime.utcnow)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False)
    
    # Relationships
    forum = relationship("Forum")
    author = relationship("User", foreign_keys=[author_id])
    problem = relationship("Problem", foreign_keys=[problem_id])

class ForumInvitation(Base):
    __tablename__ = "forum_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    forum = relationship("Forum", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="sent_invitations")
    invitee = relationship("User", foreign_keys=[invitee_id], back_populates="received_invitations")

class ForumJoinRequest(Base):
    __tablename__ = "forum_join_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    response_message = Column(Text, nullable=True)
    
    # Relationships
    forum = relationship("Forum", back_populates="join_requests")
    user = relationship("User", back_populates="forum_join_requests")

class Draft(Base):
    __tablename__ = "drafts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    year = Column(Integer, nullable=True)
    tags = Column(String, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    author = relationship("User", back_populates="drafts")

class UserOnlineStatus(Base):
    __tablename__ = "user_online_status"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), primary_key=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    is_typing = Column(Boolean, default=False)
    last_typing = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    forum = relationship("Forum")

class ForumReply(Base):
    __tablename__ = "forum_replies"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    parent_message_id = Column(Integer, ForeignKey("forum_messages.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    author = relationship("User")
    forum = relationship("Forum")
    parent_message = relationship("ForumMessage")

# Admin Models
class AdminAction(Base):
    __tablename__ = "admin_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # 'suspend_user', 'delete_forum', 'send_email', etc.
    target_id = Column(Integer, nullable=True)  # ID of affected resource
    target_type = Column(String, nullable=True)  # 'user', 'forum', 'problem', etc.
    details = Column(Text, nullable=True)  # Additional details about the action
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = relationship("User")

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(String, nullable=False)  # 'all', 'admins', 'moderators', 'users', 'specific'
    target_user_ids = Column(JSON, nullable=True)  # For specific users
    status = Column(String, default="draft")  # 'draft', 'sent', 'scheduled', 'failed'
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    recipient_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")

class SiteReport(Base):
    __tablename__ = "site_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String, nullable=False)  # 'user', 'forum', 'problem', 'comment', 'message'
    target_id = Column(Integer, nullable=False)  # ID of reported content
    reason = Column(String, nullable=False)  # 'spam', 'inappropriate', 'harassment', etc.
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")  # 'pending', 'under_review', 'resolved', 'dismissed'
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who is handling the report
    investigation_notes = Column(Text, nullable=True)  # Notes from investigation
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    resolution = Column(Text, nullable=True)
    email_sent = Column(Boolean, default=False)  # Whether email was sent to reporter
    email_content = Column(Text, nullable=True)  # Content of email sent
    email_sent_at = Column(DateTime, nullable=True)  # When email was sent
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

class UserModerationHistory(Base):
    __tablename__ = "user_moderation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who was moderated
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin/mod who took action
    action_type = Column(String, nullable=False)  # 'warn', 'ban', 'unban', 'deactivate', 'activate', 'time_ban'
    reason = Column(Text, nullable=False)  # Reason for the action
    duration = Column(Integer, nullable=True)  # Duration in days for time-limited bans
    report_id = Column(Integer, ForeignKey("site_reports.id"), nullable=True)  # Related report if any
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    moderator = relationship("User", foreign_keys=[moderator_id])
    report = relationship("SiteReport")

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    updater = relationship("User")