"""
Auth Router: 注册 / 登录 / 微信登录
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    RegisterRequest, PhoneLoginRequest, WechatLoginRequest,
    TokenResponse, UserOut,
)
from auth import (
    hash_password, verify_password, create_access_token, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """手机号注册（开发/测试用）"""
    existing = db.query(User).filter(User.phone == req.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="该手机号已注册")

    user = User(
        phone=req.phone,
        nickname=req.nickname or f"用户{req.phone[-4:]}",
        openid=None,
    )
    # Store hashed password in a simple way (V1)
    user.avatar_url = hash_password(req.password)  # reusing field for simplicity
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        nickname=user.nickname,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: PhoneLoginRequest, db: Session = Depends(get_db)):
    """手机号密码登录"""
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user or not verify_password(req.password, user.avatar_url or ""):
        raise HTTPException(status_code=401, detail="手机号或密码错误")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        nickname=user.nickname,
    )


@router.post("/wechat", response_model=TokenResponse)
def wechat_login(req: WechatLoginRequest, db: Session = Depends(get_db)):
    """
    微信小程序登录
    V1: 用 code 模拟（实际需调用微信 code2Session 接口换 openid）
    """
    # TODO: 实际实现需要:
    # 1. 用 code 调用 https://api.weixin.qq.com/sns/jscode2session 获取 openid
    # 2. 用 openid 查找或创建用户
    # 这里用 code 直接当作 openid 的 stub
    openid = f"wx_{req.code}"

    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        user = User(openid=openid, nickname="微信用户")
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        nickname=user.nickname,
    )


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return user
