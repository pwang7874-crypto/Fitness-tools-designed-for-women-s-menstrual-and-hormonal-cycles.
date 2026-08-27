# -*- coding: utf-8 -*-
"""安全规则层（规则优先于模型，LLM 不可绕过）。"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _load():
    with open(DATA_DIR / "safety_rules.json", encoding="utf-8") as f:
        return json.load(f)


def check_red_flags(red_flag_codes: list[str]) -> list[dict]:
    """返回命中的红旗规则列表；空列表表示安全。"""
    rules = _load()["red_flags"]
    by_code = {r["code"]: r for r in rules}
    hits = []
    for code in red_flag_codes:
        if code in by_code:
            hits.append(by_code[code])
    return hits


def blocked_swap_groups(injured_areas: list[str]) -> set[str]:
    """根据伤病部位，返回需要屏蔽的动作模式组。"""
    blocks = _load().get("injured_area_blocks", {})
    groups: set[str] = set()
    for area in injured_areas:
        groups.update(blocks.get(area, []))
    return groups


def has_red_flag(red_flag_codes: list[str]) -> bool:
    return bool(check_red_flags(red_flag_codes))
