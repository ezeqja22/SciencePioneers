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
    problems = relationship("Problem", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")

class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    tags = Column(String)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="problems")
    comments = relationship("Comment", back_populates="problem")
    votes = relationship("Vote", back_populates="problem")
    bookmarks = relationship("Bookmark", back_populates="problem")

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