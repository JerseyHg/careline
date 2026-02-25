"""
Pydantic schemas for API request/response
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────
class RoleEnum(str, Enum):
    patient = "patient"
    caregiver = "caregiver"


class SummaryMode(str, Enum):
    patient = "patient"
    caregiver = "caregiver"


# ─── Auth ─────────────────────────────────────────────────────────────
class WechatLoginRequest(BaseModel):
    code: str


class PhoneLoginRequest(BaseModel):
    phone: str
    password: str


class RegisterRequest(BaseModel):
    phone: str
    password: str
    nickname: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    nickname: Optional[str] = None


# ─── User ─────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    nickname: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True


# ─── Family ──────────────────────────────────────────────────────────
class FamilyCreate(BaseModel):
    name: str = "我的家庭"
    role: RoleEnum = RoleEnum.caregiver


class FamilyJoin(BaseModel):
    invite_code: str
    role: RoleEnum


class FamilyMemberOut(BaseModel):
    user_id: int
    nickname: Optional[str] = None
    role: RoleEnum
    joined_at: datetime

    class Config:
        from_attributes = True


class FamilyOut(BaseModel):
    id: int
    name: str
    invite_code: str
    my_role: RoleEnum
    members: List[FamilyMemberOut] = []

    class Config:
        from_attributes = True


# ─── ChemoCycle ──────────────────────────────────────────────────────
class CycleCreate(BaseModel):
    cycle_no: int = Field(..., ge=1)
    start_date: date
    length_days: int = Field(21, ge=7, le=42)
    regimen: Optional[str] = None


class CycleUpdate(BaseModel):
    start_date: Optional[date] = None
    length_days: Optional[int] = Field(None, ge=7, le=42)
    regimen: Optional[str] = None
    is_active: Optional[bool] = None


class CycleOut(BaseModel):
    id: int
    cycle_no: int
    start_date: date
    length_days: int
    regimen: Optional[str]
    is_active: bool
    current_day: Optional[int] = None  # computed

    class Config:
        from_attributes = True


# ─── DailyLog ────────────────────────────────────────────────────────
class DailyLogUpsert(BaseModel):
    energy: Optional[int] = Field(None, ge=0, le=4)
    nausea: Optional[int] = Field(None, ge=0, le=3)
    appetite: Optional[int] = Field(None, ge=0, le=5)
    sleep_quality: Optional[int] = Field(None, ge=0, le=3)
    fever: bool = False
    temp_c: Optional[float] = Field(None, ge=35.0, le=42.0)
    stool_count: Optional[int] = Field(None, ge=0, le=30)
    diarrhea: Optional[int] = Field(None, ge=0, le=3)
    numbness: bool = False
    mouth_sore: bool = False
    is_tough_day: bool = False
    note: Optional[str] = None


class DailyLogOut(BaseModel):
    id: int
    family_id: int
    date: date
    cycle_no: Optional[int]
    cycle_day: Optional[int]
    energy: Optional[int]
    nausea: Optional[int]
    appetite: Optional[int]
    sleep_quality: Optional[int]
    fever: bool
    temp_c: Optional[float]
    stool_count: Optional[int]
    diarrhea: Optional[int]
    numbness: bool
    mouth_sore: bool
    is_tough_day: bool
    note: Optional[str]
    stool_blood_count: int
    stool_mucus_count: int
    stool_tenesmus_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── StoolEvent ──────────────────────────────────────────────────────
class StoolEventCreate(BaseModel):
    date: Optional[date] = None  # defaults to today
    time: Optional[str] = None   # HH:MM
    bristol: Optional[int] = Field(None, ge=1, le=7)
    blood: bool = False
    mucus: bool = False
    tenesmus: bool = False


class StoolEventOut(BaseModel):
    id: int
    date: date
    time: Optional[str]
    bristol: Optional[int]
    blood: bool
    mucus: bool
    tenesmus: bool
    recorded_at: datetime

    class Config:
        from_attributes = True


class StoolDailySummary(BaseModel):
    date: date
    count: int
    events: List[StoolEventOut]
    blood_count: int
    mucus_count: int
    tenesmus_count: int


# ─── FamilyMessage ───────────────────────────────────────────────────
class MessageCreate(BaseModel):
    content: str = Field(..., max_length=500)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_nickname: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Summary ─────────────────────────────────────────────────────────
class KeyStats(BaseModel):
    max_nausea: Optional[int] = None
    max_nausea_day: Optional[int] = None
    min_energy: Optional[int] = None  # actually max energy value = worst
    min_energy_day: Optional[int] = None
    max_stool: Optional[int] = None
    max_stool_day: Optional[int] = None
    max_diarrhea: Optional[int] = None
    max_diarrhea_day: Optional[int] = None
    fever_events: List[dict] = []  # [{date, day, temp}]
    blood_events: List[dict] = []
    avg_energy_7d: Optional[float] = None
    avg_nausea_7d: Optional[float] = None
    avg_stool_7d: Optional[float] = None
    avg_sleep_7d: Optional[float] = None
    worst_days: List[dict] = []  # [{day, date, reasons}]


class TrendPoint(BaseModel):
    date: date
    cycle_day: Optional[int]
    energy: Optional[int]
    nausea: Optional[int]
    appetite: Optional[int]
    sleep_quality: Optional[int]
    stool_count: Optional[int]
    diarrhea: Optional[int]
    fever: bool
    temp_c: Optional[float]
    is_tough_day: bool


class SummaryResponse(BaseModel):
    cycle_no: int
    cycle_day: int
    start_date: date
    length_days: int
    mode: SummaryMode
    trends: List[TrendPoint]
    key_stats: KeyStats
    summary_text: str


# ─── Calendar ────────────────────────────────────────────────────────
class CalendarDay(BaseModel):
    date: date
    cycle_day: Optional[int]
    status: str  # good / okay / tough / rest / none
    emoji: str
    recorded: bool


class CalendarResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDay]
    total_recorded: int
    good_days: int
    streak: int
