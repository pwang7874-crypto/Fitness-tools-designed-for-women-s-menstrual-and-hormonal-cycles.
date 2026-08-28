# -*- coding: utf-8 -*-
"""数据库：SQLite + SQLAlchemy 2.0。"""
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        db_path = settings.database_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{db_path}"  # 用绝对路径，避免相对 CWD 歧义
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    from .. import models  # noqa: F401  确保模型注册
    Base.metadata.create_all(bind=engine)
    _upgrade_sqlite_columns()


def _upgrade_sqlite_columns():
    """为已有原型数据库补齐新增列。

    正式生产仍应使用 Alembic；这里保留一个幂等的 SQLite 兼容升级，避免用户
    打开旧交付包时因 create_all 不会 ALTER TABLE 而直接报错。
    """
    if engine.dialect.name != "sqlite":
        return
    additions = {
        "user_profiles": {
            "display_name": "VARCHAR(32) NOT NULL DEFAULT ''",
            "access_token_hash": "VARCHAR(64) NOT NULL DEFAULT ''",
            "is_adult": "BOOLEAN NOT NULL DEFAULT 0",
            "accepted_terms_at": "DATETIME",
            "health_consent_at": "DATETIME",
            "cycle_consent": "BOOLEAN NOT NULL DEFAULT 0",
            "mood_consent": "BOOLEAN NOT NULL DEFAULT 0",
            "consent_version": "VARCHAR(16) NOT NULL DEFAULT '2026-08'",
            "typical_cycle_days": "INTEGER NOT NULL DEFAULT 28",
        },
        "daily_checkins": {
            "stress": "INTEGER NOT NULL DEFAULT 3",
            "symptoms": "JSON NOT NULL DEFAULT '[]'",
            "bleeding": "VARCHAR(16) NOT NULL DEFAULT 'none'",
            "notes": "TEXT NOT NULL DEFAULT ''",
            "equipment": "JSON NOT NULL DEFAULT '[]'",
        },
        "workout_sessions": {
            "status": "VARCHAR(16) NOT NULL DEFAULT 'completed'",
            "duration_min": "INTEGER",
            "exercise_logs": "JSON NOT NULL DEFAULT '[]'",
            "started_at": "DATETIME",
            "ended_at": "DATETIME",
        },
        "training_plans": {
            "confidence_factors": "JSON NOT NULL DEFAULT '[]'",
        },
    }
    with engine.begin() as conn:
        inspector = inspect(conn)
        for table, columns in additions.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
