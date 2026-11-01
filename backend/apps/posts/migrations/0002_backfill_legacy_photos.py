"""Backfill legacy photo data into the target Post/PostMedia domain.

Idempotent: re-running skips already-converted rows using LegacyPhotoMapping
and the Post.legacy_submission traceability FK. No binary files are copied and
no legacy tables are modified or dropped.
"""

from django.db import migrations

SEED_AUTHOR_EMAIL = "archive@rendez.invalid"


def _submission_target_place(submission, Place):
    """Resolve the effective place of a submission, tolerating inconsistencies."""
    candidates = []
    if submission.place_id:
        candidates.append(submission.place_id)
    if submission.proposal_id and submission.proposal.approved_place_id:
        candidates.append(submission.proposal.approved_place_id)
    valid = [p for p in candidates if Place.objects.filter(pk=p).exists()]
    return valid[0] if valid else None


def _submission_place_id(submission, Place):
    place = _submission_target_place(submission, Place)
    return place if place is not None else None


def convert(apps, schema_editor):
    Place = apps.get_model("places", "Place")
    PhotoSubmission = apps.get_model("photos", "PhotoSubmission")
    PhotoAsset = apps.get_model("photos", "PhotoAsset")
    PlacePhoto = apps.get_model("photos", "PlacePhoto")
    Post = apps.get_model("posts", "Post")
    PostMedia = apps.get_model("posts", "PostMedia")
    LegacyPhotoMapping = apps.get_model("posts", "LegacyPhotoMapping")
    Like = apps.get_model("posts", "Like")
    Comment = apps.get_model("posts", "Comment")
    SavedPlace = apps.get_model("favorites", "SavedPlace")
    Favorite = apps.get_model("favorites", "Favorite")
    PhotoAttribute = apps.get_model("photos", "PhotoAttribute")
    User = apps.get_model("accounts", "User")

    seed_user_ids = set(User.objects.filter(email=SEED_AUTHOR_EMAIL).values_list("id", flat=True))

    existing_media_by_asset = {
        pm.media_asset_id: pm for pm in PostMedia.objects.all().only("id", "media_asset_id")
    }
    existing_mapping_ids = set(
        LegacyPhotoMapping.objects.values_list("legacy_place_photo_id", flat=True)
    )
    anomalies = []

    for submission in PhotoSubmission.objects.select_related("place", "proposal").iterator():
        if Post.objects.filter(legacy_submission_id=submission.id).exists():
            continue
        assets = list(
            PhotoAsset.objects.filter(submission_id=submission.id).order_by("sort_order", "id")
        )
        if not assets:
            anomalies.append(("submission_without_assets", str(submission.id)))
            continue

        place_id = _submission_place_id(submission, Place)
        media_place_ids = set()
        for asset in assets:
            pp = PlacePhoto.objects.filter(asset_id=asset.id).first()
            if pp and pp.place_id:
                media_place_ids.add(pp.place_id)

        # Place consistency: if media point to a different place than the
        # submission target, do NOT split the submission; keep all media and
        # mark the Post hidden so wrong-place content is never public.
        consistent = place_id is not None and (not media_place_ids or media_place_ids == {place_id})
        effective_place_id = place_id if consistent else None

        published_media = [
            PlacePhoto.objects.filter(asset_id=a.id, status="published").exists() for a in assets
        ]
        withdrawn_media = [
            PlacePhoto.objects.filter(asset_id=a.id, status="withdrawn").exists() for a in assets
        ]
        if any(published_media):
            post_status = "published"
        elif withdrawn_media and all(withdrawn_media):
            # Every media item was explicitly withdrawn -> the post is
            # withdrawn too. Anything else (pending / no PlacePhoto rows)
            # stays hidden: never auto-publish.
            post_status = "withdrawn"
        else:
            post_status = "hidden"

        post = Post.objects.create(
            author_id=submission.submitted_by_id,
            place_id=effective_place_id,
            caption=submission.caption or "",
            status=post_status,
            origin="seed" if submission.submitted_by_id in seed_user_ids else "ugc",
            legacy_submission_id=submission.id,
            published_at=submission.published_at if post_status == "published" else None,
        )

        for order, asset in enumerate(assets):
            if asset.id in existing_media_by_asset:
                media = existing_media_by_asset[asset.id]
            else:
                pp = PlacePhoto.objects.filter(asset_id=asset.id).first()
                if pp:
                    media_status = pp.status
                    media_published_at = pp.published_at
                    media_withdrawn_at = pp.withdrawn_at
                    alt_text = pp.alt_text or ""
                    legacy_pp_id = pp.id
                else:
                    media_status = "pending_publication"
                    media_published_at = None
                    media_withdrawn_at = None
                    alt_text = ""
                    legacy_pp_id = None
                media = PostMedia.objects.create(
                    post=post,
                    media_asset=asset,
                    position=asset.sort_order if asset.sort_order is not None else order,
                    alt_text=alt_text,
                    status=media_status,
                    published_at=media_published_at,
                    withdrawn_at=media_withdrawn_at,
                )
                existing_media_by_asset[asset.id] = media
                if legacy_pp_id and legacy_pp_id not in existing_mapping_ids:
                    LegacyPhotoMapping.objects.create(
                        legacy_place_photo_id=legacy_pp_id, post_media=media
                    )
                    existing_mapping_ids.add(legacy_pp_id)

    # Likes: deduplicate by (post, user); old likes keep created_at = NULL.
    PhotoLike = apps.get_model("photos", "PhotoLike")
    seen_pairs = set(
        Like.objects.exclude(created_at__isnull=False).values_list("post_id", "user_id")
    ) | set(Like.objects.filter(created_at__isnull=False).values_list("post_id", "user_id"))
    for photo_like in PhotoLike.objects.select_related("photo", "photo__asset").iterator():
        mapping = LegacyPhotoMapping.objects.filter(
            legacy_place_photo_id=photo_like.photo_id
        ).first()
        if not mapping:
            anomalies.append(("like_without_mapping", str(photo_like.id)))
            continue
        post_id = mapping.post_media.post_id
        pair = (post_id, photo_like.user_id)
        if pair in seen_pairs:
            anomalies.append(("like_deduplicated", str(photo_like.id)))
            continue
        Like.objects.create(post_id=post_id, user_id=photo_like.user_id, created_at=None)
        seen_pairs.add(pair)

    # Comments: preserve user, body, created_at and media origin.
    PhotoComment = apps.get_model("photos", "PhotoComment")
    for photo_comment in PhotoComment.objects.select_related("photo").iterator():
        mapping = LegacyPhotoMapping.objects.filter(
            legacy_place_photo_id=photo_comment.photo_id
        ).first()
        if not mapping:
            anomalies.append(("comment_without_mapping", str(photo_comment.id)))
            continue
        Comment.objects.create(
            post_id=mapping.post_media.post_id,
            post_media_id=mapping.post_media_id,
            author_id=photo_comment.user_id,
            body=photo_comment.body,
            created_at=photo_comment.created_at,
        )

    # Favorites -> SavedPlace (1:1, timestamps preserved).
    existing_saved = set(SavedPlace.objects.values_list("user_id", "place_id"))
    for favorite in Favorite.objects.select_related("place").iterator():
        pair = (favorite.user_id, favorite.place_id)
        if pair in existing_saved:
            anomalies.append(("favorite_deduplicated", str(favorite.id)))
            continue
        SavedPlace.objects.create(
            user_id=favorite.user_id,
            place_id=favorite.place_id,
            created_at=favorite.created_at,
        )
        existing_saved.add(pair)

    # PhotoAttribute backfill: keep legacy FK photo untouched.
    for attr in (
        PhotoAttribute.objects.filter(post_media__isnull=True).select_related("photo").iterator()
    ):
        mapping = LegacyPhotoMapping.objects.filter(legacy_place_photo_id=attr.photo_id).first()
        if not mapping:
            anomalies.append(("attribute_without_mapping", str(attr.id)))
            continue
        attr.post_media_id = mapping.post_media_id
        attr.save(update_fields=["post_media"])

    # Place cover: only assign if the mapped media is published and belongs to
    # the same place as the Post. Deterministic pick on anomalies (lowest id).
    covers = PlacePhoto.objects.filter(is_cover=True).select_related("asset").order_by("id")
    chosen = {}
    for pp in covers.iterator():
        mapping = (
            LegacyPhotoMapping.objects.filter(legacy_place_photo_id=pp.id)
            .select_related("post_media__post")
            .first()
        )
        if not mapping:
            anomalies.append(("cover_without_mapping", str(pp.id)))
            continue
        media = mapping.post_media
        post = media.post
        if media.status != "published" or post.place_id != pp.place_id:
            anomalies.append(("cover_not_eligible", str(pp.id)))
            continue
        chosen.setdefault(pp.place_id, media.id)
    for place_id, media_id in chosen.items():
        Place.objects.filter(pk=place_id, cover_media__isnull=True).update(cover_media=media_id)

    if anomalies:
        # Surface data anomalies instead of silently swallowing them; the
        # migration runner includes stdout in its log output.
        print(f"[posts.0002] {len(anomalies)} backfill anomaly(ies):")
        for kind, ref in anomalies:
            print(f"  - {kind}: {ref}")


def unconvert(apps, schema_editor):
    """Reverse: remove converted rows created by this migration, keep legacy."""
    Place = apps.get_model("places", "Place")
    LegacyPhotoMapping = apps.get_model("posts", "LegacyPhotoMapping")
    Post = apps.get_model("posts", "Post")
    Like = apps.get_model("posts", "Like")
    Comment = apps.get_model("posts", "Comment")
    PhotoAttribute = apps.get_model("photos", "PhotoAttribute")

    Place.objects.update(cover_media=None)
    PhotoAttribute.objects.filter(post_media__isnull=False).exclude(
        post_media__post__legacy_submission__isnull=True
    ).update(post_media=None)
    Comment.objects.all().delete()
    Like.objects.all().delete()
    LegacyPhotoMapping.objects.all().delete()
    Post.objects.filter(legacy_submission__isnull=False).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("posts", "0001_initial"),
        ("places", "0008_place_cover_media"),
        ("photos", "0010_photoattribute_post_media_and_more"),
        ("favorites", "0002_add_favorite_user_created_idx"),
    ]

    operations = [
        migrations.RunPython(convert, unconvert),
    ]
