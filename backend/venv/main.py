from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

# 👇 allow frontend (React) to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, Science Pioneers with PostgreSQL!"}
