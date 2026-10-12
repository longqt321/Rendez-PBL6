import io
import warnings

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.exceptions import APIException


class Conflict(APIException):
    status_code = 409
    default_code = "invalid_transition"
    default_detail = "Đóng góp này đã được xử lý. Tải lại trang để xem trạng thái."


def normalize_image(file):
    if file.size > 10 * 1024 * 1024:
        raise serializers.ValidationError("Mỗi ảnh tối đa 10 MiB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(file)
            image_format = image.format
            if image_format not in ("JPEG", "PNG"):
                raise serializers.ValidationError("Chỉ chấp nhận ảnh JPEG hoặc PNG.")
            width, height = image.size
            if min(width, height) < 100 or width * height > 20_000_000:
                raise serializers.ValidationError("Ảnh cần ít nhất 100 × 100 px và tối đa 20 MP.")
            image.verify()
            file.seek(0)
            with Image.open(file) as source:
                normalized = ImageOps.exif_transpose(source).convert("RGB")
                output = io.BytesIO()
                normalized.save(output, format="JPEG", quality=90)
        data = output.getvalue()
        if len(data) > 10 * 1024 * 1024:
            raise serializers.ValidationError("Ảnh vượt 10 MiB sau khi xử lý. Chọn ảnh nhỏ hơn.")
        return ContentFile(data, name="image.jpg")
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise serializers.ValidationError("Ảnh bị hỏng hoặc không hợp lệ.") from exc
