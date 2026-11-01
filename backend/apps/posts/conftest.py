"""Media isolation for app-level Post tests.

These tests live outside ``backend/tests/``, so the autouse ``isolated_media``
fixture declared in ``backend/tests/conftest.py`` does not apply to them.
Without this file every run writes real image files into the developer's
``PRIVATE_MEDIA_ROOT`` and leaves unreferenced orphans behind.
"""

import pytest


@pytest.fixture(autouse=True)
def isolated_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"
    from django.core.cache import cache

    cache.clear()
