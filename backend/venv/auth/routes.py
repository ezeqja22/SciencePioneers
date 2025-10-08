from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_
from database import get_db
from models import User, Problem, Comment, Vote, Bookmark, Follow, ProblemImage, Notification, NotificationPreferences, Forum, ForumMembership, ForumMessage, ForumInvitation, ForumJoinRequest, Draft, UserOnlineStatus
from auth.utils import hash_password, verify_password, create_jwt
from auth.dependencies import get_current_user, get_verified_user
from auth.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut, UserUpdate, PasswordVerifyRequest, PasswordChangeRequest, ForgotPasswordRequest, ResetPasswordRequest
from auth.schemas import ProblemCreate, ProblemResponse, CommentCreate, CommentResponse, ThreadedCommentResponse, VoteCreate, VoteResponse, VoteStatusResponse, BookmarkResponse
from auth.schemas import NotificationPreferencesCreate, NotificationPreferencesResponse, NotificationResponse, NotificationCreate
from auth.schemas import ForumCreate, ForumUpdate, Forum as ForumSchema, ForumMembershipCreate, ForumMembership as ForumMembershipSchema, ForumMessageCreate, ForumMessage as ForumMessageSchema, ForumInvitationCreate, ForumInvitation as ForumInvitationSchema, ForumJoinRequestCreate, ForumJoinRequest as ForumJoinRequestSchema, DraftCreate, DraftUpdate, DraftResponse, UserOnlineStatusResponse
from notification_service import NotificationService
from typing import List
from datetime import datetime, timedelta

def check_forum_permission(db: Session, forum_id: int, user_id: int, required_permission: str):
    """Check if user has required permission in forum"""
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == user_id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        return False
    
    # Permission hierarchy: creator > moderator > helper > member
    if membership.role == 'creator':
        return True
    elif membership.role == 'moderator':
        return required_permission in ['moderate', 'pin', 'kick']
    elif membership.role == 'helper':
        return required_permission in ['pin']
    else:  # member
        return False
from fastapi import UploadFile, File, Form
import os
import uuid
from PIL import Image

router = APIRouter()


