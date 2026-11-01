import uuid
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.favorites.models import SavedPlace
from apps.photos.models import PhotoAsset, PhotoSubmission
from apps.places.models import Category, Place
from apps.posts.models import Comment, Like, Post, PostMedia, SavedPost, ShareEvent, PostView

User = get_user_model()


class PostApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="u@example.com", password="pw12345", display_name="U"
        )
        self.category = Category.objects.create(slug="coffee", name="Cà phê")
        self.place = Place.objects.create(
            name="Quán B",
            address="Địa chỉ B",
            category=self.category,
            created_by=self.user,
            updated_by=self.user,
            status="published",
            published_at=timezone.now(),
        )
        self.submission = PhotoSubmission.objects.create(
            submitted_by=self.user,
            place=self.place,
            caption="hello",
            consent_version="v",
            consent_at=timezone.now(),
            idempotency_key="setup",
            payload_hash="x" * 64,
            status="approved",
            published_by=self.user,
            published_at=timezone.now(),
        )
        self.asset = PhotoAsset(
            submission=self.submission,
            sha256="b" * 64,
            file_size=1,
            width=1,
            height=1,
            sort_order=0,
        )
        self.asset.original.save("o.jpg", ContentFile(b"x"), save=False)
        self.asset.derivative.save("d.jpg", ContentFile(b"x"), save=False)
        self.asset.save()
        self.post = Post.objects.create(
            author=self.user,
            place=self.place,
            caption="hello",
            status="published",
            published_at=timezone.now(),
        )
        PostMedia.objects.create(
            post=self.post,
            media_asset=self.asset,
            position=0,
            status="published",
            published_at=timezone.now(),
        )
        self.client = APIClient()

    def test_feed_public_guest(self):
        with self.assertNumQueries(4):
            res = self.client.get("/api/v1/posts/")
        self.assertEqual(res.status_code, 200)

    def test_post_detail_public_guest(self):
        res = self.client.get(f"/api/v1/posts/{self.post.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], str(self.post.id))

    def test_like_requires_auth(self):
        res = self.client.post(f"/api/v1/posts/{self.post.id}/likes/")
        self.assertIn(res.status_code, (401, 403))
        self.client.force_authenticate(self.user)
        res = self.client.post(f"/api/v1/posts/{self.post.id}/likes/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Like.objects.filter(post=self.post, user=self.user).count(), 1)

    def test_comment_requires_auth_and_creates(self):
        res = self.client.post(
            f"/api/v1/posts/{self.post.id}/comments/", {"body": "nice"}, format="json"
        )
        self.assertIn(res.status_code, (401, 403))
        self.client.force_authenticate(self.user)
        res = self.client.post(
            f"/api/v1/posts/{self.post.id}/comments/", {"body": "nice"}, format="json"
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Comment.objects.filter(post=self.post).count(), 1)

    def test_saved_post_and_place(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(f"/api/v1/posts/{self.post.id}/saved/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SavedPost.objects.filter(post=self.post, user=self.user).count(), 1)
        res = self.client.delete(f"/api/v1/posts/{self.post.id}/saved/")
        self.assertEqual(SavedPost.objects.count(), 0)
        res = self.client.post(f"/api/v1/places/{self.place.id}/saved/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SavedPlace.objects.filter(place=self.place, user=self.user).count(), 1)

    def _published_post(self, caption, key, minutes_offset=0):
        """Create an additional published post with one published media item."""
        submission = PhotoSubmission.objects.create(
            submitted_by=self.user,
            place=self.place,
            caption=caption,
            consent_version="v",
            consent_at=timezone.now(),
            idempotency_key=key,
            payload_hash="x" * 64,
            status="approved",
            published_by=self.user,
            published_at=timezone.now(),
        )
        asset = PhotoAsset(
            submission=submission,
            sha256=uuid.uuid4().hex * 2,
            file_size=1,
            width=1,
            height=1,
            sort_order=0,
        )
        asset.original.save(f"o-{key}.jpg", ContentFile(b"x"), save=False)
        asset.derivative.save(f"d-{key}.jpg", ContentFile(b"x"), save=False)
        asset.save()
        post = Post.objects.create(
            author=self.user,
            place=self.place,
            caption=caption,
            status="published",
            published_at=timezone.now() + timezone.timedelta(minutes=minutes_offset),
        )
        PostMedia.objects.create(
            post=post,
            media_asset=asset,
            position=0,
            status="published",
            published_at=timezone.now(),
        )
        return post

    def test_saved_posts_list_requires_auth(self):
        res = self.client.get("/api/v1/posts/saved/")
        self.assertIn(res.status_code, (401, 403))

    def test_saved_posts_list_returns_public_saved_only(self):
        hidden = Post.objects.create(
            author=self.user,
            place=self.place,
            caption="hidden",
            status="hidden",
        )
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/v1/posts/{self.post.id}/saved/")
        self.client.post(f"/api/v1/posts/{hidden.id}/saved/")
        res = self.client.get("/api/v1/posts/saved/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data["results"]]
        self.assertEqual(ids, [str(self.post.id)])
        self.assertTrue(res.data["results"][0]["saved"])

    def test_saved_posts_list_orders_by_most_recent_save(self):
        newer = self._published_post("newer", "saved-newer", minutes_offset=5)
        other_user = User.objects.create_user(
            email="other@example.com", password="pw12345", display_name="O"
        )
        self.client.force_authenticate(other_user)
        self.client.post(f"/api/v1/posts/{self.post.id}/saved/")
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/v1/posts/{self.post.id}/saved/")
        self.client.post(f"/api/v1/posts/{newer.id}/saved/")
        res = self.client.get("/api/v1/posts/saved/")
        ids = [row["id"] for row in res.data["results"]]
        # Most recently saved first; the other user's save never leaks here.
        self.assertEqual(ids, [str(newer.id), str(self.post.id)])

    def test_share_and_view_guest(self):
        res = self.client.post(f"/api/v1/posts/{self.post.id}/shares/")
        self.assertEqual(res.status_code, 200)
        res = self.client.post(f"/api/v1/posts/{self.post.id}/views/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ShareEvent.objects.count(), 1)
        self.assertEqual(PostView.objects.count(), 1)
        self.post.refresh_from_db()
        self.assertEqual(self.post.view_count, 1)
        self.client.post(f"/api/v1/posts/{self.post.id}/views/")
        self.post.refresh_from_db()
        self.assertEqual(self.post.view_count, 2)

    def test_like_updates_counter_idempotently(self):
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/v1/posts/{self.post.id}/likes/")
        self.client.post(f"/api/v1/posts/{self.post.id}/likes/")  # duplicate is a no-op
        self.post.refresh_from_db()
        self.assertEqual(self.post.like_count, 1)
        self.client.delete(f"/api/v1/posts/{self.post.id}/likes/")
        self.client.delete(f"/api/v1/posts/{self.post.id}/likes/")  # unlike twice stays >= 0
        self.post.refresh_from_db()
        self.assertEqual(self.post.like_count, 0)

    def test_comment_updates_counter(self):
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/v1/posts/{self.post.id}/comments/", {"body": "nice"}, format="json")
        self.post.refresh_from_db()
        self.assertEqual(self.post.comment_count, 1)

    def test_share_updates_counter(self):
        self.client.post(f"/api/v1/posts/{self.post.id}/shares/")
        self.post.refresh_from_db()
        self.assertEqual(self.post.share_count, 1)

    def test_feed_is_stable_ordered_by_published_desc(self):
        asset2 = PhotoAsset(
            submission=self.submission,
            sha256="c" * 64,
            file_size=1,
            width=1,
            height=1,
            sort_order=1,
        )
        asset2.original.save("o2.jpg", ContentFile(b"y"), save=False)
        asset2.derivative.save("d2.jpg", ContentFile(b"y"), save=False)
        asset2.save()
        newer = Post.objects.create(
            author=self.user,
            place=self.place,
            caption="newer",
            status="published",
            published_at=self.post.published_at + timezone.timedelta(minutes=5),
        )
        PostMedia.objects.create(
            post=newer,
            media_asset=asset2,
            position=0,
            status="published",
            published_at=timezone.now(),
        )
        res = self.client.get("/api/v1/posts/")
        ids = [row["id"] for row in res.data["results"]]
        self.assertEqual(ids, [str(newer.id), str(self.post.id)])

    def test_legacy_photo_id_adapter(self):
        submission = PhotoSubmission.objects.create(
            submitted_by=self.user,
            place=self.place,
            caption="x",
            consent_version="v",
            consent_at=timezone.now(),
            idempotency_key="k",
            payload_hash="x" * 64,
            status="approved",
            published_by=self.user,
            published_at=timezone.now(),
        )
        asset = PhotoAsset(
            submission=submission, sha256="a" * 64, file_size=1, width=1, height=1, sort_order=0
        )
        asset.original.save("o.jpg", ContentFile(b"x"), save=False)
        asset.derivative.save("d.jpg", ContentFile(b"x"), save=False)
        asset.save()
        media = PostMedia.objects.create(
            post=self.post,
            media_asset=asset,
            position=1,
            status="published",
            published_at=timezone.now(),
        )
        legacy_id = uuid.uuid4()
        from apps.posts.models import LegacyPhotoMapping

        LegacyPhotoMapping.objects.create(legacy_place_photo_id=legacy_id, post_media=media)
        self.client.force_authenticate(self.user)
        res = self.client.get(f"/api/v1/photos/{legacy_id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], str(self.post.id))

    def test_account_deactivation_withdraws_public_content(self):
        self.post.status = "published"
        self.post.save(update_fields=["status"])
        self.client.force_authenticate(self.user)
        res = self.client.delete("/api/v1/auth/me/")
        self.assertEqual(res.status_code, 204)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, "withdrawn")
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
