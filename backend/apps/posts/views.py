from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest
from django.utils import timezone
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.favorites.models import SavedPlace
from apps.photos.serializers import PhotoDetailSerializer
from apps.places.models import public_places
from apps.posts.models import (
    Comment,
    LegacyPhotoMapping,
    Like,
    Post,
    SavedPost,
    ShareEvent,
    PostView,
)
from .selectors import public_posts, visible_posts
from .serializers import (
    CommentSerializer,
    PostCommentCreateSerializer,
    PostSerializer,
)


class PostFeed(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PostSerializer

    @extend_schema(responses=PostSerializer(many=True))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = visible_posts(self.request.user).order_by("-published_at", "id")
        place = self.request.query_params.get("place")
        author = self.request.query_params.get("author")
        if place:
            qs = qs.filter(place_id=place)
        if author:
            qs = qs.filter(author_id=author)
        return qs


class PostDetail(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=PostSerializer)
    def get(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        return Response(PostSerializer(post, context={"request": request}).data)


class PostSavedList(generics.ListAPIView):
    """GET /api/v1/posts/saved/ — posts the current user has saved.

    Visibility follows the same rules as the feed: a saved post whose content
    has since been hidden/withdrawn stops appearing here instead of leaking it.
    Ordered by most recently saved first.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = PostSerializer

    @extend_schema(responses=PostSerializer(many=True))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        # (post, user) is unique, so the saves join yields one row per post.
        return (
            visible_posts(self.request.user)
            .filter(saves__user=self.request.user)
            .order_by("-saves__created_at", "-saves__id")
        )


class PostLike(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "like"

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def post(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        with transaction.atomic():
            _, created = Like.objects.get_or_create(
                post=post, user=request.user, defaults={"created_at": None}
            )
            if created:
                Post.objects.filter(pk=post.pk).update(like_count=F("like_count") + 1)
        return Response({"liked": True})

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def delete(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        with transaction.atomic():
            deleted, _ = Like.objects.filter(post=post, user=request.user).delete()
            if deleted:
                Post.objects.filter(pk=post.pk).update(like_count=Greatest(F("like_count") - 1, 0))
        return Response({"liked": False})


class PostCommentListCreate(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "comment"

    @extend_schema(responses=CommentSerializer(many=True))
    def get(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        comments = Comment.objects.filter(post=post).select_related("author", "post_media")
        return Response(CommentSerializer(comments, many=True).data)

    @extend_schema(request=PostCommentCreateSerializer, responses={"201": CommentSerializer})
    def post(self, request, pk):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        serializer = PostCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = serializer.validated_data.get("post_media")
        if media is not None and media.post_id != post.pk:
            raise serializers.ValidationError(
                {"post_media": ["Ảnh đính kèm không thuộc bài viết này."]}
            )
        comment = Comment.objects.create(
            post=post,
            post_media=media,
            author=request.user,
            body=serializer.validated_data["body"],
            created_at=timezone.now(),
        )
        Post.objects.filter(pk=post.pk).update(comment_count=F("comment_count") + 1)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class PostSave(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "favorite"

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def post(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        SavedPost.objects.get_or_create(post=post, user=request.user)
        return Response({"saved": True})

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def delete(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        SavedPost.objects.filter(post=post, user=request.user).delete()
        return Response({"saved": False})


class PlaceSave(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "favorite"

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def post(self, request, pk):
        # Same visibility gate as the favourites app: only public places.
        place = get_object_or_404(public_places(), pk=pk)
        SavedPlace.objects.get_or_create(user=request.user, place=place)
        return Response({"saved": True})

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def delete(self, request, pk):
        place = get_object_or_404(public_places(), pk=pk)
        SavedPlace.objects.filter(user=request.user, place=place).delete()
        return Response({"saved": False})


class PostShare(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "share"

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def post(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        channel = str(request.data.get("channel", ""))[:32]
        ShareEvent.objects.create(
            post=post,
            user=request.user if request.user.is_authenticated else None,
            session_key=request.session.session_key or "",
            channel=channel,
        )
        Post.objects.filter(pk=post.pk).update(share_count=F("share_count") + 1)
        return Response({"shared": True})


class PostViewLog(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "view"

    @extend_schema(request=None, responses={"200": {"type": "object"}})
    def post(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        PostView.objects.create(
            post=post,
            user=request.user if request.user.is_authenticated else None,
            session_key=request.session.session_key or "",
        )
        Post.objects.filter(pk=post.pk).update(view_count=F("view_count") + 1)
        return Response({"viewed": True})


class LegacyPhotoAdapter(APIView):
    """Route adapter for GET /api/v1/photos/<uuid:pk>/.

    The legacy PlacePhoto surface stays the source of truth while both rows
    coexist: whenever the legacy photo row still exists, the request is
    delegated to the legacy PhotoDetail view so its semantics (payload shape,
    visibility rules, 404 on withdrawn) are fully preserved. The post-centric
    payload is only served for orphaned legacy IDs whose PlacePhoto row no
    longer exists but which still map to a publicly visible Post — this keeps
    pre-migration photo URLs resolvable. Authentication is required to match
    the legacy security boundary.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=PhotoDetailSerializer)
    def get(self, request, pk):
        from apps.photos.models import PlacePhoto
        from apps.photos.views import PhotoDetail

        if PlacePhoto.objects.filter(pk=pk).exists():
            return PhotoDetail.as_view()(request._request, pk=pk)
        mapping = (
            LegacyPhotoMapping.objects.filter(legacy_place_photo_id=pk)
            .select_related("post_media__post")
            .first()
        )
        if mapping is None:
            return PhotoDetail.as_view()(request._request, pk=pk)
        # Only serve the post-centric payload when the mapped Post is publicly
        # visible under the same rules as the Post domain; otherwise fall
        # through to the legacy view so hidden/withdrawn content stays 404.
        post = mapping.post_media.post
        if public_posts().filter(pk=post.pk).exists():
            return Response(PostSerializer(post, context={"request": request}).data)
        return PhotoDetail.as_view()(request._request, pk=pk)
