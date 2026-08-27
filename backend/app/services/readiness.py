# -*- coding: utf-8 -*-
"""准备度模块：个人状态 → 加权得分 → readiness band。

注意：这是"临时方案 + 显式标注 + 可配置"的业务规则（尚未经运动科学评审冻结），
权重与阈值全部来自 readiness_config.json，冻结后只改配置不改代码。
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _load():
    with open(DATA_DIR / "readiness_config.json", encoding="utf-8") as f:
        return json.load(f)


def _sleep_bucket(hours: float) -> str:
    if hours < 4:
        return "<4"
    if hours <= 6:
        return "4-6"
    if hours <= 8:
        return "6-8"
    return ">8"


def compute(energy: int, sleep_hours: float, soreness: int, pain: str, mood: str) -> dict:
    cfg = _load()
    scores = cfg["field_scores"]
    weights = cfg["weights"]

    def s(key: str) -> float:
        table = scores[key]
        if key == "sleep_hours":
            return float(table[_sleep_bucket(sleep_hours)])
        if key == "energy":
            return float(table[str(int(energy))])
        if key == "soreness":
            return float(table[str(int(soreness))])
        if key == "pain":
            return float(table.get(pain, table["none"]))
        if key == "mood":
            return float(table.get(mood, table["ok"]))
        return 50.0

    weighted = 0.0
    for field, w in weights.items():
        weighted += s(field) * float(w)

    total = round(weighted / sum(float(w) for w in weights.values()))  # 0-100
    band = cfg["bands"][-1]
    for b in cfg["bands"]:
        if total >= b["min"]:
            band = b
            break
    return {
        "score": total,
        "band": band["key"],
        "label": band["label"],
        "adjust": band["adjust"],
    }