@router.get("/problems/trending")
async def get_trending_problems(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trending problems based on engagement score"""
    from sqlalchemy import desc
    
    # Calculate engagement score: (comments × 2) + (votes × 1) + (views × 0.3) + (bookmarks × 1.5)
    # EXCLUDE forum problems from trending
    trending_query = db.query(
        Problem,
        (
            func.coalesce(func.count(Comment.id), 0) * 2 +
            func.coalesce(func.count(Vote.id), 0) * 1 +
            func.coalesce(Problem.view_count, 0) * 0.3 +
            func.coalesce(func.count(Bookmark.id), 0) * 1.5
        ).label('engagement_score')
    ).filter(Problem.forum_id.is_(None)).outerjoin(Comment, Comment.problem_id == Problem.id).outerjoin(
        Vote, Vote.problem_id == Problem.id
    ).outerjoin(
        Bookmark, Bookmark.problem_id == Problem.id
    ).group_by(Problem.id).order_by(desc('engagement_score'))
    
    # Apply pagination
    offset = (page - 1) * limit
    trending_problems = trending_query.offset(offset).limit(limit).all()
    
    # If no problems with engagement, fall back to recent problems (EXCLUDE forum problems)
    if not trending_problems:
        fallback_query = db.query(Problem).filter(Problem.forum_id.is_(None)).order_by(desc(Problem.created_at)).offset(offset).limit(limit)
        fallback_problems = fallback_query.all()
        trending_problems = [(problem, 0) for problem in fallback_problems]
    
    # Format results
    results = []
    for problem_data in trending_problems:
        problem = problem_data[0]
        engagement_score = problem_data[1]
        
        # Get author info
        author = db.query(User).filter(User.id == problem.author_id).first()
        
        # Get comment count
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        
        results.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "subject": problem.subject,
            "level": problem.level,
            "year": problem.year,
            "tags": problem.tags,
            "view_count": getattr(problem, 'view_count', 0) or 0,
            "engagement_score": float(engagement_score),
            "created_at": problem.created_at.isoformat(),
            "author": {
                "id": author.id,
                "username": author.username,
                "profile_picture": author.profile_picture
            },
            "comment_count": comment_count
        })
    
    # Get total count for pagination
    total_problems = db.query(Problem).count()
    total_pages = max(1, (total_problems + limit - 1) // limit)
    
    return {
        "problems": results,
        "total_problems": total_problems,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email is already registered (verified or not)
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        if existing_user.is_verified and existing_user.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # User exists but not verified or is deleted - delete the old record and create new one
            db.delete(existing_user)
            db.commit()
    
    # Check if username is already taken (only for active users)
    if db.query(User).filter(User.username == req.username, User.is_active == True).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate verification code first
    from email_service import email_service
    verification_code = email_service.generate_verification_code()
    verification_expires = email_service.get_verification_expiry()
    
    
    # Try to send email BEFORE creating user
    success = await email_service.send_verification_email(
        req.email, req.username, verification_code
    )
    
    if not success:
        # For testing: create user even if email fails, but log the code
        pass  # Continue to create user for testing purposes
    
    # Create user (for testing, even if email failed)
    hashed = hash_password(req.password)
    user = User(
        username=req.username, 
        email=req.email, 
        password_hash=hashed, 
        is_verified=False,
        verification_code=verification_code,
        verification_expires=verification_expires,
        marketing_emails=req.marketing_emails
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create notification preferences
    notification_preferences = NotificationPreferences(
        user_id=user.id,
        email_likes=req.email_notifications,
        email_comments=req.email_notifications,
        email_follows=req.email_notifications,
        email_marketing=req.marketing_emails,
        in_app_likes=True,  # In-app notifications default to True
        in_app_comments=True,
        in_app_follows=True
    )
    db.add(notification_preferences)
    db.commit()
    
    # Generate JWT token for automatic login
    from auth.utils import create_jwt
    access_token = create_jwt(user.id)
    
    if not success:
        return {
            "message": "Registration successful! Email sending failed, but user created for testing.",
            "debug_code": verification_code,
            "email": req.email,
            "username": req.username,
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    return {
        "message": "Registration successful! Please check your email for verification code.",
        "email": req.email,
        "username": req.username,
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail="Email not verified. Please check your email for verification code."
        )
    
    token = create_jwt(user.id)
    return {"token": token}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_verified_user)):
    return current_user

@router.post("/problems/", response_model=ProblemResponse)
def create_problem(
    problem: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    
    db_problem = Problem(
        title=problem.title,
        description=problem.description,
        tags=problem.tags,
        subject=problem.subject,
        level=problem.level,
        year=problem.year,
        author_id=current_user.id
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    
    # Return the created problem with all fields
    return {
        "id": db_problem.id,
        "title": db_problem.title,
        "description": db_problem.description,
        "tags": db_problem.tags,
        "subject": db_problem.subject,
        "level": db_problem.level,
        "year": db_problem.year,
        "author_id": db_problem.author_id,
        "comment_count": 0,
        "created_at": db_problem.created_at.isoformat() if db_problem.created_at else None,
        "updated_at": db_problem.updated_at.isoformat() if db_problem.updated_at else None,
        "author": None
    }


@router.get("/problems/")
def get_problems(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get problems with pagination"""
    offset = (page - 1) * limit
    
    # Get total count for pagination (EXCLUDE forum problems)
    total_problems = db.query(Problem).filter(Problem.forum_id.is_(None)).count()
    
    # Get problems with pagination (EXCLUDE forum problems)
    problems = db.query(Problem).filter(Problem.forum_id.is_(None)).order_by(Problem.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for problem in problems:
        # Get author for this problem
        author = db.query(User).filter(User.id == problem.author_id).first()
        
        # Get comment count
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        
        # Build response with real data
        problem_data = {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "tags": problem.tags,
            "subject": problem.subject,
            "level": problem.level,
            "year": problem.year,
            "author_id": problem.author_id,
            "comment_count": comment_count,
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
            "author": {
                "id": author.id if author else 1,
                "username": author.username if author else "Unknown User",
                "profile_picture": author.profile_picture if author else None
            }
        }
        result.append(problem_data)
    
    return {
        "problems": result,
        "total": total_problems,
        "page": page,
        "limit": limit,
        "total_pages": (total_problems + limit - 1) // limit
    }


@router.get("/problems/{problem_id}/images")
async def get_problem_images(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all images for a problem"""
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # SECURITY CHECK: If problem is from a forum, check if user is a member
    if problem.forum_id:
        # Check if user is the problem author (they should always have access to their own problems)
        is_author = problem.author_id == current_user.id
        
        # Check if user is a member (active or creator)
        membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == problem.forum_id,
            ForumMembership.user_id == current_user.id,
            ForumMembership.is_active == True
        ).first()
        
        # Also check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == problem.forum_id).first()
        is_creator = forum and forum.creator_id == current_user.id
        
        if not is_author and not membership and not is_creator:
            raise HTTPException(status_code=403, detail="Access denied: Not a member of this forum")
    
    # Get images from database
    problem_images = db.query(ProblemImage).filter(ProblemImage.problem_id == problem_id).all()
    image_filenames = [img.filename for img in problem_images]
    
    return {"images": image_filenames}

@router.get("/problems/{subject}", response_model=List[ProblemResponse])
def get_problems_by_subject(subject: str, db: Session = Depends(get_db)):
    # First get problems with comment counts (case-insensitive search)
    problems_with_counts = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(func.lower(Problem.subject) == func.lower(subject)).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    
    # Then fetch authors for all problems
    authors = db.query(User).filter(User.id.in_([p.author_id for p, _ in problems_with_counts])).all()
    author_dict = {author.id: author for author in authors}
    
    result = []
    for p, comment_count in problems_with_counts:
        author = author_dict.get(p.author_id)
        if author:
            result.append({
                "id": p.id, 
                "title": p.title, 
                "description": p.description, 
                "tags": p.tags, 
                "subject": p.subject, 
                "level": p.level, 
                "year": p.year,
                "author_id": p.author_id, 
                "comment_count": comment_count, 
                "created_at": p.created_at.isoformat() if p.created_at else None, 
                "updated_at": p.updated_at.isoformat() if p.updated_at else None, 
                "author": {
                    "id": author.id, 
                    "username": author.username, 
                    "profile_picture": author.profile_picture
                }
            })
        else:
            result.append({
                "id": p.id, 
                "title": p.title, 
                "description": p.description, 
                "tags": p.tags, 
                "subject": p.subject, 
                "level": p.level, 
                "year": p.year,
                "author_id": p.author_id, 
                "comment_count": comment_count, 
                "created_at": p.created_at.isoformat() if p.created_at else None, 
                "updated_at": p.updated_at.isoformat() if p.updated_at else None, 
                "author": None
            })
    return result


@router.get("/problems/id/{problem_id}", response_model=ProblemResponse)
def get_problem(problem_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import func
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem, comment_count = result
    
    # SECURITY CHECK: If problem is from a forum, check if user is a member
    if problem.forum_id:
        # Check if user is the problem author (they should always have access to their own problems)
        is_author = problem.author_id == current_user.id
        
        # Check if user is a member (active or creator)
        membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == problem.forum_id,
            ForumMembership.user_id == current_user.id
        ).first()
        
        # Also check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == problem.forum_id).first()
        is_creator = forum and forum.creator_id == current_user.id
        
        if not is_author and not membership and not is_creator:
            raise HTTPException(status_code=403, detail="Access denied: Not a member of this forum")
    
    
    # Fetch the author
    author = db.query(User).filter(User.id == problem.author_id).first()
    
    if author:
        return {
            "id": problem.id, 
            "title": problem.title, 
            "description": problem.description, 
            "tags": problem.tags, 
            "subject": problem.subject, 
            "level": problem.level, 
            "year": problem.year,
            "author_id": problem.author_id, 
            "comment_count": comment_count, 
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None, 
            "author": {
                "id": author.id, 
                "username": author.username, 
                "profile_picture": author.profile_picture
            }
        }
    else:
        return {
            "id": problem.id, 
            "title": problem.title, 
            "description": problem.description, 
            "tags": problem.tags, 
            "subject": problem.subject, 
            "level": problem.level, 
            "year": problem.year,
            "author_id": problem.author_id, 
            "comment_count": comment_count, 
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None, 
            "author": None
        }

@router.put("/problems/{problem_id}", response_model=ProblemResponse)
def update_problem(
    problem_id: int,
    problem: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists and belongs to current user
    db_problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.author_id == current_user.id
    ).first()
    
    if not db_problem:
        raise HTTPException(status_code=404, detail="Problem not found or you don't have permission to edit it")
    
    # Update problem
    db_problem.title = problem.title
    db_problem.description = problem.description
    db_problem.tags = problem.tags
    db_problem.subject = problem.subject
    db_problem.level = problem.level
    db_problem.year = problem.year
    db_problem.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_problem)
    
    # Return with comment count
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    problem, comment_count = result
    # Fetch the author
    author = db.query(User).filter(User.id == problem.author_id).first()
    
    if author:
        return {
            "id": problem.id, 
            "title": problem.title, 
            "description": problem.description, 
            "tags": problem.tags, 
            "subject": problem.subject, 
            "level": problem.level, 
            "year": problem.year,
            "author_id": problem.author_id, 
            "comment_count": comment_count, 
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None, 
            "author": {
                "id": author.id, 
                "username": author.username, 
                "profile_picture": author.profile_picture
            }
        }
    else:
        return {
            "id": problem.id, 
            "title": problem.title, 
            "description": problem.description, 
            "tags": problem.tags, 
            "subject": problem.subject, 
            "level": problem.level, 
            "year": problem.year,
            "author_id": problem.author_id, 
            "comment_count": comment_count, 
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None, 
            "author": None
        }

@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists and belongs to current user
    db_problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.author_id == current_user.id
    ).first()
    
    if not db_problem:
        raise HTTPException(status_code=404, detail="Problem not found or you don't have permission to delete it")
    
    # Delete problem (this will cascade delete comments and votes)
    db.delete(db_problem)
    db.commit()
    
    return {"message": "Problem deleted successfully"}

# Comment endpoints
@router.post("/problems/{problem_id}/comments", response_model=CommentResponse)
def create_comment(
    problem_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Create comment
    db_comment = Comment(
        text=comment.text,
        author_id=current_user.id,
        problem_id=problem_id,
        parent_comment_id=comment.parent_comment_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Send notification if not the author commenting on their own problem
    if problem.author_id != current_user.id:
        notification_service = NotificationService(db)
        notification_service.send_comment_notification(
            user_id=problem.author_id,
            commenter_username=current_user.username,
            problem_title=problem.title
        )
    
    # Fetch the comment with author relationship
    db_comment = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.id == db_comment.id).first()
    return db_comment

@router.get("/problems/{problem_id}/comments")
def get_comments(problem_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # SECURITY CHECK: If problem is from a forum, check if user is a member
    if problem.forum_id:
        # Check if user is the problem author (they should always have access to their own problems)
        is_author = problem.author_id == current_user.id
        
        # Check if user is a member (active or creator)
        membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == problem.forum_id,
            ForumMembership.user_id == current_user.id
        ).first()
        
        # Also check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == problem.forum_id).first()
        is_creator = forum and forum.creator_id == current_user.id
        
        if not is_author and not membership and not is_creator:
            raise HTTPException(status_code=403, detail="Access denied: Not a member of this forum")
    
    # Get top-level comments (no parent) first, then manually load author info
    top_level_comments = db.query(Comment).filter(
        Comment.problem_id == problem_id,
        Comment.parent_comment_id.is_(None)
    ).order_by(Comment.created_at.desc()).all()
    
    # Manually load author info for each comment to handle inactive users
    for comment in top_level_comments:
        if comment.author_id:
            # Query for user regardless of is_active status
            author = db.query(User).filter(User.id == comment.author_id).first()
            comment.author = author
    
    # Build threaded structure using the relationship
    def build_comment_tree(comment):
        # Get replies using the relationship
        replies = db.query(Comment).filter(
            Comment.parent_comment_id == comment.id
        ).order_by(Comment.created_at.asc()).all()
        
        # Load author info for replies
        for reply in replies:
            if reply.author_id:
                author = db.query(User).filter(User.id == reply.author_id).first()
                reply.author = author
        
        # Recursively build replies
        comment.replies = [build_comment_tree(reply) for reply in replies]
        return comment
    
    # Build the threaded structure
    threaded_comments = [build_comment_tree(comment) for comment in top_level_comments]
    
    return threaded_comments


@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists and belongs to current user
    db_problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.author_id == current_user.id
    ).first()
    
    if not db_problem:
        raise HTTPException(status_code=404, detail="Problem not found or you don't have permission to delete it")
    
    # Delete problem (this will cascade delete comments and votes)
    db.delete(db_problem)
    db.commit()
    
    return {"message": "Problem deleted successfully"}

@router.put("/problems/{problem_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    problem_id: int,
    comment_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if comment exists and belongs to current user
    db_comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.problem_id == problem_id,
        Comment.author_id == current_user.id
    ).first()
    
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found or you don't have permission to edit it")
    
    # Update comment
    db_comment.text = comment.text
    db_comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_comment)
    
    # Fetch the comment with author relationship
    db_comment = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.id == comment_id).first()
    return db_comment

@router.delete("/problems/{problem_id}/comments/{comment_id}")
def delete_comment(
    problem_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if comment exists and belongs to current user
    db_comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.problem_id == problem_id,
        Comment.author_id == current_user.id
    ).first()
    
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found or you don't have permission to delete it")
    
    # Delete comment
    db.delete(db_comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}

@router.put("/problems/{problem_id}/comments/{comment_id}/solution")
def mark_comment_as_solution(
    problem_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a comment as the solution (only problem author can do this)"""
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if current user is the problem author
    if problem.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the problem author can mark comments as solutions")
    
    # Check if comment exists and belongs to this problem
    db_comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.problem_id == problem_id
    ).first()
    
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Toggle the solution status
    db_comment.is_solution = not db_comment.is_solution
    db.commit()
    db.refresh(db_comment)
    
    action = "marked as solution" if db_comment.is_solution else "unmarked as solution"
    return {"message": f"Comment {action} successfully", "is_solution": db_comment.is_solution}

# Vote endpoints

@router.get("/problems/{problem_id}/votes", response_model=List[VoteResponse])
def get_votes(problem_id: int, db: Session = Depends(get_db)):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    votes = db.query(Vote).filter(Vote.problem_id == problem_id).all()
    return votes

@router.get("/problems/{problem_id}/vote-status", response_model=VoteStatusResponse)
def get_vote_status(
    problem_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # SECURITY CHECK: If problem is from a forum, check if user is a member
    if problem.forum_id:
        # Check if user is the problem author (they should always have access to their own problems)
        is_author = problem.author_id == current_user.id
        
        # Check if user is a member (active or creator)
        membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == problem.forum_id,
            ForumMembership.user_id == current_user.id
        ).first()
        
        # Also check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == problem.forum_id).first()
        is_creator = forum and forum.creator_id == current_user.id
        
        if not is_author and not membership and not is_creator:
            raise HTTPException(status_code=403, detail="Access denied: Not a member of this forum")
    
    # Get user's current vote
    user_vote = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.problem_id == problem_id
    ).first()
    
    # Count total likes and dislikes
    like_count = db.query(Vote).filter(
        Vote.problem_id == problem_id,
        Vote.vote_type == "like"
    ).count()
    
    dislike_count = db.query(Vote).filter(
        Vote.problem_id == problem_id,
        Vote.vote_type == "dislike"
    ).count()
    
    return {
        "user_vote": user_vote.vote_type if user_vote else None,
        "like_count": like_count,
        "dislike_count": dislike_count
    }

@router.post("/problems/{problem_id}/vote", response_model=VoteStatusResponse)
def vote_problem(
    problem_id: int,
    vote_data: dict,  # Will receive {"vote_type": "like"} or {"vote_type": "dislike"}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get user's existing vote
    existing_vote = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.problem_id == problem_id
    ).first()
    
    vote_type = vote_data.get("vote_type")
    
    # STEP 1: Always delete any existing vote first
    if existing_vote:
        db.delete(existing_vote)
        db.commit()
    
    # STEP 2: Check if user wants to vote or remove vote
    should_create_vote = not existing_vote or existing_vote.vote_type != vote_type
    
    if should_create_vote:
        new_vote = Vote(
            user_id=current_user.id,
            problem_id=problem_id,
            vote_type=vote_type
        )
        db.add(new_vote)
        db.commit()
        
        # Send notification if it's a like and not the author liking their own problem
        if vote_type == "like" and problem.author_id != current_user.id:
            notification_service = NotificationService(db)
            notification_service.send_like_notification(
                user_id=problem.author_id,
                liker_username=current_user.username,
                problem_title=problem.title
            )
    
    # STEP 3: Get the current state from database
    current_vote = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.problem_id == problem_id
    ).first()
    
    like_count = db.query(Vote).filter(
        Vote.problem_id == problem_id,
        Vote.vote_type == "like"
    ).count()
    
    dislike_count = db.query(Vote).filter(
        Vote.problem_id == problem_id,
        Vote.vote_type == "dislike"
    ).count()
    
    return {
        "user_vote": current_vote.vote_type if current_vote else None,
        "like_count": like_count,
        "dislike_count": dislike_count
    }

