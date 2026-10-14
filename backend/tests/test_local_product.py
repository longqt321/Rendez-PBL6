import pytest
from rest_framework.test import APIClient

from apps.photos.models import PhotoComment, PhotoSubmission
from apps.photos.services import submit
from tests.conftest import photo

pytestmark = pytest.mark.django_db


def published(owner, place):
    item = submit(
        owner, {"place_id": place, "consent_version": "photo-rights-v2"}, [photo()], "local-product"
    )
    return item.assets.first().public_photo


def test_owner_caption_and_withdraw_permissions(client, owner, other, place):
    item = published(owner, place)
    url = f"/api/v1/photos/{item.id}/manage/"
    client.force_authenticate(other)
    assert client.patch(url, {"caption": "khác"}, format="json").status_code == 404
    assert client.delete(url).status_code == 404
    client.force_authenticate(owner)
    assert client.get("/api/v1/auth/me/").data["photo_count"] == 1
    assert client.patch(url, {"caption": "Bàn cạnh cửa sổ"}, format="json").status_code == 200
    item.refresh_from_db()
    assert item.caption == "Bàn cạnh cửa sổ"
    assert client.delete(url).status_code == 204
    assert client.get(f"/public-photo-media/{item.id}/").status_code == 404
    assert client.get(f"/api/v1/photos/{item.id}/").status_code == 404
    assert PhotoSubmission.objects.count() == 1
    assert client.get("/api/v1/auth/me/").data["photo_count"] == 0


def test_comments_and_hidden_photo(client, owner, other, place):
    item = published(owner, place)
    url = f"/api/v1/photos/{item.id}/comments/"
    client.force_authenticate(other)
    assert client.post(url, {"body": "  "}, format="json").status_code == 400
    response = client.post(url, {"body": "Lối vào ở phía nào?"}, format="json")
    assert response.status_code == 201
    assert response.data["author_name"] == other.display_name
    comment_id = response.data["id"]
    client.force_authenticate(owner)
    assert client.delete(f"/api/v1/comments/{comment_id}/").status_code == 404
    client.delete(f"/api/v1/photos/{item.id}/manage/")
    assert client.get(url).status_code == 404
    assert client.post(url, {"body": "ẩn"}, format="json").status_code == 404
    client.force_authenticate(other)
    assert client.delete(f"/api/v1/comments/{comment_id}/").status_code == 204
    assert PhotoComment.objects.count() == 0


def test_unaccented_search(client, owner, place):
    place.name = "Cà phê Đà Nẵng"
    place.address = "8 Trần Quý Cáp"
    place.save()
    published(owner, place)
    client.force_authenticate(owner)
    assert client.get("/api/v1/feed/?q=ca phe da nang").data["count"] == 1
    assert client.get("/api/v1/feed/?q=tran quy cap").data["count"] == 1
    assert client.get("/api/v1/feed/?q=khong khop").data["count"] == 0


def test_profile_and_password_session(owner):
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(owner)
    assert (
        client.patch("/api/v1/auth/me/", {"display_name": "Tên mới"}, format="json").status_code
        == 403
    )
    token = client.get("/api/v1/auth/csrf/").data["csrfToken"]
    client.credentials(HTTP_X_CSRFTOKEN=token)
    assert client.patch("/api/v1/auth/me/", {"display_name": " "}, format="json").status_code == 400
    assert (
        client.patch("/api/v1/auth/me/", {"display_name": "Tên mới"}, format="json").data[
            "display_name"
        ]
        == "Tên mới"
    )
    assert (
        client.post(
            "/api/v1/auth/password/",
            {"current_password": "wrong", "new_password": "Changed-password-541"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/auth/password/",
            {"current_password": "Test-password-913", "new_password": "Changed-password-541"},
            format="json",
        ).status_code
        == 204
    )
    assert client.get("/api/v1/auth/me/").status_code == 200
    owner.refresh_from_db()
    assert owner.check_password("Changed-password-541")
