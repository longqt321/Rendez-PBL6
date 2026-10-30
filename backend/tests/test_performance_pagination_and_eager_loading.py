import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.photos.models import PhotoComment

from .conftest import photo


@pytest.mark.django_db
def test_pagination_limits_and_structure(client, staff, place):
    client.force_authenticate(staff)

    # 1. Standard pagination response structure
    res = client.get("/api/v1/places/")
    assert res.status_code == 200
    assert "count" in res.data
    assert "next" in res.data
    assert "previous" in res.data
    assert "results" in res.data
    assert isinstance(res.data["results"], list)

    # 2. Page size boundary check (custom page_size clamped or respected)
    res_page_size = client.get("/api/v1/places/?page_size=5")
    assert res_page_size.status_code == 200
    assert len(res_page_size.data["results"]) <= 5


@pytest.mark.django_db
def test_empty_results_handling(client, staff):
    from apps.photos.models import VisualAttribute

    client.force_authenticate(staff)
    VisualAttribute.objects.create(
        code="workspace",
        display_name_vi="Không gian làm việc",
        active=True,
        is_searchable=True,
    )

    # 1. Non-existent search query returns cleanly with count=0 and empty list
    res_empty_search = client.get("/api/v1/places/?q=dia-diem-khong-he-ton-tai-12345")
    assert res_empty_search.status_code == 200
    assert res_empty_search.data["count"] == 0
    assert res_empty_search.data["results"] == []
    assert res_empty_search.data["next"] is None
    assert res_empty_search.data["previous"] is None

    # 2. Empty feed with non-matching attributes
    res_empty_feed = client.get("/api/v1/feed/?attributes=workspace")
    assert res_empty_feed.status_code == 200
    assert isinstance(res_empty_feed.data["results"], list)


@pytest.mark.django_db
def test_deterministic_ordering_across_views(client, staff, category):
    from apps.places.models import Place

    client.force_authenticate(staff)

    # Create 3 places with deterministic names
    Place.objects.create(
        name="A Quán",
        address="100 Đường A",
        category=category,
        status="published",
        created_by=staff,
        updated_by=staff,
    )
    Place.objects.create(
        name="B Quán",
        address="102 Đường B",
        category=category,
        status="published",
        created_by=staff,
        updated_by=staff,
    )
    Place.objects.create(
        name="C Quán",
        address="104 Đường C",
        category=category,
        status="published",
        created_by=staff,
        updated_by=staff,
    )

    # Sort by name
    res_name = client.get("/api/v1/places/?sort=name")
    assert res_name.status_code == 200
    names = [
        row["name"]
        for row in res_name.data["results"]
        if row["name"] in ["A Quán", "B Quán", "C Quán"]
    ]
    assert names == ["A Quán", "B Quán", "C Quán"]


@pytest.mark.django_db
def test_photo_comments_deterministic_ordering(client, staff, owner, place):
    from apps.photos.services import submit

    client.force_authenticate(staff)
    sub = submit(
        owner,
        {
            "place_id": place,
            "caption": "Ảnh cho test comments ordering",
            "consent_version": "v1",
        },
        [photo()],
        "comments-order-key",
    )
    public_photo = sub.assets.get().public_photo

    c1 = PhotoComment.objects.create(photo=public_photo, user=staff, body="Comment 1")
    c2 = PhotoComment.objects.create(photo=public_photo, user=owner, body="Comment 2")
    c3 = PhotoComment.objects.create(photo=public_photo, user=staff, body="Comment 3")

    res = client.get(f"/api/v1/photos/{public_photo.id}/comments/")
    assert res.status_code == 200
    ids = [item["id"] for item in res.data]
    assert ids == [c1.id, c2.id, c3.id]


@pytest.mark.django_db
def test_constant_query_count_prevents_n_plus_one(client, staff, category):
    from apps.places.models import Place

    client.force_authenticate(staff)

    # Seed initial places so the query returns rows
    for i in range(3):
        Place.objects.create(
            name=f"Baseline Place {i}",
            address=f"Address {i}",
            category=category,
            status="published",
            created_by=staff,
            updated_by=staff,
        )

    # Baseline query count with 3 places
    with CaptureQueriesContext(connection) as ctx1:
        res1 = client.get("/api/v1/places/")
        assert res1.status_code == 200
    count_baseline = len(ctx1.captured_queries)

    # Add 7 more places (total 10 places)
    for i in range(7):
        Place.objects.create(
            name=f"Scaled Place {i}",
            address=f"Scaled Address {i}",
            category=category,
            status="published",
            created_by=staff,
            updated_by=staff,
        )

    # Query count should remain identical (O(1) query complexity)
    with CaptureQueriesContext(connection) as ctx2:
        res2 = client.get("/api/v1/places/")
        assert res2.status_code == 200
    count_scaled = len(ctx2.captured_queries)

    assert count_scaled == count_baseline, (
        f"Query count scaled with data! Baseline: {count_baseline}, Scaled: {count_scaled}"
    )


@pytest.mark.django_db
def test_relational_data_integrity_in_place_detail(client, staff, place, owner):
    from apps.photos.services import submit

    client.force_authenticate(staff)
    sub = submit(
        owner,
        {
            "place_id": place,
            "caption": "Ảnh xác thực quan hệ",
            "consent_version": "v1",
        },
        [photo()],
        "rel-integrity-key",
    )
    public_photo = sub.assets.get().public_photo

    res = client.get(f"/api/v1/places/{place.id}/")
    assert res.status_code == 200
    assert res.data["id"] == str(place.id)
    assert res.data["name"] == place.name
    assert res.data["category"]["slug"] == place.category.slug
    assert res.data["cover_photo_id"] == str(public_photo.id)
    assert res.data["cover_image_url"] == f"/public-photo-media/{public_photo.id}/"
    assert "photos" in res.data
    assert res.data["photos"]["count"] >= 1
