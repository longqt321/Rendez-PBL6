import io
import struct
import zlib
from unittest.mock import patch
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.exceptions import ValidationError
from apps.photos.images import normalize_image
from apps.photos.models import PhotoSubmission, PhotoAsset, PlacePhoto
from apps.photos.serializers import PhotoUploadSerializer
from apps.photos.services import submit
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


def test_empty_file_rejected():
    file = SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg")
    with pytest.raises(ValidationError) as exc:
        normalize_image(file)
    assert "rỗng" in str(exc.value)


def test_invalid_extension_rejected():
    output = io.BytesIO()
    Image.new("RGB", (120, 120)).save(output, "PNG")
    file = SimpleUploadedFile("malicious.php", output.getvalue(), content_type="image/png")
    with pytest.raises(ValidationError) as exc:
        normalize_image(file)
    assert "Phần mở rộng" in str(exc.value)


def test_fake_mime_type_non_image_content_rejected():
    # Client declares image/jpeg, but payload is text/html script
    file = SimpleUploadedFile(
        "script.jpg", b"<script>alert('xss')</script>", content_type="image/jpeg"
    )
    with pytest.raises(ValidationError) as exc:
        normalize_image(file)
    assert "không phải định dạng ảnh" in str(exc.value)


def test_extreme_aspect_ratio_rejected():
    # Abnormal dimension: 100 x 3000 (aspect ratio 30:1)
    output = io.BytesIO()
    Image.new("RGB", (100, 3000), "blue").save(output, "JPEG")
    file = SimpleUploadedFile("extreme.jpg", output.getvalue(), content_type="image/jpeg")
    with pytest.raises(ValidationError) as exc:
        normalize_image(file)
    assert "Tỉ lệ kích thước" in str(exc.value)


def test_valid_webp_image_accepted():
    output = io.BytesIO()
    Image.new("RGB", (200, 200), "red").save(output, "WEBP")
    file = SimpleUploadedFile("valid.webp", output.getvalue(), content_type="image/webp")
    content = normalize_image(file)
    # Normalized to standard JPEG
    result = Image.open(content)
    assert result.format == "JPEG"


@pytest.mark.django_db
def test_serializer_file_count_and_total_size_validation(place):
    # Test file count < 1
    s_zero = PhotoUploadSerializer(
        data={
            "place_id": str(place.id),
            "consent": True,
            "consent_version": "photo-rights-v2",
            "images": [],
        }
    )
    assert not s_zero.is_valid()
    assert "images" in s_zero.errors

    # Test file count > 5
    s_six = PhotoUploadSerializer(
        data={
            "place_id": str(place.id),
            "consent": True,
            "consent_version": "photo-rights-v2",
            "images": [photo() for _ in range(6)],
        }
    )
    assert not s_six.is_valid()
    assert "images" in s_six.errors

    # Test total size > 30 MiB
    large_file = SimpleUploadedFile("mock_large.jpg", b"0", content_type="image/jpeg")
    large_file.size = 11 * 1024 * 1024  # Spoof size attribute
    s_large = PhotoUploadSerializer(
        data={
            "place_id": str(place.id),
            "consent": True,
            "consent_version": "photo-rights-v2",
            "images": [large_file],
        }
    )
    assert not s_large.is_valid()
    assert "images" in s_large.errors


@pytest.mark.django_db
def test_upload_rollback_on_failure_no_orphaned_files_or_rows(owner, place):
    initial_submissions = PhotoSubmission.objects.count()
    initial_assets = PhotoAsset.objects.count()
    initial_photos = PlacePhoto.objects.count()

    # Simulate an error during PlacePhoto creation inside transaction
    with patch(
        "apps.photos.models.PlacePhoto.objects.create",
        side_effect=RuntimeError("Simulated DB Disk Failure"),
    ):
        with pytest.raises(RuntimeError):
            submit(
                owner,
                {
                    "place_id": place,
                    "caption": "Test Rollback",
                    "consent_version": "photo-rights-v2",
                },
                [photo()],
                "test-rollback-key",
            )

    # Verify atomic rollback left no orphan database records
    assert PhotoSubmission.objects.count() == initial_submissions
    assert PhotoAsset.objects.count() == initial_assets
    assert PlacePhoto.objects.count() == initial_photos


def test_exif_orientation_transposition_actual_dimensions_and_pixels():
    # Create landscape image (400 x 200) with EXIF orientation 6 (90° CW)
    output = io.BytesIO()
    img = Image.new("RGB", (400, 200), "red")
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation tag = 6 (Rotate 90 CW)
    img.save(output, "JPEG", exif=exif)

    file = SimpleUploadedFile("oriented_6.jpg", output.getvalue(), content_type="image/jpeg")
    derivative = normalize_image(file)

    # Verify output derivative dimensions are transposed to portrait (200 x 400)
    result = Image.open(derivative)
    assert result.size == (200, 400)
    # Verify orientation tag is stripped from derivative
    assert result.getexif().get(0x0112) is None

    # Test Orientation 8 (90° CCW / 270°)
    output8 = io.BytesIO()
    img8 = Image.new("RGB", (300, 150), "blue")
    exif8 = Image.Exif()
    exif8[0x0112] = 8
    img8.save(output8, "JPEG", exif=exif8)

    file8 = SimpleUploadedFile("oriented_8.jpg", output8.getvalue(), content_type="image/jpeg")
    derivative8 = normalize_image(file8)
    result8 = Image.open(derivative8)
    assert result8.size == (150, 300)


