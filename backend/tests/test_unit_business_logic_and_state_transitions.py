import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.photos.models import (
    ContentReport,
    PhotoAudit,
    PlacePhoto,
    VisualAttribute,
)
from apps.photos.services import (
    change_publication,
    owner_edit_photo,
    set_tags,
    submit,
)
from apps.places.models import Category, Place
from .conftest import photo


def create_test_submission_and_photo(user, place, key="unit-biz-test"):
    submission = submit(
        user,
        {
            "place_id": place,
            "caption": "Ban đầu chưa sửa",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    return submission, PlacePhoto.objects.get(asset=asset)


@pytest.mark.django_db
def test_owner_edit_photo_caption_and_audit(owner, place):
    _, test_photo = create_test_submission_and_photo(owner, place, key="edit-caption-key")

    # 1. Chủ ảnh sửa caption hợp lệ
    updated = owner_edit_photo(test_photo.id, owner, caption="Caption mới cập nhật")
    assert updated.caption == "Caption mới cập nhật"
    assert updated.alt_text == "Caption mới cập nhật"

    # Kiểm tra ghi nhận lịch sử audit
    audit = PhotoAudit.objects.filter(photo=test_photo, action="owner_caption").first()
    assert audit is not None
    assert audit.actor == owner


@pytest.mark.django_db
def test_owner_withdraw_photo_lifecycle(owner, other, place):
    _, test_photo = create_test_submission_and_photo(owner, place, key="withdraw-key")

    # Tạo một báo cáo vi phạm đang chờ xử lý cho ảnh
    pending_report = ContentReport.objects.create(
        reporter=other,
        photo=test_photo,
        reason="unsafe",
        status="pending",
    )

    # 1. Chủ ảnh chủ động rút ảnh
    withdrawn = owner_edit_photo(test_photo.id, owner, withdraw=True)
    assert withdrawn.status == "withdrawn"
    assert withdrawn.withdrawn_at is not None
    assert withdrawn.is_cover is False

    # 2. Báo cáo đang chờ xử lý tự động được giải quyết
    pending_report.refresh_from_db()
    assert pending_report.status == "resolved"
    assert pending_report.resolved_at is not None

    # 3. Ghi audit thao tác rút ảnh
    audit = PhotoAudit.objects.filter(photo=test_photo, action="owner_withdraw").first()
    assert audit is not None
    assert audit.actor == owner

    # 4. Ảnh đã rút không thể chỉnh sửa tiếp
    with pytest.raises(ValidationError, match="Ảnh này đã bị gỡ và không thể chỉnh sửa."):
        owner_edit_photo(test_photo.id, owner, caption="Cố sửa ảnh đã rút")


@pytest.mark.django_db
def test_non_owner_cannot_edit_or_withdraw_photo(owner, other, place):
    _, test_photo = create_test_submission_and_photo(owner, place, key="non-owner-key")

    # Người khác không thể chỉnh sửa ảnh của chủ sở hữu (trả về 404 Not Found từ queryset)
    from django.http import Http404

    with pytest.raises(Http404):
        owner_edit_photo(test_photo.id, other, caption="Hacker sửa ảnh")

    with pytest.raises(Http404):
        owner_edit_photo(test_photo.id, other, withdraw=True)


@pytest.mark.django_db
def test_change_publication_actions_and_guards(owner, place, staff, other):
    _, test_photo = create_test_submission_and_photo(owner, place, key="pub-guard-key")

    # 1. Người dùng không có quyền reviewer gọi change_publication bị từ chối
    with pytest.raises(PermissionDenied):
        change_publication(test_photo.id, other, "withdraw")

    # 2. Chọn làm ảnh bìa hợp lệ
    covered = change_publication(test_photo.id, staff, "cover")
    assert covered.is_cover is True
    assert PhotoAudit.objects.filter(photo=test_photo, action="cover").exists()

    # 3. Rút ảnh hợp lệ
    withdrawn = change_publication(test_photo.id, staff, "withdraw")
    assert withdrawn.status == "withdrawn"
    assert withdrawn.is_cover is False

    # 4. Không thể rút lại ảnh đã rút
    with pytest.raises(ValidationError, match="Ảnh này đã được gỡ trước đó."):
        change_publication(test_photo.id, staff, "withdraw")

    # 5. Không thể chọn ảnh đã rút làm ảnh bìa
    with pytest.raises(ValidationError, match="Chỉ chọn ảnh công khai làm bìa."):
        change_publication(test_photo.id, staff, "cover")

    # 6. Hành động không xác định bị từ chối
    with pytest.raises(ValidationError, match="Hành động không hợp lệ."):
        change_publication(test_photo.id, staff, "unknown_action")


@pytest.mark.django_db
def test_change_publication_cannot_publish_when_place_hidden_or_deleted(owner, place, staff):
    _, test_photo = create_test_submission_and_photo(owner, place, key="pub-hidden-place")

    # Tạo một ảnh ở trạng thái draft/pending (phải bỏ is_cover để tuân thủ DB invariant)
    test_photo.is_cover = False
    test_photo.status = "pending"
    test_photo.save()

    # 1. Quán đang bị ẩn -> không thể publish ảnh
    place.status = "hidden"
    place.save()
    with pytest.raises(ValidationError, match="Quán phải được công khai trước khi đăng ảnh."):
        change_publication(test_photo.id, staff, "publish")

    # 2. Quán bị xóa mềm (deleted_at set) -> không thể publish ảnh
    Place.objects.filter(pk=place.pk).update(status="hidden", deleted_at=timezone.now())
    place.refresh_from_db()
    with pytest.raises(ValidationError, match="Quán phải được công khai trước khi đăng ảnh."):
        change_publication(test_photo.id, staff, "publish")


@pytest.mark.django_db
def test_place_clean_invariants_and_slug_generation(category, owner):
    # 1. Tên hoặc địa chỉ rỗng bị từ chối ở tầng model clean
    blank_name_place = Place(
        name="   ", address="123 Bạch Đằng", category=category, created_by=owner, updated_by=owner
    )
    with pytest.raises(DjangoValidationError, match="Tên và địa chỉ không được để trống."):
        blank_name_place.clean()

    blank_addr_place = Place(
        name="Quán Mới", address="   ", category=category, created_by=owner, updated_by=owner
    )
    with pytest.raises(DjangoValidationError, match="Tên và địa chỉ không được để trống."):
        blank_addr_place.clean()

    # 2. Không thể xuất bản địa điểm có category ngừng hoạt động
    inactive_cat = Category.objects.create(
        slug="inactive_cat", name="Danh mục ngưng", is_active=False
    )
    pub_inactive_place = Place(
        name="Quán X",
        address="123 Trần Phú",
        category=inactive_cat,
        status="published",
        created_by=owner,
        updated_by=owner,
    )
    with pytest.raises(
        DjangoValidationError, match="Không thể xuất bản địa điểm đã xóa hoặc loại không hoạt động."
    ):
        pub_inactive_place.clean()

    # 3. Tự động sinh slug khi tạo quán mới hợp lệ
    valid_place = Place.objects.create(
        name="Cà Phê Sông Hàn",
        address="456 Bạch Đằng, Đà Nẵng",
        category=category,
        created_by=owner,
        updated_by=owner,
    )
    assert valid_place.slug.startswith("ca-phe-song-han-")
    assert len(valid_place.slug) > 0


@pytest.mark.django_db
def test_set_tags_boundary_and_validation(owner, place, staff):
    _, test_photo = create_test_submission_and_photo(owner, place, key="tags-test-key")

    VisualAttribute.objects.create(
        code="wifi_fast", display_name_vi="Wifi tốc độ cao", description="Wifi", active=True
    )
    VisualAttribute.objects.create(
        code="outdoor_seat",
        display_name_vi="Chỗ ngồi ngoài trời",
        description="Outdoor",
        active=True,
    )
    VisualAttribute.objects.create(
        code="old_promo", display_name_vi="Khuyến mãi cũ", description="Old promo", active=False
    )

    # 1. Gán đặc điểm hợp lệ
    set_tags(test_photo, ["wifi_fast", "outdoor_seat"], staff)
    tag_codes = list(test_photo.attributes.values_list("code", flat=True))
    assert "wifi_fast" in tag_codes
    assert "outdoor_seat" in tag_codes
    assert PhotoAudit.objects.filter(photo=test_photo, action="tags_reviewed").exists()

    # 2. Gán đặc điểm đã ngừng kích hoạt bị từ chối
    with pytest.raises(ValidationError, match="Đặc điểm không hợp lệ hoặc đã ngừng sử dụng."):
        set_tags(test_photo, ["old_promo"], staff)

    # 3. Gán mã đặc điểm không tồn tại bị từ chối
    with pytest.raises(ValidationError, match="Đặc điểm không hợp lệ hoặc đã ngừng sử dụng."):
        set_tags(test_photo, ["non_existent_attribute_code"], staff)
