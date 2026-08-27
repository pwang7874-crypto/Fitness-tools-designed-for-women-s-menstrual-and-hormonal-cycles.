# -*- coding: utf-8 -*-
"""计划引擎（规则驱动，审核动作库，LLM 不可发明动作）。

输出结构化计划：热身 / 主训练 / 整理 + 调整依据（rationale）。
暖心安慰由 comfort 模块附带，LLM 只用于把 rationale 润色成自然语言（失败时降级）。
"""
import json
from pathlib import Path

from . import safety

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# 目标 → 组次/强度预设（临时方案，可后续迁到 JSON 配置）
GOAL_PRESETS = {
    "strength": {"sets": 4, "reps": "5-8", "rpe": 8, "rest_sec": 150},
    "shape": {"sets": 3, "reps": "8-12", "rpe": 7, "rest_sec": 75},
    "health": {"sets": 2, "reps": "12-15", "rpe": 6, "rest_sec": 60},
}

# 周期阶段对训练的建议（软建议：只提供上下文与轻度减量，不硬性取消）
CYCLE_NOTES = {
    "menstrual": "正处于月经期，建议低冲击、少练一点，不舒服就休息。",
    "follicular": "处于卵泡期，精力通常较好，适合正常训练。",
    "ovulation": "处于排卵期，注意充分热身，避免过度疲劳。",
    "luteal": "处于黄体期，可能情绪或精力波动，按体感减量。",
}

# 动作模式（顺序即计划顺序）
PATTERNS = [
    ("squat_pattern", "腿部·蹲"),
    ("hinge_pattern", "腿部·髋铰链"),
    ("horizontal_push", "胸部·推"),
    ("horizontal_pull", "背部·拉"),
    ("vertical_push", "肩部·推"),
    ("vertical_pull", "背部·下拉"),
    ("core_flexion", "核心"),
]

_LEVELS = {"beginner": {"beginner"}, "intermediate": {"beginner", "intermediate"},
           "advanced": {"beginner", "intermediate", "advanced"}}


def load_exercises() -> list[dict]:
    with open(DATA_DIR / "exercises.json", encoding="utf-8") as f:
        return json.load(f)


def _equipment_ok(ex: dict, profile_equipment: set[str]) -> bool:
    """器械匹配：equipment 列表为“可选替代”（OR 语义），任一项可用即可。

    未选器械（徒手）：只保留无需器械（徒手 / 瑜伽垫）的动作。
    例：高脚杯深蹲可用“哑铃 或 壶铃”，只要有一项可用即满足。
    """
    if not profile_equipment:
        return any(e in {"bodyweight", "gym_mat"} for e in ex["equipment"])
    always = {"bodyweight", "gym_mat"}
    return any(e in profile_equipment or e in always for e in ex["equipment"])


def _filtered(exercises: list[dict], profile: dict, blocked: set[str]) -> dict[str, list[dict]]:
    levels = _LEVELS.get(profile["experience_level"], _LEVELS["beginner"])
    eq = set(profile.get("equipment") or [])
    by_pattern: dict[str, list[dict]] = {}
    for ex in exercises:
        if ex["swap_group"] in blocked:
            continue
        if ex["level"] not in levels:
            continue
        if not _equipment_ok(ex, eq):
            continue
        by_pattern.setdefault(ex["swap_group"], []).append(ex)
    return by_pattern


def _duration_min(blocks: list[dict]) -> int:
    total = 0
    for b in blocks:
        if b["type"] in ("warmup", "cooldown"):
            total += b.get("duration_min", 0)
        else:
            for e in b.get("exercises", []):
                reps = int(e["reps"].split("-")[-1])
                total += round(e["sets"] * (reps * 3 + e["rest_sec"]) / 60)
    return total


