import hashlib
import io
import json
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PIL import Image
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import User
from .images import Conflict, normalize_image
from apps.places.models import Place
from .models import (
    PhotoAsset,
    PhotoAttribute,
    PhotoAudit,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
)


def check_reviewer(user):
    if not user.is_staff or not user.has_perm("photos.review_photosubmission"):
        raise PermissionDenied("Bạn không có quyền quản lý ảnh.")


def submit(user, values, files, key):
    if not key or len(key) > 100:
        raise serializers.ValidationError(
            {"idempotency_key": ["Không xác định được lần gửi ảnh. Tải lại trang rồi gửi lại."]}
        )
    if not 1 <= len(files) <= 5:
        raise serializers.ValidationError({"images": ["Gửi từ 1 đến 5 ảnh."]})
    prepared = []
    for index, file in enumerate(files):
        try:
            normalized = normalize_image(file)
            file.seek(0)
            raw = file.read()
            with Image.open(io.BytesIO(normalized.read())) as image:
                width, height = image.size
            normalized.seek(0)
            prepared.append((raw, normalized, hashlib.sha256(raw).hexdigest(), width, height))
        except serializers.ValidationError as error:
            raise serializers.ValidationError(
                {"images": [f"Ảnh {index + 1}: {' '.join(map(str, error.detail))}"]}
            ) from error
    payload = {k: str(v.pk) if hasattr(v, "pk") else str(v) for k, v in values.items()}
    payload["images"] = [p[2] for p in prepared]
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    written = []
    try:
        with transaction.atomic():
            # Serialize only uploads for this account, including retries with the same key.
            User.objects.select_for_update(of=("self",)).get(pk=user.pk)
            existing = PhotoSubmission.objects.filter(
                submitted_by=user, idempotency_key=key
            ).first()
            if existing:
                if existing.payload_hash != digest:
                    raise Conflict(
                        "Nội dung ảnh đã thay đổi sau lần gửi trước. Tải lại trang rồi gửi lại."
                    )
                return existing
            now = timezone.now()
            if values.get("proposed_name"):
                place = Place.objects.create(
                    name=values["proposed_name"],
                    address=values["proposed_address"],
                    category=values["proposed_category"],
                    latitude=values.get("latitude"),
                    longitude=values.get("longitude"),
                    status="published",
                    published_at=now,
                    created_by=user,
                    updated_by=user,
                )
            else:
                place = Place.objects.select_for_update(of=("self",)).get(pk=values["place_id"].pk)
                if place.status != "published" or place.deleted_at:
                    raise serializers.ValidationError("Quán không còn khả dụng.")
            has_cover = PlacePhoto.objects.filter(place=place, is_cover=True).exists()
            submission = PhotoSubmission.objects.create(
                submitted_by=user,
                place=place,
                status="approved",
                published_by=user,
                published_at=now,
                caption=values.get("caption", ""),
                consent_version=values["consent_version"],
                consent_at=timezone.now(),
                idempotency_key=key,
                payload_hash=digest,
            )
            for order, (raw, normalized, sha, width, height) in enumerate(prepared):
                asset = PhotoAsset(
                    submission=submission,
                    sha256=sha,
                    file_size=len(raw),
                    width=width,
                    height=height,
                    sort_order=order,
                )
                for field, content in [
                    (asset.original, ContentFile(raw)),
                    (asset.derivative, normalized),
                ]:
                    field.save(f"{asset.id}.jpg", content, save=False)
                    written.append((field.storage, field.name))
                asset.save()
                PlacePhoto.objects.create(
                    place=place,
                    asset=asset,
                    status="published",
                    published_at=now,
                    caption=submission.caption,
                    alt_text=submission.caption[:200] or place.name,
                    is_cover=not has_cover and order == 0,
                )
            return submission
    except Exception:
        for storage, name in written:
            storage.delete(name)
        raise


def reviewed_attributes(codes):
    attributes = list(VisualAttribute.objects.filter(code__in=set(codes), active=True))
    if len(attributes) != len(set(codes)):
        raise serializers.ValidationError("Đặc điểm không hợp lệ hoặc đã ngừng sử dụng.")
    return attributes


def set_tags(photo, codes, reviewer):
    attributes = reviewed_attributes(codes)
    previous = list(photo.attributes.values_list("code", flat=True))
    # Audit precedes relation replacement so removed tags remain traceable.
    PhotoAudit.objects.create(
        actor=reviewer,
        photo=photo,
        submission=photo.asset.submission,
        action="tags_reviewed",
        details={"before": previous, "after": sorted(codes)},
    )
    PhotoAttribute.objects.filter(photo=photo).delete()
    PhotoAttribute.objects.bulk_create(
        [
            PhotoAttribute(
                photo=photo,
                attribute=a,
                reviewed_by=reviewer,
                reviewed_at=timezone.now(),
            )
            for a in attributes
        ]
    )


@transaction.atomic
def edit_tags(photo_id, reviewer, codes, caption=None):
    check_reviewer(reviewer)
    photo = (
        PlacePhoto.objects.select_for_update(of=("self",))
        .select_related("asset__submission")
        .get(pk=photo_id)
    )
    set_tags(photo, codes, reviewer)
    if caption is not None:
        photo.caption = caption
        photo.save(update_fields=["caption"])
    return photo


@transaction.atomic
def change_publication(photo_id, reviewer, action):
    check_reviewer(reviewer)
    photo = (
        PlacePhoto.objects.select_for_update(of=("self",))
        .select_related("asset__submission", "place")
        .get(pk=photo_id)
    )
    photo.place = Place.objects.select_for_update(of=("self",)).get(pk=photo.place_id)
    if action == "withdraw":
        photo.status = "withdrawn"
        photo.withdrawn_at = timezone.now()
        photo.is_cover = False
    elif action == "publish":
        if photo.status == "withdrawn":
            raise Conflict("Ảnh đã rút không được công khai lại qua thao tác này.")
        if photo.place.status != "published" or photo.place.deleted_at:
            raise serializers.ValidationError("Quán phải được công khai trước khi đăng ảnh.")
        photo.status = "published"
        photo.published_at = photo.published_at or timezone.now()
    elif action == "cover":
        if photo.status != "published" or photo.place.status != "published":
            raise serializers.ValidationError("Chỉ chọn ảnh công khai làm bìa.")
        PlacePhoto.objects.filter(place=photo.place, is_cover=True).update(is_cover=False)
        photo.is_cover = True
    else:
        raise serializers.ValidationError("Hành động không hợp lệ.")
    photo.save()
    PhotoAudit.objects.create(
        actor=reviewer, photo=photo, submission=photo.asset.submission, action=action
    )
    return photo