# Bookmark endpoints

@router.post("/problems/{problem_id}/bookmark")
def bookmark_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if already bookmarked
    existing_bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.problem_id == problem_id
    ).first()
    
    if existing_bookmark:
        raise HTTPException(status_code=400, detail="Problem already bookmarked")
    
    # Create bookmark
    bookmark = Bookmark(
        user_id=current_user.id,
        problem_id=problem_id
    )
    db.add(bookmark)
    db.commit()
    
    return {"message": "Problem bookmarked successfully"}

@router.delete("/problems/{problem_id}/bookmark")
def unbookmark_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if bookmark exists
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.problem_id == problem_id
    ).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    # Delete bookmark
    db.delete(bookmark)
    db.commit()
    
    return {"message": "Bookmark removed successfully"}

@router.get("/user/profile", response_model=dict)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's problems with comment counts
    user_problems = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.author_id == current_user.id).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    
    # Get user's comments with problem info
    user_comments = db.query(Comment).options(joinedload(Comment.problem)).filter(Comment.author_id == current_user.id).order_by(Comment.created_at.desc()).all()
    
    # Get user's bookmarks with problem info
    user_bookmarks = db.query(Bookmark).options(joinedload(Bookmark.problem)).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()).all()
    
    # Serialize problems
    problems_data = []
    for problem, comment_count in user_problems:
        problems_data.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "tags": problem.tags,
            "subject": problem.subject,
            "level": problem.level,
            "author_id": problem.author_id,
            "comment_count": comment_count,
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
            "author": {
                "id": problem.author.id,
                "username": problem.author.username,
                "profile_picture": problem.author.profile_picture
            }
        })
    
    # Serialize comments
    comments_data = []
    for comment in user_comments:
        # Skip comments where the associated problem no longer exists
        if comment.problem is None:
            continue
            
        comments_data.append({
            "id": comment.id,
            "text": comment.text,
            "author_id": comment.author_id,
            "problem_id": comment.problem_id,
            "is_solution": comment.is_solution,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
            "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
            "problem": {
                "id": comment.problem.id,
                "title": comment.problem.title,
                "subject": comment.problem.subject,
                "level": comment.problem.level
            }
        })
    
    # Serialize bookmarks
    bookmarks_data = []
    for bookmark in user_bookmarks:
        # Skip bookmarks where the associated problem no longer exists
        if bookmark.problem is None:
            continue
            
        bookmarks_data.append({
            "id": bookmark.id,
            "user_id": bookmark.user_id,
            "problem_id": bookmark.problem_id,
            "created_at": bookmark.created_at.isoformat() if bookmark.created_at else None,
            "problem": {
                "id": bookmark.problem.id,
                "title": bookmark.problem.title,
                "description": bookmark.problem.description,
                "tags": bookmark.problem.tags,
                "subject": bookmark.problem.subject,
                "level": bookmark.problem.level,
                "author_id": bookmark.problem.author_id,
                "created_at": bookmark.problem.created_at.isoformat() if bookmark.problem.created_at else None,
                "updated_at": bookmark.problem.updated_at.isoformat() if bookmark.problem.updated_at else None
            }
        })
    
    # Get follower and following counts
    follower_count = db.query(Follow).filter(Follow.following_id == current_user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == current_user.id).count()
    
    # Handle both old and new profile picture paths
    profile_picture_url = None
    if current_user.profile_picture:
        if current_user.profile_picture.startswith('uploads/'):
            # Old format: remove 'uploads/' prefix
            profile_picture_url = current_user.profile_picture.replace('uploads/', '')
        else:
            # New format: use as is
            profile_picture_url = current_user.profile_picture
    
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "bio": current_user.bio,
            "profile_picture": profile_picture_url,
            "follower_count": follower_count,
            "following_count": following_count
        },
        "problems": problems_data,
        "comments": comments_data,
        "bookmarks": bookmarks_data
    }

@router.put("/user/profile", response_model=UserOut)
def update_user_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile (bio and profile picture)"""
    # Update bio if provided
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    
    # Update profile picture if provided
    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/user/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Read file content first
    content = await file.read()
    
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image")

    # Check file size
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5MB")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"user_{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
    file_path = f"../../uploads/profile_pictures/{unique_filename}"
    stored_path = f"profile_pictures/{unique_filename}"

    # Create directory if it doesn't exist
    os.makedirs("../../uploads/profile_pictures", exist_ok=True)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    # Update database
    current_user.profile_picture = stored_path
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile picture uploaded successfully", "file_path": stored_path}


@router.delete("/user/profile-picture")
def remove_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove user's profile picture"""
    if not current_user.profile_picture:
        raise HTTPException(status_code=400, detail="No profile picture to remove")
    
    # Delete the file from filesystem if it exists
    try:
        file_path = f"../../uploads/{current_user.profile_picture}"
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        # Log the error but don't fail the request
        pass  # File deletion is optional
    
    # Update database to remove profile picture
    current_user.profile_picture = None
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile picture removed successfully"}


@router.post("/forums/upload-image")
async def upload_forum_image(
    file: UploadFile = File(...),
    forum_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload image for forum messages"""
    # Check if user is member of the forum
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id
    ).first()
    
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    is_creator = forum and forum.creator_id == current_user.id
    
    if not membership and not is_creator:
        raise HTTPException(status_code=403, detail="Access denied: Not a member of this forum")
    
    # Read file content first
    content = await file.read()
    
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image")

    # Check file size (5MB limit)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5MB")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"forum_{forum_id}_{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
    file_path = f"../../uploads/forum_images/{unique_filename}"
    stored_path = f"forum_images/{unique_filename}"

    # Create directory if it doesn't exist
    os.makedirs("../../uploads/forum_images", exist_ok=True)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    return {"message": "Image uploaded successfully", "file_path": stored_path}


@router.get("/serve-image/{filename}")
def serve_image(filename: str):
    """Direct image serving endpoint for testing"""
    from fastapi.responses import FileResponse
    import os
    
    # Try profile pictures first
    profile_path = f"../../uploads/profile_pictures/{filename}"
    if os.path.exists(profile_path):
        return FileResponse(profile_path)
    
    # Try forum images
    forum_path = f"../../uploads/forum_images/{filename}"
    if os.path.exists(forum_path):
        return FileResponse(forum_path)
    
    # Try problem images
    problem_path = f"../../uploads/problem_images/{filename}"
    if os.path.exists(problem_path):
        return FileResponse(problem_path)
    
    return {"error": "File not found", "path": f"Tried: {profile_path}, {forum_path}, {problem_path}"}

@router.post("/follow/{user_id}")
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Follow a user"""
    # Can't follow yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)
    db.commit()
    
    # Send notification to the user being followed
    notification_service = NotificationService(db)
    notification_service.send_follow_notification(
        user_id=user_id,
        follower_username=current_user.username
    )
    
    return {"message": f"Now following {target_user.username}"}

@router.delete("/follow/{user_id}")
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unfollow a user"""
    # Find the follow relationship
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")
    
    # Delete the follow relationship
    db.delete(follow)
    db.commit()
    
    return {"message": f"Unfollowed user {user_id}"}

@router.get("/feed/following")
def get_following_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get problems from users you follow"""
    # Get list of user IDs that current user follows
    following_ids = db.query(Follow.following_id).filter(
        Follow.follower_id == current_user.id
    ).all()
    following_ids = [user_id[0] for user_id in following_ids]
    
    if not following_ids:
        return {
            "problems": [],
            "message": "You don't follow anyone yet",
            "following_count": 0
        }
    
    # Get problems from followed users with comment counts
    problems = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(
        Problem.author_id.in_(following_ids)
    ).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    
    # Fetch authors for all problems
    author_ids = [p.author_id for p, _ in problems]
    authors = db.query(User).filter(User.id.in_(author_ids)).all()
    author_dict = {author.id: author for author in authors}
    
    # Serialize problems
    problems_data = []
    for problem, comment_count in problems:
        problems_data.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "tags": problem.tags,
            "subject": problem.subject,
            "level": problem.level,
            "author_id": problem.author_id,
            "comment_count": comment_count,
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
            "author": {
                "id": author_dict[problem.author_id].id,
                "username": author_dict[problem.author_id].username,
                "profile_picture": author_dict[problem.author_id].profile_picture
            }
        })
    
    return {
        "problems": problems_data,
        "following_count": len(following_ids)
    }

