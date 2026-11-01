import pytest
from django.core.exceptions import ImproperlyConfigured
from apps.photos.models import PhotoAsset, PhotoSubmission
from apps.places.models import Place
from config.settings import _get_database_config


@pytest.mark.django_db
def test_place_opening_hours_specification_jsonb(place, client):
    client.force_authenticate(user=place.created_by)
    place.opening_hours_text = "07:00 – 22:30 hàng ngày"
    place.opening_hours_source = "Thực tế"
    from django.utils import timezone

    place.opening_hours_verified_at = timezone.now()
    place.opening_hours_specification = {
        "is_24_7": False,
        "note": "07:00 – 22:30 hàng ngày",
        "regular": {
            "mon": [{"open": "07:00", "close": "22:30"}],
            "sun": [{"open": "07:00", "close": "23:00"}],
        },
    }
    place.save()

    response = client.get(f"/api/v1/places/{place.id}/")
    assert response.status_code == 200
    data = response.json()
    assert data["opening_hours"] is not None
    assert data["opening_hours"]["text"] == "07:00 – 22:30 hàng ngày"
    assert data["opening_hours"]["specification"]["is_24_7"] is False
    assert "mon" in data["opening_hours"]["specification"]["regular"]


@pytest.mark.django_db
def test_photo_asset_technical_metadata_jsonb(place, staff, isolated_media):
    submission = PhotoSubmission.objects.create(
        submitted_by=staff,
        place=place,
        consent_version="v1",
        consent_at="2026-10-29T00:00:00Z",
        idempotency_key="exif-test-key",
        payload_hash="testhash1234567890",
        status="approved",
        published_by=staff,
        published_at="2026-10-29T00:00:00Z",
    )
    asset = PhotoAsset.objects.create(
        submission=submission,
        original="visual/originals/test.jpg",
        derivative="visual/derivatives/test.jpg",
        sha256="a" * 64,
        file_size=1024,
        width=800,
        height=600,
        sort_order=0,
        technical_metadata={
            "camera": "Sony A7 IV",
            "lens": "FE 35mm F1.4 GM",
            "iso": 400,
            "f_number": 1.4,
        },
    )
    asset.refresh_from_db()
    assert asset.technical_metadata["camera"] == "Sony A7 IV"
    assert asset.technical_metadata["iso"] == 400


@pytest.mark.django_db
def test_place_search_vietnamese_accent_insensitive(category, staff, client):
    client.force_authenticate(user=staff)
    Place.objects.create(
        name="Cà Phê Muối Bách Khoa",
        address="123 Ngô Sĩ Liên, Liên Chiểu",
        description="Không gian yên tĩnh học nhóm",
        category=category,
        latitude="16.074000",
        longitude="108.152000",
        status="published",
        created_by=staff,
        updated_by=staff,
    )

    # Search with unaccented lowercase query
    res1 = client.get("/api/v1/places/?q=ca+phe+muoi")
    assert res1.status_code == 200
    assert res1.json()["count"] >= 1
    assert any(p["name"] == "Cà Phê Muối Bách Khoa" for p in res1.json()["results"])

    # Search with accented mixed case query
    res2 = client.get("/api/v1/places/?q=Bách+Khoa")
    assert res2.status_code == 200
    assert any(p["name"] == "Cà Phê Muối Bách Khoa" for p in res2.json()["results"])


def test_place_gist_index_declared():
    index_names = [idx.name for idx in Place._meta.indexes]
    assert "place_coords_gist_idx" in index_names


def test_database_config_explicit_postgres_failure(monkeypatch):
    import sys

    monkeypatch.setenv("DJANGO_DB_ENGINE", "postgresql")
    # Setting sys.modules["psycopg"] = None makes `import psycopg` raise
    # ImportError (Python treats a None entry as "module not importable"),
    # simulating a missing driver without deleting real package files.
    monkeypatch.setitem(sys.modules, "psycopg", None)

    with pytest.raises(ImproperlyConfigured, match="PostgreSQL driver"):
        _get_database_config()
