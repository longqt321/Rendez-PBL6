from apps.photos.templatetags.ui_copy import validation_message
from django.contrib import admin, messages
from django.core.exceptions import (
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from rest_framework.exceptions import APIException
from apps.places.models import Place
from .models import (
    ContentReport,
    PhotoAudit,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
)
from .services import change_publication, check_reviewer, edit_tags, moderate_report


@admin.register(VisualAttribute)
class VisualAttributeAdmin(admin.ModelAdmin):
    list_display = ("display_name_vi", "code", "active", "is_searchable")
    list_filter = ("active", "is_searchable")
    search_fields = ("code", "display_name_vi")


@admin.register(PhotoSubmission)
class PhotoSubmissionAdmin(admin.ModelAdmin):
    list_display = ("target_name", "submitted_by", "status", "submitted_at", "review_link")
    list_filter = ("status", "submitted_at")
    search_fields = ("place__name", "proposal__name", "submitted_by__email")
    readonly_fields = tuple(field.name for field in PhotoSubmission._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Địa điểm")
    def target_name(self, obj):
        return obj.place.name if obj.place_id else obj.proposal.name

    @admin.display(description="Quản lý")
    def review_link(self, obj):
        return format_html(
            '<a href="{}">Quản lý ảnh</a>', reverse("admin:photos_review", args=[obj.id])
        )

    def get_urls(self):
        return [
            path(
                "<uuid:pk>/review/",
                self.admin_site.admin_view(self.review_view),
                name="photos_review",
            )
        ] + super().get_urls()

    def review_view(self, request, pk):
        try:
            check_reviewer(request.user)
        except APIException as error:
            raise DjangoPermissionDenied(str(error)) from error
        submission = get_object_or_404(
            PhotoSubmission.objects.select_related("place", "proposal__approved_place"), pk=pk
        )
        if request.method == "POST":
            action = request.POST.get("action")
            try:
                if action in ("publish", "withdraw", "cover", "edit_tags"):
                    photo = get_object_or_404(
                        PlacePhoto, asset__submission=submission, pk=request.POST.get("photo_id")
                    )
                    if action == "edit_tags":
                        edit_tags(
                            photo.pk,
                            request.user,
                            request.POST.getlist(f"tags_{photo.asset_id}"),
                            request.POST.get(f"caption_{photo.asset_id}", photo.caption),
                        )
                    else:
                        change_publication(photo.pk, request.user, action)
                    self.message_user(request, "Đã lưu thay đổi.")
                else:
                    self.message_user(request, "Hành động không hợp lệ.", messages.ERROR)
            except (APIException, Place.DoesNotExist, DjangoValidationError) as error:
                self.message_user(request, validation_message(error), messages.ERROR)
            return HttpResponseRedirect(request.path)
        assets = []
        for asset in submission.assets.prefetch_related("public_photo__attributes"):
            photo = getattr(asset, "public_photo", None)
            assets.append(
                {
                    "asset": asset,
                    "photo": photo,
                    "selected": list(photo.attributes.values_list("code", flat=True))
                    if photo
                    else [],
                }
            )
        context = {
            **self.admin_site.each_context(request),
            "title": "Quản lý ảnh",
            "submission": submission,
            "target_name": self.target_name(submission),
            "assets": assets,
            "attributes": VisualAttribute.objects.filter(active=True),
            "places": Place.objects.exclude(status="hidden").filter(deleted_at__isnull=True),
            "opts": self.model._meta,
        }
        return TemplateResponse(request, "admin/photos/review.html", context)


class ReadOnlyAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PlacePhoto)
class PlacePhotoAdmin(ReadOnlyAdmin):
    list_display = ("place", "status", "is_cover", "published_at", "review_link")
    list_filter = ("status", "is_cover")

    def review_link(self, obj):
        return format_html(
            '<a href="{}">Sửa nhãn hoặc gỡ ảnh</a>',
            reverse("admin:photos_review", args=[obj.asset.submission_id]),
        )


@admin.register(PhotoAudit)
class PhotoAuditAdmin(ReadOnlyAdmin):
    list_display = ("submission", "photo", "action", "actor", "created_at")
    list_filter = ("action",)


@admin.register(ContentReport)
class ContentReportAdmin(ReadOnlyAdmin):
    list_display = ("id", "reason", "status", "created_at", "resolved_at", "review_link")
    list_filter = ("reason", "status")
    actions = ("take_down", "dismiss")

    def review_link(self, obj):
        if obj.photo_id:
            return format_html(
                '<a href="{}">Kiểm tra ảnh</a>',
                reverse("admin:photos_review", args=[obj.photo.asset.submission_id]),
            )
        return format_html(
            '<a href="{}">Kiểm tra địa điểm</a>',
            reverse("admin:places_place_change", args=[obj.place_id]),
        )

    @admin.action(description="Ẩn/gỡ nội dung bị báo cáo (Chấp thuận báo cáo)")
    def take_down(self, request, queryset):
        check_reviewer(request.user)
        count = 0
        for report in queryset:
            try:
                moderate_report(report.id, request.user, action="take_down")
                self.log_change(request, report, "Ẩn/gỡ nội dung và đánh dấu đã xử lý")
                count += 1
            except Exception as e:
                self.message_user(
                    request, f"Lỗi khi xử lý báo cáo {report.id}: {e}", messages.ERROR
                )
        if count:
            self.message_user(request, f"Đã gỡ nội dung cho {count} báo cáo.")

    @admin.action(description="Từ chối báo cáo (Nội dung không vi phạm)")
    def dismiss(self, request, queryset):
        check_reviewer(request.user)
        count = 0
        for report in queryset:
            try:
                moderate_report(report.id, request.user, action="dismiss")
                self.log_change(request, report, "Từ chối báo cáo")
                count += 1
            except Exception as e:
                self.message_user(
                    request, f"Lỗi khi xử lý báo cáo {report.id}: {e}", messages.ERROR
                )
        if count:
            self.message_user(request, f"Đã từ chối {count} báo cáo.")

    @admin.action(description="Đánh dấu đã xử lý báo cáo")
    def resolve(self, request, queryset):
        return self.take_down(request, queryset)
