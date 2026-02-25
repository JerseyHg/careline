"""
Summary Router: 趋势 + 就诊摘要 + 患者日历
修复版：cycle_day 超过 length_days 时标注「已超期」
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, DailyLog, ChemoCycle
from schemas import (
    SummaryResponse, SummaryMode, KeyStats, TrendPoint,
    CalendarResponse, CalendarDay,
)
from auth import get_current_user, get_user_family_role
from tz import china_today

router = APIRouter(prefix="/summary", tags=["摘要"])


def _compute_key_stats(logs: List[DailyLog], recent_days: int = 7) -> KeyStats:
    """Compute peak/valley and averages"""
    stats = KeyStats()
    if not logs:
        return stats

    # Peaks
    nausea_logs = [(l.nausea, l.cycle_day, l.date) for l in logs if l.nausea is not None]
    if nausea_logs:
        max_n = max(nausea_logs, key=lambda x: x[0])
        stats.max_nausea = max_n[0]
        stats.max_nausea_day = max_n[1]

    energy_logs = [(l.energy, l.cycle_day, l.date) for l in logs if l.energy is not None]
    if energy_logs:
        worst_e = max(energy_logs, key=lambda x: x[0])
        stats.min_energy = worst_e[0]
        stats.min_energy_day = worst_e[1]

    stool_logs = [(l.stool_count, l.cycle_day, l.date) for l in logs if l.stool_count is not None]
    if stool_logs:
        max_s = max(stool_logs, key=lambda x: x[0])
        stats.max_stool = max_s[0]
        stats.max_stool_day = max_s[1]

    diarrhea_logs = [(l.diarrhea, l.cycle_day, l.date) for l in logs if l.diarrhea is not None]
    if diarrhea_logs:
        max_d = max(diarrhea_logs, key=lambda x: x[0])
        stats.max_diarrhea = max_d[0]
        stats.max_diarrhea_day = max_d[1]

    # Fever events
    fever_logs = [l for l in logs if l.fever and l.temp_c]
    stats.fever_events = [
        {"date": str(l.date), "day": l.cycle_day, "temp": l.temp_c}
        for l in fever_logs
    ]

    # Blood events
    blood_logs = [l for l in logs if l.stool_blood_count and l.stool_blood_count > 0]
    stats.blood_events = [
        {"date": str(l.date), "day": l.cycle_day, "count": l.stool_blood_count}
        for l in blood_logs
    ]

    # Recent N days averages
    recent = sorted(logs, key=lambda l: l.date, reverse=True)[:recent_days]
    if recent:
        e_vals = [l.energy for l in recent if l.energy is not None]
        n_vals = [l.nausea for l in recent if l.nausea is not None]
        s_vals = [l.stool_count for l in recent if l.stool_count is not None]
        sl_vals = [l.sleep_quality for l in recent if l.sleep_quality is not None]

        if e_vals:
            stats.avg_energy_7d = round(sum(e_vals) / len(e_vals), 1)
        if n_vals:
            stats.avg_nausea_7d = round(sum(n_vals) / len(n_vals), 1)
        if s_vals:
            stats.avg_stool_7d = round(sum(s_vals) / len(s_vals), 1)
        if sl_vals:
            stats.avg_sleep_7d = round(sum(sl_vals) / len(sl_vals), 1)

    # Worst 3 days (composite score)
    scored = []
    for l in logs:
        score = 0
        reasons = []
        if l.energy is not None:
            score += l.energy
            if l.energy >= 3:
                reasons.append(f"体力{l.energy}")
        if l.nausea is not None:
            score += l.nausea
            if l.nausea >= 2:
                reasons.append(f"恶心{l.nausea}")
        if l.fever and l.temp_c:
            score += 3
            reasons.append(f"发热{l.temp_c}℃")
        if l.stool_count and l.stool_count >= 5:
            score += 2
            reasons.append(f"排便{l.stool_count}次")
        scored.append((score, l.cycle_day, str(l.date), reasons))

    scored.sort(key=lambda x: -x[0])
    stats.worst_days = [
        {"day": s[1], "date": s[2], "reasons": s[3]}
        for s in scored[:3]
    ]

    return stats


def _generate_caregiver_summary(
    cycle: ChemoCycle, cycle_day: int, stats: KeyStats,
) -> str:
    """生成家属模式就诊摘要文本"""

    # 🔧 修复：如果 cycle_day 超过 length_days，说明疗程已超期
    display_day = cycle_day
    overdue = False
    if cycle_day > cycle.length_days:
        overdue = True
        display_day = cycle_day

    lines = [
        "【化疗副作用记录 · 就诊摘要】",
    ]

    if overdue:
        lines.append(f"当前：第{cycle.cycle_no}疗程 · 已完成（共{cycle.length_days}天，超出{cycle_day - cycle.length_days}天）")
        lines.append(f"建议：请在「我的」中创建新疗程")
    else:
        lines.append(f"当前：第{cycle.cycle_no}疗程 · Day {display_day}/{cycle.length_days}（{china_today()}）")

    if cycle.regimen:
        lines.append(f"方案：{cycle.regimen}")

    lines.append("")

    # Key stats
    if stats.max_nausea is not None:
        lines.append(f"▸ 恶心峰值: {stats.max_nausea}/3 (Day {stats.max_nausea_day})")
    if stats.min_energy is not None:
        lines.append(f"▸ 体力最差: {stats.min_energy}/4 (Day {stats.min_energy_day})")
    if stats.max_stool is not None:
        lines.append(f"▸ 排便最多: {stats.max_stool}次 (Day {stats.max_stool_day})")
    if stats.max_diarrhea is not None:
        lines.append(f"▸ 腹泻峰值: {stats.max_diarrhea}/3 (Day {stats.max_diarrhea_day})")

    # Fever
    if stats.fever_events:
        lines.append("")
        lines.append(f"⚠️ 发热 {len(stats.fever_events)} 次:")
        for fe in stats.fever_events:
            lines.append(f"  Day {fe['day']}: {fe['temp']}℃")

    # Blood
    if stats.blood_events:
        lines.append("")
        lines.append(f"⚠️ 便血 {len(stats.blood_events)} 次")

    # Averages
    lines.append("")
    lines.append("近7日均值:")
    if stats.avg_energy_7d is not None:
        lines.append(f"  体力 {stats.avg_energy_7d}/4")
    if stats.avg_nausea_7d is not None:
        lines.append(f"  恶心 {stats.avg_nausea_7d}/3")
    if stats.avg_stool_7d is not None:
        lines.append(f"  排便 {stats.avg_stool_7d}次/天")

    # Worst days
    if stats.worst_days:
        lines.append("")
        lines.append("最辛苦的几天:")
        for wd in stats.worst_days[:3]:
            reasons = ", ".join(wd.get("reasons", []))
            if reasons:
                lines.append(f"  Day {wd['day']}: {reasons}")

    lines.append("")
    lines.append(f"——— CareLine 自动生成 · {china_today()} ———")

    return "\n".join(lines)


def _generate_patient_summary(
    cycle: ChemoCycle, cycle_day: int, stats: KeyStats,
) -> str:
    """生成患者模式简要摘要"""
    # 🔧 修复：cap pct to 100
    pct = min(100, round((cycle_day / cycle.length_days) * 100))

    if pct >= 100:
        status_text = "这个疗程已经结束啦，辛苦了！"
    elif stats.avg_energy_7d is not None and stats.avg_energy_7d <= 1.5:
        status_text = "最近状态不错，继续保持"
    elif cycle_day > 7:
        status_text = "最难的几天已经过去了，身体在恢复中"
    else:
        status_text = "身体在努力恢复中"

    display_day = min(cycle_day, cycle.length_days) if cycle_day > cycle.length_days else cycle_day

    lines = [
        f"今天是第{cycle.cycle_no}疗程的第{display_day}天 ☀️",
        "",
        f"疗程已完成 {pct}%",
        "",
        status_text,
        "继续加油 💪",
    ]
    return "\n".join(lines)


@router.get("", response_model=SummaryResponse)
def get_summary(
    cycle_no: Optional[int] = None,
    days: int = Query(14, ge=1, le=60),
    mode: SummaryMode = SummaryMode.caregiver,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    获取汇总数据
    """
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    family_id = membership.family_id

    # Find cycle
    if cycle_no:
        cycle = (
            db.query(ChemoCycle)
            .filter(ChemoCycle.family_id == family_id, ChemoCycle.cycle_no == cycle_no)
            .first()
        )
    else:
        cycle = (
            db.query(ChemoCycle)
            .filter(ChemoCycle.family_id == family_id, ChemoCycle.is_active == True)
            .first()
        )

    if not cycle:
        raise HTTPException(status_code=404, detail="疗程不存在")

    current_day = (china_today() - cycle.start_date).days + 1

    # Get logs for this cycle
    logs = (
        db.query(DailyLog)
        .filter(
            DailyLog.family_id == family_id,
            DailyLog.cycle_no == cycle.cycle_no,
        )
        .order_by(DailyLog.date)
        .all()
    )

    # Build trends
    trends = []
    for log in logs:
        trends.append(TrendPoint(
            date=log.date,
            cycle_day=log.cycle_day,
            energy=log.energy,
            nausea=log.nausea,
            appetite=log.appetite,
            sleep_quality=log.sleep_quality,
            stool_count=log.stool_count,
            diarrhea=log.diarrhea,
            fever=log.fever,
            temp_c=log.temp_c,
            is_tough_day=log.is_tough_day,
        ))

    # Compute stats
    key_stats = _compute_key_stats(logs, recent_days=min(days, 7))

    # Generate text
    if mode == SummaryMode.caregiver:
        summary_text = _generate_caregiver_summary(cycle, current_day, key_stats)
    else:
        summary_text = _generate_patient_summary(cycle, current_day, key_stats)

    return SummaryResponse(
        cycle_no=cycle.cycle_no,
        cycle_day=current_day,
        start_date=cycle.start_date,
        length_days=cycle.length_days,
        mode=mode,
        trends=trends,
        key_stats=key_stats,
        summary_text=summary_text,
    )


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    year: int = Query(None),
    month: int = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取状态日历数据"""
    membership = get_user_family_role(db, user.id)
    if not membership:
        raise HTTPException(status_code=400, detail="请先加入家庭")

    today = china_today()
    year = year or today.year
    month = month or today.month

    import calendar
    _, days_in_month = calendar.monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, days_in_month)

    logs = (
        db.query(DailyLog)
        .filter(
            DailyLog.family_id == membership.family_id,
            DailyLog.date >= start,
            DailyLog.date <= end,
        )
        .all()
    )
    log_map = {l.date: l for l in logs}

    cycle = (
        db.query(ChemoCycle)
        .filter(
            ChemoCycle.family_id == membership.family_id,
            ChemoCycle.is_active == True,
        )
        .first()
    )

    calendar_days = []
    streak = 0
    counting_streak = True

    for d in range(days_in_month, 0, -1):
        day_date = date(year, month, d)
        if day_date > today:
            continue
        log = log_map.get(day_date)
        if log:
            if counting_streak:
                streak += 1
        else:
            counting_streak = False

    streak_count = streak
    for d in range(1, days_in_month + 1):
        day_date = date(year, month, d)
        log = log_map.get(day_date)

        cycle_day = None
        if cycle:
            delta = (day_date - cycle.start_date).days + 1
            if 1 <= delta <= cycle.length_days:
                cycle_day = delta

        if log:
            score = 0
            if log.energy is not None:
                score += log.energy
            if log.nausea is not None:
                score += log.nausea

            if score <= 2:
                status = "good"
                emoji = "😊"
            elif score <= 4:
                status = "okay"
                emoji = "😐"
            else:
                status = "tough"
                emoji = "💪"

            if log.is_tough_day:
                status = "tough"
                emoji = "💪"
        elif day_date <= today:
            status = "rest" if not cycle_day else "none"
            emoji = ""
        else:
            status = "none"
            emoji = ""

        calendar_days.append(CalendarDay(
            date=day_date,
            cycle_day=cycle_day,
            status=status,
            emoji=emoji,
            recorded=log is not None,
        ))

    good_days = sum(1 for cd in calendar_days if cd.status == "good")
    total_recorded = sum(1 for cd in calendar_days if cd.recorded)

    return CalendarResponse(
        year=year,
        month=month,
        days=calendar_days,
        total_recorded=total_recorded,
        good_days=good_days,
        streak=streak_count,
    )
