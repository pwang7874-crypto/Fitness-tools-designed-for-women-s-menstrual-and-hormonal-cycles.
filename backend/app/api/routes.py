# -*- coding: utf-8 -*-
"""API 路由（第一阶段核心链路）。"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from .. import models
from ..schemas import CheckInIn, FeedbackIn, OnboardingIn
from ..services import comfort, llm, mood, plan_engine, readiness, safety, validator

router = APIRouter(prefix="/api/v1")

PROMPT_DIR = Path(__file__).resolve().parents[1] / "services" / "prompts"


def _polish_rationale(reasons: list[str]) -> str:
    prompt = (PROMPT_DIR / "rationale.txt").read_text(encoding="utf-8").format(
        reasons="\n".join(reasons))
    try:
        return llm.chat(prompt, max_tokens=200)
    except llm.LLMError:
        return "；".join(reasons)  # 确定性降级


@router.post("/onboarding")
def onboarding(payload: OnboardingIn, db: Session = Depends(get_db)):
    profile = models.UserProfile(
        goal=payload.goal,
        experience_level=payload.experience_level,
        weekly_frequency=payload.weekly_frequency,
        session_minutes=payload.session_minutes,
        equipment=payload.equipment,
        injured_areas=payload.injured_areas,
        cycle_mode=payload.cycle_mode,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"profile_id": profile.id}


@router.get("/exercises")
def list_exercises():
    return plan_engine.load_exercises()


@router.post("/checkin")
def checkin(payload: CheckInIn, db: Session = Depends(get_db)):
    profile = db.get(models.UserProfile, payload.profile_id)
    if not profile:
        raise HTTPException(404, "profile not found")

    # 1) 安全规则层（最优先）
    red_flags = safety.check_red_flags(payload.red_flags)
    if red_flags:
        for rf in red_flags:
            db.add(models.SafetyEvent(profile_id=profile.id, rule_code=rf["code"],
                                      stage="checkin", result="stop"))
        db.commit()
        return {"status": "safety_stop", "red_flags": red_flags}

    # 2) 日记心情分析（AI 从日记判断心情 + 情绪标签）
    mood_result = mood.analyze(payload.diary)

    # 3) 落库 Check-in + 情绪记录
    checkin_row = models.DailyCheckIn(
        profile_id=profile.id,
        available_minutes=payload.available_minutes,
        energy=payload.energy,
        sleep_hours=payload.sleep_hours,
        soreness=payload.soreness,
        pain=payload.pain,
        diary=payload.diary or "",
        mood=mood_result["mood"],
        red_flags=payload.red_flags,
    )
    db.add(checkin_row)
    db.add(models.MoodRecord(profile_id=profile.id, mood=mood_result["mood"],
                             tag=mood_result["tag"], source="diary"))
    db.commit()
    db.refresh(checkin_row)

    # 4) 准备度 + 情绪安慰 + 计划
    readiness_result = readiness.compute(
        energy=payload.energy, sleep_hours=payload.sleep_hours,
        soreness=payload.soreness, pain=payload.pain, mood=mood_result["mood"])
    comfort_result = comfort.get_comfort(mood_result["mood"])

    profile_dict = {
        "goal": profile.goal, "experience_level": profile.experience_level,
        "equipment": profile.equipment, "injured_areas": profile.injured_areas,
    }
    checkin_dict = payload.model_dump()
    checkin_dict["mood"] = mood_result["mood"]
    plan = plan_engine.generate_plan(profile_dict, checkin_dict, readiness_result, comfort_result)

    # 4) 计划验证器（不可绕过）
    result = validator.validate(plan, profile_dict)
    if result["status"] == "revise":
        db.add(models.SafetyEvent(profile_id=profile.id, rule_code="plan_invalid",
                                  stage="validate", result="fallback"))
        db.commit()
        # 兜底：只保留审核库中可用的前 3 个动作的保守方案
        exs = plan_engine.load_exercises()
        fallback_exs = [e for e in exs if e["level"] == "beginner"][:3]
        main = [{"exercise_id": e["id"], "name_zh": e["name_zh"], "name_en": e["name_en"],
                 "category": e["category"], "primary_muscles": e["primary_muscles"],
                 "sets": 2, "reps": "12-15", "rpe": 5, "rest_sec": 60, "swap_alternatives": []}
                for e in fallback_exs]
        plan["blocks"] = [
            {"type": "warmup", "title": "热身", "duration_min": 5, "items": ["轻松热身 5 分钟"]},
            {"type": "main", "title": "主训练（安全模板）", "exercises": main},
            {"type": "cooldown", "title": "整理", "duration_min": 3, "items": ["静态拉伸 3 分钟"]},
        ]
        plan["validation_status"] = "fallback"
    else:
        plan["validation_status"] = "pass"

    rationale_text = _polish_rationale(plan["rationale"])

    plan_row = models.TrainingPlan(
        profile_id=profile.id, checkin_id=checkin_row.id, version=1,
        goal=plan["goal"], duration_min=plan["duration_min"],
        readiness_band=plan["readiness_band"], mood=plan["mood"],
        confidence=plan["confidence"], comfort_msg=plan["comfort_msg"],
        rest_suggestion=plan["rest_suggestion"], rationale=plan["rationale"],
        blocks=plan["blocks"], validation_status=plan["validation_status"],
    )
    db.add(plan_row)
    db.commit()
    db.refresh(plan_row)

    return {
        "status": "ok",
        "checkin_id": checkin_row.id,
        "plan_id": plan_row.id,
        "mood": mood_result,
        "readiness": readiness_result,
        "confidence": plan["confidence"],
        "comfort_msg": plan["comfort_msg"],
        "rest_suggestion": plan["rest_suggestion"],
        "rationale_text": rationale_text,
        "plan": plan,
    }


@router.get("/plan/{plan_id}")
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(models.TrainingPlan, plan_id)
    if not plan:
        raise HTTPException(404, "plan not found")
    return {
        "plan_id": plan.id, "version": plan.version, "goal": plan.goal,
        "duration_min": plan.duration_min, "readiness_band": plan.readiness_band,
        "mood": plan.mood, "confidence": plan.confidence,
        "comfort_msg": plan.comfort_msg, "rest_suggestion": plan.rest_suggestion,
        "rationale": plan.rationale, "blocks": plan.blocks,
        "validation_status": plan.validation_status,
    }


@router.get("/insights/{profile_id}")
def insights(profile_id: int, db: Session = Depends(get_db)):
    """周洞察（简化版）：训练次数、平均完成度、近期情绪趋势。只陈述事实，不输出因果。"""
    from sqlalchemy import func, select
    sessions = db.query(models.WorkoutSession).filter_by(profile_id=profile_id).all()
    moods = db.query(models.MoodRecord).filter_by(profile_id=profile_id).order_by(
        models.MoodRecord.created_at.desc()).limit(30).all()
    return {
        "session_count": len(sessions),
        "avg_completion": round(sum(s.completion for s in sessions) / len(sessions), 2) if sessions else None,
        "avg_rpe": round(sum(s.rpe for s in sessions if s.rpe) / len([s for s in sessions if s.rpe]), 1) if any(s.rpe for s in sessions) else None,
        "mood_trend": [{"mood": m.mood, "tag": m.tag, "at": m.created_at.isoformat()} for m in moods],
    }


@router.get("/export/{profile_id}")
def export_data(profile_id: int, db: Session = Depends(get_db)):
    """数据控制：导出该用户的全部数据（JSON），用于「查看/导出」。"""
    profile = db.get(models.UserProfile, profile_id)
    if not profile:
        raise HTTPException(404, "profile not found")
    checkins = db.query(models.DailyCheckIn).filter_by(profile_id=profile_id).all()
    plans = db.query(models.TrainingPlan).filter_by(profile_id=profile_id).all()
    sessions = db.query(models.WorkoutSession).filter_by(profile_id=profile_id).all()
    moods = db.query(models.MoodRecord).filter_by(profile_id=profile_id).all()
    def dump(obj, cols):
        return [{c: getattr(o, c) for c in cols} for o in obj]
    return {
        "profile": dump([profile], ["id", "goal", "experience_level", "weekly_frequency",
                                     "session_minutes", "equipment", "injured_areas", "cycle_mode"]),
        "checkins": dump(checkins, ["id", "day", "available_minutes", "energy", "sleep_hours",
                                     "soreness", "pain", "mood", "red_flags", "created_at"]),
        "plans": dump(plans, ["id", "checkin_id", "version", "goal", "duration_min", "readiness_band",
                               "mood", "confidence", "comfort_msg", "rationale", "blocks", "validation_status"]),
        "sessions": dump(sessions, ["id", "plan_id", "completion", "rpe", "pain_after", "mood_after",
                                     "satisfaction", "stop_reason", "created_at"]),
        "moods": dump(moods, ["id", "mood", "source", "created_at"]),
    }


@router.delete("/profile/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """数据控制：删除该用户全部数据（软删除由前端二次确认后调用）。"""
    profile = db.get(models.UserProfile, profile_id)
    if not profile:
        raise HTTPException(404, "profile not found")
    for model, fk in [(models.DailyCheckIn, "profile_id"), (models.MoodRecord, "profile_id"),
                      (models.TrainingPlan, "profile_id"), (models.WorkoutSession, "profile_id"),
                      (models.SafetyEvent, "profile_id")]:
        db.query(model).filter(getattr(model, fk) == profile_id).delete()
    db.delete(profile)
    db.commit()
    return {"status": "deleted"}


@router.post("/feedback")
def feedback(payload: FeedbackIn, db: Session = Depends(get_db)):
    plan = db.get(models.TrainingPlan, payload.plan_id)
    if not plan:
        raise HTTPException(404, "plan not found")
    session = models.WorkoutSession(
        plan_id=payload.plan_id, profile_id=plan.profile_id,
        completion=payload.completion, rpe=payload.rpe,
        pain_after=payload.pain_after, mood_after=payload.mood_after,
        satisfaction=payload.satisfaction, stop_reason=payload.stop_reason,
    )
    db.add(session)
    db.add(models.MoodRecord(profile_id=plan.profile_id, mood=payload.mood_after,
                             source="feedback"))
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "status": "ok"}
