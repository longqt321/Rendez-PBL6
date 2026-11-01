import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_bool(name: str, default: bool = False) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


_DEV_FALLBACK_KEY = "local-development-only-not-for-public-use"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _DEV_FALLBACK_KEY).strip()
DEBUG = _env_bool("DJANGO_DEBUG", default=True)

if not DEBUG and (
    not SECRET_KEY
    or SECRET_KEY == _DEV_FALLBACK_KEY
    or len(SECRET_KEY) < 32
    or SECRET_KEY.startswith("django-insecure-")
):
    raise RuntimeError(
        "A secure DJANGO_SECRET_KEY of at least 32 characters must be configured when DEBUG=False."
    )

_raw_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS")
if _raw_hosts:
    ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(",") if h.strip()]
elif DEBUG:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
else:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be explicitly configured when DEBUG=False.")

if not DEBUG and "*" in ALLOWED_HOSTS:
    raise RuntimeError("Wildcard '*' in ALLOWED_HOSTS is not permitted when DEBUG=False.")

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "apps.accounts",
    "apps.places",
    "apps.favorites",
    "apps.photos",
    "apps.posts",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.NoStoreMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"


def _get_database_config():
    engine = os.environ.get("DJANGO_DB_ENGINE", "").strip().lower()
    if engine in ("sqlite", "sqlite3"):
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }

    is_explicit_postgres = engine in ("postgres", "postgresql")

    try:
        import psycopg  # noqa: F401
    except Exception as exc:
        if is_explicit_postgres:
            from django.core.exceptions import ImproperlyConfigured

            raise ImproperlyConfigured(
                "PostgreSQL driver (psycopg) is required when DJANGO_DB_ENGINE is postgresql but could not be imported: "
                + str(exc)
            ) from exc
        # Fallback for lightweight local development environments without libpq installed
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }

    pg_password = os.environ.get("POSTGRES_PASSWORD", "").strip()
    if not DEBUG and not pg_password:
        raise RuntimeError(
            "POSTGRES_PASSWORD must be explicitly configured in production when using PostgreSQL."
        )

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "rendez").strip(),
        "USER": os.environ.get("POSTGRES_USER", "rendez").strip(),
        "PASSWORD": pg_password or "rendez-local",
        "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1").strip(),
        "PORT": os.environ.get("POSTGRES_PORT", "55432").strip(),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }


DATABASES = {"default": _get_database_config()}
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "vi"
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "UTC"
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = Path(os.environ.get("PRIVATE_MEDIA_ROOT", BASE_DIR / ".private-media")).resolve()
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = _env_bool("DJANGO_HTTPS", default=not DEBUG)
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_COOKIE_SAMESITE = "Lax"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if SESSION_COOKIE_SECURE:
    SECURE_SSL_REDIRECT = _env_bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
    if _env_bool("DJANGO_SECURE_HSTS", default=False):
        SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "31536000"))
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True
        SECURE_HSTS_PRELOAD = True
DATA_UPLOAD_MAX_MEMORY_SIZE = 55 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.auth.SessionAuthentication"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "config.api.Pagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.api.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "login": "20/min",
        "register": "10/min",
        "upload": "10/min",
        "report": "10/min",
        "comment": "30/min",
        "password": "5/min",
        "like": "60/min",
        "favorite": "60/min",
        "share": "30/min",
        "view": "120/min",
        "geocode": "30/min",
    },
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Rendez API",
    "VERSION": "1.0.0",
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "PhotoPublicationStatusEnum": [
            ("pending_review", "Chưa đăng"),
            ("approved", "Đã đăng"),
            ("rejected", "Đã gỡ"),
        ],
        "ContentReportStatusEnum": [("pending", "Chờ xử lý"), ("resolved", "Đã xử lý")],
    },
}

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "rendez-cache",
        "TIMEOUT": 300,
        "OPTIONS": {
            "MAX_ENTRIES": 1000,
        },
    }
}

CSRF_FAILURE_VIEW = "config.api.csrf_failure"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[%(asctime)s] %(levelname)s in %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
