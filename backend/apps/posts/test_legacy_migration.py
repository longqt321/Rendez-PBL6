"""Tests for the legacy photo -> Post/PostMedia data migration (apps.posts.0002)."""

import contextlib
import io
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.favorites.models import Favorite, SavedPlace
from apps.photos.models import (
    PhotoAsset,
    PhotoAttribute,
    PhotoComment,
    PhotoLike,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
)
from apps.places.models import Category, Place
from apps.posts.models import (
    Comment,
    LegacyPhotoMapping,
    Like,
    Post,
    PostMedia,
)

User = get_user_model()


def _make_submission(user, place, assets=1, with_place_photos=1, statuses=None, caption=""):
    submission = PhotoSubmission.objects.create(
        submitted_by=user,
        place=place,
        caption=caption,
        consent_version="photo-rights-v2",
        consent_at=timezone.now(),
        idempotency_key=uuid.uuid4().hex,
        payload_hash="x" * 64,
        status="approved",
        published_by=user,
        published_at=timezone.now(),
    )
    photos = []
    for i in range(assets):
        asset = PhotoAsset.objects.create(
            submission=submission,
            sha256=uuid.uuid4().hex,
            file_size=1,
            width=1,
            height=1,
            sort_order=i,
        )
        pp = None
        if i < with_place_photos:
            st = statuses[i] if statuses and i < len(statuses) else "published"
            pp = PlacePhoto.objects.create(
                place=place,
                asset=asset,
                status=st,
                published_at=timezone.now() if st == "published" else None,
                withdrawn_at=timezone.now() if st == "withdrawn" else None,
                caption=caption,
                alt_text=caption[:200] or place.name,
                is_cover=False,
            )
        photos.append((asset, pp))
    return submission, photos


class MigrationConversionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="tester@example.com", password="pw12345", display_name="Tester"
        )
        self.seed_user = User.objects.create_user(
            email="archive@rendez.invalid", password=None, display_name="Seed"
        )
        self.category = Category.objects.create(slug="coffee", name="Cà phê")
        self.place = Place.objects.create(
            name="Quán A",
            address="Địa chỉ A",
            category=self.category,
            created_by=self.user,
            updated_by=self.user,
            status="published",
            published_at=timezone.now(),
        )

    def _run(self):
        from django.apps import apps as django_apps
        from django.db import connection

        import importlib

        convert = importlib.import_module(
            "apps.posts.migrations.0002_backfill_legacy_photos"
        ).convert

        convert(django_apps, connection.schema_editor())

    def test_submission_with_multiple_assets_creates_one_post(self):
        _, photos = _make_submission(self.user, self.place, assets=3, with_place_photos=3)
        self._run()
        post = Post.objects.get(legacy_submission__isnull=False)
        self.assertEqual(post.media.count(), 3)
        self.assertEqual(post.status, "published")

    def test_each_asset_becomes_one_postmedia(self):
        _, photos = _make_submission(self.user, self.place, assets=2, with_place_photos=2)
        self._run()
        self.assertEqual(PostMedia.objects.count(), 2)
        for asset, pp in photos:
            media = PostMedia.objects.get(media_asset=asset)
            self.assertEqual(media.position, asset.sort_order)
            self.assertTrue(LegacyPhotoMapping.objects.filter(post_media=media).exists())

    def test_asset_without_placephoto_preserved_as_pending(self):
        _make_submission(self.user, self.place, assets=2, with_place_photos=1)
        self._run()
        pending = PostMedia.objects.filter(status="pending_publication")
        self.assertEqual(pending.count(), 1)
        self.assertEqual(pending.first().media_asset.submission.submitted_by, self.user)

    def test_submission_without_assets_recorded_not_lost(self):
        _make_submission(self.user, self.place, assets=0)
        self._run()
        self.assertFalse(Post.objects.exists())
        # Legacy submission untouched.
        self.assertTrue(PhotoSubmission.objects.exists())

    def test_pending_media_never_auto_published(self):
        _make_submission(
            self.user, self.place, assets=1, with_place_photos=1, statuses=["pending_publication"]
        )
        self._run()
        post = Post.objects.get()
        self.assertEqual(post.status, "hidden")
        self.assertEqual(post.media.first().status, "pending_publication")

    def test_withdrawn_media_preserved(self):
        _make_submission(
            self.user, self.place, assets=1, with_place_photos=1, statuses=["withdrawn"]
        )
        self._run()
        media = PostMedia.objects.get()
        self.assertEqual(media.status, "withdrawn")
        self.assertIsNotNone(media.withdrawn_at)

    def test_submission_without_placephotos_is_hidden(self):
        # Assets with no PlacePhoto rows are neither published nor withdrawn:
        # the post must stay hidden, never auto-published or withdrawn.
        _make_submission(self.user, self.place, assets=1, with_place_photos=0)
        self._run()
        post = Post.objects.get()
        self.assertEqual(post.status, "hidden")
        self.assertEqual(post.media.first().status, "pending_publication")

    def test_like_without_mapping_surfaced_as_anomaly(self):
        _, photos = _make_submission(self.user, self.place, assets=1, with_place_photos=1)
        PhotoLike.objects.create(photo=photos[0][1], user=self.user)
        self._run()  # first conversion creates the mapping
        LegacyPhotoMapping.objects.all().delete()  # simulate a lost mapping
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            self._run()
        self.assertIn("like_without_mapping", buffer.getvalue())

    def test_post_public_only_with_published_media(self):
        _make_submission(
            self.user, self.place, assets=1, with_place_photos=1, statuses=["published"]
        )
        self._run()
        self.assertEqual(Post.objects.get().status, "published")

    def test_place_cover_mapping(self):
        submission, photos = _make_submission(
            self.user, self.place, assets=1, with_place_photos=1, statuses=["published"]
        )
        photos[0][1].is_cover = True
        photos[0][1].save(update_fields=["is_cover"])
        self._run()
        self.place.refresh_from_db()
        self.assertEqual(self.place.cover_media_id, PostMedia.objects.get().id)

    def test_like_deduplication_and_null_timestamp(self):
        submission, photos = _make_submission(self.user, self.place, assets=2, with_place_photos=2)
        other = User.objects.create_user(
            email="other@example.com", password="pw", display_name="Other"
        )
        for _, pp in photos:
            PhotoLike.objects.create(photo=pp, user=other)
        self._run()
        post = Post.objects.get()
        self.assertEqual(post.likes.count(), 1)
        like = post.likes.first()
        self.assertIsNone(like.created_at)

    def test_comment_preserves_media_origin_and_timestamp(self):
        submission, photos = _make_submission(self.user, self.place, assets=1, with_place_photos=1)
        pp = photos[0][1]
        created = timezone.now() - timedelta(days=1)
        PhotoComment.objects.create(photo=pp, user=self.user, body="Hay")
        PhotoComment.objects.update(created_at=created)
        self._run()
        comment = Comment.objects.get()
        self.assertEqual(comment.body, "Hay")
        self.assertEqual(comment.post_media_id, PostMedia.objects.get().id)
        self.assertEqual(comment.created_at, created)

    def test_favorite_to_savedplace_preserves_timestamp(self):
        created = timezone.now() - timedelta(days=2)
        Favorite.objects.create(user=self.user, place=self.place)
        Favorite.objects.update(created_at=created)
        self._run()
        saved = SavedPlace.objects.get()
        self.assertEqual(saved.created_at, created)
        self.assertEqual(saved.place_id, self.place.id)

    def test_photo_attribute_backfilled(self):
        submission, photos = _make_submission(self.user, self.place, assets=1, with_place_photos=1)
        pp = photos[0][1]
        va = VisualAttribute.objects.create(code="study", display_name_vi="Học", description="d")
        attr = PhotoAttribute.objects.create(
            photo=pp, attribute=va, reviewed_by=self.user, reviewed_at=timezone.now()
        )
        self._run()
        attr.refresh_from_db()
        self.assertEqual(attr.post_media_id, PostMedia.objects.get().id)
        # Legacy FK photo untouched.
        self.assertEqual(attr.photo_id, pp.id)

    def test_rerun_does_not_duplicate(self):
        _make_submission(self.user, self.place, assets=2, with_place_photos=2)
        self._run()
        counts = {
            "posts": Post.objects.count(),
            "media": PostMedia.objects.count(),
            "likes": Like.objects.count(),
            "comments": Comment.objects.count(),
            "saved": SavedPlace.objects.count(),
        }
        self._run()
        self.assertEqual(Post.objects.count(), counts["posts"])
        self.assertEqual(PostMedia.objects.count(), counts["media"])
        self.assertEqual(Like.objects.count(), counts["likes"])
        self.assertEqual(Comment.objects.count(), counts["comments"])
        self.assertEqual(SavedPlace.objects.count(), counts["saved"])

    def test_seed_author_marked_as_seed_origin(self):
        _make_submission(self.seed_user, self.place, assets=1, with_place_photos=1)
        self._run()
        self.assertEqual(Post.objects.get().origin, "seed")
