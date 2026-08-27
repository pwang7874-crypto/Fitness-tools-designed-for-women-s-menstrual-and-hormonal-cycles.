# -*- coding: utf-8 -*-
"""Pydantic 输入输出结构。"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Mood = Literal["very_bad", "low", "ok", "good", "great"]
Pain = Literal["none", "mild", "moderate"]


class OnboardingIn(BaseModel):
    goal: Literal["strength", "shape", "health"] = "health"
    experience_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    weekly_frequency: int = Field(ge=1, le=7, default=3)
    session_minutes: int = Field(ge=10, le=180, default=40)
    equipment: list[str] = Field(default_factory=list)
    injured_areas: list[str] = Field(default_factory=list)
    cycle_mode: Literal["natural", "hormonal", "irregular", "unknown"] = "unknown"


class CheckInIn(BaseModel):
    profile_id: int
    available_minutes: int = Field(ge=10, le=180, default=40)
    energy: int = Field(ge=1, le=5, default=3)
    sleep_hours: float = Field(ge=0, le=24, default=7)
    soreness: int = Field(ge=0, le=5, default=0)
    pain: Pain = "none"
    diary: Optional[str] = None          # 日记：由 AI 判断心情，不再手动选心情
    red_flags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class PeriodIn(BaseModel):
    profile_id: int
    start_date: str          # YYYY-MM-DD
    end_date: Optional[str] = None


class FeedbackIn(BaseModel):
    plan_id: int
    completion: float = Field(ge=0, le=1, default=1.0)
    rpe: Optional[int] = Field(default=None, ge=1, le=10)
    pain_after: Pain = "none"
    mood_after: Mood = "ok"
    satisfaction: int = Field(default=3, ge=1, le=5)
    stop_reason: str = "completed"


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
