# -*- coding: utf-8 -*-
"""日记心情分析：通过日记内容判断心情，输出心情档位 + 情绪标签。

- 优先用 LLM（DeepSeek）判断，结构化 JSON 输出；
- LLM 失败时降级为关键词启发式（保证离线可用、主链路不崩）。
"""
import json
import re
from pathlib import Path

from . import llm

PROMPT_DIR = Path(__file__).resolve().parents[0] / "prompts"

MOODS = {"very_bad", "low", "ok", "good", "great"}

# 关键词兜底（按优先级）
NEG_STRONG = ["崩溃", "绝望", "想哭", "大哭", "撑不下去", "糟透", "很糟", "痛苦"]
NEG = ["低落", "难过", "伤心", "烦", "焦虑", "压力", "累", "疲惫", "烦躁", "委屈", "生气", "不开心", "emo"]
POS_STRONG = ["超级开心", "特别开心", "兴奋", "满足", "幸福", "棒极了"]
POS = ["开心", "高兴", "不错", "放松", "开心", "愉快", "充实", "元气"]


def _parse_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def _keyword_fallback(diary: str) -> dict:
    if any(w in diary for w in NEG_STRONG):
        return {"mood": "very_bad", "tag": "情绪很低"}
    if any(w in diary for w in NEG):
        return {"mood": "low", "tag": "有点低落"}
    if any(w in diary for w in POS_STRONG):
        return {"mood": "great", "tag": "很开心"}
    if any(w in diary for w in POS):
        return {"mood": "good", "tag": "不错"}
    return {"mood": "ok", "tag": "平静"}


def analyze(diary: str) -> dict:
    """返回 {"mood":..., "tag":..., "confidence":...}"""
    diary = (diary or "").strip()
    if not diary:
        return {"mood": "ok", "tag": "平静", "confidence": 0.5}

    prompt = (PROMPT_DIR / "mood.txt").read_text(encoding="utf-8").format(diary=diary)
    try:
        text = llm.chat(prompt, max_tokens=80, temperature=0.2)
        data = _parse_json(text)
        if data and data.get("mood") in MOODS:
            tag = str(data.get("tag", "平静"))[:8]
            return {"mood": data["mood"], "tag": tag, "confidence": 0.9}
    except llm.LLMError:
        pass

    fallback = _keyword_fallback(diary)
    fallback["confidence"] = 0.6
    return fallback
