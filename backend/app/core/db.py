# -*- coding: utf-8 -*-
"""数据库：SQLite + SQLAlchemy 2.0。"""
from pathlib import Path

from sqlalchemy import create_engine
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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
