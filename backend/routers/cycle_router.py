"""
Cycle Router: 化疗疗程管理
"""
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, ChemoCycle
from schemas import CycleCreate, CycleUpdate, CycleOut
from auth import get_current_user, get_user_family_role, require_family_access
from tz import china_today

router = APIRouter(prefix="/cycle", tags=["疗程"])


def _compute_current_day(cycle: ChemoCycle) -> int | None:
    if not cycle.is_active:
        return None
    delta = (china_today() - cycle.start_date).days + 1
    if delta < 1:
        return None
    return delta


def _cycle_to_out(cycle: ChemoCycle) -> CycleOut:
    return CycleOut(
        id=cycle.id,
        cycle_no=cycle.cycle_no,
        start_date=cycle.start_date,
        length_days=cycle.length_days,
        regimen=cycle.regimen,
        is_active=cycle.is_active,
        current_day=_compute_current_day(cycle),
    )


@router.post("", response_model=CycleOut)
def create_cycle(
    req: CycleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """创建/更新疗程"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    family_id = membership.family_id

    # Deactivate all previous cycles
    db.query(ChemoCycle).filter(
        ChemoCycle.family_id == family_id,
        ChemoCycle.is_active == True,
    ).update({"is_active": False})

    # Check if cycle_no already exists
    existing = (
        db.query(ChemoCycle)
        .filter(
            ChemoCycle.family_id == family_id,
            ChemoCycle.cycle_no == req.cycle_no,
        )
        .first()
    )

    if existing:
        existing.start_date = req.start_date
        existing.length_days = req.length_days
        existing.regimen = req.regimen
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return _cycle_to_out(existing)

    cycle = ChemoCycle(
        family_id=family_id,
        cycle_no=req.cycle_no,
        start_date=req.start_date,
        length_days=req.length_days,
        regimen=req.regimen,
        is_active=True,
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return _cycle_to_out(cycle)


@router.get("/current", response_model=CycleOut)
def get_current_cycle(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取当前活跃疗程"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    cycle = (
        db.query(ChemoCycle)
        .filter(
            ChemoCycle.family_id == membership.family_id,
            ChemoCycle.is_active == True,
        )
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="没有活跃的疗程，请先创建")

    return _cycle_to_out(cycle)


@router.get("/list", response_model=List[CycleOut])
def list_cycles(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取所有疗程"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    cycles = (
        db.query(ChemoCycle)
        .filter(ChemoCycle.family_id == membership.family_id)
        .order_by(ChemoCycle.cycle_no)
        .all()
    )
    return [_cycle_to_out(c) for c in cycles]


@router.patch("/{cycle_no}", response_model=CycleOut)
def update_cycle(
    cycle_no: int,
    req: CycleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """更新疗程信息"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    cycle = (
        db.query(ChemoCycle)
        .filter(
            ChemoCycle.family_id == membership.family_id,
            ChemoCycle.cycle_no == cycle_no,
        )
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="疗程不存在")

    if req.start_date is not None:
        cycle.start_date = req.start_date
    if req.length_days is not None:
        cycle.length_days = req.length_days
    if req.regimen is not None:
        cycle.regimen = req.regimen
    if req.is_active is not None:
        cycle.is_active = req.is_active

    db.commit()
    db.refresh(cycle)
    return _cycle_to_out(cycle)
