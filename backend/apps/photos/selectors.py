from django.conf import settings
from django.core.cache import cache
from rest_framework import serializers
from .models import VisualAttribute, public_photos


def searchable_attributes():
    query = VisualAttribute.objects.filter(active=True, is_searchable=True)
    return query if settings.DEBUG else query.exclude(code__startswith="demo-")


def valid_searchable_attribute_codes():
    cache_key = "valid_searchable_attribute_codes"
    codes = cache.get(cache_key)
    if codes is None:
        codes = set(searchable_attributes().values_list("code", flat=True))
        cache.set(cache_key, codes, timeout=300)
    return codes


def attribute_codes(request):
    raw_attr = request.query_params.get("attributes", "")
    codes = sorted(set(filter(None, raw_attr.split(","))))
    if not codes:
        return []
    if len(codes) > 20 or len(raw_attr) > 2000:
        raise serializers.ValidationError({"attributes": ["Chọn tối đa 20 đặc điểm."]})
    valid = valid_searchable_attribute_codes()
    invalid = set(codes) - valid
    if invalid:
        raise serializers.ValidationError(
            {"attributes": ["Đặc điểm không được hỗ trợ: " + ", ".join(invalid)]}
        )
    return codes


def matching_photos(codes):
    photos = public_photos()
    for code in codes:
        photos = photos.filter(attributes__code=code, attributes__active=True)
    return photos.distinct().order_by("-published_at", "id")


def photo_queryset(query):
    return query.select_related(
        "asset__submission__submitted_by", "place__category"
    ).prefetch_related("attributes")
