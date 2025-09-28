from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import User, Problem, Comment, Vote, Bookmark
from auth.utils import hash_password, verify_password, create_jwt
from auth.dependencies import get_current_user
from auth.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from auth.schemas import ProblemCreate, ProblemResponse, CommentCreate, CommentResponse, VoteCreate, VoteResponse, VoteStatusResponse, BookmarkResponse
from typing import List
from datetime import datetime
router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(req.password)
    user = User(username=req.username, email=req.email, password_hash=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user.id)
    return {"token": token}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/problems/", response_model=ProblemCreate)
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
        author_id=current_user.id
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    return db_problem

@router.get("/problems/", response_model=List[ProblemResponse])
def get_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "description": p.description, "tags": p.tags, "subject": p.subject, "level": p.level, "author_id": p.author_id, "comment_count": comment_count, "updated_at": p.updated_at} for p, comment_count in problems]


@router.get("/problems/{subject}", response_model=List[ProblemResponse])
def get_problems_by_subject(subject: str, db: Session = Depends(get_db)):
    problems = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.subject == subject).group_by(Problem.id).order_by(Problem.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "description": p.description, "tags": p.tags, "subject": p.subject, "level": p.level, "author_id": p.author_id, "comment_count": comment_count, "updated_at": p.updated_at} for p, comment_count in problems]


@router.get("/problems/id/{problem_id}", response_model=ProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import func
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem, comment_count = result
    return {"id": problem.id, "title": problem.title, "description": problem.description, "tags": problem.tags, "subject": problem.subject, "level": problem.level, "author_id": problem.author_id, "comment_count": comment_count, "updated_at": problem.updated_at}

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
    db_problem.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_problem)
    
    # Return with comment count
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    problem, comment_count = result
    return {"id": problem.id, "title": problem.title, "description": problem.description, "tags": problem.tags, "subject": problem.subject, "level": problem.level, "author_id": problem.author_id, "comment_count": comment_count, "updated_at": problem.updated_at}

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
    db_problem.updated_at = datetime.utcnow()  # Add this field to your Problem model
    
    db.commit()
    db.refresh(db_problem)
    
    # Return with comment count
    from sqlalchemy import func
    result = db.query(Problem, func.count(Comment.id).label('comment_count')).outerjoin(Comment).filter(Problem.id == problem_id).group_by(Problem.id).first()
    problem, comment_count = result
    return {"id": problem.id, "title": problem.title, "description": problem.description, "tags": problem.tags, "subject": problem.subject, "author_id": problem.author_id, "comment_count": comment_count}

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
            "updated_at": problem.updated_at.isoformat() if problem.updated_at else None
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
    
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "bio": current_user.bio,
            "profile_picture": current_user.profile_picture
        },
        "problems": problems_data,
        "comments": comments_data,
        "bookmarks": bookmarks_data
    }