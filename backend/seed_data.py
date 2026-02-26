"""
CareLine 多疗程种子数据脚本（测试环境用）
运行方式: 
  在测试容器内:  docker exec -it careline-backend-test python seed_data.py
  或本地:        DATABASE_URL=postgresql://... python seed_data.py

创建内容:
  - 2个账号（家属 + 患者）
  - 1个家庭
  - 6个疗程（3个已完成 + 1个当前进行中 + 日期合理分布）
  - 每个疗程完整的每日记录 + 排便事件
  - 家人留言
"""
import os
import sys
import random
from datetime import date, datetime, timedelta

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://careline:careline_secret@localhost:5432/careline",
)

from database import engine, SessionLocal, init_db
from models import User, Family, FamilyMember, ChemoCycle, DailyLog, StoolEvent, FamilyMessage, RoleEnum
from auth import hash_password, generate_invite_code


def generate_cycle_data(cycle_no, length_days, severity_profile="normal"):
    """
    生成一个疗程的每日数据
    severity_profile: 
      "mild"   - 副作用较轻
      "normal" - 典型模式（化疗后几天最难受，之后恢复）
      "severe" - 副作用较重
      "improving" - 整体改善趋势
    """
    data = []
    for day in range(1, length_days + 1):
        # 化疗典型规律：D1-2输液期，D3-7最难受，D8-14逐步恢复，D15-21基本正常
        phase_factor = 0  # 0=轻, 1=中, 2=重
        if day <= 2:
            phase_factor = 0.3  # 输液期，尚可
        elif day <= 5:
            phase_factor = 0.9  # 最难受
        elif day <= 8:
            phase_factor = 0.7  # 仍然辛苦
        elif day <= 12:
            phase_factor = 0.4  # 逐步恢复
        elif day <= 16:
            phase_factor = 0.2  # 基本恢复
        else:
            phase_factor = 0.1  # 接近正常

        # 按疗程严重度调整
        if severity_profile == "mild":
            phase_factor *= 0.6
        elif severity_profile == "severe":
            phase_factor = min(1.0, phase_factor * 1.4)
        elif severity_profile == "improving":
            phase_factor *= max(0.3, 1.0 - cycle_no * 0.1)

        # 添加随机波动
        noise = random.uniform(-0.15, 0.15)
        pf = max(0, min(1.0, phase_factor + noise))

        # 体力: 0(好)-4(很差), 越难受越高
        energy = min(4, max(0, round(pf * 4)))
        # 恶心: 0(无)-3(严重)
        nausea = min(3, max(0, round(pf * 3)))
        # 食欲: 0(好)-4(很差)
        appetite = min(4, max(0, round(pf * 4)))
        # 睡眠: 0(好)-3(很差)
        sleep = min(3, max(0, round(pf * 3)))

        # 发热：主要在 D3-7，严重时更可能
        fever = False
        temp = None
        if pf > 0.6 and random.random() < pf * 0.4:
            fever = True
            temp = round(37.3 + random.uniform(0, 1.5), 1)

        # 排便次数：腹泻期间增多
        base_stool = 2
        if pf > 0.5:
            base_stool = random.choice([3, 4, 5, 6])
        elif pf > 0.3:
            base_stool = random.choice([2, 3, 3, 4])
        else:
            base_stool = random.choice([1, 2, 2, 3])
        stool_count = base_stool

        # 腹泻程度: 0(无)-3(严重)
        diarrhea = 0
        if stool_count >= 4:
            diarrhea = min(3, max(0, round(pf * 3)))
        elif stool_count >= 3:
            diarrhea = min(2, max(0, round(pf * 2)))

        # 便血/粘液/里急后重
        blood = 1 if (diarrhea >= 2 and random.random() < 0.3) else 0
        mucus = 1 if (diarrhea >= 1 and random.random() < 0.4) else 0
        tenesmus = 1 if (diarrhea >= 1 and random.random() < 0.35) else 0

        # 手足麻木：奥沙利铂典型，化疗后几天出现，可能持续
        numbness = (day >= 3 and day <= max(8, 3 + cycle_no)) and random.random() < 0.7
        # 口腔溃疡：D5-D10
        mouth_sore = (day >= 5 and day <= 10) and random.random() < (0.3 * pf + 0.1)

        # 今天难受模式
        is_tough = pf > 0.7 and random.random() < 0.3

        data.append({
            "day": day,
            "energy": energy,
            "nausea": nausea,
            "appetite": appetite,
            "sleep": sleep,
            "fever": fever,
            "temp": temp,
            "stool_count": stool_count,
            "diarrhea": diarrhea,
            "is_tough": is_tough,
            "numbness": numbness,
            "mouth_sore": mouth_sore,
            "blood": blood,
            "mucus": mucus,
            "tenesmus": tenesmus,
        })

    return data


