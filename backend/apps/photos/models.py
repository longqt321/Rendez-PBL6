import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q


class VisualAttribute(models.Model):
    code = models.SlugField(unique=True, max_length=80)
    display_name_vi = models.CharField(max_length=100)
    description = models.TextField(max_length=1000)
    active = models.BooleanField(default=True)
    is_searchable = models.BooleanField(default=False)

    class Meta:
        ordering = ("display_name_vi", "code")

    def __str__(self):
        return self.display_name_vi


class VenueProposal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=500)
    category = models.ForeignKey("places.Category", on_delete=models.PROTECT)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending_review", "Chờ duyệt"),
            ("approved", "Đã liên kết"),
            ("rejected", "Từ chối"),
        ],
        default="pending_review",
    )
    approved_place = models.ForeignKey(
        "places.Place", on_delete=models.PROTECT, null=True, blank=True
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(latitude__isnull=True, longitude__isnull=True)
                | Q(
                    latitude__isnull=False,
                    longitude__isnull=False,
                    latitude__gte=-90,
                    latitude__lte=90,
                    longitude__gte=-180,
                    longitude__lte=180,
                ),
                name="proposal_coords_valid",
            ),
            models.CheckConstraint(
                condition=~Q(status="approved") | Q(approved_place__isnull=False),
                name="approved_proposal_linked",
            ),
        ]

    def __str__(self):
        return self.name


class PhotoSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    place = models.ForeignKey("places.Place", on_delete=models.PROTECT, null=True, blank=True)
    proposal = models.ForeignKey(VenueProposal, on_delete=models.PROTECT, null=True, blank=True)
    caption = models.TextField(blank=True, max_length=1000)
    consent_version = models.CharField(max_length=80)
    consent_at = models.DateTimeField()
    idempotency_key = models.CharField(max_length=100)
    payload_hash = models.CharField(max_length=64)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending_review", "Chưa đăng"),
            ("approved", "Đã đăng"),
            ("rejected", "Đã gỡ"),
        ],
        default="pending_review",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
        db_column="reviewed_by_id",
    )
    published_at = models.DateTimeField(null=True, blank=True, db_column="reviewed_at")
    reason = models.TextField(blank=True, max_length=1000)

    class Meta:
        ordering = ("-submitted_at", "id")
        permissions = [("review_photosubmission", "Can review photo submissions")]
        constraints = [
            models.CheckConstraint(
                condition=Q(place__isnull=False, proposal__isnull=True)
                | Q(place__isnull=True, proposal__isnull=False),
                name="photo_submission_one_target",
            ),
            models.UniqueConstraint(
                fields=["submitted_by", "idempotency_key"], name="unique_photo_upload_key"
            ),
            models.CheckConstraint(
                condition=Q(
                    status="pending_review", published_by__isnull=True, published_at__isnull=True
                )
                | Q(
                    status__in=["approved", "rejected"],
                    published_by__isnull=False,
                    published_at__isnull=False,
                ),
                name="photo_review_fields",
            ),
            models.CheckConstraint(
                condition=~Q(status="rejected") | ~Q(reason=""), name="photo_rejection_reason"
            ),
        ]
        indexes = [
            models.Index(fields=["status", "submitted_at"]),
            models.Index(fields=["submitted_by", "submitted_at"]),
        ]

    @property
    def target_place(self):
        return self.place if self.place_id else self.proposal.approved_place

    def __str__(self):
        return str(self.id)


class PhotoAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(PhotoSubmission, on_delete=models.PROTECT, related_name="assets")
    original = models.FileField(upload_to="visual/originals/")
    derivative = models.ImageField(upload_to="visual/derivatives/")
    sha256 = models.CharField(max_length=64)
    file_size = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    sort_order = models.PositiveSmallIntegerField()
    technical_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "sort_order"], name="photo_asset_order_unique"
            ),
            models.CheckConstraint(condition=Q(sort_order__lte=4), name="photo_asset_max_five"),
            models.CheckConstraint(
                condition=Q(width__gt=0, height__gt=0, file_size__gt=0),
                name="photo_asset_positive_metrics",
            ),
        ]


class PlacePhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    place = models.ForeignKey(
        "places.Place", on_delete=models.PROTECT, related_name="visual_photos"
    )
    asset = models.OneToOneField(PhotoAsset, on_delete=models.PROTECT, related_name="public_photo")
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending_publication", "Chờ công khai"),
            ("published", "Công khai"),
            ("withdrawn", "Đã rút"),
        ],
        default="pending_publication",
    )
    is_cover = models.BooleanField(default=False)
    caption = models.TextField(blank=True, max_length=1000)
    alt_text = models.CharField(max_length=200, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    attributes = models.ManyToManyField(VisualAttribute, through="PhotoAttribute")

    def save(self, *args, **kwargs):
        if self.status == "withdrawn":
            if not self.withdrawn_at:
                from django.utils import timezone

                self.withdrawn_at = timezone.now()
            self.is_cover = False
            if "update_fields" in kwargs and kwargs["update_fields"] is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                    "is_cover",
                    "withdrawn_at",
                }
        super().save(*args, **kwargs)

    class Meta:
        ordering = ("-published_at", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["place"], condition=Q(is_cover=True), name="visual_one_cover"
            ),
            models.CheckConstraint(
                condition=~Q(status="published")
                | Q(published_at__isnull=False, withdrawn_at__isnull=True),
                name="published_photo_fields",
            ),
            models.CheckConstraint(
                condition=~Q(is_cover=True) | Q(status="published"),
                name="place_photo_cover_published",
            ),
            models.CheckConstraint(
                condition=~Q(status="withdrawn") | Q(withdrawn_at__isnull=False),
                name="place_photo_withdrawn_timestamp",
            ),
            models.CheckConstraint(
                condition=~Q(status="pending_publication")
                | Q(published_at__isnull=True, withdrawn_at__isnull=True),
                name="place_photo_pending_timestamps",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-published_at", "id"]),
            models.Index(fields=["place", "status", "-published_at", "id"]),
        ]


class PhotoAttribute(models.Model):
    source = models.CharField(max_length=30, choices=[("manual", "Thủ công")], default="manual")
    photo = models.ForeignKey(PlacePhoto, on_delete=models.PROTECT)
    attribute = models.ForeignKey(VisualAttribute, on_delete=models.PROTECT)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reviewed_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["photo", "attribute"], name="unique_reviewed_photo_attribute"
            )
        ]


class PhotoAudit(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    photo = models.ForeignKey(PlacePhoto, on_delete=models.PROTECT, null=True)
    submission = models.ForeignKey(PhotoSubmission, on_delete=models.PROTECT)
    action = models.CharField(max_length=40)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class ContentReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    photo = models.ForeignKey(PlacePhoto, on_delete=models.PROTECT, null=True, blank=True)
    place = models.ForeignKey("places.Place", on_delete=models.PROTECT, null=True, blank=True)
    reason = models.CharField(
        max_length=20,
        choices=[
            ("wrong_place", "Sai thông tin"),
            ("privacy", "Quyền riêng tư"),
            ("copyright", "Quyền ảnh"),
            ("unsafe", "Không phù hợp"),
            ("other", "Khác"),
        ],
    )
    note = models.TextField(blank=True, max_length=1000)
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Chờ xử lý"), ("resolved", "Đã xử lý")],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(photo__isnull=False, place__isnull=True)
                | Q(photo__isnull=True, place__isnull=False),
                name="content_report_one_target",
            ),
            models.UniqueConstraint(
                fields=["reporter", "photo"],
                condition=Q(status="pending", photo__isnull=False),
                name="unique_pending_photo_report",
            ),
            models.UniqueConstraint(
                fields=["reporter", "place"],
                condition=Q(status="pending", place__isnull=False),
                name="unique_pending_place_report",
            ),
            models.CheckConstraint(
                condition=(
                    Q(status="pending", resolved_at__isnull=True)
                    | Q(status="resolved", resolved_at__isnull=False)
                ),
                name="content_report_status_lifecycle",
            ),
        ]


def public_photos():
    from django.conf import settings

    query = PlacePhoto.objects.filter(
        status="published",
        withdrawn_at__isnull=True,
        place__status="published",
        place__deleted_at__isnull=True,
    )
    return query if settings.DEBUG else query.filter(place__is_demo=False)


class PhotoComment(models.Model):
    photo = models.ForeignKey(PlacePhoto, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [
            models.CheckConstraint(
                condition=~Q(body=""),
                name="photo_comment_non_empty_body",
            )
        ]


class PhotoLike(models.Model):
    photo = models.ForeignKey(PlacePhoto, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["photo", "user"], name="unique_photo_like")]
