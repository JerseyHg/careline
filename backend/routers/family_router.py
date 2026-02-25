"""
Family Router: 家庭空间管理
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Family, FamilyMember
from schemas import FamilyCreate, FamilyJoin, FamilyOut, FamilyMemberOut, RoleEnum
from auth import get_current_user, generate_invite_code, get_user_family_role

router = APIRouter(prefix="/family", tags=["家庭"])


@router.post("/create", response_model=FamilyOut)
def create_family(
    req: FamilyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """创建家庭空间"""
    # Check if user already in a family (V1: one family per user)
    existing = get_user_family_role(db, user.id)
    if existing:
        raise HTTPException(status_code=400, detail="您已加入一个家庭")

    invite_code = generate_invite_code()
    # Ensure unique
    while db.query(Family).filter(Family.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    family = Family(
        name=req.name,
        invite_code=invite_code,
        created_by=user.id,
    )
    db.add(family)
    db.flush()

    member = FamilyMember(
        user_id=user.id,
        family_id=family.id,
        role=req.role,
    )
    db.add(member)
    db.commit()
    db.refresh(family)

    return FamilyOut(
        id=family.id,
        name=family.name,
        invite_code=family.invite_code,
        my_role=req.role,
        members=[
            FamilyMemberOut(
                user_id=user.id,
                nickname=user.nickname,
                role=req.role,
                joined_at=member.joined_at,
            )
        ],
    )


@router.post("/join", response_model=FamilyOut)
def join_family(
    req: FamilyJoin,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """通过邀请码加入家庭"""
    existing = get_user_family_role(db, user.id)
    if existing:
        raise HTTPException(status_code=400, detail="您已加入一个家庭")

    family = (
        db.query(Family)
        .filter(Family.invite_code == req.invite_code.strip().upper())
        .first()
    )
    if not family:
        raise HTTPException(status_code=404, detail="邀请码无效")

    # Check if already a patient in this family
    if req.role == RoleEnum.patient:
        existing_patient = (
            db.query(FamilyMember)
            .filter(
                FamilyMember.family_id == family.id,
                FamilyMember.role == RoleEnum.patient,
            )
            .first()
        )
        if existing_patient:
            raise HTTPException(status_code=400, detail="该家庭已有患者")

    member = FamilyMember(
        user_id=user.id,
        family_id=family.id,
        role=req.role,
    )
    db.add(member)
    db.commit()
    db.refresh(family)

    members_out = []
    for m in family.members:
        members_out.append(
            FamilyMemberOut(
                user_id=m.user_id,
                nickname=m.user.nickname if m.user else None,
                role=m.role,
                joined_at=m.joined_at,
            )
        )

    return FamilyOut(
        id=family.id,
        name=family.name,
        invite_code=family.invite_code,
        my_role=req.role,
        members=members_out,
    )


@router.get("/me", response_model=FamilyOut)
def get_my_family(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取我的家庭与角色"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=404, detail="您还没有加入家庭")

    family = membership.family
    members_out = []
    for m in family.members:
        members_out.append(
            FamilyMemberOut(
                user_id=m.user_id,
                nickname=m.user.nickname if m.user else None,
                role=m.role,
                joined_at=m.joined_at,
            )
        )

    return FamilyOut(
        id=family.id,
        name=family.name,
        invite_code=family.invite_code,
        my_role=membership.role,
        members=members_out,
    )
