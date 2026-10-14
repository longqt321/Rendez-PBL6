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

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "sort_order"], name="photo_asset_order_unique"
            ),
            models.CheckConstraint(condition=Q(sort_order__lte=4), name="photo_asset_max_five"),
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
    attribution = models.JSONField(default=dict, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    attributes = models.ManyToManyField(VisualAttribute, through="PhotoAttribute")

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
            )
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
