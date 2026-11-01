"""Serve the built web app and admin assets from the local Gunicorn process."""

import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def frontend(request, path=""):
    root = settings.BASE_DIR.parent / "frontend" / "dist"
    target = (root / path).resolve()
    if not target.is_relative_to(root.resolve()) or target.name.startswith("."):
        raise Http404
    if not target.is_file():
        if (
            path.startswith(
                (
                    "api/",
                    "admin/",
                    "assets/",
                    "map/",
                    "fonts/",
                    "static/",
                    "public-photo-media/",
                    "public-post-media/",
                    "private-photo-media/",
                    "private-photo-original/",
                )
            )
            or Path(path).suffix
        ):
            raise Http404
        target = root / "index.html"
    if not target.is_file():
        raise Http404
    response = FileResponse(
        target.open("rb"),
        content_type=mimetypes.guess_type(target.name)[0] or "application/octet-stream",
    )
    response["X-Content-Type-Options"] = "nosniff"
    return response


def static_asset(request, path):
    root = Path(settings.STATIC_ROOT).resolve()
    target = (root / path).resolve()
    if not target.is_relative_to(root) or not target.is_file() or target.name.startswith("."):
        raise Http404
    response = FileResponse(
        target.open("rb"),
        content_type=mimetypes.guess_type(target.name)[0] or "application/octet-stream",
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "public, max-age=86400"
    return response


def health(request):
    from django.db import connection
    from django.http import JsonResponse

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
