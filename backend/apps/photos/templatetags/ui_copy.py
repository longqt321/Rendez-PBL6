import re
from django import template
from django.utils.safestring import SafeData

register = template.Library()

# Presentation labels only. Model names, field names and stored values are unchanged.
LABELS = {
    "admin": "Quản trị",
    "contenttypes": "Kiểu nội dung",
    "favorites": "Quán đã lưu",
    "favorite": "Quán đã lưu",
    "permission": "Quyền",
    "log entry": "Lịch sử thao tác",
    "content type": "Kiểu nội dung",
    "photo asset": "Tệp ảnh",
    "photo attribute": "Đặc điểm của ảnh",
    "photo submission": "đóng góp ảnh",
    "place photo": "ảnh quán",
    "venue proposal": "đề xuất địa điểm",
    "visual attribute": "đặc điểm trong ảnh",
    "photo audit": "lịch sử kiểm duyệt ảnh",
    "content report": "báo cáo nội dung",
    "photo comment": "bình luận ảnh",
    "photo like": "lượt thích ảnh",
    "place": "Địa điểm",
    "category": "Loại địa điểm",
    "user": "Người dùng",
    "auth": "Xác thực và quyền",
    "group": "nhóm",
    "accounts": "Tài khoản",
    "photos": "Ảnh",
    "users": "Người dùng",
    "categorys": "Loại địa điểm",
    "categories": "Loại địa điểm",
    "places": "Địa điểm",
    "place photos": "Ảnh quán",
    "photo submissions": "Đóng góp ảnh",
    "venue proposals": "Đề xuất địa điểm",
    "visual attributes": "Đặc điểm trong ảnh",
    "photo audits": "Lịch sử thao tác ảnh",
    "content reports": "Báo cáo nội dung",
    "photo comments": "Bình luận ảnh",
    "photo likes": "Lượt thích ảnh",
    "raw passwords are not stored, so there is no way to see the user’s password.": "Hệ thống không lưu mật khẩu gốc nên không thể hiển thị mật khẩu của người dùng.",
    "raw passwords are not stored, so there is no way to see the user's password.": "Hệ thống không lưu mật khẩu gốc nên không thể hiển thị mật khẩu của người dùng.",
    "reset password": "Đặt lại mật khẩu",
    "set password": "Đặt mật khẩu",
    "id": "Mã",
    "name": "Tên",
    "display name": "Tên hiển thị",
    "slug": "Mã đường dẫn",
    "description": "Mô tả",
    "address": "Địa chỉ",
    "submitted by": "Người gửi",
    "created by": "Người tạo",
    "updated by": "Người sửa",
    "reviewed by": "Người duyệt",
    "approved by": "Người duyệt",
    "reporter": "Người báo cáo",
    "actor": "Người thực hiện",
    "created at": "Ngày tạo",
    "updated at": "Ngày sửa",
    "deleted at": "Ngày xóa",
    "submitted at": "Ngày gửi",
    "reviewed at": "Ngày duyệt",
    "published at": "Ngày công khai",
    "withdrawn at": "Ngày rút",
    "approved at": "Ngày duyệt",
    "resolved at": "Ngày xử lý",
    "captured at": "Ngày chụp",
    "observed at": "Ngày ghi nhận",
    "started at": "Bắt đầu",
    "finished at": "Kết thúc",
    "latitude": "Vĩ độ",
    "longitude": "Kinh độ",
    "opening hours": "Giờ mở cửa",
    "opening hours source": "Nguồn giờ mở cửa",
    "opening hours verified at": "Ngày kiểm tra giờ mở cửa",
    "status": "Trạng thái",
    "is active": "Đang hoạt động",
    "is cover": "Ảnh bìa",
    "is published": "Đã công khai",
    "is demo": "Dữ liệu DEMO",
    "sort order": "Thứ tự",
    "caption": "Mô tả ảnh",
    "alt text": "Mô tả ảnh cho trình đọc màn hình",
    "asset": "Tệp ảnh",
    "image": "Ảnh",
    "original": "Ảnh gốc",
    "derivative": "Ảnh đã xử lý",
    "uploaded by": "Người tải ảnh",
    "file size": "Dung lượng (byte)",
    "byte size": "Dung lượng (byte)",
    "mime type": "Định dạng MIME",
    "width": "Chiều rộng (px)",
    "height": "Chiều cao (px)",
    "sha256": "Mã SHA-256",
    "reason": "Lý do",
    "rejection reason": "Lý do từ chối",
    "note": "Ghi chú",
    "proposal": "Đề xuất",
    "approved place": "Địa điểm đã liên kết",
    "proposed name": "Tên địa điểm đề xuất",
    "proposed address": "Địa chỉ đề xuất",
    "proposed category": "Loại địa điểm đề xuất",
    "consent at": "Ngày xác nhận quyền đăng ảnh",
    "consent version": "Phiên bản xác nhận quyền đăng ảnh",
    "idempotency key": "Mã lần gửi",
    "payload hash": "Mã kiểm tra nội dung gửi",
    "code": "Mã",
    "display name vi": "Tên tiếng Việt",
    "taxonomy version": "Phiên bản danh mục đặc điểm",
    "active": "Đang sử dụng",
    "is searchable": "Dùng trong bộ lọc",
    "audit reference": "Hồ sơ kiểm tra đặc điểm",
    "model version": "Phiên bản mô hình",
    "checkpoint hash": "Mã checkpoint",
    "latency ms": "Thời gian xử lý (ms)",
    "error code": "Mã lỗi",
    "action": "Thao tác",
    "details": "Chi tiết",
    "attributes": "Đặc điểm",
    "attribute": "Đặc điểm",
    "type": "Loại",
    "origin": "Nguồn",
    "source note": "Ghi chú nguồn",
}


