from pathlib import Path

from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import FileResponse, Http404, HttpResponseNotModified
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.places.models import public_places
from apps.places.selectors import place_context, visual_places
from apps.places.views import FILTERS
from .models import (
    ContentReport,
    PhotoAsset,
    PhotoComment,
    PhotoLike,
    PhotoSubmission,
    public_photos,
)
from .ranking import rank_similar_places
from .selectors import attribute_codes, matching_photos, photo_queryset, searchable_attributes
from .serializers import (
    CaptionSerializer,
    CommentCreateSerializer,
    ContentReportSerializer,
    FeedItemSerializer,
    PhotoCommentSerializer,
    PhotoDetailSerializer,
    PhotoLikesSerializer,
    PhotoSubmissionSerializer,
    PhotoUploadSerializer,
    PublicPhotoSerializer,
    VisualAttributeSerializer,
)
from .services import owner_edit_photo, submit


class AttributeList(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisualAttributeSerializer
    pagination_class = None

    def get_queryset(self):
        return searchable_attributes()


@extend_schema(
    parameters=FILTERS
    + [OpenApiParameter("mine", bool, description="Only photos posted by the authenticated user.")]
)
class Feed(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedItemSerializer

    def list(self, request, *args, **kwargs):
        codes = attribute_codes(request)
        places = visual_places(request, codes)
        photos = matching_photos(codes).filter(place_id__in=places.values("id"))
        if request.query_params.get("mine") == "true":
            photos = photos.filter(asset__submission__submitted_by=request.user)
        if request.query_params.get("sort") == "name":
            photos = photos.order_by("place__name", "-published_at", "id")
        page = self.paginate_queryset(photo_queryset(photos))
        rows = list(places.filter(id__in={p.place_id for p in page}))
        context = place_context(rows, request, codes)
        by_id = {place.id: place for place in rows}
        return self.get_paginated_response(
            FeedItemSerializer(
                [{"photo": p, "place": by_id[p.place_id]} for p in page],
                many=True,
                context=context,
            ).data
        )


class Gallery(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicPhotoSerializer

    @extend_schema(parameters=[OpenApiParameter("attributes", str)])
    def get(self, request, *args, **kwargs):
        get_object_or_404(public_places(), pk=kwargs["pk"])
        codes = attribute_codes(request)
        photos = photo_queryset(matching_photos(codes).filter(place_id=kwargs["pk"]))
        page = self.paginate_queryset(photos)
        return self.get_paginated_response(
            self.get_serializer(page, many=True, context={"codes": codes, "request": request}).data
        )


class PhotoDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("attributes", str)], responses=PhotoDetailSerializer
    )
    def get(self, request, pk):
        codes = attribute_codes(request)
        photo = get_object_or_404(
            photo_queryset(public_photos()).annotate(annotated_comments_count=Count("comments")),
            pk=pk,
        )
        place = get_object_or_404(
            visual_places(request, [], filter_results=False), pk=photo.place_id
        )
        context = place_context([place], request, codes)
        context["place"] = place
        context["photo_ids"] = list(
            public_photos().filter(place_id=place.id).values_list("id", flat=True)
        )
        return Response(PhotoDetailSerializer(photo, context=context).data)


class SubmissionList(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhotoSubmissionSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PhotoSubmission.objects.none()
        return (
            PhotoSubmission.objects.filter(submitted_by=self.request.user)
            .select_related("place", "proposal__approved_place")
            .prefetch_related("assets__public_photo__place")
        )

    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "upload"
        return super().get_throttles()

    @extend_schema(
        request=PhotoUploadSerializer,
        responses={201: PhotoSubmissionSerializer},
        parameters=[
            OpenApiParameter(
                "Idempotency-Key", str, location=OpenApiParameter.HEADER, required=True
            )
        ],
    )
    def post(self, request, *args, **kwargs):
        if set(request.data) - set(PhotoUploadSerializer().fields):
            raise serializers.ValidationError("Thông tin gửi lên có trường không được hỗ trợ.")
        serializer = PhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        files = values.pop("images")
        values.pop("consent")
        submission = submit(request.user, values, files, request.headers.get("Idempotency-Key", ""))
        return Response(PhotoSubmissionSerializer(submission).data, status=201)


class SubmissionDetail(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhotoSubmissionSerializer

    def get_queryset(self):
        query = PhotoSubmission.objects.select_related(
            "place", "proposal__approved_place"
        ).prefetch_related("assets__public_photo__place")
        if getattr(self, "swagger_fake_view", False):
            return query.none()
        if self.request.user.is_staff and self.request.user.has_perm(
            "photos.review_photosubmission"
        ):
            return query
        return query.filter(submitted_by=self.request.user)


class Report(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "report"

    @extend_schema(request=ContentReportSerializer, responses={201: ContentReportSerializer})
    def post(self, request, pk, kind):
        target = get_object_or_404(public_photos() if kind == "photo" else public_places(), pk=pk)
        serializer = ContentReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if (
                ContentReport.objects.select_for_update()
                .filter(
                    reporter=request.user,
                    status="pending",
                    **{kind: target},
                )
                .exists()
            ):
                raise serializers.ValidationError(
                    {"detail": "Bạn đã gửi báo cáo cho nội dung này và đang chờ xử lý."}
                )
            try:
                report = ContentReport.objects.create(
                    reporter=request.user, **{kind: target}, **serializer.validated_data
                )
            except IntegrityError as exc:
                raise serializers.ValidationError(
                    {"detail": "Bạn đã gửi báo cáo cho nội dung này và đang chờ xử lý."}
                ) from exc
        return Response(ContentReportSerializer(report).data, status=201)


def media(request, pk, private=False, original=False):
    if private:
        if not request.user.is_authenticated:
            raise Http404
        asset = get_object_or_404(PhotoAsset.objects.select_related("submission"), pk=pk)
        if original and not (
            request.user.is_staff and request.user.has_perm("photos.review_photosubmission")
        ):
            raise Http404
        if asset.submission.submitted_by_id != request.user.pk and not (
            request.user.is_staff and request.user.has_perm("photos.review_photosubmission")
        ):
            raise Http404
    else:
        photo = get_object_or_404(public_photos().select_related("asset"), pk=pk)
        asset = photo.asset

    etag = f'"{asset.sha256}"'
    if request.headers.get("If-None-Match") == etag:
        return HttpResponseNotModified()

    file_field = asset.original if original else asset.derivative
    if not file_field or not file_field.name:
        raise Http404

    try:
        file_obj = file_field.open("rb")
    except (FileNotFoundError, ValueError, SuspiciousOperation):
        # Fallback between .local/media and backend/.private-media
        clean_name = Path(file_field.name).name
        if not clean_name or clean_name.startswith("."):
            raise Http404 from None
        alt_paths = [
            settings.MEDIA_ROOT / clean_name,
            settings.BASE_DIR / ".private-media" / clean_name,
            settings.BASE_DIR.parent / ".local" / "media" / clean_name,
            settings.BASE_DIR / "media" / clean_name,
        ]
        file_obj = None
        for path in alt_paths:
            resolved = path.resolve()
            if resolved.exists() and resolved.is_file():
                file_obj = open(resolved, "rb")
                break
        if file_obj is None:
            raise Http404 from None

    response = FileResponse(
        file_obj,
        content_type="application/octet-stream" if original else "image/jpeg",
    )
    response["ETag"] = etag
    if not private and not original:
        response["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
    else:
        response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    if original:
        response["Content-Disposition"] = f'attachment; filename="original-{asset.id}.bin"'
    return response


class OwnPhoto(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=CaptionSerializer, responses=PublicPhotoSerializer)
    def patch(self, request, pk):
        values = CaptionSerializer(data=request.data)
        values.is_valid(raise_exception=True)
        photo = owner_edit_photo(pk, request.user, caption=values.validated_data["caption"])
        return Response(PublicPhotoSerializer(photo, context={"request": request}).data)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        owner_edit_photo(pk, request.user, withdraw=True)
        return Response(status=204)


class PhotoLikes(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "like"

    def response(self, photo, user):
        return Response(
            {"liked": photo.likes.filter(user=user).exists(), "count": photo.likes.count()}
        )

    @extend_schema(responses=PhotoLikesSerializer)
    def get(self, request, pk):
        photo = get_object_or_404(public_photos(), pk=pk)
        return self.response(photo, request.user)

    @extend_schema(request=None, responses=PhotoLikesSerializer)
    def post(self, request, pk):
        photo = get_object_or_404(public_photos(), pk=pk)
        PhotoLike.objects.get_or_create(photo=photo, user=request.user)
        return self.response(photo, request.user)

    @extend_schema(responses=PhotoLikesSerializer)
    def delete(self, request, pk):
        photo = get_object_or_404(public_photos(), pk=pk)
        PhotoLike.objects.filter(photo=photo, user=request.user).delete()
        return self.response(photo, request.user)


class SimilarPhotos(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=FeedItemSerializer(many=True))
    def get(self, request, pk):
        source = get_object_or_404(photo_queryset(public_photos()), pk=pk)
        ranked = rank_similar_places(
            source, photo_queryset(public_photos().exclude(place_id=source.place_id))
        )
        places = list(
            visual_places(request, [], filter_results=False).filter(
                pk__in=[p.place_id for p in ranked]
            )
        )
        by_id = {p.id: p for p in places}
        context = place_context(places, request, [])
        return Response(
            FeedItemSerializer(
                [{"photo": p, "place": by_id[p.place_id]} for p in ranked],
                many=True,
                context=context,
            ).data
        )


class PhotoComments(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhotoCommentSerializer
    throttle_scope = "comment"
    pagination_class = None

    def get_queryset(self):
        photo = get_object_or_404(public_photos(), pk=self.kwargs["pk"])
        return photo.comments.select_related("user").order_by("created_at", "id")

    @extend_schema(request=CommentCreateSerializer, responses={201: PhotoCommentSerializer})
    def post(self, request, pk):
        photo = get_object_or_404(public_photos(), pk=pk)
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = PhotoComment.objects.create(
            photo=photo,
            user=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            PhotoCommentSerializer(comment, context={"request": request}).data, status=201
        )


class CommentDetail(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "comment"

    @extend_schema(request=CommentCreateSerializer, responses=PhotoCommentSerializer)
    def patch(self, request, pk):
        comment = get_object_or_404(PhotoComment.objects.select_related("photo", "user"), pk=pk)
        if comment.user_id != request.user.pk and not request.user.is_staff:
            raise PermissionDenied("Bạn chỉ có thể chỉnh sửa bình luận của mình.")
        if comment.photo.status == "withdrawn":
            raise serializers.ValidationError("Ảnh này đã bị gỡ và không thể chỉnh sửa bình luận.")
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment.body = serializer.validated_data["body"]
        comment.save(update_fields=["body"])
        return Response(PhotoCommentSerializer(comment, context={"request": request}).data)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        try:
            comment = PhotoComment.objects.select_related("user").get(pk=pk)
        except PhotoComment.DoesNotExist:
            return Response(status=204)
        if comment.user_id != request.user.pk and not request.user.is_staff:
            raise PermissionDenied("Bạn chỉ có thể xóa bình luận của mình.")
        comment.delete()
        return Response(status=204)
