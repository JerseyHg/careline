"""
时区工具：统一使用中国时间（Asia/Shanghai UTC+8）
"""
from datetime import date, datetime, timezone, timedelta

CHINA_TZ = timezone(timedelta(hours=8))


def china_today() -> date:
    """返回中国时区的今天日期"""
    return datetime.now(CHINA_TZ).date()


def china_now() -> datetime:
    """返回中国时区的当前时间"""
    return datetime.now(CHINA_TZ)
