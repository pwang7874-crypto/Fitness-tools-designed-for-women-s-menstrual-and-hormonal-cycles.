# -*- coding: utf-8 -*-
"""SQLAlchemy 数据模型（第一阶段最小集）。"""
from datetime import datetime, date

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(32), default="")
    access_token_hash: Mapped[str] = mapped_column(String(64), default="", index=True)
    is_adult: Mapped[bool] = mapped_column(Boolean, default=False)
    accepted_terms_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    health_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cycle_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    mood_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_version: Mapped[str] = mapped_column(String(16), default="2026-08")
    goal: Mapped[str] = mapped_column(String(32))                    # strength / shape / health
    experience_level: Mapped[str] = mapped_column(String(16))        # beginner / intermediate / advanced
    weekly_frequency: Mapped[int] = mapped_column(Integer)
    session_minutes: Mapped[int] = mapped_column(Integer)
    equipment: Mapped[list] = mapped_column(JSON, default=list)      # 器械 slug 列表
    injured_areas: Mapped[list] = mapped_column(JSON, default=list)  # 伤病部位 slug 列表
    cycle_mode: Mapped[str] = mapped_column(String(32), default="unknown")  # natural / hormonal / irregular / unknown
    typical_cycle_days: Mapped[int] = mapped_column(Integer, default=28)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(Integer)
    day: Mapped[date] = mapped_column(Date, default=date.today)
    available_minutes: Mapped[int] = mapped_column(Integer)
    energy: Mapped[int] = mapped_column(Integer)          # 1-5
    sleep_hours: Mapped[float] = mapped_column(Float)     # 小时
    soreness: Mapped[int] = mapped_column(Integer)        # 0-5
    pain: Mapped[str] = mapped_column(String(16))         # none / mild / moderate
    stress: Mapped[int] = mapped_column(Integer, default=3)
    symptoms: Mapped[list] = mapped_column(JSON, default=list)
    bleeding: Mapped[str] = mapped_column(String(16), default="none")
    diary: Mapped[str] = mapped_column(Text, default="")  # 用户可选私密记录，不发送给模型
    notes: Mapped[str] = mapped_column(Text, default="")
    equipment: Mapped[list] = mapped_column(JSON, default=list)
    mood: Mapped[str] = mapped_column(String(16))         # 用户手动选择
    tag: Mapped[str] = mapped_column(String(16), default="")  # 情绪标签（疲惫/低落/平静…）
    red_flags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MoodRecord(Base):
    __tablename__ = "mood_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(Integer)
    mood: Mapped[str] = mapped_column(String(16))
    tag: Mapped[str] = mapped_column(String(16), default="")
    source: Mapped[str] = mapped_column(String(16), default="diary")  # diary / feedback
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(Integer)
    checkin_id: Mapped[int] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(Integer, default=1)
    goal: Mapped[str] = mapped_column(String(32))
    duration_min: Mapped[int] = mapped_column(Integer)
    readiness_band: Mapped[str] = mapped_column(String(16))
    mood: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    confidence_factors: Mapped[list] = mapped_column(JSON, default=list)
    comfort_msg: Mapped[str] = mapped_column(Text, default="")
    rest_suggestion: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[list] = mapped_column(JSON, default=list)
    blocks: Mapped[list] = mapped_column(JSON, default=list)
    validation_status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(Integer)
    profile_id: Mapped[int] = mapped_column(Integer)
    completion: Mapped[float] = mapped_column(Float)      # 0-1
    rpe: Mapped[int] = mapped_column(Integer, nullable=True)   # 1-10
    pain_after: Mapped[str] = mapped_column(String(16), default="none")
    mood_after: Mapped[str] = mapped_column(String(16), default="ok")
    satisfaction: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    stop_reason: Mapped[str] = mapped_column(String(32), default="completed")
    status: Mapped[str] = mapped_column(String(16), default="completed")
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exercise_logs: Mapped[list] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PeriodRecord(Base):
    __tablename__ = "period_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(Integer)
    rule_code: Mapped[str] = mapped_column(String(32))
    stage: Mapped[str] = mapped_column(String(16))
    result: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
