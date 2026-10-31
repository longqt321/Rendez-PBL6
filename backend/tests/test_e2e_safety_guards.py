import sys
from pathlib import Path
from unittest.mock import MagicMock
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from e2e_manager import (
    SafetyViolationError,
    validate_safe_database_for_drop,
    validate_safe_media_path,
    E2E_MEDIA_ROOT,
    DEV_MEDIA_ROOT,
)


def test_safety_guard_rejects_protected_databases():
    """Verify that drop validation strictly rejects all protected and non-e2e databases."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_cur.fetchone.return_value = ["postgres"]

    # 1. Protected databases must be rejected immediately
    for bad_db in ["rendez", "rendez_local", "postgres", "template0", "template1"]:
        with pytest.raises(SafetyViolationError, match="Refusing drop|is not 'rendez_e2e'"):
            validate_safe_database_for_drop(mock_conn, bad_db)

    # 2. Arbitrary database names or SQL injection attempts must be rejected
    with pytest.raises(SafetyViolationError, match="is not 'rendez_e2e'"):
        validate_safe_database_for_drop(mock_conn, "rendez_e2e; DROP DATABASE rendez_local;")

    with pytest.raises(SafetyViolationError, match="is not 'rendez_e2e'"):
        validate_safe_database_for_drop(mock_conn, "other_db")


def test_safety_guard_rejects_dropping_connected_database():
    """Verify that drop validation fails if active connection is on rendez_e2e."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_cur.fetchone.return_value = ["rendez_e2e"]

    with pytest.raises(SafetyViolationError, match="Cannot drop connected database"):
        validate_safe_database_for_drop(mock_conn, "rendez_e2e")


def test_safety_guard_accepts_valid_e2e_database():
    """Verify that drop validation succeeds only when connected to maintenance db and targeting rendez_e2e."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_cur.fetchone.return_value = ["postgres"]

    assert validate_safe_database_for_drop(mock_conn, "rendez_e2e") is True


def test_safety_guard_rejects_dangerous_media_paths(tmp_path):
    """Verify that media cleanup strictly blocks non-e2e directories, traversal, and symlinks."""
    # 1. Reject development media
    with pytest.raises(SafetyViolationError):
        validate_safe_media_path(DEV_MEDIA_ROOT)

    # 2. Reject repository root, local dir, home, and system root
    for dangerous in [REPO_ROOT, REPO_ROOT / ".local", Path.home(), Path("/")]:
        with pytest.raises(SafetyViolationError):
            validate_safe_media_path(dangerous)

    # 3. Reject path traversal
    traversal_path = E2E_MEDIA_ROOT / ".." / "media"
    with pytest.raises(SafetyViolationError):
        validate_safe_media_path(traversal_path)

    # 4. Reject symlink
    symlink_path = tmp_path / "symlink_e2e"
    symlink_path.symlink_to(E2E_MEDIA_ROOT, target_is_directory=True)
    with pytest.raises(SafetyViolationError, match="Symlink detected"):
        validate_safe_media_path(symlink_path)


def test_safety_guard_accepts_exact_e2e_media_path():
    """Verify that media cleanup accepts only the verified E2E media root."""
    assert validate_safe_media_path(E2E_MEDIA_ROOT) is True
