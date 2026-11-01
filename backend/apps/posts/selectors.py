"""Post selection helpers shared by views, serializers and media serving."""

from django.db.models import Exists, OuterRef

from apps.posts.models import Like, Post, PostMedia, SavedPost


def annotate_user_flags(qs, user):
    """Attach liked/saved Exists annotations so PostSerializer avoids N+1."""
    return qs.annotate(
        user_liked=Exists(Like.objects.filter(post_id=OuterRef("pk"), user=user)),
        user_saved=Exists(SavedPost.objects.filter(post_id=OuterRef("pk"), user=user)),
    )


def public_posts():
    """Posts visible to everyone: published post + published, live place.

    Demo data is hidden outside DEBUG so production never exposes seeded
    content. Filter with an Exists subquery instead of a media join: the join
    forces DISTINCT over every Post column (including the count query), which
    is measurably slower and duplicates rows before de-duplication.
    """
    from django.conf import settings

    query = Post.objects.filter(
        status="published",
        place__status="published",
        place__deleted_at__isnull=True,
    ).filter(Exists(PostMedia.objects.filter(post_id=OuterRef("pk"), status="published")))
    return query if settings.DEBUG else query.filter(place__is_demo=False)


def visible_posts(user=None):
    """Base queryset shared by the feed, post detail and saved-posts list.

    Public posts with author/place and published media prefetched; the
    per-user liked/saved flags are annotated only for authenticated users so
    guest requests skip the extra subqueries.
    """
    qs = public_posts().select_related("author", "place").prefetch_related("media__media_asset")
    if user is not None and user.is_authenticated:
        qs = annotate_user_flags(qs, user)
    return qs
