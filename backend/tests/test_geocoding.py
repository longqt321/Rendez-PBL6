import pytest
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
