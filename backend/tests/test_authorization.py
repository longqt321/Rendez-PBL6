import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.favorites.models import Favorite
from apps.photos.models import PhotoComment, PlacePhoto
from apps.photos.services import submit
from .conftest import photo


def upload_photo(owner, place, key="auth-test-key", caption="Original Caption by Owner"):
    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": caption,
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    return PlacePhoto.objects.get(asset=asset)


@pytest.mark.django_db
def test_idor_own_photo_cannot_be_edited_or_withdrawn_by_other_user(owner, other, place):
    place_photo = upload_photo(owner, place, key="upload-1", caption="Original Caption by Owner")

    client_other = APIClient()
    client_other.force_authenticate(other)

    # User B attempts to change caption of User A's photo
    patch_resp = client_other.patch(
        f"/api/v1/photos/{place_photo.id}/manage/",
        {"caption": "Tampered Caption by Other"},
    )
    assert patch_resp.status_code == 404
    place_photo.refresh_from_db()
    assert place_photo.caption == "Original Caption by Owner"

    # User B attempts to withdraw/delete User A's photo
    delete_resp = client_other.delete(f"/api/v1/photos/{place_photo.id}/manage/")
    assert delete_resp.status_code == 404
    place_photo.refresh_from_db()
    assert place_photo.status == "published"

    # User A (owner) can edit and withdraw their own photo
    client_owner = APIClient()
    client_owner.force_authenticate(owner)
    owner_patch = client_owner.patch(
        f"/api/v1/photos/{place_photo.id}/manage/",
        {"caption": "Updated Caption by Owner"},
    )
    assert owner_patch.status_code == 200
    place_photo.refresh_from_db()
    assert place_photo.caption == "Updated Caption by Owner"

    owner_del = client_owner.delete(f"/api/v1/photos/{place_photo.id}/manage/")
    assert owner_del.status_code == 204
    place_photo.refresh_from_db()
    assert place_photo.status == "withdrawn"


@pytest.mark.django_db
def test_idor_comment_delete_permission(owner, other, place):
    place_photo = upload_photo(owner, place, key="upload-comment-test")
    comment = PhotoComment.objects.create(
        photo=place_photo,
        user=owner,
        body="Owner comment",
    )

    # User B attempts to delete User A's comment
    client_other = APIClient()
    client_other.force_authenticate(other)
    resp = client_other.delete(f"/api/v1/comments/{comment.id}/")
    assert resp.status_code == 403
    assert PhotoComment.objects.filter(id=comment.id).exists()

    # User A deletes their own comment
    client_owner = APIClient()
    client_owner.force_authenticate(owner)
    assert client_owner.delete(f"/api/v1/comments/{comment.id}/").status_code == 204
    assert not PhotoComment.objects.filter(id=comment.id).exists()


@pytest.mark.django_db
def test_staff_can_moderate_comments(owner, staff, place):
    place_photo = upload_photo(owner, place, key="upload-mod-test")
    comment = PhotoComment.objects.create(
        photo=place_photo,
        user=owner,
        body="Offensive comment to moderate",
    )

    client_staff = APIClient()
    client_staff.force_authenticate(staff)
    resp = client_staff.delete(f"/api/v1/comments/{comment.id}/")
    assert resp.status_code == 204
    assert not PhotoComment.objects.filter(id=comment.id).exists()


@pytest.mark.django_db
def test_idor_submission_detail_isolation(owner, other, place):
    place_photo = upload_photo(owner, place, key="upload-sub-test")
    sub_owner = place_photo.asset.submission

    client_other = APIClient()
    client_other.force_authenticate(other)

    # Other user cannot see owner's submission
    resp = client_other.get(f"/api/v1/photo-submissions/{sub_owner.id}/")
    assert resp.status_code == 404

    # Owner can see their own submission
    client_owner = APIClient()
    client_owner.force_authenticate(owner)
    assert client_owner.get(f"/api/v1/photo-submissions/{sub_owner.id}/").status_code == 200


@pytest.mark.django_db
def test_favorites_isolation_between_users(owner, other, place):
    Favorite.objects.create(user=owner, place=place)

    client_other = APIClient()
    client_other.force_authenticate(other)

    # Other user's favorites list is empty
    resp = client_other.get("/api/v1/favorites/")
    assert resp.status_code == 200
    assert resp.json()["count"] == 0

    # Other user removing the place does not affect owner's favorite
    client_other.delete(f"/api/v1/favorites/{place.id}/")
    assert Favorite.objects.filter(user=owner, place=place).exists()


@pytest.mark.django_db
def test_prevent_privilege_escalation_via_profile_patch(owner):
    client = APIClient()
    client.force_authenticate(owner)

    # Attempt to elevate privileges
    resp = client.patch(
        "/api/v1/auth/me/",
        {
            "display_name": "Honest User",
            "is_staff": True,
            "is_superuser": True,
        },
    )
    assert resp.status_code == 200
    owner.refresh_from_db()
    assert owner.display_name == "Honest User"
    assert owner.is_staff is False
    assert owner.is_superuser is False


@pytest.mark.django_db
def test_deactivated_account_rejected_on_all_authenticated_endpoints(owner, place):
    client = APIClient()
    # Establish a real session via login
    client.post(
        "/api/v1/auth/login/",
        {"email": owner.email, "password": "Test-password-913"},
    )
    assert client.get("/api/v1/auth/me/").status_code == 200

    # Admin deactivates account
    owner.is_active = False
    owner.save(update_fields=["is_active"])

    # All authenticated endpoints must reject the deactivated user
    assert client.get("/api/v1/auth/me/").status_code == 401
    assert client.get("/api/v1/favorites/").status_code == 401
    assert client.get("/api/v1/photo-submissions/").status_code == 401
    assert client.post(f"/api/v1/photos/{place.id}/likes/").status_code == 401


@pytest.mark.django_db
def test_non_staff_user_blocked_from_admin(owner):
    client = APIClient()
    client.force_authenticate(owner)

    resp = client.get("/admin/")
    # Django admin redirects non-staff users to admin login page
    assert resp.status_code == 302
    assert "/admin/login/" in resp["Location"]


@pytest.mark.django_db
def test_staff_without_reviewer_perm_blocked_from_review_view(owner, place):
    staff_without_perm = User.objects.create_user(
        "junior_staff@example.test",
        "Test-password-913",
        display_name="Junior Staff",
        is_staff=True,
    )
    place_photo = upload_photo(owner, place, key="upload-review-test")
    sub = place_photo.asset.submission

    client = APIClient()
    client.force_login(staff_without_perm)

    resp = client.get(f"/admin/photos/photosubmission/{sub.id}/review/")
    # Blocked with 403 PermissionDenied
    assert resp.status_code == 403
