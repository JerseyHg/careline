"""
Message Router: 家人留言
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, FamilyMessage
from schemas import MessageCreate, MessageOut
from auth import get_current_user, get_user_family_role

router = APIRouter(prefix="/message", tags=["留言"])


@router.post("", response_model=MessageOut)
def send_message(
    req: MessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """发送留言（家属给患者，或反过来）"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    # Deactivate previous active messages from this sender
    db.query(FamilyMessage).filter(
        FamilyMessage.family_id == membership.family_id,
        FamilyMessage.sender_id == user.id,
        FamilyMessage.is_active == True,
    ).update({"is_active": False})

    msg = FamilyMessage(
        family_id=membership.family_id,
        sender_id=user.id,
        content=req.content,
        is_active=True,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_nickname=user.nickname,
        content=msg.content,
        created_at=msg.created_at,
    )


@router.get("/active", response_model=List[MessageOut])
def get_active_messages(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取当前活跃的留言（首页展示用）"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    messages = (
        db.query(FamilyMessage)
        .filter(
            FamilyMessage.family_id == membership.family_id,
            FamilyMessage.is_active == True,
            FamilyMessage.sender_id != user.id,  # Don't show own messages
        )
        .order_by(FamilyMessage.created_at.desc())
        .limit(3)
        .all()
    )

    results = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        results.append(MessageOut(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_nickname=sender.nickname if sender else None,
            content=msg.content,
            created_at=msg.created_at,
        ))

    return results
