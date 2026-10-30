import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from apps.photos.models import PhotoSubmission, PlacePhoto
from apps.photos.services import submit
from .conftest import photo


def create_submission_and_photo(owner, place, key="file-serving-test"):
    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "File Serving Security Test",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    place_photo = PlacePhoto.objects.get(asset=asset)
    return submission, asset, place_photo


@pytest.mark.django_db
def test_public_photo_media_headers_and_caching(owner, place):
    _, _, place_photo = create_submission_and_photo(owner, place, key="pub-headers-test")
    client = APIClient()

    response = client.get(f"/public-photo-media/{place_photo.id}/")
    assert response.status_code == 200
    assert response["Content-Type"] == "image/jpeg"
    assert "public" in response["Cache-Control"]
    assert "max-age=86400" in response["Cache-Control"]
    assert response["X-Content-Type-Options"] == "nosniff"
    assert "ETag" in response

    # ETag 304 Not Modified validation
    etag = response["ETag"]
    cached_resp = client.get(f"/public-photo-media/{place_photo.id}/", HTTP_IF_NONE_MATCH=etag)
    assert cached_resp.status_code == 304


@pytest.mark.django_db
def test_withdrawn_photo_cannot_be_accessed_via_public_media(owner, place):
    _, _, place_photo = create_submission_and_photo(owner, place, key="withdrawn-test")
    place_photo.status = "withdrawn"
    place_photo.save()

    client = APIClient()
    response = client.get(f"/public-photo-media/{place_photo.id}/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_private_photo_media_access_control(owner, other, staff, place):
    _, asset, _ = create_submission_and_photo(owner, place, key="priv-access-test")

    # 1. Anonymous guest access: 404
    client_guest = APIClient()
    assert client_guest.get(f"/private-photo-media/{asset.id}/").status_code == 404

    # 2. Other authenticated user access: 404
    client_other = APIClient()
    client_other.force_login(other)
    assert client_other.get(f"/private-photo-media/{asset.id}/").status_code == 404

    # 3. Owner (author) access: 200 with private, no-store
    client_owner = APIClient()
    client_owner.force_login(owner)
    owner_resp = client_owner.get(f"/private-photo-media/{asset.id}/")
    assert owner_resp.status_code == 200
    assert owner_resp["Content-Type"] == "image/jpeg"
    assert "no-store" in owner_resp["Cache-Control"]
    assert owner_resp["X-Content-Type-Options"] == "nosniff"


@pytest.mark.django_db
def test_private_photo_original_requires_reviewer_permission(owner, place):
    _, asset, _ = create_submission_and_photo(owner, place, key="priv-orig-test")

    # Owner cannot download raw original master
    client_owner = APIClient()
    client_owner.force_login(owner)
    assert client_owner.get(f"/private-photo-original/{asset.id}/").status_code == 404

    # Staff without review_photosubmission permission: 404
    from apps.accounts.models import User

    regular_staff = User.objects.create_user(
        "regular_staff@example.test", "Staff-pass-123", is_staff=True, display_name="Staff No Perm"
    )
    client_staff = APIClient()
    client_staff.force_login(regular_staff)
    assert client_staff.get(f"/private-photo-original/{asset.id}/").status_code == 404

    # Staff WITH review_photosubmission permission: 200 as octet-stream
    content_type = ContentType.objects.get_for_model(PhotoSubmission)
    perm, _ = Permission.objects.get_or_create(
        codename="review_photosubmission", content_type=content_type
    )
    regular_staff.user_permissions.add(perm)
    regular_staff = User.objects.get(pk=regular_staff.pk)
    client_staff.force_login(regular_staff)

    staff_resp = client_staff.get(f"/private-photo-original/{asset.id}/")
    assert staff_resp.status_code == 200
    # Must be served as octet-stream to prevent in-browser execution
    assert staff_resp["Content-Type"] == "application/octet-stream"
    assert "no-store" in staff_resp["Cache-Control"]
    assert staff_resp["X-Content-Type-Options"] == "nosniff"
    assert staff_resp["Content-Disposition"] == f'attachment; filename="original-{asset.id}.bin"'


def test_path_traversal_on_static_and_frontend_routes():
    client = APIClient()

    # Traversal on static files
    resp1 = client.get("/static/../../.env")
    assert resp1.status_code == 404

    resp2 = client.get("/static/../../../etc/passwd")
    assert resp2.status_code == 404

    # Hidden files rejection
    assert client.get("/static/.env").status_code == 404
    assert client.get("/static/.hidden").status_code == 404
    assert client.get("/.git/config").status_code == 404

    # Traversal on frontend SPA route
    resp3 = client.get("/assets/../../.env")
    assert resp3.status_code == 404


def test_malformed_media_url_traversal_rejected_by_routing():
    client = APIClient()

    # Malformed non-UUID URLs are rejected by Django regex/UUID converter
    assert client.get("/public-photo-media/../../etc/passwd/").status_code == 404
    assert client.get("/public-photo-media/test.jpg/").status_code == 404
    assert client.get("/private-photo-media/../../.env/").status_code == 404
    assert client.get("/private-photo-original/..%2f..%2fsettings.py/").status_code == 404
