import hashlib
import io
import json
import logging
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PIL import Image
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import User
from apps.posts.models import LegacyPhotoMapping, Post, PostMedia
from .images import Conflict, normalize_image
from apps.places.models import Place
from .models import (
    ContentReport,
    PhotoAsset,
    PhotoAttribute,
    PhotoAudit,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
)


logger = logging.getLogger(__name__)


def sync_post_media_from_photo(photo):
    """Mirror a legacy PlacePhoto lifecycle state onto its PostMedia counterpart.

    Keeps the legacy API surface and the Post domain consistent: when a photo
    is withdrawn or re-published through the legacy flows, the linked PostMedia
    (resolved via LegacyPhotoMapping) follows the same state.
    """
    mapping = (
        LegacyPhotoMapping.objects.filter(legacy_place_photo_id=photo.id)
        .select_related("post_media")
        .first()
    )
    if not mapping:
        return
    media = mapping.post_media
    now = timezone.now()
    if photo.status == "withdrawn":
        if media.status != "withdrawn":
            media.status = "withdrawn"
            media.withdrawn_at = photo.withdrawn_at or now
            media.save(update_fields=["status", "withdrawn_at"])
            Post.objects.filter(pk=media.post_id).exclude(status="withdrawn").update(
                status="withdrawn"
            )
    elif photo.status == "published" and media.status != "published":
        media.status = "published"
        media.published_at = photo.published_at or now
        media.withdrawn_at = None
        media.save(update_fields=["status", "published_at", "withdrawn_at"])


def check_reviewer(user):
    if not user.is_staff or not user.has_perm("photos.review_photosubmission"):
        raise PermissionDenied("Bạn không có quyền quản lý ảnh.")


def submit(user, values, files, key):
    key = str(key).strip() if key is not None else ""
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
                        "Nội dung ảnh đã thay đổi sau lần gửi trước. Tải lại trang rồi gửi lại.",
                        code="idempotency_conflict",
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
            has_cover = (
                PostMedia.objects.filter(post__place=place, status="published").exists()
                or Place.objects.filter(pk=place.pk, cover_media__isnull=False).exists()
            )
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
                # Dual-write: legacy PlacePhoto row keeps the legacy API surface
                # (feed, gallery, media serving, moderation) fully functional,
                # while the Post/PostMedia domain is the new source of truth.
                place_photo = PlacePhoto.objects.create(
                    place=place,
                    asset=asset,
                    status="published",
                    published_at=now,
                    caption=submission.caption,
                    alt_text=submission.caption[:200] or place.name,
                    is_cover=not has_cover and order == 0,
                )
                if order == 0:
                    post = Post.objects.create(
                        author=user,
                        place=place,
                        caption=submission.caption,
                        status="published",
                        origin="ugc",
                        legacy_submission=submission,
                        published_at=now,
                    )
                media = PostMedia.objects.create(
                    post=post,
                    media_asset=asset,
                    position=order,
                    alt_text=submission.caption[:200] or place.name,
                    status="published",
                    published_at=now,
                )
                if not has_cover and order == 0:
                    place.cover_media = media
                    place.save(update_fields=["cover_media"])
                LegacyPhotoMapping.objects.get_or_create(
                    legacy_place_photo_id=place_photo.id,
                    defaults={"post_media": media},
                )
            return submission
    except Exception:
        for storage, name in written:
            try:
                storage.delete(name)
            except Exception as cleanup_err:
                logger.warning(
                    "Failed to delete orphaned file %s during rollback: %s", name, cleanup_err
                )
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
        if photo.status == "withdrawn":
            raise serializers.ValidationError("Ảnh này đã được gỡ trước đó.")
        photo.status = "withdrawn"
        photo.withdrawn_at = timezone.now()
        photo.is_cover = False
        ContentReport.objects.filter(photo=photo, status="pending").update(
            status="resolved", resolved_at=photo.withdrawn_at
        )
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
    sync_post_media_from_photo(photo)
    PhotoAudit.objects.create(
        actor=reviewer, photo=photo, submission=photo.asset.submission, action=action
    )
    return photo


