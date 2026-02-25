"""
Authentication: JWT tokens + WeChat login stub
"""
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User, FamilyMember

SECRET_KEY = os.getenv("JWT_SECRET", "careline-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except (JWTError, ValueError, TypeError):
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="未登录")

    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    return user


def get_user_family_role(db: Session, user_id: int) -> Optional[FamilyMember]:
    """Get user's first family membership (V1: single family)"""
    return (
        db.query(FamilyMember)
        .filter(FamilyMember.user_id == user_id)
        .first()
    )


def require_family_access(db: Session, user_id: int, family_id: int) -> FamilyMember:
    """Verify user belongs to the family, return membership"""
    member = (
        db.query(FamilyMember)
        .filter(
            FamilyMember.user_id == user_id,
            FamilyMember.family_id == family_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="无权访问该家庭数据")
    return member


def generate_invite_code() -> str:
    """Generate a readable invite code like CL-XXXX-XXXX"""
    code = secrets.token_hex(4).upper()
    return f"CL-{code[:4]}-{code[4:]}"
