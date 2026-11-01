import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q


class Post(models.Model):
    """A user-created post aggregating one or more media items."""

    class Status(models.TextChoices):
        PUBLISHED = "published", "Công khai"
        HIDDEN = "hidden", "Ẩn"
        WITHDRAWN = "withdrawn", "Đã rút"

    class Origin(models.TextChoices):
        UGC = "ugc", "Người dùng"
        SEED = "seed", "Dữ liệu import/seed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="posts"
    )
    place = models.ForeignKey(
        "places.Place", on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    caption = models.TextField(blank=True, max_length=1000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.HIDDEN)
    origin = models.CharField(max_length=16, choices=Origin.choices, default=Origin.UGC)
    like_count = models.BigIntegerField(default=0)
    comment_count = models.BigIntegerField(default=0)
    share_count = models.BigIntegerField(default=0)
    view_count = models.BigIntegerField(default=0)
    legacy_submission = models.OneToOneField(
        "photos.PhotoSubmission",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="post",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "-published_at", "id"]),
            models.Index(fields=["author", "-published_at"]),
            models.Index(fields=["place", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="published") | Q(published_at__isnull=False),
                name="post_published_timestamp",
            ),
        ]


class PostMedia(models.Model):
    """One media item inside a Post; maps 1:1 to a legacy PhotoAsset."""

    class Status(models.TextChoices):
        PENDING = "pending_publication", "Chờ công khai"
        PUBLISHED = "published", "Công khai"
        WITHDRAWN = "withdrawn", "Đã rút"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="media")
    media_asset = models.OneToOneField(
        "photos.PhotoAsset", on_delete=models.PROTECT, related_name="post_media"
    )
    position = models.PositiveSmallIntegerField(default=0)
    alt_text = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    published_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("position", "id")
        constraints = [
            models.UniqueConstraint(fields=["post", "position"], name="postmedia_order_unique"),
            models.CheckConstraint(
                condition=~Q(status="published")
                | Q(published_at__isnull=False, withdrawn_at__isnull=True),
                name="postmedia_published_timestamp",
            ),
            models.CheckConstraint(
                condition=~Q(status="withdrawn") | Q(withdrawn_at__isnull=False),
                name="postmedia_withdrawn_timestamp",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-published_at", "id"]),
        ]


class LegacyPhotoMapping(models.Model):
    """Maps a legacy PlacePhoto to its converted PostMedia for API compatibility."""

    legacy_place_photo_id = models.UUIDField(unique=True)
    post_media = models.OneToOneField(PostMedia, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["legacy_place_photo_id"])]


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_likes"
    )
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["post", "user"], name="unique_post_like"),
        ]


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    post_media = models.ForeignKey(
        PostMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_comments"
    )
    body = models.TextField(max_length=1000)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ("created_at", "id")
        constraints = [
            models.CheckConstraint(condition=~Q(body=""), name="post_comment_non_empty_body"),
        ]


class SavedPost(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_posts"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["post", "user"], name="unique_saved_post"),
        ]


class ShareEvent(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="shares")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    session_key = models.CharField(max_length=64, blank=True)
    channel = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PostView(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="views")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    session_key = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
