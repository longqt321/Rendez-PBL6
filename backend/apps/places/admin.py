from django.contrib import admin
from .models import Category, Place


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "status", "published_at")
    list_filter = ("status", "category")
    search_fields = ("name", "address")
    readonly_fields = (
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
        "published_at",
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        return False