def translate_label(text):
    suffix = ":" if text.endswith(":") else ""
    key = text.removesuffix(":").lower()
    if key in LABELS:
        return LABELS[key] + suffix
    for ending in (" để thay đổi", " để xem"):
        if text.startswith("Chọn ") and text.endswith(ending):
            model = text[5 : -len(ending)].lower()
            if model in LABELS:
                return "Chọn " + LABELS[model] + ending
    for prefix in ("Thêm ", "Thay đổi ", "Xem ", "Chọn "):
        if text.startswith(prefix) and text[len(prefix) :].lower() in LABELS:
            return prefix + LABELS[text[len(prefix) :].lower()]
    return text


@register.filter(is_safe=True)
def ui_label(value):
    # Preserve escaping in Django's safe label tags; never mark plain input as safe.
    if isinstance(value, SafeData) and "<label" in str(value):
        return re.sub(
            r">([^<>]+)</label>",
            lambda match: ">" + translate_label(match[1]) + "</label>",
            str(value),
        )
    return translate_label(str(value))


def permission_label(permission):
    app = translate_label(permission.content_type.app_label)
    model = permission.content_type.model_class()
    name = str(model._meta.verbose_name) if model else permission.content_type.model
    label = permission.name
    for prefix, action in [
        ("Can add ", "Thêm "),
        ("Can change ", "Sửa "),
        ("Can delete ", "Xóa "),
        ("Can view ", "Xem "),
        ("Can review ", "Duyệt "),
    ]:
        if label.startswith(prefix):
            label = action + translate_label(label[len(prefix) :])
            break
    return app + " | " + translate_label(name) + " | " + label


def validation_message(error):
    detail = getattr(error, "detail", getattr(error, "messages", error))
    if isinstance(detail, dict):
        return " ".join(
            (
                translate_label(str(key).replace("_", " ")) + ": "
                if key != "non_field_errors"
                else ""
            )
            + validation_message(value)
            for key, value in detail.items()
        )
    if isinstance(detail, (list, tuple)):
        return " ".join(validation_message(value) for value in detail)
    return str(detail)
