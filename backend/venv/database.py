from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = DATABASE_URL = "postgresql://science_user:secure_password@localhost:5432/sciencepioneers"

engine = create_engine(DATABASE_URL)
SesscionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()