from decimal import Decimal

import pytest
from django.core.cache import cache

from apps.places.models import Category, Place


@pytest.mark.django_db
def test_geocode_api_endpoint(client):
    # Empty query
    resp = client.get("/api/v1/places/geocode/")
    assert resp.status_code == 400

    # Real address geocoding
    resp = client.get(
        "/api/v1/places/geocode/?q=Ph%E1%BA%A1m+Nh%C6%B0+X%C6%B0%C6%A1ng%2C+%C4%90%C3%A0+N%E1%BA%B5ng"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "latitude" in data and "longitude" in data
    assert 15.0 < data["latitude"] < 17.0
    assert 107.5 < data["longitude"] < 109.0
    assert "provider" in data


@pytest.mark.django_db
def test_place_auto_geocodes_on_save(owner):
    cat = Category.objects.create(name="Cà phê", slug="ca-phe")
    place = Place(
        name="Quán Mới",
        address="100 Phạm Như Xương, Liên Chiểu, Đà Nẵng",
        category=cat,
        created_by=owner,
        updated_by=owner,
    )
    # Latitude and Longitude are None initially
    assert place.latitude is None
    assert place.longitude is None

    place.save()
    place.refresh_from_db()

    # Automatically geocoded via 3rd-party OSM data
    assert place.latitude is not None
    assert place.longitude is not None
    assert 15.0 < float(place.latitude) < 17.0
    assert 107.5 < float(place.longitude) < 109.0


@pytest.mark.django_db
def test_geocode_all_sources_fail_returns_failure(owner, monkeypatch):
    from apps.places import geocoding

    cache.clear()
    monkeypatch.setattr(geocoding, "query_nominatim_realtime", lambda addr: None)
    monkeypatch.setattr(geocoding, "query_photon_realtime", lambda addr: None)
    monkeypatch.setattr(geocoding, "query_osm_local_database", lambda addr: None)

    result = geocoding.geocode_address("Địa chỉ không tồn tại 123 XYZ")
    assert result["success"] is False
    assert "latitude" not in result
    assert "longitude" not in result

    # Place.save() must not invent coordinates when geocoding fails
    cat = Category.objects.create(name="Trà", slug="tra")
    place = Place(
        name="Quán Không Tọa Độ",
        address="Địa chỉ không tồn tại 123 XYZ",
        category=cat,
        created_by=owner,
        updated_by=owner,
    )
    place.save()
    place.refresh_from_db()
    assert place.latitude is None
    assert place.longitude is None


@pytest.mark.django_db
def test_geocode_caches_successful_result(monkeypatch):
    from apps.places import geocoding

    cache.clear()
    calls = []

    def fake_lookup(addr):
        calls.append(addr)
        return {
            "latitude": Decimal("16.050000"),
            "longitude": Decimal("108.200000"),
            "display_name": "Địa chỉ thử nghiệm",
            "provider": "Test Provider",
        }

    monkeypatch.setattr(geocoding, "query_nominatim_realtime", fake_lookup)

    first = geocoding.geocode_address("Địa chỉ thử nghiệm cache")
    second = geocoding.geocode_address("Địa chỉ thử nghiệm cache")

    assert first["success"] is True
    assert second["success"] is True
    assert len(calls) == 1  # second call served from cache


@pytest.mark.django_db
def test_geocode_caches_failed_result(monkeypatch):
    from apps.places import geocoding

    cache.clear()
    calls = []

    def fake_lookup(addr):
        calls.append(addr)
        return None

    monkeypatch.setattr(geocoding, "query_nominatim_realtime", fake_lookup)
    monkeypatch.setattr(geocoding, "query_photon_realtime", lambda addr: None)
    monkeypatch.setattr(geocoding, "query_osm_local_database", lambda addr: None)

    first = geocoding.geocode_address("Địa chỉ không tồn tại xyz")
    second = geocoding.geocode_address("Địa chỉ không tồn tại xyz")

    assert first["success"] is False
    assert second["success"] is False
    # Negative caching: the failing lookup chain runs only once.
    assert len(calls) == 1
