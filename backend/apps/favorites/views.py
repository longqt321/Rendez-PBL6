from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.photos.selectors import attribute_codes
from apps.photos.serializers import VisualPlaceSerializer
from apps.places.models import public_places
from apps.places.selectors import place_context, visual_places
from apps.places.views import FILTERS
from .models import Favorite


@extend_schema(parameters=FILTERS)
class VisualFavorites(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisualPlaceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return public_places().none()
        self.codes = attribute_codes(self.request)
        return (
            visual_places(self.request, self.codes)
            .filter(favorite__user=self.request.user)
            .order_by("-favorite__created_at", "id")
        )

    def list(self, request, *args, **kwargs):
        query = self.get_queryset()
        rows = self.paginate_queryset(query)
        data = self.get_serializer(
            rows, many=True, context=place_context(rows, request, self.codes)
        ).data
        return self.get_paginated_response(data)


class FavoriteDetail(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "favorite"

    @extend_schema(request=None, responses={204: None})
    def put(self, request, pk):
        place = get_object_or_404(public_places(), pk=pk)
        Favorite.objects.get_or_create(user=request.user, place=place)
        return Response(status=204)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        Favorite.objects.filter(user=request.user, place_id=pk).delete()
        return Response(status=204)
