"""
DailyLog Router: 每日记录（核心）
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, DailyLog, ChemoCycle, StoolEvent
from schemas import DailyLogUpsert, DailyLogOut
from auth import get_current_user, get_user_family_role
from tz import china_today

router = APIRouter(prefix="/daily", tags=["每日记录"])


def _get_cycle_info(db: Session, family_id: int, log_date: date):
    """Compute cycle_no and cycle_day for a given date"""
    cycle = (
        db.query(ChemoCycle)
        .filter(
            ChemoCycle.family_id == family_id,
            ChemoCycle.is_active == True,
        )
        .first()
    )
    if not cycle:
        return None, None

    delta = (log_date - cycle.start_date).days + 1
    if delta < 1:
        return cycle.cycle_no, None
    return cycle.cycle_no, delta


def _sync_stool_summary(db: Session, family_id: int, log_date: date, daily_log: DailyLog):
    """Sync stool event counts into daily log"""
    events = (
        db.query(StoolEvent)
        .filter(
            StoolEvent.family_id == family_id,
            StoolEvent.date == log_date,
        )
        .all()
    )

    if events:
        daily_log.stool_count = len(events)
        daily_log.stool_blood_count = sum(1 for e in events if e.blood)
        daily_log.stool_mucus_count = sum(1 for e in events if e.mucus)
        daily_log.stool_tenesmus_count = sum(1 for e in events if e.tenesmus)


@router.put("/{log_date}", response_model=DailyLogOut)
def upsert_daily_log(
    log_date: date,
    req: DailyLogUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    创建或更新当天记录（Upsert）
    如果是 tough_day 模式，未填字段会用前一天数据填充
    """
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    family_id = membership.family_id
    cycle_no, cycle_day = _get_cycle_info(db, family_id, log_date)

    # Find existing
    existing = (
        db.query(DailyLog)
        .filter(DailyLog.family_id == family_id, DailyLog.date == log_date)
        .first()
    )

    # If tough_day, fill from yesterday
    data = req.model_dump(exclude_unset=False)
    if req.is_tough_day:
        yesterday = (
            db.query(DailyLog)
            .filter(
                DailyLog.family_id == family_id,
                DailyLog.date == log_date - timedelta(days=1),
            )
            .first()
        )
        if yesterday:
            for field in ["energy", "nausea", "appetite", "sleep_quality", "diarrhea",
                         "numbness", "mouth_sore", "stool_count"]:
                if data.get(field) is None:
                    data[field] = getattr(yesterday, field, None)

    if existing:
        for key, value in data.items():
            if value is not None or key in ("note", "temp_c"):
                setattr(existing, key, value)
        existing.cycle_no = cycle_no
        existing.cycle_day = cycle_day
        existing.recorded_by = user.id
        _sync_stool_summary(db, family_id, log_date, existing)
        db.commit()
        db.refresh(existing)
        return existing

    log = DailyLog(
        family_id=family_id,
        date=log_date,
        cycle_no=cycle_no,
        cycle_day=cycle_day,
        recorded_by=user.id,
        **data,
    )
    db.add(log)
    db.flush()
    _sync_stool_summary(db, family_id, log_date, log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/range", response_model=List[DailyLogOut])
def get_daily_range(
    start: date = Query(..., alias="from"),
    end: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取日期范围内的记录"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    logs = (
        db.query(DailyLog)
        .filter(
            DailyLog.family_id == membership.family_id,
            DailyLog.date >= start,
            DailyLog.date <= end,
        )
        .order_by(DailyLog.date)
        .all()
    )
    return logs


@router.get("/cycle/{cycle_no}", response_model=List[DailyLogOut])
def get_cycle_logs(
    cycle_no: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取某疗程的所有记录"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    logs = (
        db.query(DailyLog)
        .filter(
            DailyLog.family_id == membership.family_id,
            DailyLog.cycle_no == cycle_no,
        )
        .order_by(DailyLog.date)
        .all()
    )
    return logs


@router.get("/today", response_model=Optional[DailyLogOut])
def get_today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取今日记录"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    log = (
        db.query(DailyLog)
        .filter(
            DailyLog.family_id == membership.family_id,
            DailyLog.date == china_today(),
        )
        .first()
    )
    return log
