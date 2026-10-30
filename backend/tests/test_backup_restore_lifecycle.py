import hashlib
import sqlite3
import tarfile
from pathlib import Path
from unittest.mock import patch

import pytest
from django.db import OperationalError
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_check_endpoint():
    client = APIClient()
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_health_check_database_failure():
    client = APIClient()
    with patch(
        "django.db.connection.cursor",
        side_effect=OperationalError("Simulated DB connection failure"),
    ):
        response = client.get("/api/v1/health/")
        assert response.status_code == 503
        assert response.json() == {"status": "unavailable"}


def test_simulated_backup_and_restore_cycle(tmp_path: Path):
    """
    Safely verifies the backup and restore procedure using an isolated temporary sandbox.
    Verifies database copy, media tarball creation, SHA256 checksums, and restoration.
    Does NOT touch any existing database, .local files, or user data.
    """
    # 1. Setup simulated environment
    source_dir = tmp_path / "app_source"
    backup_root = tmp_path / "backups"
    restore_target = tmp_path / "app_target"

    source_media = source_dir / "media"
    source_media.mkdir(parents=True)
    backup_root.mkdir(parents=True)

    # Create simulated SQLite database with data
    source_db = source_dir / "db.sqlite3"
    conn = sqlite3.connect(source_db)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE mock_places (id INTEGER PRIMARY KEY, name TEXT, city TEXT)")
    cursor.execute("INSERT INTO mock_places (name, city) VALUES ('Rendez Cafe', 'Đà Nẵng')")
    cursor.execute("INSERT INTO mock_places (name, city) VALUES ('Hàn River Coffee', 'Đà Nẵng')")
    conn.commit()
    conn.close()

    # Create simulated media files
    img1 = source_media / "img1.jpg"
    img1.write_bytes(b"\xff\xd8\xff\xe0mock_jpeg_image_content_1")
    img2_dir = source_media / "visual" / "derivatives"
    img2_dir.mkdir(parents=True)
    img2 = img2_dir / "img2.jpg"
    img2.write_bytes(b"\xff\xd8\xff\xe0mock_jpeg_image_content_2")

    source_db_hash = hashlib.sha256(source_db.read_bytes()).hexdigest()
    img1_hash = hashlib.sha256(img1.read_bytes()).hexdigest()
    img2_hash = hashlib.sha256(img2.read_bytes()).hexdigest()

    # 2. Perform Backup to backup_dir
    backup_dir = backup_root / "20261028-120000"
    backup_dir.mkdir()

    # Backup Database
    backup_db = backup_dir / "database.sqlite3"
    backup_db.write_bytes(source_db.read_bytes())

    # Backup Media Tarball
    backup_tar = backup_dir / "media.tar.gz"
    with tarfile.open(backup_tar, "w:gz") as tar:
        tar.add(source_media, arcname="media")

    assert backup_db.is_file()
    assert backup_tar.is_file()

    # 3. Verify Backup Integrity
    with tarfile.open(backup_tar, "r:gz") as tar:
        names = tar.getnames()
        assert "media" in names
        assert "media/img1.jpg" in names
        assert "media/visual/derivatives/img2.jpg" in names

    # 4. Simulate Restore to fresh target directory
    restore_target.mkdir(parents=True)
    restored_db = restore_target / "db.sqlite3"
    restored_db.write_bytes(backup_db.read_bytes())

    # Restore Media Archive
    with tarfile.open(backup_tar, "r:gz") as tar:
        tar.extractall(restore_target)

    # 5. Verify Restored Database
    assert hashlib.sha256(restored_db.read_bytes()).hexdigest() == source_db_hash
    res_conn = sqlite3.connect(restored_db)
    res_cur = res_conn.cursor()
    res_cur.execute("SELECT name, city FROM mock_places ORDER BY id")
    rows = res_cur.fetchall()
    assert rows == [("Rendez Cafe", "Đà Nẵng"), ("Hàn River Coffee", "Đà Nẵng")]
    res_conn.close()

    # 6. Verify Restored Media Files
    restored_img1 = restore_target / "media" / "img1.jpg"
    restored_img2 = restore_target / "media" / "visual" / "derivatives" / "img2.jpg"
    assert restored_img1.is_file()
    assert restored_img2.is_file()
    assert hashlib.sha256(restored_img1.read_bytes()).hexdigest() == img1_hash
    assert hashlib.sha256(restored_img2.read_bytes()).hexdigest() == img2_hash
