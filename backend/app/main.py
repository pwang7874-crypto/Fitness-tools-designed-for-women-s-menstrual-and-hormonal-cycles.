# -*- coding: utf-8 -*-
"""FastAPI 入口。"""
import asyncio
from contextlib import asynccontextmanager
import json
import logging
from pathlib import Path
import time
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .core.config import settings
from .core.db import init_db
from .services import database_backup

STATIC_DIR = Path(__file__).resolve().parent / "static"
logger = logging.getLogger("cyclefit.http")


async def _backup_loop() -> None:
    while True:
        await asyncio.sleep(settings.DATABASE_BACKUP_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(database_backup.backup_now)
        except Exception:
            logger.exception("database_backup_failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if database_backup.enabled():
        await asyncio.to_thread(database_backup.restore_if_needed)
    init_db()
    backup_task = (
        asyncio.create_task(_backup_loop()) if database_backup.enabled() else None
    )
    try:
        yield
    finally:
        if backup_task:
            backup_task.cancel()
            try:
                await backup_task
            except asyncio.CancelledError:
                pass
            try:
                await asyncio.to_thread(database_backup.backup_now)
            except Exception:
                logger.exception("database_final_backup_failed")


app = FastAPI(
    title="顺期健身app",
    version="0.3.0",
    description="女性周期与情绪自适应训练 Web MVP；日历信息仅供参考，不构成医疗建议。",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
    ],  # 仅本地开发前端；上线前按部署域名收紧
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def request_trace(request, call_next):
    trace_id = uuid.uuid4().hex
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(json.dumps({
            "event": "request_failed",
            "trace_id": trace_id,
            "method": request.method,
            "path": request.url.path,
        }, ensure_ascii=False))
        raise
    response.headers["X-Trace-ID"] = trace_id
    logger.info(json.dumps({
        "event": "request_completed",
        "trace_id": trace_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
    }, ensure_ascii=False))
    return response

app.include_router(router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")
