from django.urls import path

from .views import (
    LegacyPhotoAdapter,
    PlaceSave,
    PostCommentListCreate,
    PostDetail,
    PostFeed,
    PostLike,
    PostSavedList,
    PostSave,
    PostShare,
    PostViewLog,
)

urlpatterns = [
    path("api/v1/posts/", PostFeed.as_view()),
    # Literal path first: <uuid:pk> never matches "saved", but explicit
    # ordering keeps the routing table readable.
    path("api/v1/posts/saved/", PostSavedList.as_view()),
    path("api/v1/posts/<uuid:pk>/", PostDetail.as_view()),
    path("api/v1/posts/<uuid:pk>/likes/", PostLike.as_view()),
    path("api/v1/posts/<uuid:pk>/comments/", PostCommentListCreate.as_view()),
    path("api/v1/posts/<uuid:pk>/saved/", PostSave.as_view()),
    path("api/v1/posts/<uuid:pk>/shares/", PostShare.as_view()),
    path("api/v1/posts/<uuid:pk>/views/", PostViewLog.as_view()),
    path("api/v1/places/<uuid:pk>/saved/", PlaceSave.as_view()),
    # Adapter: legacy PlacePhoto UUIDs resolve to their Post when mapped;
    # otherwise the request falls through to the legacy PhotoDetail view.
    path("api/v1/photos/<uuid:pk>/", LegacyPhotoAdapter.as_view()),
]
