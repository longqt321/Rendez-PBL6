import pytest
from apps.photos.models import PhotoSubmission, PlacePhoto, VenueProposal
from apps.photos.services import submit
from apps.places.models import Place
from .conftest import photo

pytestmark = pytest.mark.django_db


def test_regular_user_posts_photos_immediately(client, owner, other, place):
    assert not owner.is_staff
    client.force_login(owner)
    result = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "caption": "Ảnh tôi chụp",
            "images": [photo()],
            "consent": "true",
            "consent_version": "photo-rights-v2",
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="publish-now",
    )
    assert result.status_code == 201, result.data
    post = PhotoSubmission.objects.get()
    assert post.published_by == owner
    assert post.published_at is not None
    published = PlacePhoto.objects.get()
    assert published.status == "published"
    assert result.data["assets"][0]["publication_status"] == "published"
    client.force_login(other)
    assert client.get("/api/v1/feed/").json()["count"] == 1
    assert client.get(f"/public-photo-media/{published.id}/").status_code == 200
    assert client.get(f"/private-photo-original/{published.asset_id}/").status_code == 404


def test_new_place_is_created_and_published_immediately(client, owner, category):
    client.force_login(owner)
    result = client.post(
        "/api/v1/photo-submissions/",
        {
            "proposed_name": "Quán mới",
            "proposed_address": "Địa chỉ người đăng nhập",
            "proposed_category": category.slug,
            "latitude": "16.067",
            "longitude": "108.220",
            "images": [photo()],
            "consent": "true",
            "consent_version": "photo-rights-v2",
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="new-place-now",
    )
    assert result.status_code == 201, result.data
    place = Place.objects.get(name="Quán mới")
    assert place.status == "published"
    assert place.created_by == owner
    assert not VenueProposal.objects.exists()
    assert result.data["place_id"] == str(place.pk)
    assert client.get("/api/v1/places/map/?bbox=108.2,16,108.3,16.1").json()["count"] == 1


def test_retry_does_not_duplicate_place_or_photos(owner, category):
    values = {
        "proposed_name": "Quán mới",
        "proposed_address": "Địa chỉ",
        "proposed_category": category,
        "consent_version": "photo-rights-v2",
    }
    first = submit(owner, values, [photo(), photo()], "retry-place")
    second = submit(owner, values, [photo(), photo()], "retry-place")
    assert first.pk == second.pk
    assert Place.objects.count() == 1
    assert PlacePhoto.objects.count() == 2
    assert PlacePhoto.objects.filter(is_cover=True).count() == 1


def test_previous_confirmation_requires_reloading_before_publication(client, owner, place):
    client.force_login(owner)
    result = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.pk),
            "images": [photo()],
            "consent": "true",
            "consent_version": "photo-rights-v1",
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="old-confirmation",
    )
    assert result.status_code == 400
    assert not PhotoSubmission.objects.exists()
    assert not PlacePhoto.objects.exists()
