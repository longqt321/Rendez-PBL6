import io
import json
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from PIL import Image
from apps.photos.models import (
    ContentReport,
    PhotoAsset,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
)
from apps.photos.services import (
    change_publication,
    set_tags,
    submit,
)
from apps.photos.images import Conflict
from .conftest import photo

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def authenticated_reader(client, owner):
    client.force_login(owner)


def attribute(code):
    return VisualAttribute.objects.create(
        code=code,
        display_name_vi=code,
        description="Fixture only",
        is_searchable=True,
    )


def upload(owner, place, key="test-upload", count=1):
    return submit(
        owner,
        {"place_id": place, "caption": "Ảnh kiểm thử", "consent_version": "photo-rights-v2"},
        [photo() for _ in range(count)],
        key,
    )


def publish(owner, place, staff, codes, key="test-upload"):
    submission = upload(owner, place, key)
    asset = submission.assets.get()
    set_tags(asset.public_photo, codes, staff)
    return PlacePhoto.objects.get(asset=asset)


def test_same_photo_and_evidence(client, owner, place, staff):
    attribute("test-x")
    attribute("test-y")
    publish(owner, place, staff, ["test-x"], "first")
    publish(owner, place, staff, ["test-y"], "second")
    assert client.get("/api/v1/feed/?attributes=test-x,test-y").json()["count"] == 0
    combined = publish(owner, place, staff, ["test-x", "test-y"], "combined")
    result = client.get("/api/v1/feed/?attributes=test-x,test-y").json()
    assert result["count"] == 1
    assert result["results"][0]["photo"]["id"] == str(combined.id)
    assert result["results"][0]["photo"]["matched_attribute_codes"] == ["test-x", "test-y"]
    markers = client.get(
        "/api/v1/places/map/?bbox=108.2,16,108.3,16.1&attributes=test-x,test-y"
    ).json()
    assert markers["total_places"] == 1
    assert markers["results"][0]["supporting_photo"]["id"] == str(combined.id)
    assert "score" not in json.dumps(result)


def test_withdraw_and_hidden_block_all_public_paths(client, owner, place, staff):
    attribute("test-x")
    published = publish(owner, place, staff, ["test-x"])
    paths = [f"/api/v1/photos/{published.id}/", f"/public-photo-media/{published.id}/"]
    for path in paths:
        assert client.get(path).status_code == 200
    place.status = "hidden"
    place.save()
    for path in paths:
        assert client.get(path).status_code == 404
    assert client.get("/api/v1/feed/").json()["count"] == 0
    place.status = "published"
    place.save()
    change_publication(published.id, staff, "withdraw")
    for path in paths:
        assert client.get(path).status_code == 404
    assert client.get(f"/api/v1/places/{place.id}/photos/").json()["count"] == 0
    with pytest.raises(Conflict):
        change_publication(published.id, staff, "publish")


def test_submission_private_and_idempotent(client, owner, other, place, staff):
    client.force_authenticate(owner)
    payload = {"place_id": str(place.id), "consent": "true", "consent_version": "photo-rights-v2"}
    response = client.post(
        "/api/v1/photo-submissions/",
        {**payload, "images": [photo()]},
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="same-key",
    )
    assert response.status_code == 201, response.data
    submission_id = response.data["id"]
    again = client.post(
        "/api/v1/photo-submissions/",
        {**payload, "images": [photo()]},
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="same-key",
    )
    assert str(again.data["id"]) == str(submission_id)
    assert PhotoSubmission.objects.count() == 1
    asset = PhotoAsset.objects.get()
    assert PlacePhoto.objects.count() == 1
    # Media uses Django session authentication rather than DRF's test-only force authentication.
    client.force_login(owner)
    assert client.get(f"/private-photo-media/{asset.id}/").status_code == 200
    assert client.get(f"/private-photo-original/{asset.id}/").status_code == 404
    client.force_authenticate(other)
    client.force_login(other)
    assert client.get(f"/api/v1/photo-submissions/{submission_id}/").status_code == 404
    assert client.get(f"/private-photo-media/{asset.id}/").status_code == 404
    assert client.get("/api/v1/photo-submissions/").json()["count"] == 0
    client.force_authenticate(owner)
    changed = client.post(
        "/api/v1/photo-submissions/",
        {**payload, "caption": "different", "images": [photo()]},
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="same-key",
    )
    assert changed.status_code == 409


