"""
Auth Router: 注册 / 登录 / 微信登录
修复：登录时如果用户不存在则自动注册
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
        raise HTTPException(status_code=400, detail="该账号已注册")

    user = User(
        phone=req.phone,
        nickname=req.nickname or f"用户{req.phone[-4:]}",
        openid=None,
    )
    user.avatar_url = hash_password(req.password)
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
    """
    登录（首次自动注册）
    - 用户存在 → 验证密码
    - 用户不存在 → 自动创建账号
    """
    user = db.query(User).filter(User.phone == req.phone).first()

    if user:
        # 已有账号，验证密码
        if not verify_password(req.password, user.avatar_url or ""):
            raise HTTPException(status_code=401, detail="密码错误")
    else:
        # 首次登录，自动注册
        user = User(
            phone=req.phone,
            nickname=f"用户{req.phone[-4:] if len(req.phone) >= 4 else req.phone}",
            openid=None,
        )
        user.avatar_url = hash_password(req.password)
        db.add(user)
        db.commit()
        db.refresh(user)

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
