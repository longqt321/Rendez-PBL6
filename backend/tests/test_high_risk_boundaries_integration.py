import hashlib
import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.photos.models import (
    ContentReport,
    PhotoAsset,
    PhotoAudit,
    PhotoSubmission,
    PlacePhoto,
)


def create_test_image_file(name="sample.jpg", size=(200, 200), color=(180, 100, 50)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color)
    img.save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@pytest.mark.django_db
def test_full_pipeline_upload_processing_storage_and_media_serving(owner, category):
    client = APIClient()
    client.force_login(owner)

    upload_file = create_test_image_file("danang_coffee.jpg", size=(300, 400))

    # 1. API: Gửi bài đóng góp ảnh kèm đề xuất quán mới
    res = client.post(
        "/api/v1/photo-submissions/",
        {
            "proposed_name": "Quán Cà Phê Mới Hoàn Toàn",
            "proposed_address": "88 Trần Phú, Hải Châu, Đà Nẵng",
            "proposed_category": category.slug,
            "latitude": "16.071234",
            "longitude": "108.223456",
            "caption": "Không gian yên tĩnh để làm việc",
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": [upload_file],
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="boundary-test-key-1",
    )
    assert res.status_code == 201
    submission_id = res.data["id"]

    # 2. Database: Xác minh các bản ghi được tạo chuẩn xác và liên kết toàn vẹn
    submission = PhotoSubmission.objects.get(id=submission_id)
    assert submission.submitted_by == owner
    assert submission.place is not None
    assert submission.place.name == "Quán Cà Phê Mới Hoàn Toàn"

    asset = PhotoAsset.objects.get(submission=submission)
    assert asset.width > 0
    assert asset.height > 0
    assert asset.file_size > 0
    assert len(asset.sha256) == 64

    place_photo = PlacePhoto.objects.get(asset=asset)
    assert place_photo.status == "published"
    assert place_photo.caption == "Không gian yên tĩnh để làm việc"

    # 3. Filesystem: Kiểm tra file original được lưu và khớp mã băm SHA256
    with asset.original.open("rb") as f:
        file_bytes = f.read()
    calculated_sha256 = hashlib.sha256(file_bytes).hexdigest()
    assert asset.sha256 == calculated_sha256

    # 4. Media Serving: Endpoint công khai trả về binary JPEG và ETag tương ứng
    pub_res = client.get(f"/public-photo-media/{place_photo.id}/")
    assert pub_res.status_code == 200
    assert pub_res["Content-Type"] == "image/jpeg"
    assert pub_res["X-Content-Type-Options"] == "nosniff"
    assert "ETag" in pub_res
    assert pub_res["ETag"] == f'"{calculated_sha256}"'

    # ETag 304 validation
    cached_res = client.get(
        f"/public-photo-media/{place_photo.id}/",
        HTTP_IF_NONE_MATCH=pub_res["ETag"],
    )
    assert cached_res.status_code == 304

    # 5. Feed API Serialization: Đảm bảo photo và place hiển thị đầy đủ trong feed công khai
    feed_res = client.get("/api/v1/feed/")
    assert feed_res.status_code == 200
    assert feed_res.data["count"] >= 1
    feed_photo_ids = [item["photo"]["id"] for item in feed_res.data["results"]]
    assert str(place_photo.id) in feed_photo_ids


@pytest.mark.django_db
def test_transaction_rollback_preserves_db_cleanliness_on_corrupt_upload(owner, place):
    client = APIClient()
    client.force_login(owner)

    valid_file = create_test_image_file("valid.jpg")
    corrupt_file = SimpleUploadedFile(
        "corrupt.jpg", b"NOT_A_VALID_IMAGE_BYTES", content_type="image/jpeg"
    )

    initial_submissions = PhotoSubmission.objects.count()
    initial_assets = PhotoAsset.objects.count()
    initial_photos = PlacePhoto.objects.count()

    # Gửi request có 1 file hợp lệ và 1 file hỏng
    res = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "caption": "Thử nghiệm lỗi transaction rollback",
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": [valid_file, corrupt_file],
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="rollback-test-key",
    )

    # API từ chối với 400 Bad Request
    assert res.status_code == 400

    # Toàn bộ transaction bị rollback, không có bản ghi mồ côi nào trong database
    assert PhotoSubmission.objects.count() == initial_submissions
    assert PhotoAsset.objects.count() == initial_assets
    assert PlacePhoto.objects.count() == initial_photos


@pytest.mark.django_db
def test_multi_layer_moderation_lifecycle_and_access_control(owner, other, place):
    client_owner = APIClient()
    client_owner.force_login(owner)

    upload_file = create_test_image_file("lifecycle.jpg")
    res = client_owner.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "caption": "Caption ban đầu",
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": [upload_file],
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="lifecycle-key-1",
    )
    assert res.status_code == 201
    submission = PhotoSubmission.objects.get(id=res.data["id"])
    asset = submission.assets.get()
    place_photo = PlacePhoto.objects.get(asset=asset)

    # 1. Chủ sở hữu cập nhật chú thích -> Feed công khai phản hồi tức thì
    patch_res = client_owner.patch(
        f"/api/v1/photos/{place_photo.id}/manage/",
        {"caption": "Caption sau khi sửa"},
        format="json",
    )
    assert patch_res.status_code == 200
    assert patch_res.data["caption"] == "Caption sau khi sửa"

    # Kiểm tra audit log
    assert PhotoAudit.objects.filter(photo=place_photo, action="owner_caption").exists()

    # 2. Người dùng khác gửi báo cáo vi phạm
    client_other = APIClient()
    client_other.force_login(other)
    report_res = client_other.post(
        f"/api/v1/photos/{place_photo.id}/report/",
        {"reason": "privacy", "note": "Có mặt người lạ trong ảnh"},
        format="json",
    )
    assert report_res.status_code == 201
    report = ContentReport.objects.get(id=report_res.data["id"])
    assert report.status == "pending"

    # 3. Chủ sở hữu quyết định gỡ ảnh (DELETE /api/v1/photos/{id}/manage/)
    del_res = client_owner.delete(f"/api/v1/photos/{place_photo.id}/manage/")
    assert del_res.status_code == 204

    # Ảnh bị chuyển sang withdrawn
    place_photo.refresh_from_db()
    assert place_photo.status == "withdrawn"
    assert place_photo.withdrawn_at is not None

    # Báo cáo vi phạm đang chờ tự động được giải quyết
    report.refresh_from_db()
    assert report.status == "resolved"

    # Ảnh rút không còn xuất hiện trên feed công khai
    feed = client_other.get("/api/v1/feed/")
    active_ids = [item["photo"]["id"] for item in feed.data["results"]]
    assert str(place_photo.id) not in active_ids

    # Endpoint media công khai trả về 404
    assert client_other.get(f"/public-photo-media/{place_photo.id}/").status_code == 404

    # Endpoint private media: Chủ sở hữu vẫn xem được ảnh cá nhân đã tải lên (200), nhưng người khác bị chặn (404)
    assert client_owner.get(f"/private-photo-media/{asset.id}/").status_code == 200
    assert client_other.get(f"/private-photo-media/{asset.id}/").status_code == 404
