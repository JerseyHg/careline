"""
Stool Router: 排便即时记录（浮动按钮触发）
"""
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, StoolEvent, DailyLog
from schemas import StoolEventCreate, StoolEventOut, StoolDailySummary
from auth import get_current_user, get_user_family_role
from tz import china_today, china_now

router = APIRouter(prefix="/stool", tags=["排便记录"])


def _update_daily_stool_summary(db: Session, family_id: int, event_date: date):
    """After adding/deleting a stool event, update the daily log summary"""
    events = (
        db.query(StoolEvent)
        .filter(StoolEvent.family_id == family_id, StoolEvent.date == event_date)
        .all()
    )

    daily = (
        db.query(DailyLog)
        .filter(DailyLog.family_id == family_id, DailyLog.date == event_date)
        .first()
    )

    if daily:
        daily.stool_count = len(events)
        daily.stool_blood_count = sum(1 for e in events if e.blood)
        daily.stool_mucus_count = sum(1 for e in events if e.mucus)
        daily.stool_tenesmus_count = sum(1 for e in events if e.tenesmus)


@router.post("", response_model=StoolEventOut)
def create_stool_event(
    req: StoolEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """记录一次排便（即时，每次排便后点击）"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    event_date = req.date or china_today()
    event_time = req.time or china_now().strftime("%H:%M")

    event = StoolEvent(
        family_id=membership.family_id,
        date=event_date,
        time=event_time,
        bristol=req.bristol,
        blood=req.blood,
        mucus=req.mucus,
        tenesmus=req.tenesmus,
    )
    db.add(event)
    db.flush()

    # Update daily log summary
    _update_daily_stool_summary(db, membership.family_id, event_date)

    db.commit()
    db.refresh(event)
    return event


@router.get("/today", response_model=StoolDailySummary)
def get_today_stool(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取今日排便汇总"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    today = china_today()
    events = (
        db.query(StoolEvent)
        .filter(
            StoolEvent.family_id == membership.family_id,
            StoolEvent.date == today,
        )
        .order_by(StoolEvent.recorded_at)
        .all()
    )

    return StoolDailySummary(
        date=today,
        count=len(events),
        events=events,
        blood_count=sum(1 for e in events if e.blood),
        mucus_count=sum(1 for e in events if e.mucus),
        tenesmus_count=sum(1 for e in events if e.tenesmus),
    )


@router.get("/range", response_model=List[StoolDailySummary])
def get_stool_range(
    start: date = Query(..., alias="from"),
    end: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取日期范围内的排便记录"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    events = (
        db.query(StoolEvent)
        .filter(
            StoolEvent.family_id == membership.family_id,
            StoolEvent.date >= start,
            StoolEvent.date <= end,
        )
        .order_by(StoolEvent.date, StoolEvent.recorded_at)
        .all()
    )

    # Group by date
    from collections import defaultdict
    grouped = defaultdict(list)
    for e in events:
        grouped[e.date].append(e)

    results = []
    current = start
    while current <= end:
        day_events = grouped.get(current, [])
        results.append(StoolDailySummary(
            date=current,
            count=len(day_events),
            events=day_events,
            blood_count=sum(1 for e in day_events if e.blood),
            mucus_count=sum(1 for e in day_events if e.mucus),
            tenesmus_count=sum(1 for e in day_events if e.tenesmus),
        ))
        current += __import__("datetime").timedelta(days=1)

    return results


@router.delete("/{event_id}")
def delete_stool_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """删除一条排便记录（误操作补救）"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    event = (
        db.query(StoolEvent)
        .filter(
            StoolEvent.id == event_id,
            StoolEvent.family_id == membership.family_id,
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="记录不存在")

    event_date = event.date
    db.delete(event)
    _update_daily_stool_summary(db, membership.family_id, event_date)
    db.commit()

    return {"ok": True, "message": "已删除"}
