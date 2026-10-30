import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.places.models import Category, Place


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        "owner@example.test", "Test-password-913", display_name="Chủ ảnh"
    )


@pytest.fixture
def other(db):
    return User.objects.create_user("other@example.test", "Test-password-913", display_name="Khác")


@pytest.fixture
def staff(db):
    return User.objects.create_superuser(
        "staff@example.test", "Test-password-913", display_name="Admin"
    )


@pytest.fixture
def category(db):
    return Category.objects.create(slug="cafe", name="Cà phê")


@pytest.fixture
def place(category, staff):
    return Place.objects.create(
        name="Quán mẫu",
        address="Địa chỉ mẫu",
        category=category,
        latitude="16.067000",
        longitude="108.220000",
        status="published",
        created_by=staff,
        updated_by=staff,
    )


def photo(name="photo.png", size=(120, 120)):
    output = io.BytesIO()
    Image.new("RGB", size, "green").save(output, "PNG")
    return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")


@pytest.fixture(autouse=True)
def isolated_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"
    from django.core.cache import cache

    cache.clear()
