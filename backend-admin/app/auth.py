from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

ADMIN_SECRET = os.getenv("ADMIN_JWT_SECRET", "admin-super-secret-change-in-production")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 8

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    payload["iss"] = "stockpilot-admin"   # distinguishes from tenant tokens
    return jwt.encode(payload, ADMIN_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, ADMIN_SECRET, algorithms=[ALGORITHM])
        if payload.get("iss") != "stockpilot-admin":
            return {}
        return payload
    except JWTError:
        return {}
