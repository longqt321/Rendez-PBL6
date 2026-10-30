import pytest
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.photos.models import ContentReport, PhotoAudit, PhotoSubmission, PlacePhoto
from apps.photos.services import moderate_report, submit
from .conftest import photo


def create_photo(owner, place, key="report-mod-test"):
    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "Moderation Lifecycle Test Photo",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    return PlacePhoto.objects.get(asset=asset)


@pytest.mark.django_db
def test_normal_report_creation(owner, other, place):
    test_photo = create_photo(owner, place, key="normal-rep-photo")
    client = APIClient()
    client.force_login(other)

    # 1. Report photo successfully
    res_photo = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "copyright", "note": "Ảnh vi phạm bản quyền tác giả"},
        format="json",
    )
    assert res_photo.status_code == 201
    assert res_photo.data["reason"] == "copyright"
    assert res_photo.data["status"] == "pending"

    # 2. Report place successfully
    res_place = client.post(
        f"/api/v1/places/{place.id}/report/",
        {"reason": "wrong_place", "note": "Quán đã đổi địa chỉ"},
        format="json",
    )
    assert res_place.status_code == 201
    assert res_place.data["reason"] == "wrong_place"
    assert res_place.data["status"] == "pending"


@pytest.mark.django_db
def test_owner_and_reporter_cannot_moderate_reports(owner, other, place):
    test_photo = create_photo(owner, place, key="owner-mod-perm")
    report = ContentReport.objects.create(
        reporter=other,
        photo=test_photo,
        reason="other",
        note="Báo cáo cần kiểm duyệt",
    )

    # 1. Reporter cannot moderate their own report
    with pytest.raises(PermissionDenied):
        moderate_report(report.id, other, action="dismiss")

    # 2. Content owner cannot moderate report on their own photo
    with pytest.raises(PermissionDenied):
        moderate_report(report.id, owner, action="dismiss")


@pytest.mark.django_db
def test_duplicate_pending_reports_are_prevented(owner, other, place):
    test_photo = create_photo(owner, place, key="duplicate-rep-photo")
    client = APIClient()
    client.force_login(other)

    # First report: 201
    res1 = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "unsafe", "note": "Lần 1"},
        format="json",
    )
    assert res1.status_code == 201

    # Second report while pending: 400 Duplicate
    res2 = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "wrong_place", "note": "Lần 2"},
        format="json",
    )
    assert res2.status_code == 400
    assert "đang chờ xử lý" in str(res2.data)


@pytest.mark.django_db
def test_moderator_dismiss_report_keeps_content_public(owner, other, staff, place):
    test_photo = create_photo(owner, place, key="dismiss-rep-photo")
    client = APIClient()
    client.force_login(other)

    res = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "other", "note": "Báo cáo nhầm"},
        format="json",
    )
    report_id = res.data["id"]

    # Moderator dismisses the report
    report = moderate_report(report_id, staff, action="dismiss", note="Không phát hiện vi phạm")
    assert report.status == "resolved"
    assert report.resolved_at is not None
    assert "[Reviewer note]: Không phát hiện vi phạm" in report.note

    # Content is still published
    test_photo.refresh_from_db()
    assert test_photo.status == "published"
    assert test_photo.withdrawn_at is None

    # Audit log recorded
    assert PhotoAudit.objects.filter(photo=test_photo, action="report_dismissed").exists()

    # Now that the previous report is resolved, user can submit a new report if needed
    res_new = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "unsafe", "note": "Vi phạm mới phát hiện"},
        format="json",
    )
    assert res_new.status_code == 201