@router.get("/follow/status/{user_id}")
def get_follow_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if current user is following a specific user"""
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    return {
        "is_following": follow is not None,
        "user_id": user_id
    }

@router.get("/user/{username}")
def get_public_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get public profile of any user by username"""
    # Get the user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get follower and following counts
    follower_count = db.query(Follow).filter(Follow.following_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    
    # Check if current user is following this user
    is_following = False
    if current_user.id != user.id:  # Don't follow yourself
        follow = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        ).first()
        is_following = follow is not None
    
    # Get user's problems with comment counts
    problems = db.query(Problem).filter(Problem.author_id == user.id).order_by(Problem.created_at.desc()).all()
    
    problems_data = []
    for problem in problems:
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        problems_data.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "tags": problem.tags,
            "subject": problem.subject,
            "level": problem.level,
            "author_id": problem.author_id,
            "comment_count": comment_count,
            "created_at": problem.created_at.isoformat() if problem.created_at else None,
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
            "author": {
                "id": user.id,
                "username": user.username,
                "profile_picture": user.profile_picture
            }
        })
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "profile_picture": user.profile_picture,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": is_following,
        "problems": problems_data
    }

@router.get("/users/search")
def search_users(
    q: str,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for users by username with pagination"""
    if len(q.strip()) < 2:
        return {"users": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}
    
    offset = (page - 1) * limit
    
    # Get total count for pagination
    total_users = db.query(User).filter(
        User.username.ilike(f"%{q}%"),
        User.is_verified == True
    ).count()
    
    users = db.query(User).filter(
        User.username.ilike(f"%{q}%"),
        User.is_verified == True
    ).offset(offset).limit(limit).all()
    
    users_data = []
    for user in users:
        # Get follower count for each user
        follower_count = db.query(Follow).filter(Follow.following_id == user.id).count()
        
        # Check if current user is following this user
        is_following = False
        if current_user.id != user.id:
            follow = db.query(Follow).filter(
                Follow.follower_id == current_user.id,
                Follow.following_id == user.id
            ).first()
            is_following = follow is not None
        
        users_data.append({
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "profile_picture": user.profile_picture,
            "follower_count": follower_count,
            "is_following": is_following
        })
    
    return {
        "users": users_data,
        "total": total_users,
        "page": page,
        "limit": limit,
        "total_pages": (total_users + limit - 1) // limit
    }

@router.get("/problems/search")
def search_problems(
    q: str,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search problems by title, description, or tags with pagination"""
    if len(q.strip()) < 2:
        return {"problems": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}
    
    offset = (page - 1) * limit
    
    # Get total count for pagination
    total_problems = db.query(Problem).filter(
        or_(
            Problem.title.ilike(f"%{q}%"),
            Problem.description.ilike(f"%{q}%"),
            Problem.tags.ilike(f"%{q}%")
        )
    ).count()
    
    problems = db.query(Problem).filter(
        or_(
            Problem.title.ilike(f"%{q}%"),
            Problem.description.ilike(f"%{q}%"),
            Problem.tags.ilike(f"%{q}%")
        )
    ).offset(offset).limit(limit).all()
    
    results = []
    for problem in problems:
        # Get author info
        author = db.query(User).filter(User.id == problem.author_id).first()
        
        # Get comment count
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        
        # Get vote counts
        upvotes = db.query(Vote).filter(Vote.problem_id == problem.id, Vote.vote_type == "upvote").count()
        downvotes = db.query(Vote).filter(Vote.problem_id == problem.id, Vote.vote_type == "downvote").count()
        
        results.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "subject": problem.subject,
            "level": problem.level,
            "tags": problem.tags,
            "created_at": problem.created_at.isoformat(),
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
            "author": {
                "id": author.id,
                "username": author.username,
                "profile_picture": author.profile_picture
            },
            "comment_count": comment_count,
            "upvotes": upvotes,
            "downvotes": downvotes
        })
    
    return {
        "problems": results,
        "total": total_problems,
        "page": page,
        "limit": limit,
        "total_pages": (total_problems + limit - 1) // limit
    }

@router.get("/search/combined")
def combined_search(
    q: str,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Combined search for both users and problems"""
    if len(q.strip()) < 2:
        return {"users": [], "problems": [], "query": q}
    
    # Search users (limit to 5 per page)
    users = db.query(User).filter(
        User.username.ilike(f"%{q}%"),
        User.is_verified == True
    ).limit(5).all()
    
    user_results = []
    for user in users:
        follower_count = db.query(Follow).filter(Follow.following_id == user.id).count()
        is_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        ).first() is not None
        
        user_results.append({
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "profile_picture": user.profile_picture,
            "follower_count": follower_count,
            "is_following": is_following
        })
    
    # Search problems (limit to 5 per page)
    problems = db.query(Problem).filter(
        or_(
            Problem.title.ilike(f"%{q}%"),
            Problem.description.ilike(f"%{q}%"),
            Problem.tags.ilike(f"%{q}%")
        )
    ).limit(5).all()
    
    problem_results = []
    for problem in problems:
        author = db.query(User).filter(User.id == problem.author_id).first()
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        
        problem_results.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "subject": problem.subject,
            "level": problem.level,
            "tags": problem.tags,
            "created_at": problem.created_at.isoformat(),
            "author": {
                "id": author.id,
                "username": author.username,
                "profile_picture": author.profile_picture
            },
            "comment_count": comment_count
        })
    
    return {
        "users": user_results,
        "problems": problem_results,
        "query": q
    }

@router.get("/search/advanced")
async def advanced_search(
    q: str = "",
    category: str = "problems",
    subjects: str = "",
    level: str = "",
    year: int = None,
    tags: str = "",
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Advanced search with multiple filters - focuses on problems"""
    offset = (page - 1) * limit
    results = {"users": [], "problems": []}
    
    # Build problems query with filters
    problems_query = db.query(Problem)
    
    # Apply text search if provided
    if q:
        problems_query = problems_query.filter(
            or_(
                Problem.title.ilike(f"%{q}%"),
                Problem.description.ilike(f"%{q}%"),
                Problem.tags.ilike(f"%{q}%")
            )
        )
    
    # Apply problem-specific filters
    if subjects:
        subject_list = [s.strip() for s in subjects.split(",") if s.strip()]
        if subject_list:
            problems_query = problems_query.filter(Problem.subject.in_(subject_list))
    if level:
        problems_query = problems_query.filter(Problem.level.ilike(f"%{level}%"))
    if year:
        problems_query = problems_query.filter(Problem.year == year)
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        for tag in tag_list:
            problems_query = problems_query.filter(Problem.tags.ilike(f"%{tag}%"))
    
    # Execute problems query
    problems = problems_query.offset(offset).limit(limit).all()
    problem_results = []
    for problem in problems:
        author = db.query(User).filter(User.id == problem.author_id).first()
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        
        problem_results.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "subject": problem.subject,
            "level": problem.level,
            "year": problem.year,
            "tags": problem.tags,
            "created_at": problem.created_at.isoformat(),
            "author": {
                "id": author.id,
                "username": author.username,
                "profile_picture": author.profile_picture
            },
            "comment_count": comment_count
        })
    
    # Get total count
    total_problems = problems_query.count()
    
    
    return {
        "users": [],  # Advanced search focuses only on problems
        "problems": problem_results,
        "total_users": 0,
        "total_problems": total_problems,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_problems + limit - 1) // limit)
    }

@router.post("/send-verification")
async def send_verification_email(
    request: dict,
    db: Session = Depends(get_db)
):
    email = request.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    """Send verification email to user"""
    from email_service import email_service
    
    # Check if user exists and is not verified
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new verification code
    verification_code = email_service.generate_verification_code()
    verification_expires = email_service.get_verification_expiry()
    
    # Update user with verification code
    user.verification_code = verification_code
    user.verification_expires = verification_expires
    db.commit()
    
    # For now, just return the code for testing (remove this in production)
    
    # Send email
    success = await email_service.send_verification_email(
        email, user.username, verification_code
    )
    
    if not success:
        # For testing, return the code in the response
        return {
            "message": "Verification code generated (email sending failed)",
            "verification_code": verification_code,
            "note": "Check your backend console for the code"
        }
    
    return {"message": "Verification email sent successfully"}

@router.post("/verify-email")
def verify_email(
    request: dict,
    db: Session = Depends(get_db)
):
    email = request.get("email")
    verification_code = request.get("verification_code")
    
    
    if not email or not verification_code:
        raise HTTPException(status_code=400, detail="Email and verification code are required")
    
    """Verify user's email with verification code"""
    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already verified
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Check verification code
    if not user.verification_code or user.verification_code != verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code has expired
    if user.verification_expires and user.verification_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Verify user
    user.is_verified = True
    user.verification_code = None  # Clear the code
    user.verification_expires = None
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.get("/verification-status/{email}")
def get_verification_status(email: str, db: Session = Depends(get_db)):
    """Check if user's email is verified"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user.email,
        "is_verified": user.is_verified,
        "verification_expires": user.verification_expires.isoformat() if user.verification_expires else None
    }

@router.post("/delete-account-request")
async def delete_account_request(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send verification code for account deletion"""
    from email_service import email_service
    
    # Generate verification code for account deletion
    verification_code = email_service.generate_verification_code()
    verification_expires = email_service.get_verification_expiry()
    
    # Store the verification code in user record
    current_user.verification_code = verification_code
    current_user.verification_expires = verification_expires
    db.commit()
    
    # Send account deletion verification email
    success = await email_service.send_account_deletion_email(
        current_user.email, 
        current_user.username, 
        verification_code
    )
    
    if not success:
        return {
            "message": "Failed to send verification email. Please try again.",
            "debug_code": verification_code  # For testing
        }
    
    return {"message": "Verification code sent to your email address"}

