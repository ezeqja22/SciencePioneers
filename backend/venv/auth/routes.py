from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from database import get_db
from models import User, Problem, Comment, Vote, Bookmark, Follow, ProblemImage
from auth.utils import hash_password, verify_password, create_jwt
from auth.dependencies import get_current_user, get_verified_user
from auth.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut, UserUpdate
from auth.schemas import ProblemCreate, ProblemResponse, CommentCreate, CommentResponse, VoteCreate, VoteResponse, VoteStatusResponse, BookmarkResponse
from typing import List
from datetime import datetime
from fastapi import UploadFile, File
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
    trending_query = db.query(
        Problem,
        (
            func.coalesce(func.count(Comment.id), 0) * 2 +
            func.coalesce(func.count(Vote.id), 0) * 1 +
            func.coalesce(Problem.view_count, 0) * 0.3 +
            func.coalesce(func.count(Bookmark.id), 0) * 1.5
        ).label('engagement_score')
    ).outerjoin(Comment, Comment.problem_id == Problem.id).outerjoin(
        Vote, Vote.problem_id == Problem.id
    ).outerjoin(
        Bookmark, Bookmark.problem_id == Problem.id
    ).group_by(Problem.id).order_by(desc('engagement_score'))
    
    # Apply pagination
    offset = (page - 1) * limit
    trending_problems = trending_query.offset(offset).limit(limit).all()
    
    # If no problems with engagement, fall back to recent problems
    if not trending_problems:
        fallback_query = db.query(Problem).order_by(desc(Problem.created_at)).offset(offset).limit(limit)
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
        if existing_user.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # User exists but not verified - delete the old record and create new one
            db.delete(existing_user)
            db.commit()
    
    # Check if username is already taken
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate verification code first
    from email_service import email_service
    verification_code = email_service.generate_verification_code()
    verification_expires = email_service.get_verification_expiry()
    
    # Debug prints
    print(f"DEBUG: Generated verification code: {verification_code}")
    print(f"DEBUG: Verification expires at: {verification_expires}")
    print(f"DEBUG: Creating user for email: {req.email}")
    
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
        verification_expires=verification_expires
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Debug: Verify the user was created with the correct verification code
    print(f"DEBUG: User created with ID: {user.id}")
    print(f"DEBUG: User verification_code in DB: {user.verification_code}")
    print(f"DEBUG: User verification_expires in DB: {user.verification_expires}")
    
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
    # Debug: Check if line breaks are preserved in the received data
    print(f"Received description: {repr(problem.description)}")
    print(f"Description length: {len(problem.description)}")
    
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

@router.get("/debug/test")
def debug_test():
    return {"message": "Backend is working", "timestamp": "now"}

@router.get("/problems/")
def get_problems(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get problems with pagination"""
    offset = (page - 1) * limit
    
    # Get total count for pagination
    total_problems = db.query(Problem).count()
    
    # Get problems with pagination
    problems = db.query(Problem).order_by(Problem.created_at.desc()).offset(offset).limit(limit).all()
    
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


@router.get("/debug/subjects")
def get_all_subjects(db: Session = Depends(get_db)):
    """Debug endpoint to see what subjects exist in the database"""
    subjects = db.query(Problem.subject).distinct().all()
    return {"subjects": [s[0] for s in subjects]}

@router.get("/debug/mathematics-problems")
def get_mathematics_problems_debug(db: Session = Depends(get_db)):
    """Debug endpoint to see Mathematics problems with all details"""
    problems = db.query(Problem).filter(func.lower(Problem.subject) == 'mathematics').all()
    result = []
    for p in problems:
        author = db.query(User).filter(User.id == p.author_id).first()
        result.append({
            "id": p.id,
            "title": p.title,
            "subject": p.subject,
            "author_id": p.author_id,
            "author": author.username if author else "No author found",
            "created_at": str(p.created_at)
        })
    return {"problems": result}

@router.get("/problems/{subject}", response_model=List[ProblemResponse])
def get_problems_by_subject(subject: str, db: Session = Depends(get_db)):
    print(f"DEBUG: Searching for problems with subject: '{subject}'")
    
    # First get problems with comment counts (case-insensitive search)
    problems_with_counts = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(func.lower(Problem.subject) == func.lower(subject)).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    
    print(f"DEBUG: Found {len(problems_with_counts)} problems")
    
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
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import func
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem, comment_count = result
    
    # Debug: Check what's in the database
    print(f"Database description: {repr(problem.description)}")
    print(f"Database description length: {len(problem.description)}")
    
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
        problem_id=problem_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Fetch the comment with author relationship
    db_comment = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.id == db_comment.id).first()
    return db_comment

@router.get("/problems/{problem_id}/comments", response_model=List[CommentResponse])
def get_comments(problem_id: int, db: Session = Depends(get_db)):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    comments = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.problem_id == problem_id).order_by(Comment.created_at.desc()).all()
    return comments


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


@router.get("/serve-image/{filename}")
def serve_image(filename: str):
    """Direct image serving endpoint for testing"""
    from fastapi.responses import FileResponse
    import os
    
    # Correct path: go up two levels from backend/venv/ to reach uploads/
    file_path = f"../../uploads/profile_pictures/{filename}"
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return {"error": "File not found", "path": file_path}

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
    subject: str = "",
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
    if subject:
        problems_query = problems_query.filter(Problem.subject == subject)
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
    
    # Debug prints
    print(f"DEBUG: Received verification request for email: {email}")
    print(f"DEBUG: Received verification code: {verification_code}")
    print(f"DEBUG: Request data: {request}")
    
    if not email or not verification_code:
        raise HTTPException(status_code=400, detail="Email and verification code are required")
    
    """Verify user's email with verification code"""
    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"DEBUG: User not found for email: {email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"DEBUG: Found user: {user.username}")
    print(f"DEBUG: User's stored verification code: {user.verification_code}")
    print(f"DEBUG: User is_verified: {user.is_verified}")
    print(f"DEBUG: User verification_expires: {user.verification_expires}")
    
    # Check if already verified
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Check verification code
    if not user.verification_code or user.verification_code != verification_code:
        print(f"DEBUG: Verification code mismatch!")
        print(f"DEBUG: Expected: {user.verification_code}")
        print(f"DEBUG: Received: {verification_code}")
        print(f"DEBUG: Codes match: {user.verification_code == verification_code}")
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code has expired
    if user.verification_expires and user.verification_expires < datetime.utcnow():
        print(f"DEBUG: Verification code has expired!")
        print(f"DEBUG: Current time: {datetime.utcnow()}")
        print(f"DEBUG: Expiry time: {user.verification_expires}")
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Verify user
    user.is_verified = True
    user.verification_code = None  # Clear the code
    user.verification_expires = None
    db.commit()
    
    print(f"DEBUG: Email verification successful for {email}")
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

@router.get("/problems/{problem_id}/images")
async def get_problem_images(
    problem_id: int,
    db: Session = Depends(get_db)
):
    """Get all images for a problem"""
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get images from database
    problem_images = db.query(ProblemImage).filter(ProblemImage.problem_id == problem_id).all()
    image_filenames = [img.filename for img in problem_images]
    
    return {"images": image_filenames}

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


