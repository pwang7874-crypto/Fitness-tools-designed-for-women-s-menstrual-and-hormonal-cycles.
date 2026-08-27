# -*- coding: utf-8 -*-
"""AI 教练对话（FR-05）。

- 只基于真实数据（当前计划 / Check-in / 周期 / 准备度）作答，不编造；
- 医疗/药物/避孕/严重症状 → 拒答并建议就医；
- 计划修改先生成预览，确认后才写入（写入在路由层做）。
"""
import copy
import json
import re
from pathlib import Path

from . import comfort, guard, llm, plan_engine

PROMPT_DIR = Path(__file__).resolve().parents[0] / "prompts"

REFUSE_TOPICS = ["诊断", "药", "避孕", "怀孕", "流产", "异常出血", "心理治疗", "抑郁",
                 "自杀", "自残", "绝经", "手术", "医嘱", "治疗", "吃什么补剂"]

EQUIPMENT_ALL = ["dumbbell", "barbell", "bench", "cable", "kettlebell", "resistance_band", "pullup_bar"]


def _parse(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {"reply": text.strip(), "change": None}
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return {"reply": text.strip(), "change": None}
    reply = str(data.get("reply", "")).strip() or "好的，已为你处理。"
    change = data.get("change")
    return {"reply": reply, "change": change}


def _plan_summary(plan: dict) -> str:
    exs = [e for b in plan["blocks"] if b["type"] == "main" for e in b["exercises"]]
    lines = [f"- 时长 {plan['duration_min']} 分钟，准备度 {plan['readiness_label']}",
             f"- 动作：" + "、".join(f"{e['name_zh']}({e['exercise_id']}) {e['sets']}组" for e in exs)]
    swaps = [f"{e['name_zh']} 可替换为：" + "、".join(e.get("swap_alternatives", [])) for e in exs if e.get("swap_alternatives")]
    if swaps:
        lines.append("可替换候选：" + "；".join(swaps))
    return "\n".join(lines)


def chat(profile: dict, checkin: dict, plan: dict, cycle_phase: str | None,
         message: str) -> dict:
    # 1) 系统防护：注入/违规/超长拦截（确定性，先于模型）
    blocked = guard.check(message)
    if blocked:
        return {"reply": blocked, "change": None}

    # 2) 医疗/药物/避孕等话题拒答
    if any(k in message for k in REFUSE_TOPICS):
        return {"reply": "这个话题我帮不上忙，建议你咨询专业医生或医疗机构。我可以继续帮你调整今天的训练计划。",
                "change": None}

    context = {
        "目标": profile.get("goal"),
        "经验": profile.get("experience_level"),
        "器械": profile.get("equipment") or ["徒手"],
        "今天状态": f"能量{checkin.get('energy')}，睡眠{checkin.get('sleep_hours')}h，酸痛{checkin.get('soreness')}，疼痛{checkin.get('pain')}，心情{checkin.get('mood')}",
        "周期阶段": cycle_phase or "未知",
        "当前计划": _plan_summary(plan),
    }
    ctx_text = "\n".join(f"{k}：{v}" for k, v in context.items())

    prompt = (PROMPT_DIR / "coach.txt").read_text(encoding="utf-8").format(
        context=ctx_text, message=message)
    try:
        text = llm.chat(prompt, max_tokens=800, temperature=0.4)
    except llm.LLMError:
        return {"reply": "抱歉，我现在有点走神，请稍后再试。你也可以直接在主界面调整时长或器械。",
                "change": None}
    return _parse(text)


def apply_change(profile: dict, checkin: dict, readiness: dict, cycle_phase: str | None,
                 plan: dict, change: dict) -> dict:
    """按 change 生成新计划（预览用，不落库）。"""
    t = change.get("type")
    mood = checkin.get("mood", "ok")
    c = comfort.get_comfort(mood)

    if t == "duration":
        new_checkin = {**checkin, "available_minutes": int(change.get("value", checkin.get("available_minutes", 40)))}
        return plan_engine.generate_plan(profile, new_checkin, readiness, c, cycle_phase)

    if t == "equipment":
        value = change.get("value") or []
        new_profile = {**profile, "equipment": [e for e in value if e in EQUIPMENT_ALL]}
        return plan_engine.generate_plan(new_profile, checkin, readiness, c, cycle_phase)

    if t == "swap":
        exs = {e["id"]: e for e in plan_engine.load_exercises()}
        to = exs.get(change.get("to"))
        if not to:
            raise ValueError("unknown exercise")
        new_plan = copy.deepcopy(plan)
        for b in new_plan["blocks"]:
            if b["type"] == "main":
                for e in b["exercises"]:
                    if e["exercise_id"] == change.get("from"):
                        e["exercise_id"] = to["id"]
                        e["name_zh"] = to["name_zh"]
                        e["name_en"] = to["name_en"]
                        e["category"] = to["category"]
                        e["primary_muscles"] = to["primary_muscles"]
                        e["swap_alternatives"] = []
        return new_plan

    raise ValueError("unknown change type")
