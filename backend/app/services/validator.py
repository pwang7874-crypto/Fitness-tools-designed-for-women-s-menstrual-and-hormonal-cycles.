# -*- coding: utf-8 -*-
"""计划验证器（LLM 不可绕过）：动作必须来自审核动作库，时长/组数/伤病部位合规。"""
from .plan_engine import load_exercises


def validate(plan: dict, profile: dict) -> dict:
    """返回 {"status": "pass"/"revise"/"fallback", "issues": [...]}"""
    exercises = {e["id"]: e for e in load_exercises()}
    issues = []

    main = next((b for b in plan["blocks"] if b["type"] == "main"), None)
    exs = main["exercises"] if main else []
    if not exs:
        issues.append("主训练为空")

    allowed_ids = set(exercises.keys())
    for e in exs:
        if e["exercise_id"] not in allowed_ids:
            issues.append(f"动作不在审核动作库: {e['exercise_id']}")
        if e["sets"] < 1 or e["sets"] > 8:
            issues.append(f"组数越界: {e['name_zh']} {e['sets']}组")
        if e["rpe"] < 1 or e["rpe"] > 10:
            issues.append(f"RPE越界: {e['name_zh']}")

    if plan["duration_min"] > (profile.get("session_minutes", 40) + 10):
        issues.append(f"时长超限: {plan['duration_min']}分钟")

    # 伤病部位的动作已在上游按 swap_group 屏蔽，这里复检
    from . import safety
    blocked = safety.blocked_swap_groups(profile.get("injured_areas") or [])
    for e in exs:
        ex = exercises.get(e["exercise_id"])
        if ex and ex["swap_group"] in blocked:
            issues.append(f"伤病部位动作未屏蔽: {e['name_zh']}")

    if issues:
        return {"status": "revise", "issues": issues}
    return {"status": "pass", "issues": []}
