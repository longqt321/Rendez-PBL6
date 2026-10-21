import json
import uuid
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import User
from apps.places.models import Category, Place
from apps.photos.models import PhotoSubmission, VisualAttribute
from apps.photos.services import set_tags, submit


class Command(BaseCommand):
    help = "Import the attributed Da Nang dataset from local files; safe to repeat."

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[5]
        data_path = root / "data" / "danang.json"
        if not data_path.is_file():
            raise CommandError("Missing data/danang.json. Run scripts/prepare_content.py.")
        data = json.loads(data_path.read_text())
        for entry in data["places"]:
            for photo in entry["photos"]:
                if not (root / "data/photos" / photo["file"]).is_file():
                    raise CommandError(f"Missing local image: {photo['file']}")
        editor, created = User.objects.get_or_create(
            email="archive@rendez.invalid", defaults={"display_name": "Rendez · Tư liệu"}
        )
        if created:
            editor.set_unusable_password()
            editor.save(update_fields=["password"])
        categories = {}
        for order, (slug, name) in enumerate(data["categories"].items()):
            categories[slug], _ = Category.objects.update_or_create(
                slug=slug, defaults={"name": name, "is_active": True, "sort_order": order}
            )
        labels = {
            "plants": "Cây xanh",
            "water": "Mặt nước",
            "architecture": "Kiến trúc",
            "interior": "Trong nhà",
            "night": "Ban đêm",
            "food": "Đồ ăn & thức uống",
        }
        for code, name in labels.items():
            VisualAttribute.objects.update_or_create(
                code=code,
                defaults={
                    "display_name_vi": name,
                    "description": f"Ảnh có {name.lower()}.",
                    "active": True,
                    "is_searchable": True,
                },
            )
        now = timezone.now()
        checked = timezone.datetime.fromisoformat(data["checked_at"] + "T00:00:00+07:00")
        added = 0
        for index, entry in enumerate(data["places"]):
            place_id = uuid.uuid5(uuid.NAMESPACE_URL, "rendez:danang:" + entry["slug"])
            place, new = Place.objects.get_or_create(
                pk=place_id,
                defaults={
                    "slug": "danang-" + entry["slug"],
                    "name": entry["name"],
                    "address": entry["address"],
                    "description": entry["description"],
                    "category": categories[entry["category"]],
                    "latitude": Decimal(str(entry["latitude"]))
                    if entry["latitude"] is not None
                    else None,
                    "longitude": Decimal(str(entry["longitude"]))
                    if entry["longitude"] is not None
                    else None,
                    "source_url": entry["source_url"],
                    "verified_at": checked,
                    "created_by": editor,
                    "updated_by": editor,
                    "status": "published",
                    "published_at": now,
                    "is_demo": False,
                },
            )
            # Re-running import leaves user edits and withdrawals untouched.
            for order, photo in enumerate(entry["photos"]):
                key = "danang-" + photo["file"]
                if PhotoSubmission.objects.filter(
                    submitted_by=editor, idempotency_key=key
                ).exists():
                    continue
                content = (root / "data/photos" / photo["file"]).read_bytes()
                submission = submit(
                    editor,
                    {
                        "place_id": place,
                        "caption": photo["caption"],
                        "consent_version": "photo-rights-v2",
                    },
                    [SimpleUploadedFile(photo["file"], content, content_type="image/jpeg")],
                    key,
                )
                public = submission.assets.first().public_photo
                public.published_at = now - timedelta(minutes=order * len(data["places"]) + index)
                public.save(update_fields=["published_at"])
                set_tags(public, photo.get("tags", []), editor)
                added += 1
            self.stdout.write(entry["name"])
        self.stdout.write(
            self.style.SUCCESS(
                f"{len(data['places'])} places; {added} new photos. All files stored locally."
            )
        )
