from django.contrib import admin
from django.urls import path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.views import (
    CSRFView,
    CreatorDetail,
    CreatorPhotos,
    LoginView,
    LogoutView,
    MeView,
    PasswordChange,
    RegisterView,
)
from apps.favorites.views import FavoriteDetail, VisualFavorites
from apps.photos import views as visual
from apps.places.views import (
    CategoryList,
    GeocodeView,
    VisualMap,
    VisualPlaceDetail,
    VisualPlaceList,
)
from .local import frontend, health, static_asset

admin.site.site_header = "Quản trị Rendez"
admin.site.site_title = "Quản trị Rendez"
admin.site.index_title = "Quản lý nội dung"

urlpatterns = [
    path("api/v1/health/", health),
    # Attributes & Feed
    path("api/v1/attributes/", visual.AttributeList.as_view()),
    path("api/v1/feed/", visual.Feed.as_view()),
    # Photos, Likes & Comments
    path("api/v1/photos/<uuid:pk>/", visual.PhotoDetail.as_view()),
    path("api/v1/photos/<uuid:pk>/similar/", visual.SimilarPhotos.as_view()),
    path("api/v1/photos/<uuid:pk>/likes/", visual.PhotoLikes.as_view()),
    path("api/v1/photos/<uuid:pk>/comments/", visual.PhotoComments.as_view()),
    path("api/v1/comments/<int:pk>/", visual.CommentDetail.as_view()),
    path("api/v1/photos/<uuid:pk>/manage/", visual.OwnPhoto.as_view()),
    path("api/v1/photos/<uuid:pk>/report/", visual.Report.as_view(), {"kind": "photo"}),
    # Places
    path("api/v1/categories/", CategoryList.as_view()),
    path("api/v1/places/", VisualPlaceList.as_view()),
    path("api/v1/places/map/", VisualMap.as_view()),
    path("api/v1/places/geocode/", GeocodeView.as_view()),
    path("api/v1/places/<uuid:pk>/", VisualPlaceDetail.as_view()),
    path("api/v1/places/<uuid:pk>/photos/", visual.Gallery.as_view()),
    path("api/v1/places/<uuid:pk>/report/", visual.Report.as_view(), {"kind": "place"}),
    # Favorites
    path("api/v1/favorites/", VisualFavorites.as_view()),
    path("api/v1/favorites/<uuid:pk>/", FavoriteDetail.as_view()),
    # Submissions & Media
    path("api/v1/photo-submissions/", visual.SubmissionList.as_view()),
    path("api/v1/photo-submissions/<uuid:pk>/", visual.SubmissionDetail.as_view()),
    path("public-photo-media/<uuid:pk>/", visual.media),
    path("private-photo-original/<uuid:pk>/", visual.media, {"private": True, "original": True}),
    path("private-photo-media/<uuid:pk>/", visual.media, {"private": True}),
    # Auth
    path("api/v1/auth/csrf/", CSRFView.as_view()),
    path("api/v1/auth/register/", RegisterView.as_view()),
    path("api/v1/auth/login/", LoginView.as_view()),
    path("api/v1/auth/logout/", LogoutView.as_view()),
    path("api/v1/auth/me/", MeView.as_view()),
    path("api/v1/auth/password/", PasswordChange.as_view()),
    path("api/v1/creators/<uuid:pk>/", CreatorDetail.as_view()),
    path("api/v1/creators/<uuid:pk>/photos/", CreatorPhotos.as_view()),
    # Admin & Schema docs
    path("admin/", admin.site.urls),
    path(
        "api/v1/schema/",
        SpectacularAPIView.as_view(permission_classes=[IsAuthenticated]),
        name="schema",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAuthenticated]),
    ),
    # Static & Frontend SPA
    path("static/<path:path>", static_asset),
    re_path(
        r"^(?P<path>(?:(?:discover|map|saved|profile|creators|login|register|places|photos|submissions)(?:/.*)?|assets/.*|icon\.svg|manifest\.webmanifest|favicon\.ico|))$",
        frontend,
    ),
]
