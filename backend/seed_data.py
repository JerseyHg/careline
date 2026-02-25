"""
CareLine 种子数据脚本
运行方式: python seed_data.py
会创建两个测试账号 + 一个家庭 + 疗程 + 多天记录
"""
import os
import sys
import random
from datetime import date, datetime, timedelta

# 设置数据库连接（和 start.ps1 保持一致）
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://careline:careline_secret@localhost:5432/careline",
)

from database import engine, SessionLocal, init_db
from models import User, Family, FamilyMember, ChemoCycle, DailyLog, StoolEvent, FamilyMessage, RoleEnum
from auth import hash_password, generate_invite_code

def seed():
    init_db()
    db = SessionLocal()

    # ─── 清理旧数据（开发用，生产环境别跑这个！）──────────
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

    # 家属账号
    caregiver_user = User(
        phone="13800001111",
        nickname="小明",
        avatar_url=hash_password("123456"),  # 密码: 123456
    )
    db.add(caregiver_user)

    # 患者账号
    patient_user = User(
        phone="13800002222",
        nickname="爸爸",
        avatar_url=hash_password("123456"),  # 密码: 123456
    )
    db.add(patient_user)
    db.flush()

    print(f"   家属: 手机 13800001111 / 密码 123456")
    print(f"   患者: 手机 13800002222 / 密码 123456")

    # ─── 创建家庭 ──────────────────────────────────────────
    print("👨‍👩‍👧 创建家庭...")
    family = Family(
        name="我们的家",
        invite_code="CL-TEST-CODE",
        created_by=caregiver_user.id,
    )
    db.add(family)
    db.flush()

    # 加入家庭
    db.add(FamilyMember(user_id=caregiver_user.id, family_id=family.id, role=RoleEnum.caregiver))
    db.add(FamilyMember(user_id=patient_user.id, family_id=family.id, role=RoleEnum.patient))
    db.flush()

    # ─── 创建疗程 ──────────────────────────────────────────
    print("💊 创建化疗疗程...")

    # 上一个疗程（第4疗程，已结束）
    cycle4_start = date.today() - timedelta(days=35)
    cycle4 = ChemoCycle(
        family_id=family.id,
        cycle_no=4,
        start_date=cycle4_start,
        length_days=21,
        regimen="FOLFOX",
        is_active=False,
    )
    db.add(cycle4)

    # 当前疗程（第5疗程）
    cycle5_start = date.today() - timedelta(days=6)  # 今天是 Day 7
    cycle5 = ChemoCycle(
        family_id=family.id,
        cycle_no=5,
        start_date=cycle5_start,
        length_days=21,
        regimen="FOLFOX",
        is_active=True,
    )
    db.add(cycle5)
    db.flush()

    print(f"   第4疗程: {cycle4_start} (已结束)")
    print(f"   第5疗程: {cycle5_start} (进行中，今天 Day 7)")

    # ─── 第4疗程记录（用于跨疗程对比）─────────────────────
    print("📝 生成第4疗程历史数据...")

    cycle4_data = [
        # day, energy, nausea, appetite, sleep, fever, temp, stool, diarrhea, tough
        (1, 1, 0, 4, 1, False, None, 2, 0, False),
        (2, 1, 1, 3, 1, False, None, 2, 0, False),
        (3, 2, 2, 2, 2, False, None, 3, 1, False),
        (4, 3, 2, 1, 2, True, 37.6, 4, 2, True),
        (5, 2, 3, 1, 3, True, 38.0, 5, 2, True),
        (6, 2, 2, 2, 2, False, None, 4, 1, False),
        (7, 2, 1, 2, 2, False, None, 3, 1, False),
        (8, 1, 1, 3, 1, False, None, 3, 0, False),
        (9, 1, 1, 3, 1, False, None, 2, 0, False),
        (10, 1, 0, 3, 1, False, None, 2, 0, False),
        (11, 1, 0, 4, 1, False, None, 2, 0, False),
        (12, 0, 0, 4, 0, False, None, 2, 0, False),
        (13, 0, 0, 4, 0, False, None, 2, 0, False),
        (14, 0, 0, 4, 0, False, None, 1, 0, False),
    ]

    for day, energy, nausea, appetite, sleep, fever, temp, stool, diarrhea, tough in cycle4_data:
        log_date = cycle4_start + timedelta(days=day - 1)
        log = DailyLog(
            family_id=family.id,
            date=log_date,
            cycle_no=4,
            cycle_day=day,
            energy=energy,
            nausea=nausea,
            appetite=appetite,
            sleep_quality=sleep,
            fever=fever,
            temp_c=temp,
            stool_count=stool,
            diarrhea=diarrhea,
            is_tough_day=tough,
            numbness=(day >= 3 and day <= 6),
            mouth_sore=(day >= 5 and day <= 8),
            recorded_by=patient_user.id,
        )
        db.add(log)

    # ─── 第5疗程记录（当前疗程，到昨天为止）─────────────────
    print("📝 生成第5疗程当前数据...")

    cycle5_data = [
        # day, energy, nausea, appetite, sleep, fever, temp, stool, diarrhea, tough, blood, mucus, tenesmus
        (1, 1, 0, 4, 1, False, None,  2, 0, False, 0, 0, 0),
        (2, 1, 1, 3, 1, False, None,  3, 1, False, 0, 0, 0),
        (3, 2, 2, 2, 2, False, None,  4, 1, False, 0, 1, 1),
        (4, 3, 3, 1, 2, True,  37.8,  5, 2, True,  1, 1, 1),
        (5, 3, 2, 1, 3, True,  38.2,  6, 2, True,  0, 1, 1),
        (6, 2, 2, 2, 2, False, None,  4, 1, False, 0, 0, 1),
    ]

    for day, energy, nausea, appetite, sleep, fever, temp, stool, diarrhea, tough, blood, mucus, tenesmus in cycle5_data:
        log_date = cycle5_start + timedelta(days=day - 1)
        log = DailyLog(
            family_id=family.id,
            date=log_date,
            cycle_no=5,
            cycle_day=day,
            energy=energy,
            nausea=nausea,
            appetite=appetite,
            sleep_quality=sleep,
            fever=fever,
            temp_c=temp,
            stool_count=stool,
            diarrhea=diarrhea,
            is_tough_day=tough,
            numbness=(day >= 3),
            mouth_sore=False,
            stool_blood_count=blood,
            stool_mucus_count=mucus,
            stool_tenesmus_count=tenesmus,
            recorded_by=patient_user.id,
        )
        db.add(log)

        # 生成对应的排便事件
        for i in range(stool):
            hour = 7 + i * 2 + random.randint(0, 1)
            minute = random.randint(0, 59)
            event = StoolEvent(
                family_id=family.id,
                date=log_date,
                time=f"{hour:02d}:{minute:02d}",
                bristol=random.choice([4, 5, 5, 6]) if diarrhea > 0 else random.choice([3, 4, 4, 5]),
                blood=(i == 0 and blood > 0),
                mucus=(i == 0 and mucus > 0),
                tenesmus=(tenesmus > 0 and i < 2),
            )
            db.add(event)

    # ─── 家人留言 ──────────────────────────────────────────
    print("💌 创建家人留言...")
    msg = FamilyMessage(
        family_id=family.id,
        sender_id=caregiver_user.id,
        content="爸，今天我来做饭，想吃什么告诉我 ❤️",
        is_active=True,
    )
    db.add(msg)

    # ─── 提交 ─────────────────────────────────────────────
    db.commit()
    db.close()

    print("")
    print("=" * 50)
    print("✅ 种子数据创建完成！")
    print("=" * 50)
    print("")
    print("📱 测试账号：")
    print("   家属: 13800001111 / 123456")
    print("   患者: 13800002222 / 123456")
    print("")
    print(f"   邀请码: CL-TEST-CODE")
    print(f"   当前: 第5疗程 Day 7")
    print(f"   数据: 第4疗程14天 + 第5疗程6天 + 排便事件 + 留言")
    print("")
    print("🌐 打开 http://localhost:5173 登录查看")


if __name__ == "__main__":
    seed()
