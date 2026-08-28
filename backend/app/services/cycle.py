# -*- coding: utf-8 -*-
"""可解释的周期日历估算。

冷启动时先用用户填写的典型周期给出宽区间；有真实周期间隔后再逐层替换为
个人数据。症状和情绪不用来倒推排卵或精确周期。
"""
import statistics
from datetime import date, timedelta

PHASES = [
    {"key": "menstrual", "name": "经期", "days": "通常从出血第 1 天开始",
     "hormone": "有些人会疲劳或不适；训练以当天疼痛、睡眠和体感为准。"},
    {"key": "follicular", "name": "卵泡期", "days": "经期后到排卵前的估算区间",
     "hormone": "日历阶段只作背景信息；不要因为阶段标签强行提高训练量。"},
    {"key": "ovulation", "name": "排卵附近", "days": "仅为日历估算",
     "hormone": "无法由日期确认排卵；仍以热身、疼痛和恢复状态为准。"},
    {"key": "luteal", "name": "黄体期", "days": "排卵估算后到下次经期前",
     "hormone": "若出现经前不适，可按体感减量或休息。"},
]


def _observation(last: date | None, today: date, logged_days: int) -> dict:
    """三周观察只表示数据积累进度，不冒充周期长度证据。"""
    elapsed = max(0, (today - last).days + 1) if last else 0
    target = 21
    complete = elapsed >= target
    return {
        "days_elapsed": elapsed,
        "logged_days": max(0, logged_days),
        "target_days": target,
        "complete": complete,
        "percent": min(100, round(elapsed / target * 100)),
        "message": (
            "21 天观察已完成。系统已重新检查近期记录；如果还没有新的经期开始日，"
            "会继续保留宽区间，不用情绪或症状猜测周期长度。"
            if complete else
            f"已进行 {elapsed} 天观察。估算已立即开始，不需等满 21 天；"
            "这段时间的打卡用于补充训练与恢复背景。"
        ),
    }


def _base(starts: list[date], mode: str, today: date, logged_days: int) -> dict:
    return {
        "mode": mode,
        "has_data": bool(starts),
        "status": "collecting",
        "prediction_tier": "none",
        "prediction_basis": "尚无经期开始日",
        "confidence_label": "尚未估算",
        "sample_size": max(0, len(starts) - 1),
        "avg_cycle": None,
        "last_period": starts[-1].isoformat() if starts else None,
        "next_period": None,
        "next_period_window": None,
        "cycle_day": None,
        "phase": None,
        "confidence": 0.0,
        "phases": PHASES if mode == "natural" else [],
        "recent": [s.isoformat() for s in starts[-12:]],
        "observation": _observation(starts[-1] if starts else None, today, logged_days),
        "message": "导入或记录 1 次经期开始日后，立即给出初步日期区间。",
        "disclaimer": "仅为日历估算，不是诊断、排卵确认或避孕依据。",
    }


def _window(center: date, margin: int) -> dict:
    return {
        "start": (center - timedelta(days=margin)).isoformat(),
        "end": (center + timedelta(days=margin)).isoformat(),
    }


def _phase_for(cycle_day: int, typical: int) -> dict:
    ovulation_day = max(typical - 14, 6)
    if cycle_day <= 5:
        key = "menstrual"
    elif cycle_day < ovulation_day:
        key = "follicular"
    elif cycle_day <= ovulation_day + 1:
        key = "ovulation"
    else:
        key = "luteal"
    return next(item for item in PHASES if item["key"] == key)


