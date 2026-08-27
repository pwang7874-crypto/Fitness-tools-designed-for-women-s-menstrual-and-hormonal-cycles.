# -*- coding: utf-8 -*-
"""情绪安慰：固定模板，不调模型、不做情绪分析、不做诊断。"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _load():
    with open(DATA_DIR / "comfort_templates.json", encoding="utf-8") as f:
        return json.load(f)


def get_comfort(mood: str) -> dict | None:
    """情绪不好（very_bad / low）时返回一条固定暖心安慰 + 休息建议；否则返回 None。"""
    cfg = _load()
    if mood not in cfg["low_mood_triggers"]:
        return None
    templates = cfg["templates"]
    # 按天固定轮换，避免每次都同一句
    import datetime
    idx = datetime.date.today().toordinal() % len(templates)
    return {
        "comfort_msg": templates[idx],
        "rest_suggestion": cfg["rest_suggestion"],
    }
