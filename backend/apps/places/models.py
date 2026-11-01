import logging
import uuid
from django.conf import settings
from django.contrib.postgres.indexes import GistIndex
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify


logger = logging.getLogger(__name__)


class Category(models.Model):
    slug = models.SlugField(unique=True, max_length=50)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self):
        return self.name


class Place(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Bản nháp"
        PUBLISHED = "published", "Công khai"
        HIDDEN = "hidden", "Đã ẩn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=240, blank=True)
    is_demo = models.BooleanField(default=False)
    description = models.TextField(blank=True, max_length=2000)
    address = models.CharField(max_length=500)
    source_url = models.URLField(max_length=1000, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    opening_hours_text = models.CharField(max_length=500, blank=True)
    opening_hours_source = models.CharField(max_length=500, blank=True)
    opening_hours_verified_at = models.DateTimeField(null=True, blank=True)
    opening_hours_specification = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cover_media = models.ForeignKey(
        "posts.PostMedia",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(latitude__isnull=True, longitude__isnull=True)
                    | Q(
                        latitude__isnull=False,
                        longitude__isnull=False,
                        latitude__gte=-90,
                        latitude__lte=90,
                        longitude__gte=-180,
                        longitude__lte=180,
                    )
                ),
                name="place_coords_valid",
            ),
            models.CheckConstraint(
                condition=~Q(status="published")
                | Q(published_at__isnull=False, deleted_at__isnull=True),
                name="place_public_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "deleted_at", "published_at"]),
            models.Index(fields=["latitude", "longitude"]),
            GistIndex(fields=["latitude", "longitude"], name="place_coords_gist_idx"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if not self.name.strip() or not self.address.strip():
            raise ValidationError("Tên và địa chỉ không được để trống.")
        if self.status == "published":
            if self.deleted_at or not self.category.is_active:
                raise ValidationError(
                    "Không thể xuất bản địa điểm đã xóa hoặc loại không hoạt động."
                )
            if not self.published_at:
                self.published_at = timezone.now()

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.address = self.address.strip()
        if not self.is_demo and (self.latitude is None or self.longitude is None) and self.address:
            try:
                from .geocoding import geocode_address

                geo = geocode_address(self.address)
                if geo.get("success") and geo.get("latitude") and geo.get("longitude"):
                    self.latitude = geo["latitude"]
                    self.longitude = geo["longitude"]
            except Exception as exc:
                logger.warning(
                    "Automatic geocoding failed for place address '%s': %s", self.address, exc
                )
        if not self.slug:
            self.slug = f"{slugify(self.name)[:190] or 'place'}-{str(self.id)[:8]}"
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


def public_places():
    from django.conf import settings

    query = Place.objects.filter(status="published", deleted_at__isnull=True)
    return query if settings.DEBUG else query.filter(is_demo=False)
