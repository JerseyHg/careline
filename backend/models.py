"""
CareLine Database Models
化疗周期副作用管理系统 - 数据模型
"""
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    Text, ForeignKey, UniqueConstraint, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship, declarative_base
import enum
import uuid

Base = declarative_base()


class RoleEnum(str, enum.Enum):
    patient = "patient"
    caregiver = "caregiver"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    openid = Column(String(128), unique=True, nullable=True, index=True)  # WeChat openid
    phone = Column(String(20), unique=True, nullable=True)
    nickname = Column(String(64), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    family_memberships = relationship("FamilyMember", back_populates="user")


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False, default="我的家庭")
    invite_code = Column(String(16), unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    members = relationship("FamilyMember", back_populates="family")
    cycles = relationship("ChemoCycle", back_populates="family")
    daily_logs = relationship("DailyLog", back_populates="family")
    stool_events = relationship("StoolEvent", back_populates="family")
    messages = relationship("FamilyMessage", back_populates="family")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "family_id", name="uq_user_family"),
    )

    # Relationships
    user = relationship("User", back_populates="family_memberships")
    family = relationship("Family", back_populates="members")


class ChemoCycle(Base):
    """化疗疗程"""
    __tablename__ = "chemo_cycles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    cycle_no = Column(Integer, nullable=False)  # 第几疗程
    start_date = Column(Date, nullable=False)
    length_days = Column(Integer, nullable=False, default=21)  # 周期天数
    regimen = Column(String(64), nullable=True)  # 化疗方案, e.g. FOLFOX
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("family_id", "cycle_no", name="uq_family_cycle"),
        Index("ix_family_active", "family_id", "is_active"),
    )

    family = relationship("Family", back_populates="cycles")


class DailyLog(Base):
    """每日记录（核心表）"""
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    date = Column(Date, nullable=False)
    cycle_no = Column(Integer, nullable=True)
    cycle_day = Column(Integer, nullable=True)

    # 体力 ECOG 0-4
    energy = Column(Integer, nullable=True)
    # 恶心 0-3
    nausea = Column(Integer, nullable=True)
    # 食欲 0-5
    appetite = Column(Integer, nullable=True)
    # 睡眠 0-3
    sleep_quality = Column(Integer, nullable=True)
    # 发热
    fever = Column(Boolean, default=False)
    temp_c = Column(Float, nullable=True)
    # 排便（由 stool_events 汇总，也可手动填）
    stool_count = Column(Integer, nullable=True)
    # 腹泻 0-3
    diarrhea = Column(Integer, nullable=True)
    # 手足麻木
    numbness = Column(Boolean, default=False)
    # 口腔溃疡
    mouth_sore = Column(Boolean, default=False)
    # 是否"困难日"快捷记录
    is_tough_day = Column(Boolean, default=False)
    # 备注
    note = Column(Text, nullable=True)

    # 由 stool_events 汇总的字段
    stool_blood_count = Column(Integer, default=0)
    stool_mucus_count = Column(Integer, default=0)
    stool_tenesmus_count = Column(Integer, default=0)

    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("family_id", "date", name="uq_family_date"),
        Index("ix_family_date_range", "family_id", "date"),
        Index("ix_family_cycle", "family_id", "cycle_no"),
    )

    family = relationship("Family", back_populates="daily_logs")


class StoolEvent(Base):
    """单次排便事件（即时记录）"""
    __tablename__ = "stool_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(String(8), nullable=True)  # HH:MM format
    bristol = Column(Integer, nullable=True)  # 1-7
    blood = Column(Boolean, default=False)
    mucus = Column(Boolean, default=False)
    tenesmus = Column(Boolean, default=False)

    recorded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_stool_family_date", "family_id", "date"),
    )

    family = relationship("Family", back_populates="stool_events")


class FamilyMessage(Base):
    """家人留言"""
    __tablename__ = "family_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    family = relationship("Family", back_populates="messages")
