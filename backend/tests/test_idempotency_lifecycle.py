import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.favorites.models import Favorite
from apps.photos.models import PhotoAsset, PhotoLike, PhotoSubmission, PlacePhoto
from .conftest import photo


def _submission_payload(place, **overrides):
    payload = {
        "place_id": str(place.id),
        "caption": "Thao tác gửi",
        "consent": "true",
        "consent_version": "photo-rights-v2",
        "images": [photo()],
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_retry_after_success_returns_same_result_without_duplication(client, owner, place):
    client.force_authenticate(owner)

    # 1. First upload attempt succeeds (201)
    res1 = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Thao tác gửi lần đầu"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="retry-success-key",
    )
    assert res1.status_code == 201
    submission_id = res1.data["id"]
    initial_submission_count = PhotoSubmission.objects.count()
    initial_asset_count = PhotoAsset.objects.count()
    initial_photo_count = PlacePhoto.objects.count()

    # 2. Retry with the EXACT same key and payload after simulated response loss
    res2 = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Thao tác gửi lần đầu"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="retry-success-key",
    )
    assert res2.status_code == 201
    assert str(res2.data["id"]) == str(submission_id)

    # 3. Verify no duplicate records were created
    assert PhotoSubmission.objects.count() == initial_submission_count
    assert PhotoAsset.objects.count() == initial_asset_count
    assert PlacePhoto.objects.count() == initial_photo_count


@pytest.mark.django_db
def test_retry_after_failure_succeeds_cleanly(client, owner, place, settings):
    client.force_authenticate(owner)
    bad_payload = {
        "place_id": str(place.id),
        "caption": "Thử nghiệm lỗi",
        "consent": "true",
        "consent_version": "photo-rights-v2",
        "images": [
            SimpleUploadedFile("corrupted.jpg", b"bad image data", content_type="image/jpeg")
        ],
    }

    # 1. First attempt fails due to invalid image content (400)
    res_fail = client.post(
        "/api/v1/photo-submissions/",
        bad_payload,
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="retry-fail-key",
    )
    assert res_fail.status_code == 400
    assert not PhotoSubmission.objects.filter(idempotency_key="retry-fail-key").exists()

    # 2. Retry with the SAME key but valid data succeeds cleanly (201)
    res_success = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Thử nghiệm thành công sau lỗi"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="retry-fail-key",
    )
    assert res_success.status_code == 201
    assert PhotoSubmission.objects.filter(idempotency_key="retry-fail-key").count() == 1


@pytest.mark.django_db
def test_same_idempotency_key_across_different_users_is_scoped(client, owner, other, place):
    shared_key = "user-scoped-shared-key"

    # User 1 submits with shared_key
    client.force_authenticate(owner)
    res1 = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Ảnh từ User 1"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=shared_key,
    )
    assert res1.status_code == 201

    # User 2 submits with the SAME shared_key
    client.force_authenticate(other)
    res2 = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Ảnh từ User 2"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=shared_key,
    )
    assert res2.status_code == 201

    # Both submissions exist independently
    assert str(res1.data["id"]) != str(res2.data["id"])
    assert PhotoSubmission.objects.filter(idempotency_key=shared_key).count() == 2


@pytest.mark.django_db
def test_same_key_with_different_payload_returns_409_conflict(client, owner, place):
    client.force_authenticate(owner)
    key = "conflict-detection-key"

    # 1. Initial submission
    res1 = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Mô tả ban đầu"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=key,
    )
    assert res1.status_code == 201

    # 2. Resubmitting with modified caption returns 409 Conflict
    res_conflict_caption = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Mô tả đã thay đổi"),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=key,
    )
    assert res_conflict_caption.status_code == 409

    # 3. Resubmitting with different image content returns 409 Conflict
    different_image = photo(name="diff.png", size=(150, 150))
    res_conflict_image = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place, caption="Mô tả ban đầu", images=[different_image]),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=key,
    )
    assert res_conflict_image.status_code == 409


@pytest.mark.django_db
def test_invalid_or_missing_idempotency_key_rejected(client, owner, place):
    client.force_authenticate(owner)

    # 1. Missing header
    res_missing = client.post(
        "/api/v1/photo-submissions/", _submission_payload(place), format="multipart"
    )
    assert res_missing.status_code == 400
    assert "idempotency_key" in str(res_missing.data)

    # 2. Empty or whitespace-only key
    res_empty = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="   ",
    )
    assert res_empty.status_code == 400
    assert "idempotency_key" in str(res_empty.data)

    # 3. Key exceeding 100 characters
    res_long = client.post(
        "/api/v1/photo-submissions/",
        _submission_payload(place),
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="a" * 101,
    )
    assert res_long.status_code == 400
    assert "idempotency_key" in str(res_long.data)


@pytest.mark.django_db
def test_natural_idempotency_of_other_state_mutations(client, owner, other, place):
    # 1. Favorite PUT idempotency: multiple calls produce exactly 1 record
    client.force_authenticate(owner)
    assert client.put(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert client.put(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert client.put(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert Favorite.objects.filter(user=owner, place=place).count() == 1

    # 2. Favorite DELETE idempotency: multiple calls safely return 204
    assert client.delete(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert client.delete(f"/api/v1/favorites/{place.id}/").status_code == 204
    assert Favorite.objects.filter(user=owner, place=place).count() == 0

    # 3. Photo Like POST idempotency
    from apps.photos.services import submit

    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "Photo for like test",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        "photo-like-idemp-test",
    )
    sample_photo = submission.assets.get().public_photo

    client.force_authenticate(other)
    url_like = f"/api/v1/photos/{sample_photo.id}/likes/"
    res_like1 = client.post(url_like)
    assert res_like1.status_code == 200
    assert res_like1.data == {"liked": True, "count": 1}

    # Repeated like returns same state and does not create duplicate likes
    res_like2 = client.post(url_like)
    assert res_like2.status_code == 200
    assert res_like2.data == {"liked": True, "count": 1}
    assert PhotoLike.objects.filter(user=other, photo=sample_photo).count() == 1
