from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Problem
from auth.utils import hash_password, verify_password, create_jwt
from auth.dependencies import get_current_user
from auth.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from auth.schemas import ProblemCreate, ProblemResponse
from typing import List
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
        author_id=current_user.id
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    return db_problem

@router.get("/problems/", response_model=List[ProblemResponse])
def get_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem).order_by(Problem.created_at.desc()).all()
    return problems

@router.get("/problems/{subject}", response_model=List[ProblemResponse])
def get_problems_by_subject(subject: str, db: Session = Depends(get_db)):
    problems = db.query(Problem).filter(Problem.subject == subject).order_by(Problem.created_at.desc()).all()
    return problems

@router.get("/problems/id/{problem_id}", response_model=ProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

