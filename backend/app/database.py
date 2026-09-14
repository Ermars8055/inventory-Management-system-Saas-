import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

# Always store DB inside backend/ regardless of working directory
_backend_dir = os.path.dirname(os.path.abspath(__file__))  # .../backend/app
_db_path = os.path.normpath(os.path.join(_backend_dir, "..", "stockpilot.db"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_db_path}")

# SQLite needs check_same_thread=False; ignored for other DBs
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
