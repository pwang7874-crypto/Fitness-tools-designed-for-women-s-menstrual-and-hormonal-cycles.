# -*- coding: utf-8 -*-
"""API 集成冒烟（mock 环境，不调真实模型）。"""
from fastapi.testclient import TestClient

from app.main import app


def test_full_chain():
    with TestClient(app) as client:
        # 建档
        r = client.post("/api/v1/onboarding", json={
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 40,
            "equipment": ["dumbbell"], "injured_areas": [], "cycle_mode": "natural"})
        assert r.status_code == 200
        profile_id = r.json()["profile_id"]

        # Check-in（日记写出低落 → AI 分析出低心情 → 应附带暖心安慰）
        r = client.post("/api/v1/checkin", json={
            "profile_id": profile_id, "available_minutes": 40,
            "energy": 3, "sleep_hours": 6.5, "soreness": 1,
            "pain": "none", "diary": "今天好累好烦，不想动", "red_flags": []})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert d["comfort_msg"]
        assert d["plan"]["blocks"]

        # 反馈
        r = client.post("/api/v1/feedback", json={
            "plan_id": d["plan_id"], "completion": 0.8, "rpe": 6,
            "pain_after": "none", "mood_after": "good", "satisfaction": 4})
        assert r.status_code == 200


def test_safety_stop_on_red_flag():
    with TestClient(app) as client:
        r = client.post("/api/v1/onboarding", json={
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 40,
            "equipment": [], "injured_areas": [], "cycle_mode": "unknown"})
        profile_id = r.json()["profile_id"]
        r = client.post("/api/v1/checkin", json={
            "profile_id": profile_id, "available_minutes": 40,
            "energy": 3, "sleep_hours": 7, "soreness": 0,
            "pain": "none", "red_flags": ["chest_pain"]})
        d = r.json()
        assert d["status"] == "safety_stop"
        assert d["red_flags"][0]["code"] == "chest_pain"
