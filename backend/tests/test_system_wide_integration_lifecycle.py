import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.favorites.models import Favorite
from apps.photos.models import (
    ContentReport,
    PhotoAsset,
    PhotoComment,
    PhotoLike,
    PhotoSubmission,
    PlacePhoto,
)
from apps.photos.services import moderate_report
from apps.places.models import Place


def create_jpeg(name="danang.jpg", size=(250, 250), color=(100, 150, 200)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color)
    img.save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@pytest.mark.django_db
def test_end_to_end_user_journey_from_registration_to_moderation(category, staff):
    """
    Kiểm thử tích hợp chu trình hoàn chỉnh từ đăng ký, đóng góp, tương tác, báo cáo
    đến kiểm duyệt gỡ bỏ nội dung giữa nhiều tác tử độc lập (User A, User B, Admin).
    """
    client_a = APIClient()
    client_b = APIClient()

    # 1. User A đăng ký tài khoản mới
    res_reg_a = client_a.post(
        "/api/v1/auth/register/",
        {
            "email": "usera@example.test",
            "password": "Password-A-9134",
            "display_name": "Tác Giả A",
        },
    )
    assert res_reg_a.status_code == 201
    user_a = User.objects.get(email="usera@example.test")
    assert user_a.display_name == "Tác Giả A"

    # Kiểm tra phiên hoạt động của User A
    me_a = client_a.get("/api/v1/auth/me/")
    assert me_a.status_code == 200
    assert me_a.data["email"] == "usera@example.test"

    # 2. User A đóng góp ảnh kèm đề xuất địa điểm mới với Idempotency Key
    image_a = create_jpeg("coffee_a.jpg")
    idempotency_key = "idemp-journey-key-101"
    sub_payload = {
        "proposed_name": "Cà Phê Ven Sông Hàn",
        "proposed_address": "12 Bạch Đằng, Hải Châu, Đà Nẵng",
        "proposed_category": category.slug,
        "latitude": "16.068800",
        "longitude": "108.225500",
        "caption": "Góc nhìn ra cầu Rồng lúc hoàng hôn",
        "consent": "true",
        "consent_version": "photo-rights-v2",
        "images": [image_a],
    }

    res_sub = client_a.post(
        "/api/v1/photo-submissions/",
        sub_payload,
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=idempotency_key,
    )
    assert res_sub.status_code == 201
    submission_id = res_sub.data["id"]

    # Xác minh tính toàn vẹn bản ghi và file media
    submission = PhotoSubmission.objects.get(id=submission_id)
    assert submission.submitted_by == user_a
    new_place = submission.place
    assert new_place.name == "Cà Phê Ven Sông Hàn"
    assert new_place.status == "published"

    asset = PhotoAsset.objects.get(submission=submission)
    place_photo = PlacePhoto.objects.get(asset=asset)
    assert place_photo.status == "published"
    assert place_photo.is_cover is True

    # 3. Gửi lại cùng request đóng góp với cùng Idempotency Key -> trả về kết quả cũ, không tạo trùng
    image_a_repeat = create_jpeg("coffee_a.jpg")
    sub_payload["images"] = [image_a_repeat]
    res_sub_repeat = client_a.post(
        "/api/v1/photo-submissions/",
        sub_payload,
        format="multipart",
        HTTP_IDEMPOTENCY_KEY=idempotency_key,
    )
    assert res_sub_repeat.status_code == 201
    assert res_sub_repeat.data["id"] == submission_id
    assert Place.objects.filter(name="Cà Phê Ven Sông Hàn").count() == 1
    assert PlacePhoto.objects.filter(place=new_place).count() == 1

    # 4. User B đăng ký tài khoản mới
    res_reg_b = client_b.post(
        "/api/v1/auth/register/",
        {
            "email": "userb@example.test",
            "password": "Password-B-9134",
            "display_name": "Người Dùng B",
        },
    )
    assert res_reg_b.status_code == 201
    user_b = User.objects.get(email="userb@example.test")

    # 5. User B duyệt Feed và Bản đồ
    feed_res = client_b.get("/api/v1/feed/")
    assert feed_res.status_code == 200
    feed_photos = [item["photo"]["id"] for item in feed_res.data["results"]]
    assert str(place_photo.id) in feed_photos

    # User B tìm kiếm quán theo từ khóa
    search_res = client_b.get("/api/v1/places/?q=Sông Hàn")
    assert search_res.status_code == 200
    assert any(p["id"] == str(new_place.id) for p in search_res.data["results"])

    # User B kiểm tra bản đồ trong bounding box chứa quán
    map_res = client_b.get("/api/v1/places/map/?bbox=108.20,16.05,108.25,16.08")
    assert map_res.status_code == 200
    map_place_ids = [m["id"] for m in map_res.data["results"]]
    assert str(new_place.id) in map_place_ids

    # 6. User B tương tác: Thích ảnh, Bình luận, Lưu yêu thích
    like_url = f"/api/v1/photos/{place_photo.id}/likes/"
    # Thích lần 1
    res_like1 = client_b.post(like_url)
    assert res_like1.status_code == 200
    assert res_like1.data == {"liked": True, "count": 1}
    assert PhotoLike.objects.filter(photo=place_photo, user=user_b).count() == 1

    # Thích lặp lại (idempotent)
    res_like2 = client_b.post(like_url)
    assert res_like2.status_code == 200
    assert res_like2.data == {"liked": True, "count": 1}
    assert PhotoLike.objects.filter(photo=place_photo, user=user_b).count() == 1

    # User B viết bình luận
    comment_url = f"/api/v1/photos/{place_photo.id}/comments/"
    res_cm = client_b.post(comment_url, {"body": "Quán có view sông Hàn tuyệt đẹp!"})
    assert res_cm.status_code == 201
    comment_id = res_cm.data["id"]
    assert PhotoComment.objects.filter(id=comment_id).exists()

    # User B chỉnh sửa bình luận của chính mình (PATCH)
    edit_cm_url = f"/api/v1/comments/{comment_id}/"
    res_cm_patch = client_b.patch(edit_cm_url, {"body": "View sông Hàn tuyệt đẹp và thoáng mát!"})
    assert res_cm_patch.status_code == 200
    assert res_cm_patch.data["body"] == "View sông Hàn tuyệt đẹp và thoáng mát!"

    # User A cố tình chỉnh sửa bình luận của User B -> 403 Forbidden
    res_cm_hack = client_a.patch(edit_cm_url, {"body": "Hacked comment!"})
    assert res_cm_hack.status_code == 403

    # User B lưu quán vào mục yêu thích
    fav_url = f"/api/v1/favorites/{new_place.id}/"
    res_fav = client_b.put(fav_url)
    assert res_fav.status_code == 204
    assert Favorite.objects.filter(user=user_b, place=new_place).exists()

    # User B kiểm tra danh sách đã lưu
    my_favs = client_b.get("/api/v1/favorites/")
    assert my_favs.status_code == 200
    assert any(f["id"] == str(new_place.id) for f in my_favs.data["results"])

    # 7. User B gửi báo cáo vi phạm đối với ảnh của User A
    report_url = f"/api/v1/photos/{place_photo.id}/report/"
    res_rep = client_b.post(
        report_url, {"reason": "unsafe", "note": "Hình ảnh chụp khu vực nguy hiểm"}
    )
    assert res_rep.status_code == 201
    report_id = res_rep.data["id"]
    report = ContentReport.objects.get(id=report_id)
    assert report.status == "pending"

    # 8. Quản trị viên (staff) thực hiện kiểm duyệt chấp thuận báo cáo và gỡ bỏ ảnh (take_down)
    moderate_report(report_id, reviewer=staff, action="take_down", note="Xác nhận vi phạm quy định")

    # 9. Xác minh toàn hệ thống sau khi ảnh bị gỡ
    place_photo.refresh_from_db()
    assert place_photo.status == "withdrawn"
    assert place_photo.withdrawn_at is not None
    assert place_photo.is_cover is False

    report.refresh_from_db()
    assert report.status == "resolved"

    # Ảnh biến mất khỏi Feed công khai
    feed_after = client_b.get("/api/v1/feed/")
    feed_photos_after = [item["photo"]["id"] for item in feed_after.data["results"]]
    assert str(place_photo.id) not in feed_photos_after

    # Endpoint media công khai trả về 404 Not Found
    res_pub_media = client_b.get(f"/public-photo-media/{place_photo.id}/")
    assert res_pub_media.status_code == 404

    # Quyền riêng tư: User A vẫn xem được ảnh gốc của mình ở endpoint private, User B bị chặn 404
    assert client_a.get(f"/private-photo-media/{asset.id}/").status_code == 200
    assert client_b.get(f"/private-photo-media/{asset.id}/").status_code == 404

    # Không thể bình luận thêm vào ảnh đã rút
    assert client_b.post(comment_url, {"body": "Cố bình luận vào ảnh đã gỡ"}).status_code == 404

    # 10. User B xóa bình luận của mình
    res_del_cm = client_b.delete(edit_cm_url)
    assert res_del_cm.status_code == 204
    assert not PhotoComment.objects.filter(id=comment_id).exists()

    # 11. Đăng xuất User A và User B
    assert client_a.post("/api/v1/auth/logout/").status_code == 204
    assert client_b.post("/api/v1/auth/logout/").status_code == 204

    # Các request yêu cầu xác thực bị chặn 401
    assert client_a.get("/api/v1/auth/me/").status_code == 401
    assert client_b.get("/api/v1/favorites/").status_code == 401


