from django.contrib import admin
from django.urls import path
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts.views import CSRFView, LoginView, LogoutView, MeView, RegisterView
from apps.favorites.views import FavoriteDetail
from apps.places.views import CategoryList

from apps.photos import views as visual

admin.site.site_header = "Quản trị Rendez"
admin.site.site_title = "Quản trị Rendez"
admin.site.index_title = "Quản lý nội dung"

urlpatterns = [
    path("api/v1/attributes/", visual.AttributeList.as_view()),
    path("api/v1/feed/", visual.Feed.as_view()),
    path("api/v1/photos/<uuid:pk>/", visual.PhotoDetail.as_view()),
    path("api/v1/photos/<uuid:pk>/report/", visual.Report.as_view(), {"kind": "photo"}),
    path("api/v1/places/<uuid:pk>/report/", visual.Report.as_view(), {"kind": "place"}),
    path("api/v1/places/<uuid:pk>/photos/", visual.Gallery.as_view()),
    path("api/v1/photo-submissions/", visual.SubmissionList.as_view()),
    path("api/v1/photo-submissions/<uuid:pk>/", visual.SubmissionDetail.as_view()),
    path("public-photo-media/<uuid:pk>/", visual.media),
    path("private-photo-original/<uuid:pk>/", visual.media, {"private": True, "original": True}),
    path("private-photo-media/<uuid:pk>/", visual.media, {"private": True}),
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
    path("api/v1/auth/csrf/", CSRFView.as_view()),
    path("api/v1/auth/register/", RegisterView.as_view()),
    path("api/v1/auth/login/", LoginView.as_view()),
    path("api/v1/auth/logout/", LogoutView.as_view()),
    path("api/v1/auth/me/", MeView.as_view()),
    path("api/v1/categories/", CategoryList.as_view()),
    path("api/v1/places/", visual.VisualPlaceList.as_view()),
    path("api/v1/places/map/", visual.VisualMap.as_view()),
    path("api/v1/places/<uuid:pk>/", visual.VisualPlaceDetail.as_view()),
    path("api/v1/favorites/", visual.VisualFavorites.as_view()),
    path("api/v1/favorites/<uuid:pk>/", FavoriteDetail.as_view()),
]
