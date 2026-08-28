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


def duration_min(blocks: list[dict]) -> int:
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
    if checkin.get("stress", 3) >= 4:
        reasons.append("今天压力偏高，计划保持简单，并预留了更多恢复空间。")
    if checkin.get("symptoms") or checkin.get("bleeding") in {"medium", "heavy"}:
        reasons.append("已结合你手动记录的症状与出血情况做保守调整。")
    if blocked:
        reasons.append("已避开伤病部位相关的动作。")
    if mood_low:
        reasons.append("情绪不好没关系，已附上一句暖心安慰，今天少练一点也很好。")
    if cycle_phase:
        reasons.append(CYCLE_NOTES.get(cycle_phase, "周期阶段仅作背景信息，训练仍以当天体感为准。"))
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

    symptom_sensitive = bool(checkin.get("symptoms")) or checkin.get("bleeding") == "heavy"
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
        # 症状是显式输入；周期标签本身不触发增减量。
        if symptom_sensitive:
            sets = max(2, sets - 1)
            rpe = max(4, rpe - 1)
        main_exercises.append({
            "exercise_id": ex["id"],
            "name_zh": ex["name_zh"],
            "name_en": ex["name_en"],
            "category": ex["category"],
            "primary_muscles": ex["primary_muscles"],
            "swap_group": ex["swap_group"],
            "equipment": ex["equipment"],
            "level": ex["level"],
            "sets": sets,
            "reps": reps,
            "rpe": rpe,
            "rest_sec": preset["rest_sec"] if band != "low" else 60,
            "swap_alternatives": [a["id"] for a in candidates[1:3]],
        })

    available = int(checkin.get("available_minutes", 40))
    warmup_min, cooldown_min = (3, 2) if available < 20 else (5, 3)
    blocks = [
        {"type": "warmup", "title": "热身", "duration_min": warmup_min,
         "items": [f"轻松有氧或动态活动 {warmup_min} 分钟，让身体微微发热"]},
        {"type": "main", "title": "主训练", "exercises": main_exercises},
        {"type": "cooldown", "title": "整理", "duration_min": cooldown_min,
         "items": [f"舒缓呼吸与整理活动 {cooldown_min} 分钟"]},
    ]

    # 按可用时间裁剪：先减低优先级动作的组数，再删除；尽量保留蹲/推/拉/核心。
    keep_patterns_priority = {"squat_pattern", "hinge_pattern", "horizontal_push",
                              "horizontal_pull", "core_flexion", "core_static"}
    while duration_min(blocks) > available and main_exercises:
        lowest = next(
            (e for e in reversed(main_exercises) if e["swap_group"] not in keep_patterns_priority),
            main_exercises[-1],
        )
        if lowest["sets"] > 2:
            lowest["sets"] -= 1
        else:
            main_exercises.remove(lowest)

    mood_low = comfort is not None
    rationale = build_rationale(checkin, readiness, blocked, mood_low, cycle_phase)

    # 置信度表达“有多少真实上下文”，不会因默认值而自动满分。
    provided = set(checkin.get("_provided_fields") or [])
    core = {"energy", "sleep_hours", "soreness", "pain", "mood", "stress"}
    explicit_ratio = len(core & provided) / len(core)
    history_count = int(checkin.get("_history_count", 0))
    confidence = round(min(0.92, 0.5 + 0.28 * explicit_ratio + 0.04 * min(history_count, 3)), 2)
    confidence_factors = [
        f"本次主动填写 {len(core & provided)}/{len(core)} 项核心状态",
        f"参考 {history_count} 次既往训练反馈" if history_count else "尚无既往训练反馈",
        "周期只作背景，不参与置信度加分",
    ]

    return {
        "goal": profile.get("goal", "health"),
        "duration_min": duration_min(blocks),
        "readiness_band": band,
        "readiness_label": readiness["label"],
        "mood": checkin.get("mood", "ok"),
        "confidence": confidence,
        "confidence_factors": confidence_factors,
        "comfort_msg": comfort["comfort_msg"] if comfort else "",
        "rest_suggestion": comfort["rest_suggestion"] if comfort else "",
        "rationale": rationale,
        "blocks": blocks,
    }


def fallback_plan(profile: dict, checkin: dict, readiness: dict, comfort: dict | None) -> dict:
    """仍从同一审核/器械/伤病过滤链路生成确定性保守兜底。"""
    conservative = {
        **profile,
        "goal": "health",
        "experience_level": "beginner",
    }
    safe_readiness = {**readiness, "band": "low", "label": "保守模式"}
    plan = generate_plan(conservative, checkin, safe_readiness, comfort, None)
    main = next((b for b in plan["blocks"] if b["type"] == "main"), None)
    if not main or not main["exercises"]:
        plan.update({
            "mode": "rest",
            "duration_min": min(10, int(checkin.get("available_minutes", 10))),
            "blocks": [{
                "type": "recovery",
                "title": "今天先恢复",
                "duration_min": min(10, int(checkin.get("available_minutes", 10))),
                "items": ["暂停正式训练；做舒缓呼吸或完全休息。如不适持续或加重，请咨询专业人员。"],
            }],
        })
    plan["rationale"] = ["原计划未通过校验，已切换为通过同一安全规则筛选的保守方案。"]
    return plan
