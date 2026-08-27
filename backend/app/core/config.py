# -*- coding: utf-8 -*-
"""配置加载：从 .env 读取，密钥不进代码、不进仓库。"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 后端目录为 backend/，.env 在 backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
load_dotenv(BASE_DIR / ".env")


class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    MODEL_ID: str = os.getenv("MODEL_ID", "deepseek-chat")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/cyclefit.db")

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


settings = Settings()