@router.post("/delete-account")
def delete_account(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account after verification"""
    verification_code = request.get("verification_code")
    
    
    if not verification_code:
        raise HTTPException(status_code=400, detail="Verification code is required")
    
    # Check verification code
    if not current_user.verification_code or current_user.verification_code != verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code has expired
    if current_user.verification_expires and current_user.verification_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Instead of deleting the user, mark them as deleted
    # Store unique username in database but display as "[deleted user]" to users
    current_user.username = f"__deleted_user_{current_user.id}__"
    current_user.email = f"deleted_{current_user.id}@example.com"
    current_user.is_active = False
    current_user.verification_code = None
    current_user.verification_expires = None
    
    # Clear sensitive data but keep content
    current_user.bio = None
    current_user.profile_picture = None
    
    db.commit()
    
    return {"message": "Account successfully deleted"}

@router.post("/cleanup-expired-users")
def cleanup_expired_users(db: Session = Depends(get_db)):
    """Clean up unverified users older than 1 hour"""
    from datetime import datetime, timedelta
    
    cutoff_time = datetime.utcnow() - timedelta(hours=1)
    expired_users = db.query(User).filter(
        User.is_verified == False,
        User.created_at < cutoff_time
    ).all()
    
    count = len(expired_users)
    for user in expired_users:
        db.delete(user)
    
    db.commit()
    
    return {
        "message": f"Cleaned up {count} expired unverified users",
        "deleted_count": count
    }

@router.post("/problems/{problem_id}/images")
async def upload_problem_image(
    problem_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """Upload an image for a problem"""
    # Check if problem exists and user owns it
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if problem.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this problem")
    
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create uploads directory if it doesn't exist
    os.makedirs("../../uploads/problem_images", exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"../../uploads/problem_images/{unique_filename}"
    
    # Read and save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Resize image if too large (optional)
    try:
        with Image.open(file_path) as img:
            if img.width > 1920 or img.height > 1920:
                img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        pass  # Image processing failed, but continue
    
    # Store the image association in the database
    problem_image = ProblemImage(
        problem_id=problem_id,
        filename=unique_filename
    )
    db.add(problem_image)
    db.commit()
    
    return {
        "message": "Image uploaded successfully",
        "filename": unique_filename,
        "file_path": file_path
    }

@router.get("/serve-problem-image/{filename}")
async def serve_problem_image(filename: str):
    """Serve problem images"""
    file_path = f"../../uploads/problem_images/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)

@router.delete("/problems/{problem_id}/images/{filename}")
async def delete_problem_image(
    problem_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """Delete a problem image"""
    # Check if problem exists and user owns it
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if problem.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this problem")
    
    # Delete from database
    problem_image = db.query(ProblemImage).filter(
        ProblemImage.problem_id == problem_id,
        ProblemImage.filename == filename
    ).first()
    
    if not problem_image:
        raise HTTPException(status_code=404, detail="Image not found in database")
    
    db.delete(problem_image)
    db.commit()
    
    # Delete file
    file_path = f"../../uploads/problem_images/{filename}"
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": "Image deleted successfully"}
    else:
        return {"message": "Image deleted from database but file not found"}


@router.post("/problems/{problem_id}/view")
async def increment_view_count(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Increment view count for a problem"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Increment view count
    problem.view_count = (problem.view_count or 0) + 1
    db.commit()
    
    return {"message": "View count incremented", "view_count": problem.view_count}

# Notification endpoints
@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all notifications for the current user"""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications

@router.get("/notifications/unread-count")
def get_unread_notifications_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.put("/notifications/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"message": "All notifications marked as read"}

@router.get("/notification-preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notification preferences"""
    preferences = db.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences if they don't exist
        preferences = NotificationPreferences(
            user_id=current_user.id,
            email_likes=True,
            email_comments=True,
            email_follows=True,
            email_marketing=current_user.marketing_emails,
            in_app_likes=True,
            in_app_comments=True,
            in_app_follows=True
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences

@router.put("/notification-preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    preferences: NotificationPreferencesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's notification preferences"""
    db_preferences = db.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == current_user.id
    ).first()
    
    if not db_preferences:
        # Create new preferences
        db_preferences = NotificationPreferences(
            user_id=current_user.id,
            **preferences.dict()
        )
        db.add(db_preferences)
    else:
        # Update existing preferences
        for field, value in preferences.dict().items():
            setattr(db_preferences, field, value)
        db_preferences.updated_at = datetime.utcnow()
    
    # Also update marketing_emails in user table
    current_user.marketing_emails = preferences.email_marketing
    
    db.commit()
    db.refresh(db_preferences)
    
    return db_preferences

# Follow/Following endpoints
@router.get("/followers/{user_id}")
def get_followers(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users who follow the specified user"""
    # Get all users who follow this user
    followers = db.query(User).join(Follow, Follow.follower_id == User.id).filter(
        Follow.following_id == user_id,
        User.is_active == True
    ).all()
    
    return followers

@router.get("/following/{user_id}")
def get_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users that the specified user follows"""
    # Get all users that this user follows
    following = db.query(User).join(Follow, Follow.following_id == User.id).filter(
        Follow.follower_id == user_id,
        User.is_active == True
    ).all()
    
    return following

@router.get("/followers/count/{user_id}")
def get_followers_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get count of followers for a user"""
    count = db.query(Follow).filter(Follow.following_id == user_id).count()
    return {"followers_count": count}

@router.get("/following/count/{user_id}")
def get_following_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get count of users that a user follows"""
    count = db.query(Follow).filter(Follow.follower_id == user_id).count()
    return {"following_count": count}


# Forum Endpoints
@router.post("/forums", response_model=ForumSchema)
def create_forum(
    forum: ForumCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new forum"""
    # Validate tags (max 5 tags)
    tags_list = []
    if forum.tags:
        tags_list = [tag.strip() for tag in forum.tags.split(',') if tag.strip()]
        if len(tags_list) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 tags allowed")
    
    db_forum = Forum(
        title=forum.title,
        description=forum.description,
        creator_id=current_user.id,
        is_private=forum.is_private,
        max_members=forum.max_members,
        subject=forum.subject,
        level=forum.level,
        tags=forum.tags
    )
    db.add(db_forum)
    db.commit()
    db.refresh(db_forum)
    
    # Add creator as a member with 'creator' role
    membership = ForumMembership(
        forum_id=db_forum.id,
        user_id=current_user.id,
        role="creator"
    )
    db.add(membership)
    db.commit()
    
    return db_forum

@router.put("/forums/{forum_id}", response_model=ForumSchema)
def update_forum(
    forum_id: int,
    forum_update: ForumUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a forum (creator only)"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if user is the creator
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can update the forum")
    
    # Validate tags if provided
    if forum_update.tags:
        tags_list = [tag.strip() for tag in forum_update.tags.split(',') if tag.strip()]
        if len(tags_list) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 tags allowed")
    
    # Update only provided fields
    update_data = forum_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(forum, field, value)
    
    db.commit()
    db.refresh(forum)
    
    return forum

@router.get("/forums", response_model=List[ForumSchema])
def get_forums(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of forums (all public forums and all private forums for discovery)"""
    # Get all forums - public forums for everyone, private forums for discovery
    forums = db.query(Forum).offset(skip).limit(limit).all()
    
    # Add member count and membership status to each forum
    for forum in forums:
        member_count = db.query(ForumMembership).filter(
            ForumMembership.forum_id == forum.id,
            ForumMembership.is_active == True
        ).count()
        forum.member_count = member_count
        
        # Check if current user is a member of this forum
        user_membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == forum.id,
            ForumMembership.user_id == current_user.id,
            ForumMembership.is_active == True
        ).first()
        forum.is_member = user_membership is not None
        forum.user_role = user_membership.role if user_membership else None
        
        
        # Check if current user has a pending join request
        pending_request = db.query(ForumJoinRequest).filter(
            ForumJoinRequest.forum_id == forum.id,
            ForumJoinRequest.user_id == current_user.id,
            ForumJoinRequest.status == "pending"
        ).first()
        forum.has_pending_request = pending_request is not None
    
    return forums

@router.get("/forums/my-forums", response_model=List[ForumSchema])
def get_my_forums(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get forums where user is a member or creator"""
    # Get forums where user is creator
    created_forums = db.query(Forum).filter(Forum.creator_id == current_user.id).all()
    
    # Get forums where user is a member
    membership_forums = db.query(Forum).join(ForumMembership).filter(
        ForumMembership.user_id == current_user.id
    ).all()
    
    # Combine and remove duplicates
    all_forums = list(created_forums) + [f for f in membership_forums if f not in created_forums]
    
    return all_forums

@router.get("/forums/{forum_id}", response_model=ForumSchema)
def get_forum(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific forum"""
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user can access this forum
    if forum.is_private:
        membership = db.query(ForumMembership).filter(
            ForumMembership.forum_id == forum_id,
            ForumMembership.user_id == current_user.id,
            ForumMembership.is_active == True
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied to private forum")
    
    # Add member count
    member_count = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).count()
    forum.member_count = member_count
    
    return forum

@router.post("/forums/{forum_id}/join")
def join_forum(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a forum (public forums only)"""
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    if forum.is_private:
        raise HTTPException(status_code=403, detail="Cannot join private forum directly")
    
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user is already a member
    existing_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id
    ).first()
    
    if existing_membership:
        if existing_membership.is_active:
            raise HTTPException(status_code=400, detail="Already a member of this forum")
        else:
            # Reactivate membership
            existing_membership.is_active = True
            db.commit()
            return {"message": "Successfully joined forum"}
    
    # Check if forum is full
    member_count = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).count()
    
    if member_count >= forum.max_members:
        raise HTTPException(status_code=400, detail="Forum is full")
    
    # Add user as member
    membership = ForumMembership(
        forum_id=forum_id,
        user_id=current_user.id,
        role="member"
    )
    db.add(membership)
    db.commit()
    
    return {"message": "Successfully joined forum"}


@router.delete("/forums/{forum_id}/leave")
def leave_forum(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a forum"""
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Not a member of this forum")
    
    if membership.role == "creator":
        raise HTTPException(status_code=400, detail="Creator cannot leave forum")
    
    membership.is_active = False
    db.commit()
    
    return {"message": "Successfully left forum"}

@router.get("/forums/{forum_id}/members", response_model=List[ForumMembershipSchema])
def get_forum_members(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get members of a forum"""
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied")
    
    members = db.query(ForumMembership).options(
        selectinload(ForumMembership.user)
    ).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).all()
    
    
    return members

@router.post("/forums/{forum_id}/problems", response_model=ProblemResponse)
def create_forum_problem(
    forum_id: int,
    problem: ProblemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a problem in a forum"""
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to post problems")
    
    # Create problem with forum_id
    problem_data = problem.dict()
    problem_data['forum_id'] = forum_id
    problem_data['author_id'] = current_user.id
    
    
    db_problem = Problem(**problem_data)
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    
    
    # Update forum last activity
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    forum.last_activity = datetime.utcnow()
    db.commit()
    
    # Get comment count and author for proper serialization
    comment_count = db.query(Comment).filter(Comment.problem_id == db_problem.id).count()
    author = db.query(User).filter(User.id == db_problem.author_id).first()
    
    # Create proper response
    return {
        "id": db_problem.id,
        "title": db_problem.title,
        "description": db_problem.description,
        "subject": db_problem.subject,
        "level": db_problem.level,
        "year": db_problem.year,
        "tags": db_problem.tags,
        "created_at": db_problem.created_at,
        "author_id": db_problem.author_id,
        "forum_id": db_problem.forum_id,
        "comment_count": comment_count,
        "author": {
            "id": author.id,
            "username": author.username,
            "email": author.email,
            "profile_picture": author.profile_picture,
            "created_at": author.created_at
        } if author else None
    }

@router.get("/forums/{forum_id}/problems", response_model=List[ProblemResponse])
def get_forum_problems(
    forum_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get problems from a forum"""
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to view problems")
    
    problems = db.query(Problem).filter(
        Problem.forum_id == forum_id
    ).order_by(Problem.created_at.desc()).offset(skip).limit(limit).all()
    
    
    # Serialize problems with comment counts and authors
    result = []
    for problem in problems:
        comment_count = db.query(Comment).filter(Comment.problem_id == problem.id).count()
        author = db.query(User).filter(User.id == problem.author_id).first()
        
        result.append({
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "subject": problem.subject,
            "level": problem.level,
            "year": problem.year,
            "tags": problem.tags,
            "created_at": problem.created_at,
            "author_id": problem.author_id,
            "forum_id": problem.forum_id,
            "comment_count": comment_count,
            "author": {
                "id": author.id,
                "username": author.username,
                "email": author.email,
                "profile_picture": author.profile_picture,
                "created_at": author.created_at
            } if author else None
        })
    
    return result

# Forum Message Endpoints
@router.post("/forums/{forum_id}/messages", response_model=ForumMessageSchema)
def send_message(
    forum_id: int,
    message: ForumMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a forum"""
    
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to send messages")
    
    db_message = ForumMessage(
        forum_id=forum_id,
        author_id=current_user.id,
        content=message.content,
        message_type=message.message_type,
        problem_id=message.problem_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Update forum last activity
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    forum.last_activity = datetime.utcnow()
    db.commit()
    
    return db_message

@router.get("/forums/{forum_id}/messages", response_model=List[ForumMessageSchema])
def get_messages(
    forum_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from a forum"""
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to view messages")
    
    messages = db.query(ForumMessage).options(
        selectinload(ForumMessage.author)
    ).filter(
        ForumMessage.forum_id == forum_id
    ).order_by(ForumMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    
    return messages

@router.put("/forums/{forum_id}/messages/{message_id}")
def edit_message(
    forum_id: int,
    message_id: int,
    new_content: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a message"""
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to edit messages")
    
    message = db.query(ForumMessage).filter(
        ForumMessage.id == message_id,
        ForumMessage.forum_id == forum_id,
        ForumMessage.author_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.content = new_content
    message.is_edited = True
    message.edited_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Message updated successfully"}

@router.delete("/forums/{forum_id}/messages/{message_id}")
def delete_message(
    forum_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message"""
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to delete messages")
    
    message = db.query(ForumMessage).filter(
        ForumMessage.id == message_id,
        ForumMessage.forum_id == forum_id,
        ForumMessage.author_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}

# Forum Invitation Endpoints
@router.post("/forums/{forum_id}/invite", response_model=ForumInvitationSchema)
def invite_user_to_forum(
    forum_id: int,
    invitation: ForumInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a user to a forum (creator only)"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if current user is the creator
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can send invitations")
    
    # Check if invitee exists
    invitee = db.query(User).filter(User.id == invitation.invitee_id).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == invitation.invitee_id,
        ForumMembership.is_active == True
    ).first()
    
    if existing_membership:
        raise HTTPException(status_code=400, detail="User is already a member of this forum")
    
    # Check if invitation already exists and is pending
    existing_invitation = db.query(ForumInvitation).filter(
        ForumInvitation.forum_id == forum_id,
        ForumInvitation.invitee_id == invitation.invitee_id,
        ForumInvitation.status == "pending"
    ).first()
    
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Invitation already sent to this user")
    
    # Create invitation
    db_invitation = ForumInvitation(
        forum_id=forum_id,
        inviter_id=current_user.id,
        invitee_id=invitation.invitee_id,
        status="pending"
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    
    # Send notification to invitee
    notification_service = NotificationService(db)
    notification_service.send_forum_invitation_notification(
        user_id=invitation.invitee_id,
        inviter_username=current_user.username,
        forum_title=forum.title,
        forum_id=forum.id,
        invitation_id=db_invitation.id
    )
    
    return db_invitation

@router.get("/forums/{forum_id}/invitations", response_model=List[ForumInvitationSchema])
def get_forum_invitations(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all invitations for a forum (creator only)"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if current user is the creator
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can view invitations")
    
    invitations = db.query(ForumInvitation).options(
        selectinload(ForumInvitation.invitee)
    ).filter(ForumInvitation.forum_id == forum_id).all()
    
    return invitations

@router.post("/forums/{forum_id}/invitations/{invitation_id}/accept")
def accept_forum_invitation(
    forum_id: int,
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a forum invitation"""
    # Check if invitation exists and belongs to current user
    invitation = db.query(ForumInvitation).filter(
        ForumInvitation.id == invitation_id,
        ForumInvitation.forum_id == forum_id,
        ForumInvitation.invitee_id == current_user.id,
        ForumInvitation.status == "pending"
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")
    
    # Check if forum is full
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    member_count = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).count()
    
    if member_count >= forum.max_members:
        raise HTTPException(status_code=400, detail="Forum is full")
    
    # Add user as member
    membership = ForumMembership(
        forum_id=forum_id,
        user_id=current_user.id,
        role="member"
    )
    db.add(membership)
    
    # Update invitation status
    invitation.status = "accepted"
    invitation.responded_at = datetime.utcnow()
    
    db.commit()
    
    # Send notification to inviter
    notification_service = NotificationService(db)
    notification_service.send_forum_invitation_accepted_notification(
        user_id=invitation.inviter_id,
        invitee_username=current_user.username,
        forum_title=forum.title
    )
    
    return {"message": "Successfully joined the forum"}

@router.post("/forums/{forum_id}/invitations/{invitation_id}/decline")
def decline_forum_invitation(
    forum_id: int,
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a forum invitation"""
    # Check if invitation exists and belongs to current user
    invitation = db.query(ForumInvitation).filter(
        ForumInvitation.id == invitation_id,
        ForumInvitation.forum_id == forum_id,
        ForumInvitation.invitee_id == current_user.id,
        ForumInvitation.status == "pending"
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")
    
    # Update invitation status
    invitation.status = "declined"
    invitation.responded_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Invitation declined"}

# Forum Join Request Endpoints
@router.post("/forums/{forum_id}/request-join", response_model=ForumJoinRequestSchema)
def request_to_join_forum(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request to join a private forum"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    if not forum.is_private:
        raise HTTPException(status_code=400, detail="Forum is public, use join endpoint")
    
    # Check if user is banned from this forum
    banned_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_banned == True
    ).first()
    
    if banned_membership:
        raise HTTPException(status_code=403, detail="You are banned from this forum")
    
    # Check if user is already a member
    existing_membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if existing_membership:
        raise HTTPException(status_code=400, detail="Already a member of this forum")
    
    # Check if request already exists and is pending
    existing_request = db.query(ForumJoinRequest).filter(
        ForumJoinRequest.forum_id == forum_id,
        ForumJoinRequest.user_id == current_user.id,
        ForumJoinRequest.status == "pending"
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Join request already sent")
    
    # Create join request
    db_request = ForumJoinRequest(
        forum_id=forum_id,
        user_id=current_user.id,
        status="pending"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Send notification to forum creator
    notification_service = NotificationService(db)
    notification_service.send_forum_join_request_notification(
        user_id=forum.creator_id,
        requester_username=current_user.username,
        forum_title=forum.title,
        forum_id=forum.id,
        request_id=db_request.id
    )
    
    return db_request

@router.delete("/forums/{forum_id}/retract-request")
def retract_join_request(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retract a pending join request for a private forum"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Find the pending request
    existing_request = db.query(ForumJoinRequest).filter(
        ForumJoinRequest.forum_id == forum_id,
        ForumJoinRequest.user_id == current_user.id,
        ForumJoinRequest.status == "pending"
    ).first()
    
    if not existing_request:
        raise HTTPException(status_code=404, detail="No pending request found")
    
    # Delete the request
    db.delete(existing_request)
    
    # Delete the notification for the forum creator
    # Since we're deleting the request, we can safely delete all join request notifications
    # for this forum creator (they should only have one per forum anyway)
    db.query(Notification).filter(
        Notification.user_id == forum.creator_id,
        Notification.type == "forum_join_request"
    ).delete()
    
    db.commit()
    
    return {"message": "Join request retracted successfully"}

@router.get("/forums/{forum_id}/join-requests", response_model=List[ForumJoinRequestSchema])
def get_forum_join_requests(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all join requests for a forum (creator only)"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if current user is the creator
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can view join requests")
    
    requests = db.query(ForumJoinRequest).options(
        selectinload(ForumJoinRequest.user)
    ).filter(ForumJoinRequest.forum_id == forum_id).all()
    
    return requests

@router.post("/forums/{forum_id}/join-requests/{request_id}/accept")
def accept_join_request(
    forum_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a join request (creator only)"""
    # Check if forum exists and user is creator
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can accept requests")
    
    # Check if request exists
    request = db.query(ForumJoinRequest).filter(
        ForumJoinRequest.id == request_id,
        ForumJoinRequest.forum_id == forum_id,
        ForumJoinRequest.status == "pending"
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Join request not found or already processed")
    
    # Check if forum is full
    member_count = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).count()
    
    if member_count >= forum.max_members:
        raise HTTPException(status_code=400, detail="Forum is full")
    
    # Add user as member
    membership = ForumMembership(
        forum_id=forum_id,
        user_id=request.user_id,
        role="member"
    )
    db.add(membership)
    
    # Update request status
    request.status = "accepted"
    request.responded_at = datetime.utcnow()
    
    db.commit()
    
    # Send notification to requester
    notification_service = NotificationService(db)
    notification_service.send_forum_join_request_accepted_notification(
        user_id=request.user_id,
        forum_title=forum.title
    )
    
    return {"message": "Join request accepted"}

@router.post("/forums/{forum_id}/join-requests/{request_id}/decline")
def decline_join_request(
    forum_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a join request (creator only)"""
    # Check if forum exists and user is creator
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can decline requests")
    
    # Check if request exists
    request = db.query(ForumJoinRequest).filter(
        ForumJoinRequest.id == request_id,
        ForumJoinRequest.forum_id == forum_id,
        ForumJoinRequest.status == "pending"
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Join request not found or already processed")
    
    # Update request status
    request.status = "declined"
    request.responded_at = datetime.utcnow()
    
    db.commit()
    
    # Send notification to requester
    notification_service = NotificationService(db)
    notification_service.send_forum_join_request_declined_notification(
        user_id=request.user_id,
        forum_title=forum.title
    )
    
    return {"message": "Join request declined"}

@router.get("/forums/{forum_id}/invite-users")
def get_users_for_invitation(
    forum_id: int,
    search: str = "",
    tab: str = "all",  # "all", "following", "followers"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users that can be invited to a forum"""
    # Check if forum exists and user is creator
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can invite users")
    
    # Get existing members to exclude them
    existing_members = db.query(ForumMembership.user_id).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).all()
    existing_member_ids = [member[0] for member in existing_members]
    
    # Get existing invitations to exclude them
    existing_invitations = db.query(ForumInvitation.invitee_id).filter(
        ForumInvitation.forum_id == forum_id,
        ForumInvitation.status == "pending"
    ).all()
    existing_invitation_ids = [invitation[0] for invitation in existing_invitations]
    
    # Build query based on tab
    query = db.query(User).filter(
        User.id != current_user.id,  # Don't include self
        User.is_active == True,
        User.is_verified == True,
        ~User.id.in_(existing_member_ids)  # Only exclude existing members, not pending invitations
    )
    
    if tab == "following":
        # Only users that current user follows
        following_ids = db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
        following_ids = [f[0] for f in following_ids]
        query = query.filter(User.id.in_(following_ids))
    elif tab == "followers":
        # Only users that follow current user
        follower_ids = db.query(Follow.follower_id).filter(Follow.following_id == current_user.id).all()
        follower_ids = [f[0] for f in follower_ids]
        query = query.filter(User.id.in_(follower_ids))
    # "all" tab includes all users
    
    # Apply search filter
    if search:
        query = query.filter(User.username.ilike(f"%{search}%"))
    
    # Limit to 5 results
    users = query.limit(5).all()
    
    # Format response
    results = []
    for user in users:
        # Check if user is already a member
        is_member = user.id in existing_member_ids
        
        # Check if user has pending invitation
        has_pending_invitation = user.id in existing_invitation_ids
        
        results.append({
            "id": user.id,
            "username": user.username,
            "profile_picture": user.profile_picture,
            "bio": user.bio,
            "is_member": is_member,
            "has_pending_invitation": has_pending_invitation
        })
    
    return {"users": results}

@router.delete("/forums/{forum_id}")
def delete_forum(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a forum (creator only)"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if user is the creator
    if forum.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the forum creator can delete the forum")
    
    # Get all forum members for notifications
    members = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.is_active == True
    ).all()
    
    # Move ALL problems from this forum to drafts for their respective authors
    forum_problems = db.query(Problem).filter(
        Problem.forum_id == forum_id
    ).all()
    
    # First, delete all forum messages that reference these problems
    problem_ids = [problem.id for problem in forum_problems]
    if problem_ids:
        db.query(ForumMessage).filter(ForumMessage.problem_id.in_(problem_ids)).delete()
    
    for problem in forum_problems:
        # Create draft from problem for the problem's author
        draft = Draft(
            title=problem.title,
            description=problem.description,
            subject=problem.subject,
            level=problem.level,
            year=problem.year,
            tags=problem.tags,
            author_id=problem.author_id
        )
        db.add(draft)
        
        # Delete the original problem
        db.delete(problem)
    
    # Commit the draft creations before deleting the forum
    db.commit()
    
    # Send notifications to all members
    notification_service = NotificationService(db)
    for member in members:
        if member.user_id != current_user.id:  # Don't notify the creator
            notification = notification_service.send_forum_deleted_notification(
                user_id=member.user_id,
                forum_title=forum.title,
                creator_username=current_user.username
            )
            if notification:
                pass  # Notification was sent successfully
    
    # Explicitly delete related records to avoid foreign key constraint issues
    # Delete forum invitations
    db.query(ForumInvitation).filter(ForumInvitation.forum_id == forum_id).delete()
    
    # Delete forum join requests
    db.query(ForumJoinRequest).filter(ForumJoinRequest.forum_id == forum_id).delete()
    
    # Delete forum messages
    db.query(ForumMessage).filter(ForumMessage.forum_id == forum_id).delete()
    
    # Delete forum memberships
    db.query(ForumMembership).filter(ForumMembership.forum_id == forum_id).delete()
    
    # Finally delete the forum
    db.delete(forum)
    db.commit()
    
    return {"message": "Forum deleted successfully"}


# ==================== DRAFT ENDPOINTS ====================

@router.post("/drafts", response_model=DraftResponse)
def create_draft(
    draft: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new draft"""
    db_draft = Draft(
        title=draft.title,
        description=draft.description,
        subject=draft.subject,
        level=draft.level,
        year=draft.year,
        tags=draft.tags,
        author_id=current_user.id
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)
    
    return db_draft

@router.get("/drafts", response_model=List[DraftResponse])
def get_user_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all drafts for the current user"""
    drafts = db.query(Draft).filter(Draft.author_id == current_user.id).order_by(Draft.updated_at.desc()).all()
    return drafts

@router.get("/drafts/{draft_id}", response_model=DraftResponse)
def get_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific draft by ID"""
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.author_id == current_user.id
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return draft

@router.put("/drafts/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: int,
    draft_update: DraftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing draft"""
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.author_id == current_user.id
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Update only provided fields
    update_data = draft_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)
    
    draft.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(draft)
    
    return draft

@router.delete("/drafts/{draft_id}")
def delete_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a draft"""
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.author_id == current_user.id
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db.delete(draft)
    db.commit()
    
    return {"message": "Draft deleted successfully"}

@router.post("/drafts/{draft_id}/publish", response_model=ProblemResponse)
def publish_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a draft as a new problem"""
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.author_id == current_user.id
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Create new problem from draft
    problem_data = {
        "title": draft.title,
        "description": draft.description,
        "subject": draft.subject,
        "level": draft.level,
        "year": draft.year,
        "tags": draft.tags,
        "author_id": current_user.id
    }
    
    db_problem = Problem(**problem_data)
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    
    # Delete the draft after publishing
    db.delete(draft)
    db.commit()
    
    # Get comment count and author for response
    comment_count = db.query(Comment).filter(Comment.problem_id == db_problem.id).count()
    author = db.query(User).filter(User.id == db_problem.author_id).first()
    
    return {
        "id": db_problem.id,
        "title": db_problem.title,
        "description": db_problem.description,
        "subject": db_problem.subject,
        "level": db_problem.level,
        "year": db_problem.year,
        "tags": db_problem.tags,
        "created_at": db_problem.created_at,
        "author_id": db_problem.author_id,
        "forum_id": db_problem.forum_id,
        "comment_count": comment_count,
        "author": {
            "id": author.id,
            "username": author.username,
            "email": author.email,
            "profile_picture": author.profile_picture,
            "created_at": author.created_at
        } if author else None
    }



# Password Change Endpoints
@router.post("/verify-password")
def verify_user_password(
    request: PasswordVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user's current password"""
    try:
        # Verify old password
        if not verify_password(request.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect password")
        
        return {"message": "Password verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to verify password")

@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password after verifying old password"""
    try:
        # Verify old password
        if not verify_password(request.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect old password")
        
        # Hash new password
        new_hashed_password = hash_password(request.new_password)
        
        # Update password in database
        current_user.password_hash = new_hashed_password
        db.commit()
        
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to change password")

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            # Don't reveal if email exists or not for security
            return {"message": "If the email exists, a password reset link has been sent"}
        
        # Generate reset token (simple UUID for now)
        import uuid
        reset_token = str(uuid.uuid4())
        
        # Store token in database
        user.reset_token = reset_token
        db.commit()
        
        # TODO: Send email with reset link
        # For now, just return the token (in production, send via email)
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
        
        return {
            "message": "Password reset link sent to your email",
            "reset_link": reset_link  # Remove this in production
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to send reset email")

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token from email"""
    try:
        # Find user with reset token
        user = db.query(User).filter(User.reset_token == request.token).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Hash new password
        new_hashed_password = hash_password(request.new_password)
        
        # Update password and clear reset token
        user.password_hash = new_hashed_password
        user.reset_token = None
        db.commit()
        
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to reset password")

# Online Status Endpoints
@router.post("/forums/{forum_id}/online")
def mark_user_online(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark user as online in a forum"""
    # Check if forum exists
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this forum")
    
    # Update or create online status
    online_status = db.query(UserOnlineStatus).filter(
        UserOnlineStatus.user_id == current_user.id,
        UserOnlineStatus.forum_id == forum_id
    ).first()
    
    if online_status:
        online_status.last_heartbeat = datetime.utcnow()
        online_status.is_online = True
    else:
        online_status = UserOnlineStatus(
            user_id=current_user.id,
            forum_id=forum_id,
            last_heartbeat=datetime.utcnow(),
            is_online=True
        )
        db.add(online_status)
    
    db.commit()
    
    return {"message": "Marked as online"}

@router.delete("/forums/{forum_id}/online")
def mark_user_offline(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark user as offline in a forum"""
    online_status = db.query(UserOnlineStatus).filter(
        UserOnlineStatus.user_id == current_user.id,
        UserOnlineStatus.forum_id == forum_id
    ).first()
    
    if online_status:
        online_status.is_online = False
        db.commit()
    
    return {"message": "Marked as offline"}

@router.get("/forums/{forum_id}/online-count")
def get_online_count(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of online users in a forum"""
    # Check if user is a member
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id,
        ForumMembership.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this forum")
    
    # Production-ready cleanup and counting
    cutoff_time = datetime.utcnow() - timedelta(minutes=1)  # 1 minute for testing
    
    # Clean up old online statuses (mark as offline if no heartbeat in 1 minute)
    old_online_users = db.query(UserOnlineStatus).filter(
        UserOnlineStatus.forum_id == forum_id,
        UserOnlineStatus.is_online == True,
        UserOnlineStatus.last_heartbeat <= cutoff_time
    ).all()
    
    if old_online_users:
        for user_status in old_online_users:
            user_status.is_online = False
    
    # Count online users (active within last 1 minute)
    online_count = db.query(UserOnlineStatus).filter(
        UserOnlineStatus.forum_id == forum_id,
        UserOnlineStatus.is_online == True,
        UserOnlineStatus.last_heartbeat > cutoff_time
    ).count()
    
    db.commit()
    
    return {"online_count": online_count}

@router.post("/forums/{forum_id}/typing")
def set_typing_status(
    forum_id: int,
    is_typing: bool = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set user's typing status in a forum"""
    # Check if user is a member of the forum
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this forum")
    
    # Update or create typing status
    typing_status = db.query(UserOnlineStatus).filter(
        UserOnlineStatus.user_id == current_user.id,
        UserOnlineStatus.forum_id == forum_id
    ).first()
    
    if typing_status:
        typing_status.is_typing = is_typing
        if is_typing:
            typing_status.last_typing = datetime.utcnow()
    else:
        typing_status = UserOnlineStatus(
            user_id=current_user.id,
            forum_id=forum_id,
            is_typing=is_typing,
            last_typing=datetime.utcnow() if is_typing else None
        )
        db.add(typing_status)
    
    db.commit()
    
    return {"message": "Typing status updated"}

@router.get("/forums/{forum_id}/typing")
def get_typing_users(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users currently typing in a forum"""
    # Check if user is a member of the forum
    membership = db.query(ForumMembership).filter(
        ForumMembership.forum_id == forum_id,
        ForumMembership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this forum")
    
    # Get users typing within last 5 seconds
    cutoff_time = datetime.utcnow() - timedelta(seconds=5)
    typing_users = db.query(UserOnlineStatus, User).join(
        User, UserOnlineStatus.user_id == User.id
    ).filter(
        UserOnlineStatus.forum_id == forum_id,
        UserOnlineStatus.is_typing == True,
        UserOnlineStatus.last_typing > cutoff_time,
        UserOnlineStatus.user_id != current_user.id  # Exclude current user
    ).all()
    
    typing_users_data = []
    for status, user in typing_users:
        typing_users_data.append({
            "user_id": user.id,
            "username": user.username
        })
    
    return {"typing_users": typing_users_data}


@router.post("/forums/{forum_id}/messages/{message_id}/pin")
async def pin_message(
    forum_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pin a message in the forum (only forum creator can pin)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user has permission to pin messages
        if not check_forum_permission(db, forum_id, current_user.id, 'pin'):
            raise HTTPException(status_code=403, detail="You don't have permission to pin messages")
        
        # Get the message
        message = db.query(ForumMessage).filter(
            ForumMessage.id == message_id,
            ForumMessage.forum_id == forum_id
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Unpin any currently pinned message
        db.query(ForumMessage).filter(
            ForumMessage.forum_id == forum_id,
            ForumMessage.is_pinned == True
        ).update({"is_pinned": False})
        
        # Pin the new message
        message.is_pinned = True
        db.commit()
        
        return {"message": "Message pinned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/forums/{forum_id}/messages/unpin")
async def unpin_message(
    forum_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unpin the currently pinned message (only forum creator can unpin)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user has permission to unpin messages
        if not check_forum_permission(db, forum_id, current_user.id, 'pin'):
            raise HTTPException(status_code=403, detail="You don't have permission to unpin messages")
        
        # Unpin the currently pinned message
        result = db.query(ForumMessage).filter(
            ForumMessage.forum_id == forum_id,
            ForumMessage.is_pinned == True
        ).update({"is_pinned": False})
        
        if result == 0:
            raise HTTPException(status_code=404, detail="No pinned message found")
        
        db.commit()
        
        return {"message": "Message unpinned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/forums/{forum_id}/messages/{message_id}")
async def delete_message(
    forum_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a message (only forum creator can delete)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user has permission to delete messages
        if not check_forum_permission(db, forum_id, current_user.id, 'moderate'):
            raise HTTPException(status_code=403, detail="You don't have permission to delete messages")
        
        # Get the message
        message = db.query(ForumMessage).filter(
            ForumMessage.id == message_id,
            ForumMessage.forum_id == forum_id
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Delete the message
        db.delete(message)
        db.commit()
        
        return {"message": "Message deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/forums/{forum_id}/members/{member_id}")
async def kick_member(
    forum_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kick a member from the forum (only forum creator can kick)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user has permission to kick members
        if not check_forum_permission(db, forum_id, current_user.id, 'kick'):
            raise HTTPException(status_code=403, detail="You don't have permission to kick members")
        
        # Get the membership
        membership = db.query(ForumMembership).filter(
            ForumMembership.id == member_id,
            ForumMembership.forum_id == forum_id
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Can't kick the creator
        if membership.user_id == forum.creator_id:
            raise HTTPException(status_code=403, detail="Cannot kick the forum creator")
        
        # Remove the membership
        db.delete(membership)
        db.commit()
        
        return {"message": "Member kicked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forums/{forum_id}/members/{member_id}/ban")
async def ban_member(
    forum_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ban a member from the forum (only forum creator can ban)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        if forum.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only forum creator can ban members")
        
        # Get the membership
        membership = db.query(ForumMembership).filter(
            ForumMembership.id == member_id,
            ForumMembership.forum_id == forum_id
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Can't ban the creator
        if membership.user_id == forum.creator_id:
            raise HTTPException(status_code=403, detail="Cannot ban the forum creator")
        
        # Mark as banned
        membership.is_banned = True
        membership.is_active = False
        db.commit()
        
        return {"message": "Member banned successfully"}
    except HTTPException:
        raise

@router.get("/forums/{forum_id}/banned-members")
async def get_banned_members(
    forum_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all banned members of a forum (creator only)"""
    try:
        # Get forum
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user is the creator
        if forum.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the forum creator can view banned members")
        
        # Get banned members with user details
        banned_memberships = db.query(ForumMembership).options(
            selectinload(ForumMembership.user)
        ).filter(
            ForumMembership.forum_id == forum_id,
            ForumMembership.is_banned == True
        ).all()
        
        return banned_memberships
    except HTTPException:
        raise

@router.post("/forums/{forum_id}/members/{member_id}/unban")
async def unban_member(
    forum_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unban a member from a forum (creator only)"""
    try:
        # Get forum
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user is the creator
        if forum.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the forum creator can unban members")
        
        # Get membership
        membership = db.query(ForumMembership).filter(
            ForumMembership.id == member_id,
            ForumMembership.forum_id == forum_id
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Membership not found")
        
        if not membership.is_banned:
            raise HTTPException(status_code=400, detail="Member is not banned")
        
        # Unban the member
        membership.is_banned = False
        membership.is_active = True
        db.commit()
        
        return {"message": "Member unbanned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forums/{forum_id}/members/{member_id}/assign-role")
async def assign_member_role(
    forum_id: int,
    member_id: int,
    role_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a role to a forum member (creator only)"""
    try:
        # Get forum
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        # Check if user is the creator
        if forum.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the forum creator can assign roles")
        
        # Get membership
        membership = db.query(ForumMembership).filter(
            ForumMembership.id == member_id,
            ForumMembership.forum_id == forum_id
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Membership not found")
        
        # Can't change creator's role
        if membership.user_id == forum.creator_id:
            raise HTTPException(status_code=403, detail="Cannot change creator's role")
        
        # Validate role
        valid_roles = ['member', 'moderator', 'helper']
        new_role = role_data.get('role')
        if new_role not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Update role
        membership.role = new_role
        db.commit()
        
        return {"message": f"Role updated to {new_role}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/forums/{forum_id}")
async def update_forum(
    forum_id: int,
    forum_data: ForumUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update forum settings (only forum creator can update)"""
    try:
        # Check if user is the forum creator
        forum = db.query(Forum).filter(Forum.id == forum_id).first()
        if not forum:
            raise HTTPException(status_code=404, detail="Forum not found")
        
        if forum.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only forum creator can update forum")
        
        # Update forum fields
        if forum_data.name is not None:
            forum.name = forum_data.name
        if forum_data.description is not None:
            forum.description = forum_data.description
        if forum_data.is_private is not None:
            forum.is_private = forum_data.is_private
        
        db.commit()
        
        return {"message": "Forum updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