def seed():
    init_db()
    db = SessionLocal()

    # ─── 清理旧数据 ──────────────────────────────────────
    print("🗑  清理旧数据...")
    db.query(FamilyMessage).delete()
    db.query(StoolEvent).delete()
    db.query(DailyLog).delete()
    db.query(ChemoCycle).delete()
    db.query(FamilyMember).delete()
    db.query(Family).delete()
    db.query(User).delete()
    db.commit()

    # ─── 创建用户 ──────────────────────────────────────────
    print("👤 创建用户...")
    caregiver_user = User(
        phone="13800001111",
        nickname="小明",
        avatar_url=hash_password("123456"),
    )
    db.add(caregiver_user)

    patient_user = User(
        phone="13800002222",
        nickname="爸爸",
        avatar_url=hash_password("123456"),
    )
    db.add(patient_user)
    db.flush()

    print("   家属: 13800001111 / 123456")
    print("   患者: 13800002222 / 123456")

    # ─── 创建家庭 ──────────────────────────────────────────
    print("👨‍👩‍👧 创建家庭...")
    family = Family(
        name="我们的家",
        invite_code="CL-TEST-CODE",
        created_by=caregiver_user.id,
    )
    db.add(family)
    db.flush()

    db.add(FamilyMember(user_id=caregiver_user.id, family_id=family.id, role=RoleEnum.caregiver))
    db.add(FamilyMember(user_id=patient_user.id, family_id=family.id, role=RoleEnum.patient))
    db.flush()

    # ─── 创建6个疗程 ──────────────────────────────────────
    # 时间线：从约4个月前开始，每个疗程21天
    today = date.today()
    cycle_configs = [
        # (cycle_no, length_days, severity, is_active, days_recorded)
        (1, 21, "mild",      False, 21),   # 完整完成
        (2, 21, "normal",    False, 21),   # 完整完成
        (3, 21, "severe",    False, 21),   # 完整完成（最难受的一次）
        (4, 21, "improving", True,  None), # 当前进行中
    ]

    # 计算起始日期：从当前疗程反推
    # 第4疗程正在 Day 12 左右
    current_cycle_day = 12
    cycle4_start = today - timedelta(days=current_cycle_day - 1)

    # 疗程之间休息3-5天
    cycle3_start = cycle4_start - timedelta(days=21 + 4)
    cycle2_start = cycle3_start - timedelta(days=21 + 3)
    cycle1_start = cycle2_start - timedelta(days=21 + 5)

    starts = [cycle1_start, cycle2_start, cycle3_start, cycle4_start]

    for i, (cno, length, severity, is_active, days_rec) in enumerate(cycle_configs):
        start = starts[i]
        print(f"📅 创建第{cno}疗程: {start} ~ {start + timedelta(days=length-1)} ({'进行中' if is_active else '已完成'})")

        cycle = ChemoCycle(
            family_id=family.id,
            cycle_no=cno,
            start_date=start,
            length_days=length,
            regimen="XELOX" if cno <= 2 else "FOLFOX",
            is_active=is_active,
        )
        db.add(cycle)
        db.flush()

        # 决定记录多少天
        if is_active:
            # 当前疗程：记到昨天
            actual_days = (today - start).days  # 不包含今天
        else:
            actual_days = days_rec or length

        actual_days = min(actual_days, length)

        # 生成数据
        cycle_data = generate_cycle_data(cno, actual_days, severity)

        print(f"   📝 生成 {len(cycle_data)} 天记录...")

        for row in cycle_data:
            log_date = start + timedelta(days=row["day"] - 1)

            # 跳过未来日期
            if log_date >= today:
                continue

            log = DailyLog(
                family_id=family.id,
                date=log_date,
                cycle_no=cno,
                cycle_day=row["day"],
                energy=row["energy"],
                nausea=row["nausea"],
                appetite=row["appetite"],
                sleep_quality=row["sleep"],
                fever=row["fever"],
                temp_c=row["temp"],
                stool_count=row["stool_count"],
                diarrhea=row["diarrhea"],
                is_tough_day=row["is_tough"],
                numbness=row["numbness"],
                mouth_sore=row["mouth_sore"],
                stool_blood_count=row["blood"],
                stool_mucus_count=row["mucus"],
                stool_tenesmus_count=row["tenesmus"],
                recorded_by=patient_user.id,
            )
            db.add(log)

            # 生成排便事件
            for s in range(row["stool_count"]):
                hour = 7 + s * 2 + random.randint(0, 2)
                minute = random.randint(0, 59)
                if hour > 22:
                    hour = 22
                event = StoolEvent(
                    family_id=family.id,
                    date=log_date,
                    time=f"{hour:02d}:{minute:02d}",
                    bristol=random.choice([5, 6, 6, 7]) if row["diarrhea"] >= 2 else
                            random.choice([4, 5, 5, 6]) if row["diarrhea"] >= 1 else
                            random.choice([3, 4, 4, 5]),
                    blood=(s == 0 and row["blood"] > 0),
                    mucus=(s == 0 and row["mucus"] > 0),
                    tenesmus=(row["tenesmus"] > 0 and s < 2),
                )
                db.add(event)

    # ─── 家人留言 ──────────────────────────────────────────
    print("💌 创建家人留言...")
    messages = [
        ("爸，今天我来做饭，想吃什么告诉我 ❤️", True),
        ("医生说恢复得不错，继续加油！💪", True),
        ("下午给你炖了银耳汤，放冰箱了", False),
    ]
    for content, is_active in messages:
        db.add(FamilyMessage(
            family_id=family.id,
            sender_id=caregiver_user.id,
            content=content,
            is_active=is_active,
        ))

    # ─── 提交 ─────────────────────────────────────────────
    db.commit()
    db.close()

    print("")
    print("=" * 55)
    print("✅ 多疗程种子数据创建完成！")
    print("=" * 55)
    print("")
    print("📱 测试账号：")
    print("   家属: 13800001111 / 123456")
    print("   患者: 13800002222 / 123456")
    print(f"   邀请码: CL-TEST-CODE")
    print("")
    print("📊 数据概况：")
    print(f"   疗程 1: {cycle1_start} ~ {cycle1_start + timedelta(days=20)} (XELOX, 轻度)")
    print(f"   疗程 2: {cycle2_start} ~ {cycle2_start + timedelta(days=20)} (XELOX, 正常)")
    print(f"   疗程 3: {cycle3_start} ~ {cycle3_start + timedelta(days=20)} (FOLFOX, 较重)")
    print(f"   疗程 4: {cycle4_start} ~ 进行中 Day {current_cycle_day} (FOLFOX, 改善中)")
    print("")


if __name__ == "__main__":
    seed()