@pytest.mark.django_db
def test_moderator_take_down_photo_and_inaccessibility(owner, other, staff, place):
    test_photo = create_photo(owner, place, key="takedown-rep-photo")
    client = APIClient()
    client.force_login(other)

    res = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "privacy", "note": "Ảnh lộ thông tin cá nhân"},
        format="json",
    )
    report_id = res.data["id"]

    # Moderator accepts report and takes down photo
    report = moderate_report(report_id, staff, action="take_down", note="Đã gỡ ảnh theo yêu cầu")
    assert report.status == "resolved"
    assert report.resolved_at is not None

    test_photo.refresh_from_db()
    assert test_photo.status == "withdrawn"
    assert test_photo.withdrawn_at is not None
    assert test_photo.is_cover is False

    # PhotoAudit recorded
    assert PhotoAudit.objects.filter(photo=test_photo, action="moderation_withdrawn").exists()

    # Verifying inaccessibility across endpoints:
    # 1. Detail endpoint: 404
    assert client.get(f"/api/v1/photos/{test_photo.id}/").status_code == 404
    # 2. Public media endpoint: 404
    assert client.get(f"/public-photo-media/{test_photo.id}/").status_code == 404
    # 3. Likes endpoint: 404
    assert client.get(f"/api/v1/photos/{test_photo.id}/likes/").status_code == 404
    assert client.post(f"/api/v1/photos/{test_photo.id}/likes/").status_code == 404
    # 4. Comments endpoint: 404
    assert client.get(f"/api/v1/photos/{test_photo.id}/comments/").status_code == 404
    assert (
        client.post(
            f"/api/v1/photos/{test_photo.id}/comments/", {"body": "Bình luận"}, format="json"
        ).status_code
        == 404
    )
    # 5. Report endpoint: 404
    assert (
        client.post(
            f"/api/v1/photos/{test_photo.id}/report/",
            {"reason": "unsafe", "note": "Thử báo cáo lại"},
            format="json",
        ).status_code
        == 404
    )

    # 6. Owner cannot edit caption on withdrawn photo
    client_owner = APIClient()
    client_owner.force_login(owner)
    res_patch = client_owner.patch(
        f"/api/v1/photos/{test_photo.id}/manage/",
        {"caption": "Mô tả mới trên ảnh bị gỡ"},
        format="json",
    )
    assert res_patch.status_code == 400


@pytest.mark.django_db
def test_moderator_take_down_place_hides_content(other, staff, place):
    client = APIClient()
    client.force_login(other)

    res = client.post(
        f"/api/v1/places/{place.id}/report/",
        {"reason": "wrong_place", "note": "Quán lừa đảo"},
        format="json",
    )
    report_id = res.data["id"]

    # Moderator accepts report and hides place
    report = moderate_report(report_id, staff, action="take_down", note="Ẩn quán vi phạm")
    assert report.status == "resolved"

    place.refresh_from_db()
    assert place.status == "hidden"

    # Verifying inaccessibility across endpoints:
    assert client.get(f"/api/v1/places/{place.id}/").status_code == 404
    assert client.get(f"/api/v1/places/{place.id}/photos/").status_code == 404
    assert (
        client.post(
            f"/api/v1/places/{place.id}/report/",
            {"reason": "other", "note": "Báo cáo tiếp"},
            format="json",
        ).status_code
        == 404
    )


@pytest.mark.django_db
def test_invalid_state_transitions_and_repeated_operations(owner, other, staff, place):
    test_photo = create_photo(owner, place, key="invalid-state-photo")
    client = APIClient()
    client.force_login(other)

    res = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "copyright", "note": "Vi phạm"},
        format="json",
    )
    report_id = res.data["id"]

    # Resolve once
    moderate_report(report_id, staff, action="dismiss")

    # Attempt repeated operation on already resolved report: rejected
    with pytest.raises(ValidationError) as exc:
        moderate_report(report_id, staff, action="dismiss")
    assert "không thể xử lý lại" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        moderate_report(report_id, staff, action="take_down")
    assert "không thể xử lý lại" in str(exc.value)

    # Invalid action rejected
    new_rep = ContentReport.objects.create(reporter=other, photo=test_photo, reason="other")
    with pytest.raises(ValidationError) as exc:
        moderate_report(new_rep.id, staff, action="random_invalid_action")
    assert "không hợp lệ" in str(exc.value)


@pytest.mark.django_db
def test_moderator_permission_checks(owner, other, place):
    test_photo = create_photo(owner, place, key="perm-check-photo")
    report = ContentReport.objects.create(reporter=other, photo=test_photo, reason="other")

    # Regular user cannot moderate
    with pytest.raises(PermissionDenied):
        moderate_report(report.id, other, action="dismiss")

    # Staff without review_photosubmission permission cannot moderate
    regular_staff = User.objects.create_user(
        "regular_staff_mod@example.test", "Pass-12345", is_staff=True
    )
    with pytest.raises(PermissionDenied):
        moderate_report(report.id, regular_staff, action="dismiss")

    # Staff WITH review_photosubmission permission can moderate
    content_type = ContentType.objects.get_for_model(PhotoSubmission)
    perm, _ = Permission.objects.get_or_create(
        codename="review_photosubmission", content_type=content_type
    )
    regular_staff.user_permissions.add(perm)
    regular_staff = User.objects.get(pk=regular_staff.pk)

    res = moderate_report(report.id, regular_staff, action="dismiss")
    assert res.status == "resolved"
