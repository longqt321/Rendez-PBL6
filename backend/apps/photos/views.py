import math
import unicodedata
from django.conf import settings
from django.db.models import BooleanField, Exists, OuterRef, Subquery, Value
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.favorites.models import Favorite
from apps.places.models import Category, public_places
from config.api import Pagination
from .models import (
    ContentReport,
    PhotoAsset,
    PhotoAttribute,
    PhotoSubmission,
    PhotoComment,
    VisualAttribute,
    public_photos,
)
from .serializers import (
    ContentReportSerializer,
    CaptionSerializer,
    PhotoCommentSerializer,
    FeedItemSerializer,
    PhotoDetailSerializer,
    PhotoSubmissionSerializer,
    PhotoUploadSerializer,
    PublicPhotoSerializer,
    VisualAttributeSerializer,
    VisualDetailSerializer,
    VisualMapSerializer,
    VisualPlaceSerializer,
)
from .services import submit, owner_edit_photo

FILTERS = [
    OpenApiParameter("q", str),
    OpenApiParameter("category", str),
    OpenApiParameter(
        "attributes", str, description="Comma-separated codes. AND on one public photo."
    ),
    OpenApiParameter("sort", str),
]


def attribute_codes(request):
    codes = sorted(set(filter(None, request.query_params.get("attributes", "").split(","))))
    if len(codes) > 20 or len(request.query_params.get("attributes", "")) > 2000:
        raise serializers.ValidationError({"attributes": ["Chọn tối đa 20 đặc điểm."]})
    valid = set(searchable_attributes().filter(code__in=codes).values_list("code", flat=True))
    if set(codes) - valid:
        raise serializers.ValidationError(
            {"attributes": ["Đặc điểm không được hỗ trợ: " + ", ".join(set(codes) - valid)]}
        )
    return codes


def matching_photos(codes):
    photos = public_photos()
    for code in codes:
        photos = photos.filter(attributes__code=code, attributes__active=True)
    return photos.distinct().order_by("-published_at", "id")


def visual_places(request, codes):
    photos = public_photos().filter(place_id=OuterRef("pk"))
    supporting = matching_photos(codes).filter(place_id=OuterRef("pk"))
    places = (
        public_places()
        .select_related("category")
        .annotate(
            visual_cover_id=Subquery(
                photos.order_by("-is_cover", "-published_at", "id").values("id")[:1]
            ),
            visual_support_id=Subquery(supporting.values("id")[:1]),
            is_saved=Exists(Favorite.objects.filter(place_id=OuterRef("pk"), user=request.user))
            if request.user.is_authenticated
            else Value(False, output_field=BooleanField()),
        )
    )
    q = request.query_params.get("q", "").strip()
    if len(q) > 100:
        raise serializers.ValidationError({"q": ["Từ khóa tìm kiếm tối đa 100 ký tự."]})
    if q:

        def fold(value):
            return "".join(
                c
                for c in unicodedata.normalize("NFD", value.casefold().replace("đ", "d"))
                if not unicodedata.combining(c)
            )

        words = fold(q).split()
        ids = [
            row[0]
            for row in places.values_list("id", "name", "address", "description")
            if all(word in fold(" ".join(row[1:])) for word in words)
        ]
        places = places.filter(pk__in=ids)
    category = request.query_params.get("category")
    if category:
        if not Category.objects.filter(slug=category, is_active=True).exists():
            raise serializers.ValidationError({"category": ["Loại quán không hợp lệ."]})
        places = places.filter(category__slug=category)
    sort = request.query_params.get("sort", "recent")
    if sort not in ("recent", "name"):
        raise serializers.ValidationError({"sort": ["Cách sắp xếp không hợp lệ."]})
    if codes:
        places = places.filter(Exists(supporting))
    return places.order_by("name" if sort == "name" else "-published_at", "id")


def photo_queryset(query):
    return query.select_related(
        "asset__submission__submitted_by", "place__category"
    ).prefetch_related("attributes")


def place_context(rows, request, codes):
    photo_ids = {
        photo_id
        for place in rows
        for photo_id in [place.visual_cover_id, place.visual_support_id]
        if photo_id
    }
    return {
        "request": request,
        "codes": codes,
        "photos_by_id": {p.id: p for p in photo_queryset(public_photos().filter(id__in=photo_ids))},
    }


def searchable_attributes():
    query = VisualAttribute.objects.filter(active=True, is_searchable=True)
    return query if settings.DEBUG else query.exclude(code__startswith="demo-")


