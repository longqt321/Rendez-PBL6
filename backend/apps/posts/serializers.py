from drf_spectacular.utils import extend_schema_field

from rest_framework import serializers

from .models import Comment, Like, Post, PostMedia, SavedPost


class PostMediaSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia
        fields = [
            "id",
            "media_url",
            "position",
            "alt_text",
            "status",
            "published_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_media_url(self, obj):
        return f"/public-post-media/{obj.pk}/"


class PostSerializer(serializers.ModelSerializer):
    media = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.display_name", read_only=True)
    place_name = serializers.CharField(source="place.name", read_only=True)
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "author_name",
            "place",
            "place_name",
            "caption",
            "status",
            "origin",
            "published_at",
            "like_count",
            "comment_count",
            "share_count",
            "view_count",
            "liked",
            "saved",
            "media",
        ]

    @extend_schema_field(PostMediaSerializer(many=True))
    def get_media(self, obj):
        published = [m for m in obj.media.all() if m.status == "published"]
        return PostMediaSerializer(published, many=True, context=self.context).data

    @extend_schema_field(serializers.IntegerField())
    def get_like_count(self, obj):
        return obj.like_count

    @extend_schema_field(serializers.IntegerField())
    def get_comment_count(self, obj):
        return obj.comment_count

    def _current_user(self):
        request = self.context.get("request")
        if request is None or not getattr(request, "user", None):
            return None
        if not request.user.is_authenticated:
            return None
        return request.user

    @extend_schema_field(serializers.BooleanField(allow_null=True))
    def get_liked(self, obj):
        user = self._current_user()
        if user is None:
            return False
        if hasattr(obj, "user_liked"):
            return bool(obj.user_liked)
        return Like.objects.filter(post=obj, user=user).exists()

    @extend_schema_field(serializers.BooleanField(allow_null=True))
    def get_saved(self, obj):
        user = self._current_user()
        if user is None:
            return False
        if hasattr(obj, "user_saved"):
            return bool(obj.user_saved)
        return SavedPost.objects.filter(post=obj, user=user).exists()


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "post", "post_media", "author", "author_name", "body", "created_at"]


class PostCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["body", "post_media"]
