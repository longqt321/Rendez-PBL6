import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.favorites.models import Favorite

pytestmark = pytest.mark.django_db


def test_auth_csrf_registration_conflict_and_logout():
    client = APIClient(enforce_csrf_checks=True)
    data = {
        "email": "Person@Example.Test",
        "password": "Unique-test-password-991",
        "display_name": "Demo",
    }
    assert client.post("/api/v1/auth/register/", data).status_code == 403
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    response = client.post("/api/v1/auth/register/", data, HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 201
    assert response.json()["is_staff"] is False
    user = User.objects.get(email="person@example.test")
    assert user.check_password(data["password"])
    assert client.get("/api/v1/auth/me/").status_code == 200
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    assert client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code == 204
    assert client.get("/api/v1/auth/me/").status_code == 401
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    assert client.post("/api/v1/auth/register/", data, HTTP_X_CSRFTOKEN=token).status_code == 400
    assert (
        client.post(
            "/api/v1/auth/login/",
            {"email": "PERSON@example.test", "password": data["password"]},
            HTTP_X_CSRFTOKEN=token,
        ).status_code
        == 200
    )


def test_favorites_owner_idempotence(client, place, owner, other):
    url = f"/api/v1/favorites/{place.id}/"
    assert client.put(url).status_code == 401
    client.force_authenticate(owner)
    assert client.put(url).status_code == 204
    assert client.put(url).status_code == 204
    assert Favorite.objects.count() == 1
    client.force_authenticate(other)
    assert client.get("/api/v1/favorites/").json()["count"] == 0
    client.force_authenticate(owner)
    place.status = "hidden"
    place.save()
    assert client.get("/api/v1/favorites/").json()["count"] == 0
    assert client.put(url).status_code == 404
    assert client.delete(url).status_code == 204
    assert client.delete(url).status_code == 204


def test_csrf_cross_origin_login_and_logout(owner):
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    values = {"email": owner.email, "password": "Test-password-913"}
    assert (
        client.post(
            "/api/v1/auth/login/",
            values,
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://evil.example",
        ).status_code
        == 403
    )
    assert client.post("/api/v1/auth/login/", values, HTTP_X_CSRFTOKEN=token).status_code == 200
    response = client.post("/api/v1/auth/logout/")
    assert response.status_code == 403
    assert client.get("/api/v1/auth/me/").status_code == 200
    assert "no-store" in client.get("/api/v1/auth/me/")["Cache-Control"]


def test_password_preserves_whitespace():
    client = APIClient()
    password = " Safe-test-password-912 "
    values = {
        "email": "spaces@example.test",
        "password": password,
        "display_name": "Demo",
        "is_staff": True,
    }
    assert client.post("/api/v1/auth/register/", values).status_code == 201
    user = User.objects.get(email=values["email"])
    assert user.check_password(password)
    assert not user.check_password(password.strip())
    assert user.is_staff is False


def test_unexpected_error_uses_safe_json(client, owner):
    client.force_authenticate(owner)
    from unittest.mock import patch

    with patch("apps.photos.views.visual_places", side_effect=RuntimeError("internal detail")):
        response = client.get("/api/v1/places/")
    assert response.status_code == 500
    assert response.json() == {
        "code": "server_error",
        "message": "Không xử lý được yêu cầu. Thử lại sau.",
        "fields": {},
        "request_id": response.headers["X-Request-ID"],
    }
