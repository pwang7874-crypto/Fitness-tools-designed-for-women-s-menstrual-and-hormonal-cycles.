# -*- coding: utf-8 -*-
"""计划验证器：动作来源、等级、器械、伤病、时长都必须通过。"""
from . import safety
from .plan_engine import _equipment_ok, duration_min, load_exercises

_LEVELS = {
    "beginner": {"beginner"},
    "intermediate": {"beginner", "intermediate"},
    "advanced": {"beginner", "intermediate", "advanced"},
}


def validate(plan: dict, profile: dict) -> dict:
    exercises = {e["id"]: e for e in load_exercises()}
    issues: list[str] = []
    blocks = plan.get("blocks") or []
    if plan.get("mode") == "rest":
        declared = int(plan.get("duration_min", 0))
        limit = int(profile.get("available_minutes") or profile.get("session_minutes") or 40)
        issues = [] if 0 < declared <= limit else ["恢复计划时长越界"]
        return {"status": "revise", "issues": issues} if issues else {"status": "pass", "issues": []}

    main = next((b for b in blocks if b.get("type") == "main"), None)
    exs = main.get("exercises", []) if main else []
    if not exs:
        issues.append("主训练为空")

    allowed_levels = _LEVELS.get(profile.get("experience_level", "beginner"), {"beginner"})
    available_equipment = set(profile.get("equipment") or [])
    blocked = safety.blocked_swap_groups(profile.get("injured_areas") or [])
    seen: set[str] = set()

    for item in exs:
        exercise_id = item.get("exercise_id")
        ex = exercises.get(exercise_id)
        if not ex:
            issues.append(f"动作不在审核动作库: {exercise_id}")
            continue
        if exercise_id in seen:
            issues.append(f"动作重复: {ex['name_zh']}")
        seen.add(exercise_id)
        if not 1 <= int(item.get("sets", 0)) <= 8:
            issues.append(f"组数越界: {ex['name_zh']}")
        if not 1 <= int(item.get("rpe", 0)) <= 10:
            issues.append(f"RPE 越界: {ex['name_zh']}")
        if ex["level"] not in allowed_levels:
            issues.append(f"动作难度超出当前等级: {ex['name_zh']}")
        if not _equipment_ok(ex, available_equipment):
            issues.append(f"器械不可用: {ex['name_zh']}")
        if ex["swap_group"] in blocked:
            issues.append(f"伤病部位动作未屏蔽: {ex['name_zh']}")

    limit = int(profile.get("available_minutes") or profile.get("session_minutes") or 40)
    declared = int(plan.get("duration_min", 0))
    if declared > limit:
        issues.append(f"时长超出今天可用时间: {declared}/{limit} 分钟")
    try:
        actual = duration_min(blocks)
        if abs(actual - declared) > 1:
            issues.append(f"计划时长不一致: 标注 {declared}，估算 {actual} 分钟")
    except (KeyError, TypeError, ValueError):
        issues.append("计划时长无法校验")

    return {"status": "revise", "issues": issues} if issues else {"status": "pass", "issues": []}
