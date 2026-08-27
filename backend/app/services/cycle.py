# -*- coding: utf-8 -*-
"""经期记录 → 周期与激素预测。

算法参照主流周期 App（Flo / Clue / Wild.AI / Stardust）的通用做法：
- 用最近若干次「经期开始日」的间隔求平均周期长度（过滤 15~45 天的异常值）；
- 下次经期 = 上次经期开始日 + 平均周期；
- 按周期第几天推导当前阶段（月经期/卵泡期/排卵期/黄体期）与激素趋势；
- 排卵日按「黄体期约 14 天」倒推（ovulation ≈ 周期长度 − 14）。

说明：这是「日历推算 + 置信度」的参考值，不是医学诊断；周期不规律时降低置信度。
"""
import statistics
from datetime import date, timedelta

PHASES = [
    {"key": "menstrual", "name": "月经期", "days": "第 1–5 天",
     "hormone": "雌激素与孕激素都较低，可能有疲劳、腹部不适。适合低冲击、轻松活动或休息。"},
    {"key": "follicular", "name": "卵泡期", "days": "月经结束到排卵前",
     "hormone": "雌激素逐渐上升，精力与恢复通常较好，适合正常力量训练。"},
    {"key": "ovulation", "name": "排卵期", "days": "周期中段约 1–2 天",
     "hormone": "雌激素达峰后下降，部分人精力仍好；注意充分热身。"},
    {"key": "luteal", "name": "黄体期", "days": "排卵后到下次月经前",
     "hormone": "孕激素升高，可能有情绪波动、睡眠变浅、经前不适；可按体感减量。"},
]


def predict(records) -> dict:
    """records: 按 start_date 升序的 PeriodRecord 列表。"""
    starts = sorted({r.start_date for r in records})
    lengths = []
    for i in range(1, len(starts)):
        d = (starts[i] - starts[i - 1]).days
        if 15 <= d <= 45:
            lengths.append(d)

    avg = round(statistics.mean(lengths)) if lengths else 28
    # 样本越少置信度越低
    confidence = 0.5 + 0.15 * min(len(lengths), 4)  # 0.5 ~ 1.0

    last = starts[-1] if starts else None
    today = date.today()

    if last is None:
        return {"has_data": False, "avg_cycle": None, "last_period": None,
                "next_period": None, "cycle_day": None, "phase": None,
                "confidence": 0.5, "phases": PHASES}

    next_period = last + timedelta(days=avg)
    cycle_day = (today - last).days + 1
    cycle_day = max(1, min(cycle_day, avg))  # 夹在 1..avg

    ovulation_day = max(avg - 14, 6)
    if cycle_day <= 5:
        phase_key = "menstrual"
    elif cycle_day < ovulation_day:
        phase_key = "follicular"
    elif cycle_day <= ovulation_day + 1:
        phase_key = "ovulation"
    else:
        phase_key = "luteal"

    phase = next((p for p in PHASES if p["key"] == phase_key), PHASES[1])

    return {
        "has_data": True,
        "avg_cycle": avg,
        "last_period": last.isoformat(),
        "next_period": next_period.isoformat(),
        "cycle_day": cycle_day,
        "phase": phase,
        "confidence": round(confidence, 2),
        "phases": PHASES,
        "recent": [s.isoformat() for s in starts[-12:]],
    }
