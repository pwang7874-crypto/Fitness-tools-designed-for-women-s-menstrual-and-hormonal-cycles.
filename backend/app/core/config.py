# -*- coding: utf-8 -*-
"""配置加载：从 .env 读取，密钥不进代码、不进仓库。"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 后端目录为 backend/，.env 在 backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
load_dotenv(BASE_DIR / ".env")


class Settings:
    ENV: str = os.getenv("ENV", "dev")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    MODEL_ID: str = os.getenv("MODEL_ID", "deepseek-chat")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/cyclefit.db")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE: str = "cyclefit_session"
    INVITE_CODES: tuple[str, ...] = tuple(
        code.strip() for code in os.getenv("INVITE_CODES", "").split(",") if code.strip()
    )

    DATABASE_BACKUP_ENABLED: bool = (
        os.getenv("DATABASE_BACKUP_ENABLED", "false").lower() == "true"
    )
    DATABASE_BACKUP_INTERVAL_SECONDS: int = max(
        60, int(os.getenv("DATABASE_BACKUP_INTERVAL_SECONDS", "300"))
    )
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    S3_REGION: str = os.getenv("S3_REGION", "cn-beijing")
    S3_DATABASE_KEY: str = os.getenv(
        "S3_DATABASE_KEY", "cyclefit/database/cyclefit.db"
    )

    # 数据目录（含 SQLite 文件）；相对路径统一解析到项目根
    @property
    def database_path(self) -> Path:
        url = self.DATABASE_URL
        if url.startswith("sqlite:///"):
            p = url.replace("sqlite:///", "", 1)
            p = Path(p)
            if not p.is_absolute():
                p = (Path(__file__).resolve().parents[2].parent / p)
            return p
        return Path("data/cyclefit.db")

    @property
    def invite_required(self) -> bool:
        return self.ENV.lower() == "prod"

    @property
    def database_backup_configured(self) -> bool:
        return self.DATABASE_BACKUP_ENABLED and all((
            self.S3_ENDPOINT,
            self.S3_ACCESS_KEY,
            self.S3_SECRET_KEY,
            self.S3_BUCKET,
        ))


settings = Settings()
