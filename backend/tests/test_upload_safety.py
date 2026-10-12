import io
import struct
import zlib
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.exceptions import ValidationError
from apps.photos.images import normalize_image
from .conftest import photo


@pytest.mark.parametrize("kind", ["gif", "oversized", "bomb", "truncated"])
def test_upload_resource_limits(kind):
    if kind == "gif":
        output = io.BytesIO()
        Image.new("RGB", (120, 120)).save(output, "GIF")
        file = SimpleUploadedFile("spoof.png", output.getvalue(), content_type="image/png")
    elif kind == "oversized":
        file = SimpleUploadedFile(
            "large.jpg", b"x" * (10 * 1024 * 1024 + 1), content_type="image/jpeg"
        )
    elif kind == "truncated":
        original = photo()
        file = SimpleUploadedFile("bad.png", original.read()[:50], content_type="image/png")
    else:
        raw = struct.pack(">IIBBBBB", 100000, 100000, 8, 2, 0, 0, 0)

        def chunk(name, data):
            return (
                struct.pack(">I", len(data))
                + name
                + data
                + struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF)
            )

        file = SimpleUploadedFile(
            "bomb.png",
            b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", raw) + chunk(b"IDAT", b"") + chunk(b"IEND", b""),
            content_type="image/png",
        )
    with pytest.raises(ValidationError):
        normalize_image(file)


def test_image_metadata_removed():
    output = io.BytesIO()
    image = Image.new("RGB", (120, 120))
    exif = Image.Exif()
    exif[0x010E] = "Sensitive sample metadata"
    image.save(output, "JPEG", exif=exif)
    content = normalize_image(SimpleUploadedFile("original.jpg", output.getvalue()))
    assert not Image.open(content).getexif()
