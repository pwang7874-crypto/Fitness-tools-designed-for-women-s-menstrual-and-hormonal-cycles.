# -*- coding: utf-8 -*-
"""顺期健身app Web MVP API：确定性安全规则包裹可选 AI 能力。"""
from collections import Counter
from datetime import date, datetime, timedelta
import hashlib
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from .. import models
from ..core.config import settings
from ..core.db import get_db
from ..schemas import (
    ChatApplyIn,
    ChatIn,
    CheckInIn,
    FeedbackIn,
    OnboardingIn,
    PeriodIn,
    ProfileUpdateIn,
    PrivacySettingsIn,
)
from ..services import coach, comfort, cycle, llm, mood, plan_engine, readiness, safety, validator

router = APIRouter(prefix="/api/v1")
PROMPT_DIR = Path(__file__).resolve().parents[1] / "services" / "prompts"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _set_session(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE,
        value=token,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _session_profile(request: Request, db: Session) -> models.UserProfile:
    token = request.cookies.get(settings.SESSION_COOKIE, "")
    if not token:
        raise HTTPException(401, "请先建立或恢复档案")
    profile = db.query(models.UserProfile).filter_by(access_token_hash=_hash_token(token)).first()
    if not profile:
        raise HTTPException(401, "会话已失效，请重新建立档案")
    return profile


def _require_profile(profile_id: int, request: Request, db: Session) -> models.UserProfile:
    profile = _session_profile(request, db)
    if profile.id != profile_id:
        raise HTTPException(404, "profile not found")
    return profile


def _profile_dict(profile: models.UserProfile, equipment: list[str] | None = None,
                  available_minutes: int | None = None) -> dict:
    return {
        "goal": profile.goal,
        "experience_level": profile.experience_level,
        "equipment": profile.equipment if equipment is None else equipment,
        "injured_areas": profile.injured_areas,
        "session_minutes": profile.session_minutes,
        "available_minutes": available_minutes or profile.session_minutes,
    }


def _profile_out(profile: models.UserProfile) -> dict:
    return {
        "profile_id": profile.id,
        "display_name": profile.display_name,
        "goal": profile.goal,
        "experience_level": profile.experience_level,
        "weekly_frequency": profile.weekly_frequency,
        "session_minutes": profile.session_minutes,
        "equipment": profile.equipment,
        "injured_areas": profile.injured_areas,
        "cycle_mode": profile.cycle_mode,
        "typical_cycle_days": profile.typical_cycle_days,
        "is_adult": profile.is_adult,
        "cycle_consent": profile.cycle_consent,
        "mood_consent": profile.mood_consent,
        "consent_version": profile.consent_version,
    }


def _polish_rationale(reasons: list[str]) -> str:
    """只把非敏感 reason code 文案发给模型；失败时确定性降级。"""
    prompt = (PROMPT_DIR / "rationale.txt").read_text(encoding="utf-8").format(
        reasons="\n".join(reasons)
    )
    try:
        return llm.chat(prompt, max_tokens=200)
    except llm.LLMError:
        return "；".join(reasons)


def _cycle_result(profile: models.UserProfile, db: Session) -> dict:
    if not profile.cycle_consent:
        return cycle.predict([], "unknown", predictions_enabled=False)
    records = (
        db.query(models.PeriodRecord)
        .filter_by(profile_id=profile.id)
        .order_by(models.PeriodRecord.start_date.asc())
        .all()
    )
    observed_checkin_days = 0
    if records:
        observed_checkin_days = (
            db.query(models.DailyCheckIn.day)
            .filter(
                models.DailyCheckIn.profile_id == profile.id,
                models.DailyCheckIn.day >= records[-1].start_date,
            )
            .distinct()
            .count()
        )
    return cycle.predict(
        records,
        profile.cycle_mode,
        configured_cycle_days=profile.typical_cycle_days,
        observed_checkin_days=observed_checkin_days,
    )


@router.post("/onboarding")
def onboarding(payload: OnboardingIn, response: Response, db: Session = Depends(get_db)):
    invite_code = payload.invite_code.strip()
    invite_valid = any(
        secrets.compare_digest(invite_code, expected)
        for expected in settings.INVITE_CODES
    )
    if settings.invite_required and not invite_valid:
        raise HTTPException(403, "体验邀请码无效，请向邀请人确认后重试")

    now = datetime.utcnow()
    token = secrets.token_urlsafe(32)
    profile = models.UserProfile(
        display_name=payload.display_name.strip(),
        access_token_hash=_hash_token(token),
        is_adult=payload.is_adult,
        accepted_terms_at=now,
        health_consent_at=now,
        cycle_consent=payload.cycle_consent,
        mood_consent=payload.mood_consent,
        consent_version="2026-08",
        goal=payload.goal,
        experience_level=payload.experience_level,
        weekly_frequency=payload.weekly_frequency,
        session_minutes=payload.session_minutes,
        equipment=payload.equipment,
        injured_areas=payload.injured_areas,
        cycle_mode=payload.cycle_mode,
        typical_cycle_days=payload.typical_cycle_days,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _set_session(response, token)
    return {"profile_id": profile.id, "session": "device_private"}


@router.get("/session")
def session(request: Request, db: Session = Depends(get_db)):
    return _profile_out(_session_profile(request, db))


@router.get("/exercises")
def list_exercises():
    return plan_engine.load_exercises()


@router.post("/checkin")
def checkin(payload: CheckInIn, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(payload.profile_id, request, db)

    red_flags = safety.check_red_flags(payload.red_flags)
    if red_flags:
        for hit in red_flags:
            db.add(models.SafetyEvent(
                profile_id=profile.id,
                rule_code=hit["code"],
                stage="checkin",
                result="stop",
            ))
        db.commit()
        return {"status": "safety_stop", "red_flags": red_flags}

    chosen_mood = mood.select(payload.mood if profile.mood_consent else "ok")
    today_equipment = payload.equipment if payload.equipment is not None else profile.equipment
    checkin_row = models.DailyCheckIn(
        profile_id=profile.id,
        available_minutes=payload.available_minutes,
        energy=payload.energy,
        sleep_hours=payload.sleep_hours,
        soreness=payload.soreness,
        pain=payload.pain,
        stress=payload.stress,
        symptoms=payload.symptoms,
        bleeding=payload.bleeding,
        diary=(payload.diary or "").strip() if profile.mood_consent else "",
        notes=(payload.notes or "").strip(),
        equipment=today_equipment,
        mood=chosen_mood["mood"],
        tag=chosen_mood["tag"],
        red_flags=payload.red_flags,
    )
    db.add(checkin_row)
    if profile.mood_consent:
        db.add(models.MoodRecord(
            profile_id=profile.id,
            mood=chosen_mood["mood"],
            tag=chosen_mood["tag"],
            source="manual",
        ))
    db.commit()
    db.refresh(checkin_row)

    readiness_result = readiness.compute(
        payload.energy,
        payload.sleep_hours,
        payload.soreness,
        payload.pain,
        chosen_mood["mood"],
    )
    comfort_result = comfort.get_comfort(chosen_mood["mood"])
    cycle_result = _cycle_result(profile, db)
    cycle_phase = (
        cycle_result["phase"]["key"]
        if cycle_result.get("status") == "ready" and cycle_result.get("phase")
        else None
    )
    history_count = db.query(models.WorkoutSession).filter_by(profile_id=profile.id).count()
    checkin_dict = payload.model_dump()
    checkin_dict.update({
        "mood": chosen_mood["mood"],
        "_provided_fields": sorted(payload.model_fields_set),
        "_history_count": history_count,
    })
    profile_dict = _profile_dict(profile, today_equipment, payload.available_minutes)
    plan = plan_engine.generate_plan(
        profile_dict,
        checkin_dict,
        readiness_result,
        comfort_result,
        cycle_phase,
    )
    result = validator.validate(plan, profile_dict)
    if result["status"] == "revise":
        db.add(models.SafetyEvent(
            profile_id=profile.id,
            rule_code="plan_invalid",
            stage="validate",
            result="fallback",
        ))
        plan = plan_engine.fallback_plan(
            profile_dict,
            checkin_dict,
            readiness_result,
            comfort_result,
        )
        fallback_result = validator.validate(plan, profile_dict)
        if fallback_result["status"] == "revise":
            raise HTTPException(500, "安全兜底计划校验失败")
        plan["validation_status"] = "fallback"
    else:
        plan["validation_status"] = "pass"

    rationale_text = _polish_rationale(plan["rationale"])
    plan_row = models.TrainingPlan(
        profile_id=profile.id,
        checkin_id=checkin_row.id,
        version=1,
        goal=plan["goal"],
        duration_min=plan["duration_min"],
        readiness_band=plan["readiness_band"],
        mood=plan["mood"],
        confidence=plan["confidence"],
        confidence_factors=plan["confidence_factors"],
        comfort_msg=plan["comfort_msg"],
        rest_suggestion=plan["rest_suggestion"],
        rationale=plan["rationale"],
        blocks=plan["blocks"],
        validation_status=plan["validation_status"],
    )
    db.add(plan_row)
    db.commit()
    db.refresh(plan_row)

    return {
        "status": "ok",
        "checkin_id": checkin_row.id,
        "plan_id": plan_row.id,
        "mood": chosen_mood if profile.mood_consent else None,
        "readiness": readiness_result,
        "cycle_context": cycle_result,
        "confidence": plan["confidence"],
        "confidence_factors": plan["confidence_factors"],
        "comfort_msg": plan["comfort_msg"],
        "rest_suggestion": plan["rest_suggestion"],
        "rationale_text": rationale_text,
        "plan": plan,
        "context_disclosure": {
            "used": ["训练目标与经验", "今天可用时间与器械", "能量、睡眠、酸痛、疼痛与压力",
                     "手动选择的情绪" if profile.mood_consent else "未使用情绪数据",
                     "周期日历背景" if cycle_phase else "未使用具体周期阶段",
                     f"{history_count} 次既往训练反馈"],
            "never_sent_to_ai": ["日记原文", "备注原文", "精确经期日期"],
        },
    }


@router.get("/plan/{plan_id}")
def get_plan(plan_id: int, request: Request, db: Session = Depends(get_db)):
    plan = db.get(models.TrainingPlan, plan_id)
    if not plan:
        raise HTTPException(404, "plan not found")
    _require_profile(plan.profile_id, request, db)
    return {
        "plan_id": plan.id,
        "version": plan.version,
        "goal": plan.goal,
        "duration_min": plan.duration_min,
        "readiness_band": plan.readiness_band,
        "mood": plan.mood,
        "confidence": plan.confidence,
        "confidence_factors": plan.confidence_factors,
        "comfort_msg": plan.comfort_msg,
        "rest_suggestion": plan.rest_suggestion,
        "rationale": plan.rationale,
        "blocks": plan.blocks,
        "validation_status": plan.validation_status,
    }


@router.get("/plans/{profile_id}")
def list_plans(profile_id: int, request: Request, limit: int = 10,
               db: Session = Depends(get_db)):
    _require_profile(profile_id, request, db)
    rows = (
        db.query(models.TrainingPlan)
        .filter_by(profile_id=profile_id)
        .order_by(models.TrainingPlan.created_at.desc())
        .limit(max(1, min(limit, 30)))
        .all()
    )
    return [{
        "plan_id": row.id,
        "created_at": row.created_at.isoformat(),
        "duration_min": row.duration_min,
        "readiness_band": row.readiness_band,
        "validation_status": row.validation_status,
        "version": row.version,
    } for row in rows]


def _chat_context(db: Session, profile: models.UserProfile, plan: models.TrainingPlan):
    checkin = db.get(models.DailyCheckIn, plan.checkin_id)
    if not checkin:
        raise HTTPException(404, "context not found")
    equipment = checkin.equipment or profile.equipment
    profile_dict = _profile_dict(profile, equipment, checkin.available_minutes)
    checkin_dict = {
        "available_minutes": checkin.available_minutes,
        "energy": checkin.energy,
        "sleep_hours": checkin.sleep_hours,
        "soreness": checkin.soreness,
        "pain": checkin.pain,
        "mood": checkin.mood if profile.mood_consent else "ok",
        "stress": checkin.stress,
        "symptoms": checkin.symptoms,
        "bleeding": checkin.bleeding,
        "_provided_fields": ["energy", "sleep_hours", "soreness", "pain", "mood", "stress"],
        "_history_count": db.query(models.WorkoutSession).filter_by(profile_id=profile.id).count(),
    }
    readiness_result = readiness.compute(
        checkin.energy,
        checkin.sleep_hours,
        checkin.soreness,
        checkin.pain,
        checkin_dict["mood"],
    )
    cyc = _cycle_result(profile, db)
    cycle_phase = cyc["phase"]["key"] if cyc.get("status") == "ready" and cyc.get("phase") else None
    plan_dict = {
        "goal": plan.goal,
        "duration_min": plan.duration_min,
        "readiness_band": plan.readiness_band,
        "readiness_label": readiness_result["label"],
        "mood": plan.mood,
        "confidence": plan.confidence,
        "confidence_factors": plan.confidence_factors,
        "comfort_msg": plan.comfort_msg,
        "rest_suggestion": plan.rest_suggestion,
        "rationale": plan.rationale,
        "blocks": plan.blocks,
    }
    return profile_dict, checkin_dict, readiness_result, cycle_phase, plan_dict


@router.post("/chat")
def chat(payload: ChatIn, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(payload.profile_id, request, db)
    plan = db.get(models.TrainingPlan, payload.plan_id)
    if not plan or plan.profile_id != profile.id:
        raise HTTPException(404, "plan not found")
    profile_dict, checkin_dict, readiness_result, cycle_phase, plan_dict = _chat_context(
        db, profile, plan
    )
    result = coach.chat(profile_dict, checkin_dict, plan_dict, cycle_phase, payload.message)
    preview = None
    if result["change"]:
        try:
            new_plan = coach.apply_change(
                profile_dict,
                checkin_dict,
                readiness_result,
                cycle_phase,
                plan_dict,
                result["change"],
            )
            validation = validator.validate(new_plan, {
                **profile_dict,
                "available_minutes": new_plan["duration_min"],
            })
            if validation["status"] == "revise":
                result["change"] = None
                result["reply"] += "（这个调整没有通过器械、难度或安全校验。）"
            else:
                preview = {
                    "blocks": new_plan["blocks"],
                    "duration_min": new_plan["duration_min"],
                    "rationale": new_plan["rationale"],
                    "validation_status": "pass",
                }
        except (TypeError, ValueError):
            result["change"] = None
            result["reply"] += "（我没有识别出可安全执行的调整。）"
    return {
        "reply": result["reply"],
        "change": result["change"],
        "preview": preview,
        "context_disclosure": ["结构化训练档案", "今日状态", "当前计划", "可用器械"],
    }


@router.post("/chat/apply")
def chat_apply(payload: ChatApplyIn, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(payload.profile_id, request, db)
    plan = db.get(models.TrainingPlan, payload.plan_id)
    if not plan or plan.profile_id != profile.id:
        raise HTTPException(404, "plan not found")
    profile_dict, checkin_dict, readiness_result, cycle_phase, plan_dict = _chat_context(
        db, profile, plan
    )
    try:
        new_plan = coach.apply_change(
            profile_dict,
            checkin_dict,
            readiness_result,
            cycle_phase,
            plan_dict,
            payload.change,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(400, "无法应用这个调整") from exc
    validation = validator.validate(new_plan, {
        **profile_dict,
        "available_minutes": new_plan["duration_min"],
    })
    if validation["status"] == "revise":
        raise HTTPException(400, "计划校验未通过，已保留原计划")

    row = models.TrainingPlan(
        profile_id=profile.id,
        checkin_id=plan.checkin_id,
        version=plan.version + 1,
        goal=new_plan["goal"],
        duration_min=new_plan["duration_min"],
        readiness_band=new_plan["readiness_band"],
        mood=new_plan["mood"],
        confidence=new_plan["confidence"],
        confidence_factors=new_plan.get("confidence_factors", []),
        comfort_msg=new_plan["comfort_msg"],
        rest_suggestion=new_plan["rest_suggestion"],
        rationale=new_plan["rationale"],
        blocks=new_plan["blocks"],
        validation_status="pass",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "plan_id": row.id,
        "version": row.version,
        "duration_min": row.duration_min,
        "blocks": row.blocks,
        "rationale": row.rationale,
        "validation_status": row.validation_status,
    }


@router.get("/profile/{profile_id}")
def get_profile(profile_id: int, request: Request, db: Session = Depends(get_db)):
    return _profile_out(_require_profile(profile_id, request, db))


@router.patch("/profile/{profile_id}")
def update_profile(profile_id: int, payload: ProfileUpdateIn, request: Request,
                   db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    profile.display_name = payload.display_name.strip()
    profile.goal = payload.goal
    profile.experience_level = payload.experience_level
    profile.weekly_frequency = payload.weekly_frequency
    profile.session_minutes = payload.session_minutes
    profile.equipment = payload.equipment
    profile.injured_areas = payload.injured_areas
    profile.cycle_mode = payload.cycle_mode if profile.cycle_consent else "unknown"
    profile.typical_cycle_days = payload.typical_cycle_days
    db.commit()
    db.refresh(profile)
    return _profile_out(profile)


@router.patch("/profile/{profile_id}/consents")
def update_consents(profile_id: int, payload: PrivacySettingsIn, request: Request,
                    db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    profile.cycle_consent = payload.cycle_consent
    profile.mood_consent = payload.mood_consent
    db.commit()
    return {
        "status": "updated",
        "cycle_consent": profile.cycle_consent,
        "mood_consent": profile.mood_consent,
        "message": "撤回后将立即停止使用对应数据；历史数据可通过导出查看或删除。",
    }


@router.get("/insights/{profile_id}")
def insights(profile_id: int, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    now = datetime.utcnow()
    sessions_28 = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.profile_id == profile_id,
                models.WorkoutSession.created_at >= now - timedelta(days=28))
        .order_by(models.WorkoutSession.created_at.asc())
        .all()
    )
    sessions_7 = [s for s in sessions_28 if s.created_at >= now - timedelta(days=7)]
    rpes = [s.rpe for s in sessions_28 if s.rpe is not None]
    pain_events = sum(1 for s in sessions_28 if s.pain_after != "none")
    moods = []
    if profile.mood_consent:
        moods = (
            db.query(models.MoodRecord)
            .filter(models.MoodRecord.profile_id == profile_id,
                    models.MoodRecord.created_at >= now - timedelta(days=28))
            .order_by(models.MoodRecord.created_at.asc())
            .all()
        )
    mood_counts = Counter(m.mood for m in moods)
    mood_ready = len(moods) >= 8
    observations = []
    if sessions_7:
        observations.append(f"近 7 天完成 {len(sessions_7)} 次训练。")
    if pain_events:
        observations.append(f"近 28 天有 {pain_events} 次训练后记录了疼痛或不适。")
    if not observations:
        observations.append("数据仍在积累，暂不生成趋势判断。")
    return {
        "window_days": 28,
        "week_session_count": len(sessions_7),
        "session_count": len(sessions_28),
        "avg_completion": (
            round(sum(s.completion for s in sessions_28) / len(sessions_28), 2)
            if sessions_28 else None
        ),
        "avg_rpe": round(sum(rpes) / len(rpes), 1) if rpes else None,
        "pain_event_count": pain_events,
        "observations": observations,
        "mood_summary": {
            "available": mood_ready,
            "sample_size": len(moods),
            "minimum_sample": 8,
            "distribution": dict(mood_counts) if mood_ready else {},
            "message": (
                "只展示频次分布，不推断周期或训练导致了情绪变化。"
                if mood_ready else f"至少需要 8 条情绪记录；目前 {len(moods)} 条。"
            ),
        },
        "mood_trend": [
            {"mood": m.mood, "tag": m.tag, "at": m.created_at.isoformat()}
            for m in moods[-14:]
        ],
        "disclaimer": "洞察仅陈述记录中的共现与频次，不代表因果或医学结论。",
    }


@router.get("/export/{profile_id}")
def export_data(profile_id: int, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    checkins = db.query(models.DailyCheckIn).filter_by(profile_id=profile_id).all()
    plans = db.query(models.TrainingPlan).filter_by(profile_id=profile_id).all()
    sessions = db.query(models.WorkoutSession).filter_by(profile_id=profile_id).all()
    moods = db.query(models.MoodRecord).filter_by(profile_id=profile_id).all()
    periods = db.query(models.PeriodRecord).filter_by(profile_id=profile_id).all()
    events = db.query(models.SafetyEvent).filter_by(profile_id=profile_id).all()

    def dump(rows, columns):
        return [{column: getattr(row, column) for column in columns} for row in rows]

    return {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "schema_version": "0.3",
        "profile": dump([profile], [
            "id", "display_name", "goal", "experience_level", "weekly_frequency",
            "session_minutes", "equipment", "injured_areas", "cycle_mode", "is_adult",
            "typical_cycle_days",
            "accepted_terms_at", "health_consent_at", "cycle_consent", "mood_consent",
            "consent_version", "created_at",
        ]),
        "checkins": dump(checkins, [
            "id", "day", "available_minutes", "energy", "sleep_hours", "soreness",
            "pain", "stress", "symptoms", "bleeding", "diary", "notes", "equipment",
            "mood", "tag", "red_flags", "created_at",
        ]),
        "plans": dump(plans, [
            "id", "checkin_id", "version", "goal", "duration_min", "readiness_band",
            "mood", "confidence", "confidence_factors", "comfort_msg",
            "rest_suggestion", "rationale", "blocks", "validation_status", "created_at",
        ]),
        "sessions": dump(sessions, [
            "id", "plan_id", "completion", "rpe", "pain_after", "mood_after",
            "satisfaction", "stop_reason", "status", "duration_min", "exercise_logs",
            "started_at", "ended_at", "created_at",
        ]),
        "moods": dump(moods, ["id", "mood", "tag", "source", "created_at"]),
        "periods": dump(periods, ["id", "start_date", "end_date", "created_at"]),
        "safety_events": dump(events, ["id", "rule_code", "stage", "result", "created_at"]),
    }


@router.delete("/profile/{profile_id}")
def delete_profile(profile_id: int, request: Request, response: Response,
                   db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    for model in [
        models.DailyCheckIn,
        models.MoodRecord,
        models.TrainingPlan,
        models.WorkoutSession,
        models.PeriodRecord,
        models.SafetyEvent,
    ]:
        db.query(model).filter(model.profile_id == profile_id).delete()
    db.delete(profile)
    db.commit()
    response.delete_cookie(settings.SESSION_COOKIE, path="/")
    return {"status": "deleted", "scope": "profile_and_all_related_data"}


@router.post("/periods")
def add_period(payload: PeriodIn, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(payload.profile_id, request, db)
    if not profile.cycle_consent:
        raise HTTPException(403, "请先开启周期数据授权")
    try:
        start = date.fromisoformat(payload.start_date)
        end = date.fromisoformat(payload.end_date) if payload.end_date else None
    except ValueError as exc:
        raise HTTPException(422, "日期格式应为 YYYY-MM-DD") from exc
    if start > date.today():
        raise HTTPException(422, "经期开始日不能晚于今天")
    if end and end < start:
        raise HTTPException(422, "结束日不能早于开始日")
    exists = db.query(models.PeriodRecord).filter_by(
        profile_id=profile.id, start_date=start
    ).first()
    if exists:
        exists.end_date = end
        db.commit()
        return {"status": "updated", "id": exists.id}
    record = models.PeriodRecord(
        profile_id=profile.id,
        start_date=start,
        end_date=end,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"status": "ok", "id": record.id}


@router.delete("/periods/{profile_id}/{period_id}")
def delete_period(profile_id: int, period_id: int, request: Request,
                  db: Session = Depends(get_db)):
    _require_profile(profile_id, request, db)
    record = db.get(models.PeriodRecord, period_id)
    if not record or record.profile_id != profile_id:
        raise HTTPException(404, "period record not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}


@router.get("/cycle/{profile_id}")
def get_cycle(profile_id: int, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    return _cycle_result(profile, db)


@router.get("/diaries/{profile_id}")
def get_diaries(profile_id: int, request: Request, db: Session = Depends(get_db)):
    profile = _require_profile(profile_id, request, db)
    if not profile.mood_consent:
        return []
    rows = (
        db.query(models.DailyCheckIn)
        .filter(models.DailyCheckIn.profile_id == profile_id,
                models.DailyCheckIn.diary != "")
        .order_by(models.DailyCheckIn.created_at.desc())
        .all()
    )
    return [{
        "id": row.id,
        "day": row.day.isoformat(),
        "diary": row.diary,
        "mood": row.mood,
        "tag": row.tag,
        "created_at": row.created_at.isoformat(),
    } for row in rows]


@router.delete("/diaries/{profile_id}/{checkin_id}")
def delete_diary(profile_id: int, checkin_id: int, request: Request,
                 db: Session = Depends(get_db)):
    _require_profile(profile_id, request, db)
    row = db.get(models.DailyCheckIn, checkin_id)
    if not row or row.profile_id != profile_id:
        raise HTTPException(404, "diary not found")
    row.diary = ""
    db.commit()
    return {"status": "deleted"}


@router.post("/feedback")
def feedback(payload: FeedbackIn, request: Request, db: Session = Depends(get_db)):
    plan = db.get(models.TrainingPlan, payload.plan_id)
    if not plan:
        raise HTTPException(404, "plan not found")
    profile = _require_profile(plan.profile_id, request, db)
    plan_ids = {
        exercise["exercise_id"]
        for block in plan.blocks if block.get("type") == "main"
        for exercise in block.get("exercises", [])
    }
    logs = [item.model_dump() for item in payload.exercise_logs]
    if any(item["exercise_id"] not in plan_ids for item in logs):
        raise HTTPException(422, "训练记录包含计划外动作")
    completion = payload.completion
    if logs:
        completed = sum(min(item["completed_sets"], item["target_sets"]) for item in logs)
        target = sum(item["target_sets"] for item in logs)
        completion = round(completed / target, 2) if target else 0
    started_at = payload.started_at
    if started_at and started_at.tzinfo:
        started_at = started_at.replace(tzinfo=None)
    session_row = models.WorkoutSession(
        plan_id=plan.id,
        profile_id=profile.id,
        completion=completion,
        rpe=payload.rpe,
        pain_after=payload.pain_after,
        mood_after=payload.mood_after if profile.mood_consent else "ok",
        satisfaction=payload.satisfaction,
        stop_reason=payload.stop_reason,
        status="completed" if completion >= 1 and payload.stop_reason == "completed" else "partial",
        duration_min=payload.duration_min,
        exercise_logs=logs,
        started_at=started_at,
        ended_at=datetime.utcnow(),
    )
    db.add(session_row)
    if profile.mood_consent:
        db.add(models.MoodRecord(
            profile_id=profile.id,
            mood=payload.mood_after,
            source="feedback",
        ))
    if payload.pain_after == "moderate":
        db.add(models.SafetyEvent(
            profile_id=profile.id,
            rule_code="pain_after_training",
            stage="feedback",
            result="reduce_next",
        ))
    db.commit()
    db.refresh(session_row)
    return {
        "session_id": session_row.id,
        "status": session_row.status,
        "completion": session_row.completion,
    }