class AttributeList(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisualAttributeSerializer
    pagination_class = None

    def get_queryset(self):
        return searchable_attributes()


@extend_schema(parameters=FILTERS)
class VisualPlaceList(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisualPlaceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return public_places().none()
        self.codes = attribute_codes(self.request)
        return visual_places(self.request, self.codes)

    def list(self, request, *args, **kwargs):
        query = self.get_queryset()
        rows = self.paginate_queryset(query)
        data = self.get_serializer(
            rows, many=True, context=place_context(rows, request, self.codes)
        ).data
        return self.get_paginated_response(data)


class VisualFavorites(VisualPlaceList):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(favorite__user=self.request.user)
            .order_by("-favorite__created_at", "id")
        )


@extend_schema(parameters=FILTERS)
class Feed(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedItemSerializer

    def list(self, request, *args, **kwargs):
        codes = attribute_codes(request)
        places = visual_places(request, codes)
        photos = matching_photos(codes).filter(place_id__in=places.values("id"))
        if request.query_params.get("sort") == "name":
            photos = photos.order_by("place__name", "-published_at", "id")
        page = self.paginate_queryset(photo_queryset(photos))
        rows = list(places.filter(id__in={p.place_id for p in page}))
        context = place_context(rows, request, codes)
        by_id = {place.id: place for place in rows}
        return self.get_paginated_response(
            FeedItemSerializer(
                [{"photo": p, "place": by_id[p.place_id]} for p in page], many=True, context=context
            ).data
        )


class VisualMap(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=FILTERS + [OpenApiParameter("bbox", str, required=True)],
        responses=VisualMapSerializer,
    )
    def get(self, request):
        codes = attribute_codes(request)
        try:
            west, south, east, north = map(float, request.query_params.get("bbox", "").split(","))
            if not all(math.isfinite(n) for n in (west, south, east, north)) or not (
                -180 <= west < east <= 180 and -90 <= south < north <= 90
            ):
                raise ValueError
        except ValueError:
            raise serializers.ValidationError(
                {"bbox": ["BBox phải có west,south,east,north hợp lệ."]}
            )
        if east - west > 2 or north - south > 2:
            raise serializers.ValidationError({"bbox": ["Phạm vi quá lớn. Phóng to bản đồ."]})
        query = visual_places(request, codes).filter(
            longitude__gte=west, longitude__lte=east, latitude__gte=south, latitude__lte=north
        )
        total = query.count()
        rows = list(query[:200])
        return Response(
            {
                "count": len(rows),
                "total_places": total,
                "truncated": total > len(rows),
                "results": VisualPlaceSerializer(
                    rows, many=True, context=place_context(rows, request, codes)
                ).data,
            }
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


class VisualPlaceDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("attributes", str)], responses=VisualDetailSerializer
    )
    def get(self, request, pk):
        codes = attribute_codes(request)
        # Place existence is independent of the contextual filter.
        place = get_object_or_404(visual_places(request, []), pk=pk)
        supporting = matching_photos(codes).filter(place_id=pk).first()
        place.visual_support_id = supporting.id if supporting else None
        context = place_context([place], request, codes)
        photos = photo_queryset(matching_photos(codes).filter(place_id=pk))
        pagination = Pagination()
        first = pagination.paginate_queryset(photos, request)
        gallery = pagination.get_paginated_response(
            PublicPhotoSerializer(first, many=True, context=context).data
        ).data
        if gallery["next"]:
            gallery["next"] = gallery["next"].replace(f"/places/{pk}/?", f"/places/{pk}/photos/?")
        data = VisualPlaceSerializer(place, context=context).data
        evidence = {}
        for relation in PhotoAttribute.objects.filter(
            photo__in=public_photos().filter(place_id=pk), attribute__active=True
        ).select_related("attribute"):
            item = evidence.setdefault(
                relation.attribute_id,
                {"attribute": VisualAttributeSerializer(relation.attribute).data, "photo_ids": []},
            )
            # One link suffices for the P0 attribute evidence chip; gallery is paginated.
            if not item["photo_ids"]:
                item["photo_ids"].append(str(relation.photo_id))
        hours = None
        if (
            place.opening_hours_text
            and place.opening_hours_source
            and place.opening_hours_verified_at
        ):
            hours = {
                "text": place.opening_hours_text,
                "source": place.opening_hours_source,
                "verified_at": place.opening_hours_verified_at.isoformat(),
            }
        return Response(
            {
                **data,
                "description": place.description,
                "source_url": place.source_url,
                "verified_at": place.verified_at,
                "opening_hours": hours,
                "photos": gallery,
                "attribute_evidence": list(evidence.values()),
            }
        )


class PhotoDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("attributes", str)], responses=PhotoDetailSerializer
    )
    def get(self, request, pk):
        codes = attribute_codes(request)
        photo = get_object_or_404(photo_queryset(public_photos()), pk=pk)
        place = get_object_or_404(visual_places(request, []), pk=photo.place_id)
        context = place_context([place], request, codes)
        context["place"] = place
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
        report = ContentReport.objects.create(
            reporter=request.user, **{kind: target}, **serializer.validated_data
        )
        return Response(ContentReportSerializer(report).data, status=201)


def media(request, pk, private=False, original=False):
    if not request.user.is_authenticated:
        raise Http404
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
    try:
        response = FileResponse(
            (asset.original if original else asset.derivative).open("rb"),
            content_type="application/octet-stream" if original else "image/jpeg",
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
    except FileNotFoundError:
        raise Http404


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


class Comments(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhotoCommentSerializer
    throttle_scope = "comment"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PhotoComment.objects.none()
        self.photo = get_object_or_404(public_photos(), pk=self.kwargs["pk"])
        return self.photo.comments.select_related("user")

    def perform_create(self, serializer):
        photo = get_object_or_404(public_photos(), pk=self.kwargs["pk"])
        serializer.save(photo=photo, user=self.request.user)


class DeleteComment(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhotoCommentSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PhotoComment.objects.none()
        return PhotoComment.objects.filter(user=self.request.user)