@transaction.atomic
def owner_edit_photo(photo_id, user, caption=None, withdraw=False):
    from django.shortcuts import get_object_or_404

    photo = get_object_or_404(
        PlacePhoto.objects.select_for_update(of=("self",)).select_related(
            "asset__submission", "place"
        ),
        pk=photo_id,
        asset__submission__submitted_by=user,
    )
    if photo.status == "withdrawn":
        raise serializers.ValidationError("Ảnh này đã bị gỡ và không thể chỉnh sửa.")
    if caption is not None:
        photo.caption = caption
        photo.alt_text = caption[:200] or photo.place.name
    if withdraw:
        photo.status = "withdrawn"
        photo.withdrawn_at = photo.withdrawn_at or timezone.now()
        photo.is_cover = False
        ContentReport.objects.filter(photo=photo, status="pending").update(
            status="resolved", resolved_at=photo.withdrawn_at
        )
    photo.save()
    sync_post_media_from_photo(photo)
    PhotoAudit.objects.create(
        actor=user,
        photo=photo,
        submission=photo.asset.submission,
        action="owner_withdraw" if withdraw else "owner_caption",
    )
    return photo


@transaction.atomic
def moderate_report(report_id, reviewer, action, note=""):
    """
    Xử lý quyết định của người kiểm duyệt trên một ContentReport.
    - action='take_down': Chấp thuận báo cáo và ẩn/gỡ nội dung vi phạm (rút photo hoặc ẩn place).
    - action='dismiss': Từ chối báo cáo, giữ nguyên nội dung.
    Bảo đảm tính nguyên tử, kiểm tra quyền, chống chuyển trạng thái không hợp lệ và ghi audit.
    """
    check_reviewer(reviewer)
    from django.shortcuts import get_object_or_404

    report = (
        ContentReport.objects.select_for_update(of=("self",))
        .select_related("photo__asset__submission", "photo__place", "place")
        .filter(pk=report_id)
        .first()
    )
    if not report:
        raise get_object_or_404(ContentReport, pk=report_id)

    if report.status != "pending":
        raise serializers.ValidationError(
            f"Báo cáo này đã ở trạng thái '{report.get_status_display()}' và không thể xử lý lại."
        )

    now = timezone.now()
    if action in ("take_down", "withdraw", "resolve"):
        report.status = "resolved"
        report.resolved_at = now
        if note:
            report.note = f"{report.note}\n[Reviewer note]: {note}".strip()
            report.save(update_fields=["status", "resolved_at", "note"])
        else:
            report.save(update_fields=["status", "resolved_at"])

        if report.photo_id:
            photo = (
                PlacePhoto.objects.select_for_update(of=("self",))
                .select_related("asset__submission")
                .get(pk=report.photo_id)
            )
            photo.status = "withdrawn"
            photo.withdrawn_at = photo.withdrawn_at or now
            photo.is_cover = False
            photo.save(update_fields=["status", "withdrawn_at", "is_cover"])
            sync_post_media_from_photo(photo)
            PhotoAudit.objects.create(
                actor=reviewer,
                photo=photo,
                submission=photo.asset.submission,
                action="moderation_withdrawn",
                details={"report_id": str(report.id), "reason": report.reason, "note": note},
            )
            ContentReport.objects.filter(photo_id=photo.id, status="pending").exclude(
                pk=report.id
            ).update(status="resolved", resolved_at=now)
        elif report.place_id:
            place = Place.objects.select_for_update(of=("self",)).get(pk=report.place_id)
            place.status = Place.Status.HIDDEN
            place.save(update_fields=["status"])
            ContentReport.objects.filter(place_id=place.id, status="pending").exclude(
                pk=report.id
            ).update(status="resolved", resolved_at=now)
    elif action in ("dismiss", "reject"):
        report.status = "resolved"
        report.resolved_at = now
        if note:
            report.note = f"{report.note}\n[Reviewer note]: {note}".strip()
            report.save(update_fields=["status", "resolved_at", "note"])
        else:
            report.save(update_fields=["status", "resolved_at"])

        if report.photo_id:
            PhotoAudit.objects.create(
                actor=reviewer,
                photo=report.photo,
                submission=report.photo.asset.submission,
                action="report_dismissed",
                details={"report_id": str(report.id), "reason": report.reason, "note": note},
            )
    else:
        raise serializers.ValidationError(f"Hành động xử lý '{action}' không hợp lệ.")

    return report
