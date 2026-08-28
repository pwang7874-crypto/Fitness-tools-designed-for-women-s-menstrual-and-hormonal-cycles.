# -*- coding: utf-8 -*-
"""API 输入结构：显式约束健康、周期与情绪敏感数据。"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

Mood = Literal["very_bad", "low", "ok", "good", "great"]
Pain = Literal["none", "mild", "moderate"]
Bleeding = Literal["none", "spotting", "light", "medium", "heavy"]


class OnboardingIn(BaseModel):
    invite_code: str = Field(default="", max_length=64)
    display_name: str = Field(default="", max_length=32)
    is_adult: bool = False
    accepted_terms: bool = False
    health_consent: bool = False
    cycle_consent: bool = False
    mood_consent: bool = False
    goal: Literal["strength", "shape", "health"] = "health"
    experience_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    weekly_frequency: int = Field(ge=1, le=7, default=3)
    session_minutes: int = Field(ge=10, le=180, default=40)
    equipment: list[str] = Field(default_factory=list)
    injured_areas: list[str] = Field(default_factory=list)
    cycle_mode: Literal["natural", "hormonal", "irregular", "unknown"] = "unknown"
    typical_cycle_days: int = Field(ge=21, le=45, default=28)

    @model_validator(mode="after")
    def validate_required_consents(self):
        if not self.is_adult:
            raise ValueError("顺期健身app当前仅面向已满 18 周岁的成年人")
        if not self.accepted_terms or not self.health_consent:
            raise ValueError("需要同意服务条款与健康数据处理说明")
        return self


class CheckInIn(BaseModel):
    profile_id: int
    available_minutes: int = Field(ge=10, le=180, default=40)
    energy: int = Field(ge=1, le=5, default=3)
    sleep_hours: float = Field(ge=0, le=24, default=7)
    soreness: int = Field(ge=0, le=5, default=0)
    pain: Pain = "none"
    mood: Mood = "ok"  # 用户手动选择；不从日记推断
    stress: int = Field(ge=1, le=5, default=3)
    symptoms: list[str] = Field(default_factory=list, max_length=12)
    bleeding: Bleeding = "none"
    diary: Optional[str] = Field(default=None, max_length=2000)
    equipment: Optional[list[str]] = None
    red_flags: list[str] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=500)


class PeriodIn(BaseModel):
    profile_id: int
    start_date: str
    end_date: Optional[str] = None


class PrivacySettingsIn(BaseModel):
    cycle_consent: bool
    mood_consent: bool


class ProfileUpdateIn(BaseModel):
    display_name: str = Field(default="", max_length=32)
    goal: Literal["strength", "shape", "health"]
    experience_level: Literal["beginner", "intermediate", "advanced"]
    weekly_frequency: int = Field(ge=1, le=7)
    session_minutes: int = Field(ge=10, le=180)
    equipment: list[str] = Field(default_factory=list)
    injured_areas: list[str] = Field(default_factory=list)
    cycle_mode: Literal["natural", "hormonal", "irregular", "unknown"]
    typical_cycle_days: int = Field(ge=21, le=45, default=28)


class ChatIn(BaseModel):
    profile_id: int
    plan_id: int
    message: str = Field(..., min_length=1, max_length=500)


class ChatApplyIn(BaseModel):
    profile_id: int
    plan_id: int
    change: dict


class ExerciseLog(BaseModel):
    exercise_id: str
    completed_sets: int = Field(ge=0, le=20)
    target_sets: int = Field(ge=1, le=20)
    actual_reps: list[int] = Field(default_factory=list, max_length=20)
    skipped: bool = False


class FeedbackIn(BaseModel):
    plan_id: int
    completion: float = Field(ge=0, le=1, default=1.0)
    rpe: Optional[int] = Field(default=None, ge=1, le=10)
    pain_after: Pain = "none"
    mood_after: Mood = "ok"
    satisfaction: int = Field(default=3, ge=1, le=5)
    stop_reason: Literal["completed", "time", "fatigue", "pain", "other"] = "completed"
    duration_min: Optional[int] = Field(default=None, ge=0, le=360)
    started_at: Optional[datetime] = None
    exercise_logs: list[ExerciseLog] = Field(default_factory=list, max_length=40)


class ExerciseOut(BaseModel):
    id: str
    name_zh: str
    name_en: str
    category: str
    primary_muscles: list[str]
    secondary_muscles: list[str]
    equipment: list[str]
    level: str
    home_friendly: bool
