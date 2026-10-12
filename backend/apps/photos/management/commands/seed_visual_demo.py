import io
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image, ImageDraw
from apps.accounts.models import User
from apps.places.models import Category, Place
from apps.photos.models import PhotoSubmission, PlacePhoto, VisualAttribute
from apps.photos.services import change_publication, set_tags, submit


class Command(BaseCommand):
    help = "Tạo fixture DEMO v3 local; không dùng làm dữ liệu quán thật hoặc benchmark."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo chỉ được tạo trong môi trường DEBUG.")
        user, created = User.objects.get_or_create(
            email="visual-demo@demo.invalid",
            defaults={
                "display_name": "Fixture DEMO",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()
        if not user.is_staff or not user.is_superuser:
            raise CommandError("Tài khoản fixture bị thay đổi quyền; không nâng quyền tự động.")
        if not user.is_active and not user.has_usable_password():
            user.is_active = True
            user.save(update_fields=["is_active"])
        attributes = []
        for code, name in [
            ("demo-vegetation", "[DEMO] Cây xanh"),
            ("demo-wood", "[DEMO] Vật liệu gỗ"),
        ]:
            attribute, _ = VisualAttribute.objects.get_or_create(
                code=code,
                defaults={
                    "display_name_vi": name,
                    "description": "Nhãn DEMO để kiểm thử, chưa dùng cho dữ liệu quán thật.",
                    "is_searchable": True,
                },
            )
            attributes.append(attribute)
        category, _ = Category.objects.get_or_create(slug="cafe", defaults={"name": "Cà phê"})
        for index in range(4):
            place, _ = Place.objects.get_or_create(
                id=f"30000000-0000-0000-0000-{index + 1:012d}",
                defaults={
                    "name": [
                        "Quán mẫu — DEMO",
                        "Không gian mẫu — DEMO",
                        "Quán chưa có vị trí — DEMO",
                        "Quán chưa có ảnh — DEMO",
                    ][index],
                    "address": "Địa chỉ hư cấu, Đà Nẵng · Fixture phát triển",
                    "category": category,
                    "latitude": None if index == 2 else str(16.067 + index * 0.002),
                    "longitude": None if index == 2 else str(108.22 + index * 0.002),
                    "status": "published",
                    "description": "Dữ liệu và ảnh minh họa DEMO, không phải địa điểm kinh doanh thật.",
                    "is_demo": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            if index == 3:
                continue
            if PhotoSubmission.objects.filter(
                submitted_by=user, idempotency_key=f"visual-demo-{index}", status="approved"
            ).exists():
                continue
            image = Image.new("RGB", (600, 750), ["#d9e3d6", "#e7dcc7", "#d6dfeb"][index])
            draw = ImageDraw.Draw(image)
            draw.rounded_rectangle((60, 90, 540, 600), radius=32, fill="#f9f7f0")
            draw.rectangle((130, 390, 470, 420), fill="#866c53")
            draw.rectangle((170, 420, 195, 550), fill="#866c53")
            draw.rectangle((405, 420, 430, 550), fill="#866c53")
            draw.ellipse((80, 190, 250, 380), fill="#53785b")
            draw.ellipse((340, 130, 500, 340), fill="#6b8b64")
            draw.text((110, 620), "DEMO - NOT A REAL VENUE PHOTO", fill="#205b48")
            data = io.BytesIO()
            image.save(data, format="JPEG")
            submission = submit(
                user,
                {
                    "place_id": place,
                    "caption": "Ảnh minh họa DEMO; không dùng cho nghiên cứu.",
                    "consent_version": "photo-rights-v2",
                },
                [SimpleUploadedFile("demo.jpg", data.getvalue(), content_type="image/jpeg")],
                f"visual-demo-{index}",
            )
            codes = [a.code for a in attributes] if index == 0 else [attributes[index - 1].code]
            set_tags(submission.assets.get().public_photo, codes, user)
            change_publication(
                PlacePhoto.objects.get(asset__submission=submission).id, user, "cover"
            )
        self.stdout.write("Đã chuẩn bị fixture v3 DEMO. DEBUG=0 loại fixture khỏi API public.")