@pytest.mark.django_db
def test_invalid_inputs_server_errors_and_malicious_payloads_recovery(owner, place):
    """
    Kiểm thử xử lý lỗi dữ liệu không hợp lệ, tải file hỏng, bbox sai phạm vi,
    path traversal và các trường hợp biên đảm bảo không crash server và không rò rỉ dữ liệu.
    """
    client = APIClient()
    client.force_login(owner)

    # 1. Upload ảnh bằng tệp tin rác không phải định dạng ảnh hợp lệ
    corrupt_file = SimpleUploadedFile(
        "bad.jpg", b"NOT_AN_IMAGE_RANDOM_GARBAGE_BYTES", content_type="image/jpeg"
    )
    res_corrupt = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": [corrupt_file],
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="bad-upload-key-1",
    )
    assert res_corrupt.status_code == 400
    assert "định dạng ảnh được hỗ trợ" in str(res_corrupt.data)
    # Xác nhận không có bản ghi mồ côi nào được tạo
    assert not PhotoSubmission.objects.filter(idempotency_key="bad-upload-key-1").exists()

    # 2. Upload vượt quá số lượng ảnh cho phép (> 5 ảnh)
    six_images = [create_jpeg(f"img_{i}.jpg") for i in range(6)]
    res_excess = client.post(
        "/api/v1/photo-submissions/",
        {
            "place_id": str(place.id),
            "consent": "true",
            "consent_version": "photo-rights-v2",
            "images": six_images,
        },
        format="multipart",
        HTTP_IDEMPOTENCY_KEY="excess-upload-key",
    )
    assert res_excess.status_code == 400
    assert "no more than 5 elements" in str(res_excess.data)

    # 3. Đổi mật khẩu với mật khẩu hiện tại không chính xác
    res_pwd = client.post(
        "/api/v1/auth/password/",
        {
            "current_password": "WrongCurrentPassword123",
            "new_password": "ValidNewPassword-9134",
        },
    )
    assert res_pwd.status_code == 400
    assert "Mật khẩu hiện tại không đúng" in str(res_pwd.data)

    # 4. Truy vấn bản đồ với tham số bbox bị lỗi hoặc quá lớn (> 2 độ)
    res_bbox_huge = client.get("/api/v1/places/map/?bbox=100.0,10.0,110.0,20.0")
    assert res_bbox_huge.status_code == 400
    assert "Phạm vi quá lớn" in str(res_bbox_huge.data)

    res_bbox_invalid = client.get("/api/v1/places/map/?bbox=invalid,bbox,data,string")
    assert res_bbox_invalid.status_code == 400

    # 5. Geocoding với chuỗi truy vấn rỗng hoặc khoảng trắng
    res_geo_empty = client.get("/api/v1/places/geocode/?q=   ")
    assert res_geo_empty.status_code == 400
    assert "Vui lòng nhập địa chỉ" in str(res_geo_empty.data)

    # 6. Traversal attack trong media request qua UUID giả mạo
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    res_fake_media = client.get(f"/public-photo-media/{fake_uuid}/")
    assert res_fake_media.status_code == 404
