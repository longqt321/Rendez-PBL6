import importlib
import pytest
from config import settings as app_settings


def test_env_bool_parsing():
    assert app_settings._env_bool("NON_EXISTENT_VAR", default=True) is True
    assert app_settings._env_bool("NON_EXISTENT_VAR", default=False) is False

    from unittest.mock import patch

    with patch.dict("os.environ", {"TEST_FLAG": "1"}):
        assert app_settings._env_bool("TEST_FLAG") is True
    with patch.dict("os.environ", {"TEST_FLAG": "true"}):
        assert app_settings._env_bool("TEST_FLAG") is True
    with patch.dict("os.environ", {"TEST_FLAG": "True"}):
        assert app_settings._env_bool("TEST_FLAG") is True
    with patch.dict("os.environ", {"TEST_FLAG": "yes"}):
        assert app_settings._env_bool("TEST_FLAG") is True
    with patch.dict("os.environ", {"TEST_FLAG": "on"}):
        assert app_settings._env_bool("TEST_FLAG") is True

    with patch.dict("os.environ", {"TEST_FLAG": "0"}):
        assert app_settings._env_bool("TEST_FLAG", default=True) is False
    with patch.dict("os.environ", {"TEST_FLAG": "false"}):
        assert app_settings._env_bool("TEST_FLAG", default=True) is False
    with patch.dict("os.environ", {"TEST_FLAG": "no"}):
        assert app_settings._env_bool("TEST_FLAG", default=True) is False
    with patch.dict("os.environ", {"TEST_FLAG": "off"}):
        assert app_settings._env_bool("TEST_FLAG", default=True) is False


def test_production_rejects_missing_secret_key(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com")
    monkeypatch.setenv("POSTGRES_PASSWORD", "some-strong-password")

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "DJANGO_SECRET_KEY" in str(exc_info.value)
    # Ensure error message does not leak any secret data
    assert "local-development-only" not in str(exc_info.value)


def test_production_rejects_short_secret_key(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "too-short")
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com")
    monkeypatch.setenv("POSTGRES_PASSWORD", "some-strong-password")

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "at least 32 characters" in str(exc_info.value)
    assert "too-short" not in str(exc_info.value)


def test_production_rejects_django_insecure_prefix(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv(
        "DJANGO_SECRET_KEY", "django-insecure-this-is-a-known-insecure-key-123456789"
    )
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com")
    monkeypatch.setenv("POSTGRES_PASSWORD", "some-strong-password")

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "DJANGO_SECRET_KEY" in str(exc_info.value)


def test_production_rejects_missing_allowed_hosts(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 48)
    monkeypatch.delenv("DJANGO_ALLOWED_HOSTS", raising=False)
    monkeypatch.setenv("POSTGRES_PASSWORD", "some-strong-password")

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "DJANGO_ALLOWED_HOSTS" in str(exc_info.value)


def test_production_rejects_wildcard_allowed_hosts(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 48)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com, *")
    monkeypatch.setenv("POSTGRES_PASSWORD", "some-strong-password")

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "Wildcard '*'" in str(exc_info.value)


def test_production_rejects_missing_postgres_password(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 48)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com")
    monkeypatch.delenv("DJANGO_DB_ENGINE", raising=False)
    monkeypatch.delenv("POSTGRES_PASSWORD", raising=False)
    import sys

    monkeypatch.setitem(sys.modules, "psycopg", object())

    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(app_settings)
    assert "POSTGRES_PASSWORD" in str(exc_info.value)


def test_production_valid_configuration(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "b" * 48)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", " rendez.example.com , 10.0.0.1 ")
    monkeypatch.setenv("POSTGRES_PASSWORD", "valid-strong-password-42")
    monkeypatch.setenv("DJANGO_HTTPS", "1")
    monkeypatch.setenv("DJANGO_SECURE_SSL_REDIRECT", "1")
    monkeypatch.setenv("DJANGO_SECURE_HSTS", "1")
    import sys

    monkeypatch.setitem(sys.modules, "psycopg", object())

    reloaded = importlib.reload(app_settings)
    assert reloaded.DEBUG is False
    assert reloaded.ALLOWED_HOSTS == ["rendez.example.com", "10.0.0.1"]
    assert reloaded.SESSION_COOKIE_SECURE is True
    assert reloaded.CSRF_COOKIE_SECURE is True
    assert reloaded.SECURE_SSL_REDIRECT is True
    assert reloaded.SECURE_HSTS_SECONDS == 31536000


def test_restore_dev_settings(monkeypatch):
    # Ensure after other tests that development settings reload safely
    monkeypatch.setenv("DJANGO_DEBUG", "1")
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
    monkeypatch.delenv("DJANGO_ALLOWED_HOSTS", raising=False)
    monkeypatch.setenv("DJANGO_DB_ENGINE", "sqlite")
    reloaded = importlib.reload(app_settings)
    assert reloaded.DEBUG is True
    assert "localhost" in reloaded.ALLOWED_HOSTS