def test_invalid_batch_leaves_no_files(client, owner, place, settings):
    client.force_authenticate(owner)
    response = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": [
                photo(),
                SimpleUploadedFile("bad.png", b"not-an-image", content_type="image/png"),
            ],
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="bad-key",
    )
    assert response.status_code == 400
    assert PhotoSubmission.objects.count() == 0
    assert not list(settings.MEDIA_ROOT.rglob("*.jpg"))


def test_no_photo_no_coordinates_and_supported_taxonomy(client, owner, place, staff):
    assert client.get("/api/v1/feed/").json()["count"] == 0
    assert client.get("/api/v1/places/map/?bbox=108.2,16,108.3,16.1").json()["total_places"] == 1
    assert client.get("/api/v1/feed/?attributes=unknown").status_code == 400
    VisualAttribute.objects.create(code="not-audited", display_name_vi="Chưa audit", description="")
    assert client.get("/api/v1/attributes/").json() == []
    publish(owner, place, staff, [])
    place.latitude = place.longitude = None
    place.save()
    assert client.get("/api/v1/feed/").json()["count"] == 1
    assert client.get("/api/v1/places/map/?bbox=108.2,16,108.3,16.1").json()["total_places"] == 0


def test_favorite_and_report_scope(client, owner, other, place, staff):
    client.logout()
    published = publish(owner, place, staff, [])
    assert (
        client.post(f"/api/v1/photos/{published.id}/report/", {"reason": "privacy"}).status_code
        == 401
    )
    client.force_authenticate(owner)
    assert client.put(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert client.put(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert client.get("/api/v1/feed/").json()["results"][0]["place"]["is_saved"] is True
    assert (
        client.post(f"/api/v1/photos/{published.id}/report/", {"reason": "privacy"}).status_code
        == 201
    )
    assert ContentReport.objects.count() == 1
    client.force_authenticate(other)
    assert client.get("/api/v1/favorites/").json()["count"] == 0
    assert client.get("/api/v1/feed/").json()["results"][0]["place"]["is_saved"] is False


def test_photo_derivative_strips_exif(owner, place):
    raw = io.BytesIO()
    image = Image.new("RGB", (120, 120))
    exif = Image.Exif()
    exif[270] = "private metadata"
    image.save(raw, format="JPEG", exif=exif)
    submission = submit(
        owner,
        {"place_id": place, "consent_version": "photo-rights-v2"},
        [SimpleUploadedFile("private.jpg", raw.getvalue(), content_type="image/jpeg")],
        "exif",
    )
    asset = submission.assets.get()
    with asset.original.open("rb") as original:
        assert original.read() == raw.getvalue()
    with asset.derivative.open("rb") as derivative:
        assert not Image.open(derivative).getexif()


def test_feed_query_count_does_not_grow_per_photo(client, owner, place, staff):
    publish(owner, place, staff, [], "one")
    with CaptureQueriesContext(connection) as queries:
        response = client.get("/api/v1/feed/")
    assert response.status_code == 200
    first_count = len(queries)
    for index in range(5):
        publish(owner, place, staff, [], str(index))
    with CaptureQueriesContext(connection) as queries:
        response = client.get("/api/v1/feed/")
    assert response.status_code == 200
    assert len(queries) == first_count


def test_development_fixtures_are_excluded_in_production(client, owner, place, staff, settings):
    place.is_demo = True
    place.save()
    settings.DEBUG = True
    publish(owner, place, staff, [])
    assert client.get("/api/v1/feed/").json()["count"] == 1
    settings.DEBUG = False
    assert client.get("/api/v1/feed/").json()["count"] == 0
    assert client.get(f"/api/v1/places/{place.id}/").status_code == 404


def test_staff_without_photo_permission_is_denied_in_admin(client, owner, place):
    owner.is_staff = True
    owner.save(update_fields=["is_staff"])
    submission = upload(owner, place)
    client.force_login(owner)
    assert client.get(f"/admin/photos/photosubmission/{submission.id}/review/").status_code == 403


def test_errors_have_request_id(client):
    response = client.get("/api/v1/feed/?attributes=unknown")
    assert response.status_code == 400
    assert len(response.json()["request_id"]) == 32
    assert response.headers["X-Request-ID"] == response.json()["request_id"]