def build_rationale(checkin: dict, readiness: dict, blocked: set[str], mood_low: bool,
                    cycle_phase: str | None = None) -> list[str]:
    reasons = []
    band = readiness["band"]
    if band == "medium":
        reasons.append("今天状态一般，已相应减少训练容量。")
    elif band == "low":
        reasons.append("今天状态较差，已把计划调整为轻松活动。")
    if checkin.get("soreness", 0) >= 3:
        reasons.append("肌肉酸痛较明显，减少了相关部位的训练量。")
    if checkin.get("sleep_hours", 8) < 6:
        reasons.append("睡眠不足，降低了今天的训练总量。")
    if blocked:
        reasons.append("已避开伤病部位相关的动作。")
    if mood_low:
        reasons.append("情绪不好没关系，已附上一句暖心安慰，今天少练一点也很好。")
    if cycle_phase:
        reasons.append(CYCLE_NOTES.get(cycle_phase, ""))
    if not reasons:
        reasons.append("身体状态正常，按原计划执行。")
    return reasons


def generate_plan(profile: dict, checkin: dict, readiness: dict, comfort: dict | None,
                  cycle_phase: str | None = None) -> dict:
    """生成计划（不含 LLM 润色，调用方再决定是否润色 rationale）。

    cycle_phase：月经期/卵泡期/排卵期/黄体期——只提供软建议与轻度减量。
    """
    exercises = load_exercises()
    blocked = safety.blocked_swap_groups(profile.get("injured_areas") or [])
    by_pattern = _filtered(exercises, profile, blocked)

    band = readiness["band"]
    preset = dict(GOAL_PRESETS.get(profile.get("goal", "health"), GOAL_PRESETS["health"]))

    main_exercises = []
    for pattern, _label in PATTERNS:
        candidates = by_pattern.get(pattern, [])
        if not candidates:
            continue
        ex = candidates[0]
        sets = preset["sets"]
        rpe = preset["rpe"]
        reps = preset["reps"]
        if band == "medium":
            sets = max(2, sets - 1)
            rpe = max(4, rpe - 1)
        elif band == "low":
            sets = 2
            rpe = 4
        # 周期软建议：月经期轻度减量
        if cycle_phase == "menstrual":
            sets = max(2, sets - 1)
            rpe = max(4, rpe - 1)
        main_exercises.append({
            "exercise_id": ex["id"],
            "name_zh": ex["name_zh"],
            "name_en": ex["name_en"],
            "category": ex["category"],
            "primary_muscles": ex["primary_muscles"],
            "sets": sets,
            "reps": reps,
            "rpe": rpe,
            "rest_sec": preset["rest_sec"] if band != "low" else 60,
            "swap_alternatives": [a["id"] for a in candidates[1:3]],
        })

    blocks = [
        {"type": "warmup", "title": "热身", "duration_min": 5,
         "items": ["轻松有氧或动态拉伸 5 分钟，让身体微微发热"]},
        {"type": "main", "title": "主训练", "exercises": main_exercises},
        {"type": "cooldown", "title": "整理", "duration_min": 3,
         "items": ["静态拉伸 3 分钟，重点放松今天训练的部位"]},
    ]

    # 按可用时间裁剪：先减组数，再删孤立动作（保留蹲/推/拉/核心）
    available = checkin.get("available_minutes", 40)
    keep_patterns_priority = {"squat_pattern", "hinge_pattern", "horizontal_push",
                              "horizontal_pull", "core_flexion", "core_static"}
    while _duration_min(blocks) > available and main_exercises:
        # 优先裁掉优先级最低的动作
        lowest = min(main_exercises,
                     key=lambda e: 0 if e["exercise_id"] in keep_patterns_priority else 1)
        if lowest["sets"] > 2:
            lowest["sets"] -= 1
        else:
            main_exercises.remove(lowest)

    mood_low = comfort is not None
    rationale = build_rationale(checkin, readiness, blocked, mood_low, cycle_phase)

    # 置信度：数据字段齐全度（临时方案）
    present = sum(1 for k in ["energy", "sleep_hours", "soreness", "pain", "mood"]
                  if checkin.get(k) not in (None, ""))
    confidence = round(min(1.0, 0.4 + 0.12 * present), 2)

    return {
        "goal": profile.get("goal", "health"),
        "duration_min": _duration_min(blocks),
        "readiness_band": band,
        "readiness_label": readiness["label"],
        "mood": checkin.get("mood", "ok"),
        "confidence": confidence,
        "comfort_msg": comfort["comfort_msg"] if comfort else "",
        "rest_suggestion": comfort["rest_suggestion"] if comfort else "",
        "rationale": rationale,
        "blocks": blocks,
    }
