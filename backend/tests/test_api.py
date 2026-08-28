# -*- coding: utf-8 -*-
"""API 集成冒烟（mock 环境，不调真实模型）。"""
from fastapi.testclient import TestClient
from datetime import date

from app.main import app
from app.core.config import settings


def test_full_chain():
    with TestClient(app) as client:
        # 建档
        r = client.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
            "mood_consent": True, "cycle_consent": True,
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 40,
            "equipment": ["dumbbell"], "injured_areas": [], "cycle_mode": "natural"})
        assert r.status_code == 200
        profile_id = r.json()["profile_id"]

        # Check-in（心情由用户手动选择；日记不会被模型分析）
        r = client.post("/api/v1/checkin", json={
            "profile_id": profile_id, "available_minutes": 40,
            "energy": 3, "sleep_hours": 6.5, "soreness": 1,
            "pain": "none", "mood": "low", "diary": "今天好累好烦，不想动",
            "stress": 4, "red_flags": []})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert d["comfort_msg"]
        assert d["plan"]["blocks"]
        assert "日记原文" in d["context_disclosure"]["never_sent_to_ai"]

        # 反馈
        r = client.post("/api/v1/feedback", json={
            "plan_id": d["plan_id"], "completion": 0.8, "rpe": 6,
            "pain_after": "none", "mood_after": "good", "satisfaction": 4,
            "exercise_logs": []})
        assert r.status_code == 200


def test_safety_stop_on_red_flag():
    with TestClient(app) as client:
        r = client.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
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


def test_private_session_and_complete_data_controls():
    with TestClient(app) as owner, TestClient(app) as stranger:
        r = owner.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
            "cycle_consent": True, "mood_consent": True,
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 30,
            "equipment": [], "injured_areas": [], "cycle_mode": "natural"})
        profile_id = r.json()["profile_id"]
        assert owner.get("/api/v1/session").status_code == 200
        assert stranger.get(f"/api/v1/profile/{profile_id}").status_code == 401

        owner.post("/api/v1/periods", json={
            "profile_id": profile_id, "start_date": "2026-07-01"})
        exported = owner.get(f"/api/v1/export/{profile_id}").json()
        assert len(exported["periods"]) == 1
        assert "safety_events" in exported

        deleted = owner.delete(f"/api/v1/profile/{profile_id}")
        assert deleted.status_code == 200
        assert owner.get("/api/v1/session").status_code == 401


def test_production_invite_code_is_required(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "prod")
    monkeypatch.setattr(settings, "INVITE_CODES", ("CYCLEFIT-TEST",))
    payload = {
        "is_adult": True, "accepted_terms": True, "health_consent": True,
        "goal": "health", "experience_level": "beginner",
        "weekly_frequency": 3, "session_minutes": 30,
        "equipment": [], "injured_areas": [], "cycle_mode": "unknown",
    }
    with TestClient(app) as client:
        assert client.post("/api/v1/onboarding", json=payload).status_code == 403
        wrong = client.post(
            "/api/v1/onboarding", json={**payload, "invite_code": "WRONG"}
        )
        assert wrong.status_code == 403
        accepted = client.post(
            "/api/v1/onboarding",
            json={**payload, "invite_code": "CYCLEFIT-TEST"},
        )
        assert accepted.status_code == 200
        assert accepted.headers["x-trace-id"]


def test_hormonal_mode_never_infers_natural_phase():
    with TestClient(app) as client:
        r = client.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
            "cycle_consent": True, "mood_consent": False,
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 30,
            "equipment": [], "injured_areas": [], "cycle_mode": "hormonal"})
        profile_id = r.json()["profile_id"]
        client.post("/api/v1/periods", json={
            "profile_id": profile_id, "start_date": "2026-07-01"})
        data = client.get(f"/api/v1/cycle/{profile_id}").json()
        assert data["status"] == "tracking_only"
        assert data["phase"] is None
        assert data["next_period"] is None


def test_first_period_import_immediately_returns_approximate_window():
    with TestClient(app) as client:
        response = client.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
            "cycle_consent": True, "mood_consent": False,
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 30,
            "equipment": [], "injured_areas": [], "cycle_mode": "unknown",
            "typical_cycle_days": 30,
        })
        profile_id = response.json()["profile_id"]
        added = client.post("/api/v1/periods", json={
            "profile_id": profile_id,
            "start_date": date.today().isoformat(),
        })
        assert added.status_code == 200
        data = client.get(f"/api/v1/cycle/{profile_id}").json()
        assert data["status"] == "baseline_estimate"
        assert data["avg_cycle"] == 30
        assert data["next_period_window"]
        assert data["prediction_basis"] == "你填写的典型周期 30 天"
        assert data["observation"]["days_elapsed"] == 1


def test_mood_opt_out_does_not_store_diary_or_mood_record():
    with TestClient(app) as client:
        r = client.post("/api/v1/onboarding", json={
            "is_adult": True, "accepted_terms": True, "health_consent": True,
            "cycle_consent": False, "mood_consent": False,
            "goal": "health", "experience_level": "beginner",
            "weekly_frequency": 3, "session_minutes": 30,
            "equipment": [], "injured_areas": [], "cycle_mode": "unknown"})
        profile_id = r.json()["profile_id"]
        response = client.post("/api/v1/checkin", json={
            "profile_id": profile_id, "available_minutes": 30,
            "energy": 3, "sleep_hours": 7, "soreness": 0, "stress": 3,
            "pain": "none", "mood": "very_bad", "diary": "不应保存",
            "red_flags": []}).json()
        assert response["mood"] is None
        exported = client.get(f"/api/v1/export/{profile_id}").json()
        assert exported["checkins"][0]["diary"] == ""
        assert exported["moods"] == []
