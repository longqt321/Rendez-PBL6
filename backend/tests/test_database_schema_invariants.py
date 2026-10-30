import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.photos.models import (
    ContentReport,
    PhotoAsset,
    PhotoComment,
    PhotoSubmission,
    PlacePhoto,
)
from .conftest import photo


@pytest.mark.django_db
def test_prevent_duplicate_pending_content_reports_at_db_level(owner, place):
    # 1. First pending report on a place succeeds
    report1 = ContentReport.objects.create(
        reporter=owner,
        place=place,
        reason="wrong_place",
        status="pending",
    )
    assert report1.id is not None

    # 2. Duplicate pending report on the same place by the same user is rejected at DB level
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            ContentReport.objects.create(
                reporter=owner,
                place=place,
                reason="unsafe",
                status="pending",
            )

    # 3. Once resolved, user is allowed to submit a new report if an issue re-occurs
    report1.status = "resolved"
    report1.resolved_at = timezone.now()
    report1.save()

    report2 = ContentReport.objects.create(
        reporter=owner,
        place=place,
        reason="privacy",
        status="pending",
    )
    assert report2.id is not None


@pytest.mark.django_db
def test_content_report_status_lifecycle_constraint(owner, place):
    # Pending report cannot have resolved_at
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            ContentReport.objects.create(
                reporter=owner,
                place=place,
                reason="wrong_place",
                status="pending",
                resolved_at=timezone.now(),
            )

    # Resolved report MUST have resolved_at
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            ContentReport.objects.create(
                reporter=owner,
                place=place,
                reason="wrong_place",
                status="resolved",
                resolved_at=None,
            )


@pytest.mark.django_db
def test_place_photo_cover_published_constraint(owner, place):
    submission = PhotoSubmission.objects.create(
        submitted_by=owner,
        place=place,
        status="approved",
        published_by=owner,
        published_at=timezone.now(),
        consent_version="v1",
        consent_at=timezone.now(),
        idempotency_key="cover-test-key",
        payload_hash="testhash",
    )
    asset = PhotoAsset.objects.create(
        submission=submission,
        original="orig.jpg",
        derivative="deriv.jpg",
        sha256="abc",
        file_size=1024,
        width=800,
        height=600,
        sort_order=0,
    )

    photo_obj = PlacePhoto.objects.create(
        place=place,
        asset=asset,
        status="published",
        published_at=timezone.now(),
        is_cover=True,
    )

    # Database constraint prevents setting is_cover=True on a withdrawn photo
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PlacePhoto.objects.filter(pk=photo_obj.pk).update(
                status="withdrawn",
                withdrawn_at=timezone.now(),
                is_cover=True,
            )


@pytest.mark.django_db
def test_place_photo_status_timestamps_constraints(owner, place):
    submission = PhotoSubmission.objects.create(
        submitted_by=owner,
        place=place,
        status="approved",
        published_by=owner,
        published_at=timezone.now(),
        consent_version="v1",
        consent_at=timezone.now(),
        idempotency_key="ts-test-key",
        payload_hash="testhash",
    )
    asset1 = PhotoAsset.objects.create(
        submission=submission,
        original="orig1.jpg",
        derivative="deriv1.jpg",
        sha256="abc1",
        file_size=1024,
        width=800,
        height=600,
        sort_order=0,
    )

    photo_obj = PlacePhoto.objects.create(
        place=place,
        asset=asset1,
        status="withdrawn",
        withdrawn_at=timezone.now(),
    )

    # Withdrawn photo must have withdrawn_at at DB level
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PlacePhoto.objects.filter(pk=photo_obj.pk).update(withdrawn_at=None)

    # Pending publication photo must NOT have published_at or withdrawn_at
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PlacePhoto.objects.create(
                place=place,
                asset=asset1,
                status="pending_publication",
                published_at=timezone.now(),
            )


@pytest.mark.django_db
def test_photo_asset_positive_dimensions_constraint(owner, place):
    submission = PhotoSubmission.objects.create(
        submitted_by=owner,
        place=place,
        status="approved",
        published_by=owner,
        published_at=timezone.now(),
        consent_version="v1",
        consent_at=timezone.now(),
        idempotency_key="dim-test-key",
        payload_hash="testhash",
    )

    # Width <= 0 rejected
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PhotoAsset.objects.create(
                submission=submission,
                original="orig.jpg",
                derivative="deriv.jpg",
                sha256="abc",
                file_size=1024,
                width=0,
                height=600,
                sort_order=0,
            )

    # file_size <= 0 rejected
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PhotoAsset.objects.create(
                submission=submission,
                original="orig.jpg",
                derivative="deriv.jpg",
                sha256="abc",
                file_size=0,
                width=800,
                height=600,
                sort_order=0,
            )


@pytest.mark.django_db
def test_photo_comment_non_empty_body_constraint(owner, place):
    submission = PhotoSubmission.objects.create(
        submitted_by=owner,
        place=place,
        status="approved",
        published_by=owner,
        published_at=timezone.now(),
        consent_version="v1",
        consent_at=timezone.now(),
        idempotency_key="comment-test-key",
        payload_hash="testhash",
    )
    asset = PhotoAsset.objects.create(
        submission=submission,
        original="orig.jpg",
        derivative="deriv.jpg",
        sha256="abc",
        file_size=1024,
        width=800,
        height=600,
        sort_order=0,
    )
    public_photo = PlacePhoto.objects.create(
        place=place,
        asset=asset,
        status="published",
        published_at=timezone.now(),
    )

    # Empty body is rejected at DB level
    with transaction.atomic():
        with pytest.raises(IntegrityError):
            PhotoComment.objects.create(
                photo=public_photo,
                user=owner,
                body="",
            )


@pytest.mark.django_db
def test_valid_submission_and_lifecycle_compatibility(client, owner, place):
    from apps.photos.services import submit

    # Standard valid submission creates records satisfying all constraints
    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "Ảnh hợp lệ kiểm tra schema invariants",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        "schema-compat-key",
    )
    assert submission.id is not None
    created_asset = submission.assets.get()
    assert created_asset.width > 0
    assert created_asset.height > 0
    assert created_asset.file_size > 0

    created_photo = created_asset.public_photo
    assert created_photo.status == "published"
    assert created_photo.published_at is not None
    assert created_photo.withdrawn_at is None
