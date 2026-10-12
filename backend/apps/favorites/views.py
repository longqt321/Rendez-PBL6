from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.places.models import public_places
from .models import Favorite


class FavoriteDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def put(self, request, pk):
        place = get_object_or_404(public_places(), pk=pk)
        Favorite.objects.get_or_create(user=request.user, place=place)
        return Response(status=204)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        Favorite.objects.filter(user=request.user, place_id=pk).delete()
        return Response(status=204)
