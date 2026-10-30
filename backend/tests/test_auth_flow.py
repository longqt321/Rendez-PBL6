import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User


@pytest.mark.django_db
def test_csrf_token_endpoint_and_cookie():
    client = APIClient()
    response = client.get("/api/v1/auth/csrf/")
    assert response.status_code == 200
    data = response.json()
    assert "csrfToken" in data
    assert len(data["csrfToken"]) > 0
    # Verify csrftoken cookie is issued
    assert "csrftoken" in client.cookies


@pytest.mark.django_db
def test_login_success_and_session_cookie(owner):
    client = APIClient(enforce_csrf_checks=True)
    csrf_token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]

    response = client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert response.status_code == 200
    assert response.json()["email"] == owner.email
    assert response.json()["display_name"] == owner.display_name
    assert "sessionid" in client.cookies

    # Profile endpoint returns 200 with cache-control no-store
    me_resp = client.get("/api/v1/auth/me/")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == owner.email
    assert "no-store" in me_resp["Cache-Control"]


@pytest.mark.django_db
def test_login_case_insensitive_email(owner):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/",
        {"email": owner.email.upper(), "password": "Test-password-913"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == owner.email


@pytest.mark.django_db
def test_login_invalid_credentials_prevent_enumeration(owner):
    client = APIClient()
    # Wrong password
    resp1 = client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "WrongPassword123"},
    )
    assert resp1.status_code == 400
    assert resp1.json()["fields"]["email"] == ["Email hoặc mật khẩu không đúng."]

    # Non-existent email returns identical message to prevent enumeration
    resp2 = client.post(
        "/api/v1/auth/login/",
        {"email": "doesnotexist@example.test", "password": "WrongPassword123"},
    )
    assert resp2.status_code == 400
    assert resp2.json()["fields"]["email"] == ["Email hoặc mật khẩu không đúng."]


@pytest.mark.django_db
def test_login_inactive_user_rejected():
    user = User.objects.create_user(
        "inactive@example.test", "Test-password-913", display_name="Inactive"
    )
    user.is_active = False
    user.save()

    client = APIClient()
    resp = client.post(
        "/api/v1/auth/login/",
        {"email": "inactive@example.test", "password": "Test-password-913"},
    )
    assert resp.status_code == 400
    assert resp.json()["fields"]["email"] == ["Email hoặc mật khẩu không đúng."]


@pytest.mark.django_db
def test_login_demo_disabled_when_debug_false(settings):
    settings.DEBUG = False
    client = APIClient()
    resp = client.post(
        "/api/v1/auth/login/",
        {"is_demo": True},
    )
    assert resp.status_code == 400
    assert "email" in resp.json()["fields"]


@pytest.mark.django_db
def test_logout_destroys_session_and_is_idempotent(owner):
    client = APIClient(enforce_csrf_checks=True)
    csrf_token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]

    # Login
    client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert client.get("/api/v1/auth/me/").status_code == 200

    # Fresh CSRF token after login rotation
    csrf_token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]

    # Logout
    logout_resp = client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf_token)
    assert logout_resp.status_code == 204

    # Now unauthenticated
    assert client.get("/api/v1/auth/me/").status_code == 401

    # Idempotent logout (subsequent logout when already logged out succeeds with 204)
    csrf_token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    assert client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf_token).status_code == 204


@pytest.mark.django_db
def test_csrf_protection_on_all_auth_endpoints():
    client = APIClient(enforce_csrf_checks=True)

    # Missing CSRF token on POST login
    assert client.post("/api/v1/auth/login/", {}).status_code == 403

    # Missing CSRF token on POST register
    assert client.post("/api/v1/auth/register/", {}).status_code == 403

    # Missing CSRF token on POST logout
    assert client.post("/api/v1/auth/logout/").status_code == 403


@pytest.mark.django_db
def test_session_expiration_flow(owner):
    client = APIClient()
    client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
    )
    assert client.get("/api/v1/auth/me/").status_code == 200

    # Simulate session expiration / invalidation by flushing sessions
    from django.contrib.sessions.models import Session

    Session.objects.all().delete()

    # Requests now return 401 Unauthorized
    assert client.get("/api/v1/auth/me/").status_code == 401
    assert client.get("/api/v1/favorites/").status_code == 401


@pytest.mark.django_db
def test_password_change_maintains_session(owner):
    client = APIClient()
    client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
    )

    # Wrong current password
    bad_resp = client.post(
        "/api/v1/auth/password/",
        {"current_password": "WrongPassword", "new_password": "New-password-123"},
    )
    assert bad_resp.status_code == 400

    # Successful change
    good_resp = client.post(
        "/api/v1/auth/password/",
        {"current_password": "Test-password-913", "new_password": "New-password-123"},
    )
    assert good_resp.status_code == 204

    # Current session remains active
    assert client.get("/api/v1/auth/me/").status_code == 200

    # Old password no longer works
    client_new = APIClient()
    assert (
        client_new.post(
            "/api/v1/auth/login/",
            {"email": owner.email, "password": "Test-password-913"},
        ).status_code
        == 400
    )

    # New password works
    assert (
        client_new.post(
            "/api/v1/auth/login/",
            {"email": owner.email, "password": "New-password-123"},
        ).status_code
        == 200
    )
