# -*- coding: utf-8 -*-
"""第一层 mock 测试：业务逻辑（安全 / 准备度 / 安慰 / 计划 / 验证）。"""
from app.services import comfort, cycle, mood, plan_engine, readiness, safety, validator


def test_cycle_predict():
    from datetime import date, timedelta
    class R:
        def __init__(self, d): self.start_date = d
    today = date.today()
    recs = [R(today - timedelta(days=56)), R(today - timedelta(days=28)), R(today)]
    p = cycle.predict(recs)
    assert p["avg_cycle"] == 28
    assert p["cycle_day"] == 1
    assert p["phase"]["key"] == "menstrual"
    assert p["next_period"] == (today + timedelta(days=28)).isoformat()


def test_mood_keyword_fallback():
    # 无 API Key 时走关键词兑底，主链路不崩
    assert mood.analyze("今天好累好烦")["mood"] in ("low", "very_bad")
    assert mood.analyze("今天很开心元气满满")["mood"] in ("good", "great")
    assert mood.analyze("")["mood"] == "ok"


def test_safety_red_flag_hit():
    hits = safety.check_red_flags(["chest_pain"])
    assert hits and hits[0]["code"] == "chest_pain"


def test_safety_no_red_flag():
    assert safety.check_red_flags([]) == []


def test_safety_blocked_groups():
    blocked = safety.blocked_swap_groups(["knee"])
    assert "squat_pattern" in blocked
    assert "lunge_pattern" in blocked


def test_readiness_high_band():
    r = readiness.compute(energy=5, sleep_hours=8, soreness=0, pain="none", mood="great")
    assert r["band"] == "high"


def test_readiness_low_band():
    r = readiness.compute(energy=1, sleep_hours=3, soreness=5, pain="moderate", mood="very_bad")
    assert r["band"] == "low"


def test_comfort_triggered():
    c = comfort.get_comfort("very_bad")
    assert c and c["comfort_msg"] and c["rest_suggestion"]


def test_comfort_not_triggered():
    assert comfort.get_comfort("ok") is None
    assert comfort.get_comfort("great") is None


def test_plan_engine_home_filters_out_gym():
    profile = {"goal": "health", "experience_level": "beginner",
               "equipment": [], "injured_areas": []}
    checkin = {"available_minutes": 60, "energy": 3, "sleep_hours": 7,
               "soreness": 0, "pain": "none", "mood": "ok"}
    r = readiness.compute(3, 7, 0, "none", "ok")
    plan = plan_engine.generate_plan(profile, checkin, r, None)
    ids = [e["exercise_id"] for b in plan["blocks"] if b["type"] == "main"
           for e in b["exercises"]]
    exs = {e["id"]: e for e in plan_engine.load_exercises()}
    # 未选器械 = 徒手：只允许徒手/瑜伽垫动作
    assert all(any(x in {"bodyweight", "gym_mat"} for x in exs[i]["equipment"]) for i in ids)


def test_plan_engine_equipment_or_semantics():
    # 只有哑铃时，高脚杯深蹲（哑铃或壶铃）应可选；中级可选罗马尼亚硬拉
    profile = {"goal": "health", "experience_level": "intermediate",
               "equipment": ["dumbbell"], "injured_areas": []}
    by = plan_engine._filtered(plan_engine.load_exercises(), profile, set())
    assert "goblet_squat" in [e["id"] for e in by.get("squat_pattern", [])]
    assert "romanian_deadlift" in [e["id"] for e in by.get("hinge_pattern", [])]


def test_plan_engine_excludes_injured():
    profile = {"goal": "health", "experience_level": "beginner",
               "equipment": ["dumbbell", "barbell", "bench", "cable"],
               "injured_areas": ["knee"]}
    checkin = {"available_minutes": 60, "energy": 3, "sleep_hours": 7,
               "soreness": 0, "pain": "none", "mood": "ok"}
    r = readiness.compute(3, 7, 0, "none", "ok")
    plan = plan_engine.generate_plan(profile, checkin, r, None)
    exs = {e["id"]: e for e in plan_engine.load_exercises()}
    for b in plan["blocks"]:
        if b["type"] == "main":
            for e in b["exercises"]:
                assert exs[e["exercise_id"]]["swap_group"] not in {"squat_pattern", "lunge_pattern"}


def test_plan_engine_attaches_comfort():
    profile = {"goal": "health", "experience_level": "beginner",
               "equipment": [], "injured_areas": []}
    checkin = {"available_minutes": 40, "energy": 3, "sleep_hours": 7,
               "soreness": 0, "pain": "none", "mood": "low"}
    r = readiness.compute(3, 7, 0, "none", "low")
    c = comfort.get_comfort("low")
    plan = plan_engine.generate_plan(profile, checkin, r, c)
    assert plan["comfort_msg"]
    assert any("情绪" in reason for reason in plan["rationale"])


def test_plan_engine_trim_to_time():
    profile = {"goal": "strength", "experience_level": "advanced",
               "equipment": ["dumbbell", "barbell", "bench", "cable", "kettlebell",
                             "resistance_band", "pullup_bar"],
               "injured_areas": []}
    checkin = {"available_minutes": 15, "energy": 5, "sleep_hours": 8,
               "soreness": 0, "pain": "none", "mood": "great"}
    r = readiness.compute(5, 8, 0, "none", "great")
    plan = plan_engine.generate_plan(profile, checkin, r, None)
    assert plan["duration_min"] <= 15


def test_validator_pass():
    profile = {"experience_level": "beginner", "session_minutes": 60,
               "injured_areas": [], "equipment": []}
    checkin = {"available_minutes": 40, "energy": 3, "sleep_hours": 7,
               "soreness": 0, "pain": "none", "mood": "ok"}
    r = readiness.compute(3, 7, 0, "none", "ok")
    plan = plan_engine.generate_plan(profile, checkin, r, None)
    result = validator.validate(plan, profile)
    assert result["status"] == "pass"


def test_validator_rejects_unknown_exercise():
    profile = {"experience_level": "beginner", "session_minutes": 60,
               "injured_areas": [], "equipment": []}
    plan = {"duration_min": 30, "blocks": [
        {"type": "main", "exercises": [{"exercise_id": "not_exist", "name_zh": "x",
                                        "sets": 3, "reps": "10", "rpe": 6}]}]}
    result = validator.validate(plan, profile)
    assert result["status"] == "revise"
    assert any("审核动作库" in i for i in result["issues"])
