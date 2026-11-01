import math
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers
from rest_framework.settings import api_settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.photos.models import PhotoAttribute, public_photos
from apps.photos.selectors import attribute_codes, matching_photos, photo_queryset
from apps.photos.serializers import (
    PublicPhotoSerializer,
    VisualAttributeSerializer,
    VisualDetailSerializer,
    VisualMapSerializer,
    VisualPlaceSerializer,
)
from apps.posts.selectors import visible_posts
from apps.posts.serializers import PostSerializer
from config.api import Pagination
from .geocoding import geocode_address
from .models import Category, public_places
from .selectors import place_context, visual_places
from .serializers import CategorySerializer

FILTERS = [
    OpenApiParameter("q", str),
    OpenApiParameter("category", str),
    OpenApiParameter(
        "attributes", str, description="Comma-separated codes. AND on one public photo."
    ),
    OpenApiParameter("sort", str),
]


class CategoryList(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("sort_order", "name")


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


class VisualPlaceDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter("attributes", str)], responses=VisualDetailSerializer
    )
    def get(self, request, pk):
        codes = attribute_codes(request)
        place = get_object_or_404(visual_places(request, []), pk=pk)
        photos = photo_queryset(matching_photos(codes).filter(place_id=pk))
        pagination = Pagination()
        first = pagination.paginate_queryset(photos, request)
        place.visual_support_id = first[0].id if (first and codes) else None
        context = place_context([place], request, codes)
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
                "specification": place.opening_hours_specification or {},
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
                # Aggregated community posts for this place (first page,
                # same visibility rules as the feed).
                "posts": PostSerializer(
                    visible_posts(request.user).filter(place_id=pk)[: api_settings.PAGE_SIZE],
                    many=True,
                    context={"request": request},
                ).data,
            }
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
            ) from None
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


class GeocodeResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    display_name = serializers.CharField(required=False)
    provider = serializers.CharField(required=False)
    confidence = serializers.FloatField(required=False)


class GeocodeView(APIView):
    """
    Tự động giải mã và định vị địa chỉ thực tế (Geocoding) trả về tọa độ kinh độ, vĩ độ.
    Sử dụng cơ sở dữ liệu và API thời gian thực từ OpenStreetMap (Nominatim, Photon).
    """

    permission_classes = [AllowAny]
    throttle_scope = "geocode"

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "q",
                str,
                required=True,
                description="Chuỗi địa chỉ thực tế cần tự động lấy tọa độ",
            )
        ],
        responses={200: GeocodeResponseSerializer},
    )
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"success": False, "message": "Vui lòng nhập địa chỉ cần tìm."},
                status=400,
            )
        if len(query) > 300:
            return Response(
                {"success": False, "message": "Địa chỉ tìm kiếm tối đa 300 ký tự."},
                status=400,
            )

        result = geocode_address(query)
        if "latitude" in result and result["latitude"] is not None:
            result["latitude"] = float(result["latitude"])
        if "longitude" in result and result["longitude"] is not None:
            result["longitude"] = float(result["longitude"])

        return Response(result)