def test_exif_sensitive_metadata_stripped_from_derivative():
    output = io.BytesIO()
    img = Image.new("RGB", (200, 200), "green")
    exif = Image.Exif()
    # Inject sensitive device, location, and software tags
    exif[0x0110] = "iPhone 15 Pro Max"  # Model
    exif[0x0131] = "iOS 17.5 Confidential"  # Software
    exif[0x9286] = "Secret User Note 987"  # UserComment
    # GPS IFD
    gps_ifd = {1: "N", 2: (16, 4, 0), 3: "E", 4: (108, 13, 0)}
    exif[0x8825] = gps_ifd

    img.save(output, "JPEG", exif=exif)
    raw_input = output.getvalue()
    assert b"iPhone 15 Pro Max" in raw_input

    file = SimpleUploadedFile("sensitive.jpg", raw_input, content_type="image/jpeg")
    derivative = normalize_image(file)

    result_bytes = derivative.read()
    # Verify sensitive strings are absent from published bytes
    assert b"iPhone 15 Pro Max" not in result_bytes
    assert b"Secret User Note 987" not in result_bytes

    # Verify PIL getexif() returns no metadata
    derivative.seek(0)
    result_img = Image.open(derivative)
    assert len(result_img.getexif()) == 0


def test_image_without_exif_processed_cleanly():
    output = io.BytesIO()
    Image.new("RGB", (250, 250), "yellow").save(output, "PNG")
    file = SimpleUploadedFile("no_exif.png", output.getvalue(), content_type="image/png")
    derivative = normalize_image(file)
    result = Image.open(derivative)
    assert result.format == "JPEG"
    assert result.size == (250, 250)


def test_image_with_corrupt_exif_handled_resiliently():
    # Inject corrupted bytes into EXIF segment of valid JPEG
    output = io.BytesIO()
    Image.new("RGB", (200, 200), "purple").save(output, "JPEG")
    clean_bytes = output.getvalue()
    # Corrupt the EXIF header segment
    corrupted_bytes = clean_bytes[:2] + b"\xff\xe1\x00\x08Exif\x00\x00" + clean_bytes[2:]

    file = SimpleUploadedFile("corrupted_exif.jpg", corrupted_bytes, content_type="image/jpeg")
    derivative = normalize_image(file)
    result = Image.open(derivative)
    assert result.format == "JPEG"
    assert result.size == (200, 200)


def test_transparent_png_composited_on_clean_white_background():
    # Create RGBA PNG with transparent background and red center box
    img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))  # Completely transparent corner
    # Draw opaque red rectangle in center
    for x in range(50, 150):
        for y in range(50, 150):
            img.putpixel((x, y), (255, 0, 0, 255))
    output = io.BytesIO()
    img.save(output, "PNG")

    file = SimpleUploadedFile("transparent.png", output.getvalue(), content_type="image/png")
    derivative = normalize_image(file)

    result = Image.open(derivative)
    assert result.format == "JPEG"
    # Corner (0, 0) was transparent; must composite to clean white (255, 255, 255), NOT black (0, 0, 0)
    corner_pixel = result.getpixel((0, 0))
    assert corner_pixel == (255, 255, 255)


@pytest.mark.django_db
def test_preservation_of_original_master_file(owner, place):
    # Upload photo with custom raw bytes and metadata
    output = io.BytesIO()
    img = Image.new("RGB", (300, 300), "orange")
    exif = Image.Exif()
    exif[0x0110] = "Master Camera Model X"
    img.save(output, "JPEG", exif=exif)
    raw_uploaded_bytes = output.getvalue()

    file = SimpleUploadedFile("master.jpg", raw_uploaded_bytes, content_type="image/jpeg")
    submission = submit(
        owner,
        {"place_id": place, "caption": "Master Test", "consent_version": "photo-rights-v2"},
        [file],
        "test-master-preservation-key",
    )
    asset = submission.assets.get()

    # Original master file preserves exact uploaded bytes and master EXIF
    saved_original_bytes = asset.original.read()
    assert saved_original_bytes == raw_uploaded_bytes
    assert b"Master Camera Model X" in saved_original_bytes

    # Derivative file is stripped and normalized to JPEG without master EXIF
    saved_derivative_bytes = asset.derivative.read()
    assert b"Master Camera Model X" not in saved_derivative_bytes
    asset.derivative.seek(0)
    derivative_img = Image.open(asset.derivative)
    assert len(derivative_img.getexif()) == 0
