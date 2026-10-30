import pytest
from rest_framework.test import APIClient

from apps.favorites.models import Favorite
from apps.photos.models import PhotoAudit, PhotoLike, PhotoSubmission, PlacePhoto
from apps.photos.services import submit
from .conftest import photo


def create_user_photo(user, place, key="privacy-test-photo"):
    submission = submit(
        user,
        {
            "place_id": place,
            "caption": "Privacy Lifecycle Test Photo",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    return PlacePhoto.objects.get(asset=asset)


@pytest.mark.django_db
def test_user_cannot_read_other_users_private_data(owner, other, place):
    test_photo = create_user_photo(owner, place, key="other-priv-read")
    Favorite.objects.create(user=owner, place=place)
    PhotoLike.objects.create(user=owner, photo=test_photo)

    client = APIClient()
    client.force_login(other)

    # 1. Creator profile does not leak email or permissions
    res_creator = client.get(f"/api/v1/creators/{owner.id}/")
    assert res_creator.status_code == 200
    assert "email" not in res_creator.data
    assert "password" not in res_creator.data
    assert "is_staff" not in res_creator.data
    assert res_creator.data["display_name"] == owner.display_name

    # 2. Other user's favorites are not visible
    res_fav = client.get("/api/v1/favorites/")
    assert res_fav.status_code == 200
    assert res_fav.data["count"] == 0

    # 3. Other user cannot view owner's submissions
    res_sub = client.get("/api/v1/photo-submissions/")
    assert res_sub.status_code == 200
    assert res_sub.data["count"] == 0

    # 4. Other user cannot access owner's private photo media
    assert client.get(f"/private-photo-media/{test_photo.asset_id}/").status_code == 404


@pytest.mark.django_db
def test_profile_update_and_validation(owner):
    client = APIClient()
    client.force_login(owner)

    # Valid display name update
    res = client.patch("/api/v1/auth/me/", {"display_name": "Tên Hiển Thị Mới"}, format="json")
    assert res.status_code == 200
    assert res.data["display_name"] == "Tên Hiển Thị Mới"
    owner.refresh_from_db()
    assert owner.display_name == "Tên Hiển Thị Mới"

    # Blank or whitespace-only name rejected
    res_blank = client.patch("/api/v1/auth/me/", {"display_name": "   "}, format="json")
    assert res_blank.status_code == 400


@pytest.mark.django_db
def test_account_deletion_lifecycle_and_data_erasure(owner, other, place):
    test_photo = create_user_photo(owner, place, key="account-del-photo")
    Favorite.objects.create(user=owner, place=place)
    PhotoLike.objects.create(user=owner, photo=test_photo)

    client = APIClient()
    client.force_login(owner)

    # Execute account deletion
    del_res = client.delete("/api/v1/auth/me/")
    assert del_res.status_code == 204

    # 1. User session invalidated
    assert client.get("/api/v1/auth/me/").status_code == 401

    # 2. Cannot login again
    login_client = APIClient()
    login_res = login_client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
        format="json",
    )
    assert login_res.status_code == 400

    # 3. User account is deactivated and anonymized
    owner.refresh_from_db()
    assert owner.is_active is False
    assert owner.display_name == "Tài khoản đã đóng"
    assert not owner.has_usable_password()

    # 4. Personal interaction data deleted
    assert not Favorite.objects.filter(user=owner).exists()
    assert not PhotoLike.objects.filter(user=owner).exists()

    # 5. Published photos automatically withdrawn
    test_photo.refresh_from_db()
    assert test_photo.status == "withdrawn"
    assert test_photo.withdrawn_at is not None

    # 6. Public media and creator profile inaccessible
    other_client = APIClient()
    other_client.force_login(other)
    assert other_client.get(f"/public-photo-media/{test_photo.id}/").status_code == 404
    assert other_client.get(f"/api/v1/photos/{test_photo.id}/").status_code == 404
    assert other_client.get(f"/api/v1/creators/{owner.id}/").status_code == 404
    assert other_client.get(f"/api/v1/creators/{owner.id}/photos/").status_code == 404

    # 7. Audit records and legal consent preserved for legal integrity
    assert PhotoSubmission.objects.filter(submitted_by=owner).exists()
    assert PhotoAudit.objects.filter(actor=owner, action="account_deactivated").exists()


@pytest.mark.django_db
def test_admin_account_cannot_self_delete_via_public_api(staff):
    client = APIClient()
    client.force_login(staff)

    res = client.delete("/api/v1/auth/me/")
    assert res.status_code == 400
    assert "quản trị" in str(res.data)
