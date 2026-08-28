import shutil
import sqlite3

from app.core.config import settings
from app.services import database_backup


class FakeS3Client:
    def __init__(self, remote_path):
        self.remote_path = remote_path

    def upload_file(self, source, bucket, key):
        del bucket, key
        shutil.copyfile(source, self.remote_path)

    def download_file(self, bucket, key, destination):
        del bucket, key
        shutil.copyfile(self.remote_path, destination)


def test_sqlite_backup_and_restore(monkeypatch, tmp_path):
    database_path = tmp_path / "cyclefit.db"
    remote_path = tmp_path / "remote.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite:///{database_path}")
    monkeypatch.setattr(settings, "DATABASE_BACKUP_ENABLED", True)
    monkeypatch.setattr(settings, "S3_ENDPOINT", "https://example.invalid")
    monkeypatch.setattr(settings, "S3_ACCESS_KEY", "test")
    monkeypatch.setattr(settings, "S3_SECRET_KEY", "test")
    monkeypatch.setattr(settings, "S3_BUCKET", "test")
    monkeypatch.setattr(database_backup, "_client", lambda: FakeS3Client(remote_path))

    with sqlite3.connect(database_path) as connection:
        connection.execute("CREATE TABLE sample (value TEXT)")
        connection.execute("INSERT INTO sample VALUES ('kept')")
        connection.commit()

    assert database_backup.backup_now() is True
    database_path.unlink()
    assert database_backup.restore_if_needed() is True
    with sqlite3.connect(database_path) as connection:
        assert connection.execute("SELECT value FROM sample").fetchone() == ("kept",)
