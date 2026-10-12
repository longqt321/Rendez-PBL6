from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group
from .models import User
from apps.photos.templatetags.ui_copy import permission_label


@admin.register(User)
class EmailUserAdmin(UserAdmin):
    readonly_fields = ("is_superuser",)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if "user_permissions" in form.base_fields:
            form.base_fields["user_permissions"].label_from_instance = permission_label
        return form

    ordering = ("email",)
    list_display = ("email", "display_name", "is_staff", "is_active")
    search_fields = ("email", "display_name")
    fieldsets = (
        (None, {"fields": ("email", "password", "display_name")}),
        (
            "Quyền",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Thời gian", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"fields": ("email", "display_name", "password1", "password2")}),)


admin.site.unregister(Group)


@admin.register(Group)
class VietnameseGroupAdmin(GroupAdmin):
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if "permissions" in form.base_fields:
            form.base_fields["permissions"].label_from_instance = permission_label
        return form
