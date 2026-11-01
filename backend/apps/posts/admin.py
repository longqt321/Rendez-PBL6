from django.contrib import admin

from .models import (
    Comment,
    LegacyPhotoMapping,
    Like,
    Post,
    PostMedia,
    SavedPost,
    ShareEvent,
    PostView,
)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "place", "status", "origin", "published_at")
    list_filter = ("status", "origin")
    search_fields = ("caption", "author__email")


@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "position", "status", "published_at")
    list_filter = ("status",)


@admin.register(LegacyPhotoMapping)
class LegacyPhotoMappingAdmin(admin.ModelAdmin):
    list_display = ("legacy_place_photo_id", "post_media")


admin.site.register(Like)
admin.site.register(Comment)
admin.site.register(SavedPost)
admin.site.register(ShareEvent)
admin.site.register(PostView)
