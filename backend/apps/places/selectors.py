import unicodedata
from django.core.cache import cache
from django.db.models import BooleanField, Exists, OuterRef, Subquery, Value
from rest_framework import serializers

from apps.favorites.models import Favorite
from apps.photos.models import public_photos
from apps.photos.selectors import matching_photos, photo_queryset
from .models import Category, public_places


def normalize_vietnamese_text(value: str) -> str:
    """Normalize and fold Vietnamese text to lowercase without diacritics for search."""
    return "".join(
        c
        for c in unicodedata.normalize("NFD", value.casefold().replace("đ", "d"))
        if not unicodedata.combining(c)
    )


def visual_places(request, codes, filter_results=True):
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
    if not filter_results:
        return places.order_by("-published_at", "id")

    q = request.query_params.get("q", "").strip()
    if len(q) > 100:
        raise serializers.ValidationError({"q": ["Từ khóa tìm kiếm tối đa 100 ký tự."]})
    if q:
        from django.db import connection

        words = normalize_vietnamese_text(q).split()
        if connection.vendor == "postgresql":
            for word in words:
                places = places.extra(
                    where=[
                        "f_unaccent(lower(name || ' ' || address || ' ' || coalesce(description, ''))) LIKE %s"
                    ],
                    params=[f"%{word}%"],
                )
        else:
            matched_ids = [
                row[0]
                for row in places.values_list("id", "name", "address", "description")
                if all(word in normalize_vietnamese_text(" ".join(row[1:])) for word in words)
            ]
            places = places.filter(pk__in=matched_ids)

    category = request.query_params.get("category")
    if category:
        valid_categories = cache.get("active_category_slugs")
        if valid_categories is None:
            valid_categories = set(
                Category.objects.filter(is_active=True).values_list("slug", flat=True)
            )
            cache.set("active_category_slugs", valid_categories, timeout=300)
        if category not in valid_categories:
            raise serializers.ValidationError({"category": ["Loại quán không hợp lệ."]})
        places = places.filter(category__slug=category)

    sort = request.query_params.get("sort", "recent")
    if sort not in ("recent", "name"):
        raise serializers.ValidationError({"sort": ["Cách sắp xếp không hợp lệ."]})

    if codes:
        places = places.filter(Exists(supporting))

    return places.order_by("name" if sort == "name" else "-published_at", "id")


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