def predict(
    records,
    cycle_mode: str = "natural",
    today: date | None = None,
    configured_cycle_days: int = 28,
    observed_checkin_days: int = 0,
    predictions_enabled: bool = True,
) -> dict:
    """根据经期开始日逐层生成估算。

    - 1 个开始日：用用户配置的典型周期，宽区间、无阶段。
    - 1 个有效间隔：用真实间隔第一次校准，仍为宽区间、无阶段。
    - 2+ 个有效间隔：用近期 6 个间隔的中位数，自然周期才显示日历阶段。
    """
    starts = sorted({record.start_date for record in records})
    today = today or date.today()
    result = _base(starts, cycle_mode, today, observed_checkin_days)
    result["records"] = [
        {
            "id": getattr(record, "id", None),
            "start_date": record.start_date.isoformat(),
            "end_date": record.end_date.isoformat() if getattr(record, "end_date", None) else None,
        }
        for record in sorted(records, key=lambda item: item.start_date, reverse=True)[:12]
    ]

    if not predictions_enabled:
        result.update({
            "status": "disabled",
            "message": "当前未授权周期估算。",
            "observation": _observation(None, today, 0),
        })
        return result

    if cycle_mode == "hormonal":
        result.update({
            "status": "tracking_only",
            "prediction_basis": "激素使用模式仅记录出血",
            "confidence_label": "不推算",
            "message": "激素使用者仅显示出血记录，不推断自然周期或阶段。",
        })
        return result

    if not starts:
        return result

    configured = max(21, min(45, int(configured_cycle_days or 28)))
    lengths = [
        (starts[index] - starts[index - 1]).days
        for index in range(1, len(starts))
        if 15 <= (starts[index] - starts[index - 1]).days <= 60
    ]
    result["sample_size"] = len(lengths)
    last = starts[-1]
    cycle_day = max(1, (today - last).days + 1)
    result["cycle_day"] = cycle_day

    if not lengths:
        margin = 10 if cycle_mode == "irregular" else 7
        center = last + timedelta(days=configured)
        result.update({
            "status": "baseline_estimate",
            "prediction_tier": "baseline",
            "prediction_basis": f"你填写的典型周期 {configured} 天",
            "confidence_label": "初步·宽区间",
            "avg_cycle": configured,
            "next_period_window": _window(center, margin),
            "confidence": 0.22 if cycle_mode == "irregular" else 0.28,
            "message": (
                "已在导入后立即给出初步区间。21 天后会自动完成一次观察检查；"
                "记录到下一次经期开始日时，将优先用真实间隔校准。"
            ),
        })
        return result

    recent_lengths = lengths[-6:]
    if len(recent_lengths) == 1:
        typical = recent_lengths[0]
        margin = 8 if cycle_mode == "irregular" else 5
        center = last + timedelta(days=typical)
        result.update({
            "status": "personal_estimate",
            "prediction_tier": "personal",
            "prediction_basis": f"1 个真实周期间隔（{typical} 天）",
            "confidence_label": "初次校准·仍需积累",
            "avg_cycle": typical,
            "next_period_window": _window(center, margin),
            "confidence": 0.35 if cycle_mode == "irregular" else 0.42,
            "message": "已用第 1 个真实间隔替换默认值；再记录 1 次开始日后，将用近期中位数继续校准。",
        })
        return result

    typical = round(statistics.median(recent_lengths))
    spread = statistics.pstdev(recent_lengths)
    center = last + timedelta(days=typical)
    margin = max(3, min(10, round(spread) + 2))
    result.update({
        "prediction_tier": "history",
        "prediction_basis": f"近期 {len(recent_lengths)} 个有效间隔的中位数（{typical} 天）",
        "avg_cycle": typical,
        "next_period_window": _window(center, margin),
    })

    if cycle_mode in {"irregular", "unknown"}:
        result.update({
            "status": "low_confidence",
            "confidence_label": "个体化·仅日期区间",
            "confidence": round(max(0.35, min(0.58, 0.6 - spread / 100)), 2),
            "message": (
                "已用近期记录形成个体化日期区间；"
                "因周期不规律或模式未确定，不推断具体阶段。"
            ),
        })
        return result

    days_since_last = (today - last).days
    if days_since_last > typical + 7:
        result.update({
            "status": "low_confidence",
            "confidence_label": "记录可能缺失",
            "confidence": 0.35,
            "message": "最近记录已超出典型周期范围，阶段暂不显示；请补充最近经期开始日。",
        })
        return result

    confidence = max(0.5, min(0.88, 0.66 + 0.06 * min(len(recent_lengths) - 2, 3) - spread / 100))
    result.update({
        "status": "ready",
        "confidence_label": "个体化日历估算",
        "next_period": center.isoformat(),
        "phase": _phase_for(cycle_day, typical),
        "confidence": round(confidence, 2),
        "message": "已基于近期记录生成个体化日历估算；训练仍以当天体感为先。",
    })
    return result
