# -*- coding: utf-8 -*-
"""SQLite 云备份：通过 TOS 的 S3 兼容接口备份与启动恢复。"""
import logging
import os
import sqlite3
import tempfile
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from ..core.config import settings

logger = logging.getLogger("cyclefit.backup")


def enabled() -> bool:
    """只有显式开启且 S3 配置完整时才连接对象存储。"""
    return settings.database_backup_configured and settings.DATABASE_URL.startswith("sqlite")


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "virtual"},
        ),
    )


def restore_if_needed() -> bool:
    """本地数据库不存在时，从最近一次云备份恢复。"""
    if not enabled():
        return False
    database_path = settings.database_path
    if database_path.exists():
        return False
    database_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = database_path.with_suffix(".restore.tmp")
    try:
        _client().download_file(
            settings.S3_BUCKET,
            settings.S3_DATABASE_KEY,
            str(temporary_path),
        )
        os.replace(temporary_path, database_path)
        logger.info("database_restore_completed key=%s", settings.S3_DATABASE_KEY)
        return True
    except ClientError as exc:
        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        if error_code in {"NoSuchKey", "404", "NotFound"}:
            logger.info("database_restore_skipped reason=no_remote_backup")
            return False
        raise
    finally:
        temporary_path.unlink(missing_ok=True)


def backup_now() -> bool:
    """使用 SQLite 在线备份生成一致快照，再上传到对象存储。"""
    if not enabled():
        return False
    database_path = settings.database_path
    if not database_path.exists():
        return False

    snapshot_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix="cyclefit-backup-", suffix=".db", dir="/tmp", delete=False
        ) as snapshot:
            snapshot_path = Path(snapshot.name)
        with sqlite3.connect(database_path) as source, sqlite3.connect(snapshot_path) as target:
            source.backup(target)
        _client().upload_file(
            str(snapshot_path),
            settings.S3_BUCKET,
            settings.S3_DATABASE_KEY,
        )
        logger.info("database_backup_completed key=%s", settings.S3_DATABASE_KEY)
        return True
    finally:
        if snapshot_path:
            snapshot_path.unlink(missing_ok=True)
