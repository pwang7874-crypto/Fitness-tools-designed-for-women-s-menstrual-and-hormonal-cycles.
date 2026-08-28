# -*- coding: utf-8 -*-
"""情绪输入归一化。

PRD 要求情绪由用户在五档中手动选择。日记是私密备注，不做自动情绪分析，
也不会被拼接进任何模型提示词。
"""

MOODS = {"very_bad", "low", "ok", "good", "great"}
TAGS = {
    "very_bad": "很难受",
    "low": "有点低落",
    "ok": "平静",
    "good": "不错",
    "great": "很好",
}


def select(value: str | None) -> dict:
    chosen = value if value in MOODS else "ok"
    return {"mood": chosen, "tag": TAGS[chosen], "source": "manual"}


def analyze(_diary: str | None) -> dict:
    """兼容旧调用；不读取或推断日记内容。"""
    return {**select("ok"), "deprecated": True}
