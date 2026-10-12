import pytest
from django.contrib import admin
from django.db.migrations.autodetector import MigrationAutodetector
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.state import ProjectState
from django.urls import Resolver404, resolve
from django.apps import apps
from django.utils.translation import override


@pytest.mark.parametrize(
    "path",
    [
        "/api/legacy/v2/places/",
        "/api/legacy/v2/favorites/",
        "/api/v1/contributions/",
        "/api/v1/places/00000000-0000-0000-0000-000000000001/evidence/",
        "/protected-media/00000000-0000-0000-0000-000000000001/",
        "/public-media/00000000-0000-0000-0000-000000000001/",
    ],
)
def test_retired_routes_are_not_exposed(path):
    with pytest.raises(Resolver404):
        resolve(path)


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/feed/",
        "/api/v1/categories/",
        "/api/v1/places/map/",
        "/api/v1/favorites/",
        "/api/v1/photo-submissions/",
    ],
)
def test_current_routes_remain_available(path):
    assert resolve(path).func.view_class


def test_only_current_models_are_registered():
    for label in [
        "contributions.Contribution",
        "pricing.PriceEvidence",
        "pricing.MenuItem",
        "places.PlaceImage",
    ]:
        with pytest.raises(LookupError):
            apps.get_model(label)
    assert admin.site.is_registered(apps.get_model("photos.PhotoSubmission"))
    assert admin.site.is_registered(apps.get_model("places.Place"))


def test_model_state_matches_existing_migrations_without_database_access():
    with override("en"):
        loader = MigrationLoader(None)
        changes = MigrationAutodetector(
            loader.project_state(), ProjectState.from_apps(apps)
        ).changes(graph=loader.graph)
    assert changes == {}


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/feed/",
        "/api/v1/categories/",
        "/api/v1/attributes/",
        "/api/v1/places/",
        "/api/v1/places/map/",
        "/api/v1/favorites/",
        "/api/v1/photo-submissions/",
        "/api/v1/photos/00000000-0000-0000-0000-000000000001/",
        "/api/v1/places/00000000-0000-0000-0000-000000000001/",
        "/api/v1/places/00000000-0000-0000-0000-000000000001/photos/",
        "/api/v1/schema/",
        "/api/v1/docs/",
    ],
)
def test_anonymous_requests_cannot_access_internal_api(client, path):
    assert client.get(path).status_code == 401
