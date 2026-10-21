import pytest
from rest_framework.test import APIClient

from apps.photos.models import PhotoLike, PhotoSubmission
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


def test_likes_are_unique_private_and_persistent(client, owner, other, place):
    item = published(owner, place)
    url = f"/api/v1/photos/{item.id}/likes/"
    assert client.get(url).status_code == 401
    client.force_authenticate(other)
    assert client.get(url).data == {"liked": False, "count": 0}
    assert client.post(url).data == {"liked": True, "count": 1}
    assert client.post(url).data == {"liked": True, "count": 1}
    assert client.get(url).data == {"liked": True, "count": 1}
    client.force_authenticate(owner)
    assert client.get(url).data == {"liked": False, "count": 1}
    assert client.post(url).data == {"liked": True, "count": 2}
    assert client.delete(url).data == {"liked": False, "count": 1}
    assert client.delete(url).data == {"liked": False, "count": 1}
    assert PhotoLike.objects.count() == 1
    client.delete(f"/api/v1/photos/{item.id}/manage/")
    for method in (client.get, client.post, client.delete):
        assert method(url).status_code == 404


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


def test_profile_feed_only_current_users_public_photos(client, owner, other, place):
    own = published(owner, place)
    published(other, place)
    url = "/api/v1/feed/?mine=true"
    assert client.get(url).status_code == 401
    client.force_authenticate(owner)
    response = client.get(url)
    assert response.data["count"] == 1
    assert response.data["results"][0]["photo"]["id"] == str(own.id)
    assert response.data["results"][0]["photo"]["is_owner"] is True
    client.delete(f"/api/v1/photos/{own.id}/manage/")
    assert client.get(url).data["count"] == 0
    client.force_authenticate(other)
    assert client.get(url).data["count"] == 1
