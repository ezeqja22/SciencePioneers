from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
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
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile_picture = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_expires = Column(DateTime, nullable=True)
    problems = relationship("Problem", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")

class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    tags = Column(String)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    year = Column(Integer, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="problems")
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="comments")
    problem = relationship("Problem", back_populates="comments")

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