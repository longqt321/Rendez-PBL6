import io
from pathlib import Path
import warnings

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.exceptions import APIException

# Prevent decompression bomb DOS attacks
Image.MAX_IMAGE_PIXELS = 50_000_000


class Conflict(APIException):
    status_code = 409
    default_code = "invalid_transition"
    default_detail = "Đóng góp này đã được xử lý. Tải lại trang để xem trạng thái."


def normalize_image(file):
    if not file or getattr(file, "size", 0) <= 0:
        raise serializers.ValidationError("File ảnh rỗng.")
    if file.size > 10 * 1024 * 1024:
        raise serializers.ValidationError("Mỗi ảnh tối đa 10 MiB.")

    filename = getattr(file, "name", "") or ""
    clean_suffix = Path(filename).suffix.lower()
    if clean_suffix and clean_suffix not in (".jpg", ".jpeg", ".png", ".webp"):
        raise serializers.ValidationError(
            "Phần mở rộng file không hợp lệ (chỉ chấp nhận .jpg, .jpeg, .png, .webp)."
        )

    file.seek(0)
    magic = file.read(16)
    file.seek(0)
    is_jpeg = magic.startswith(b"\xff\xd8\xff")
    is_png = magic.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = magic.startswith(b"RIFF") and len(magic) >= 12 and magic[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise serializers.ValidationError(
            "Nội dung file thực tế không phải định dạng ảnh được hỗ trợ (JPEG, PNG, WEBP)."
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(file)
            image_format = image.format
            if image_format not in ("JPEG", "PNG", "WEBP"):
                raise serializers.ValidationError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.")
            width, height = image.size
            if min(width, height) < 100 or width * height > 20_000_000:
                raise serializers.ValidationError("Ảnh cần ít nhất 100 × 100 px và tối đa 20 MP.")
            if max(width, height) / max(min(width, height), 1) > 10:
                raise serializers.ValidationError("Tỉ lệ kích thước ảnh bất thường (tối đa 10:1).")
            image.verify()
            file.seek(0)
            with Image.open(file) as source:
                try:
                    transposed = ImageOps.exif_transpose(source)
                except Exception:
                    transposed = source
                if transposed.mode in ("RGBA", "LA") or (
                    transposed.mode == "P" and "transparency" in transposed.info
                ):
                    background = Image.new("RGB", transposed.size, (255, 255, 255))
                    alpha = transposed.convert("RGBA")
                    background.paste(alpha, mask=alpha.split()[3])
                    normalized = background
                else:
                    normalized = transposed.convert("RGB")
                normalized.thumbnail((2000, 2400))
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
