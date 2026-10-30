import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.photos.models import PlacePhoto
from apps.photos.services import submit
from .conftest import photo


def create_sample_photo(owner, place, key="input-val-photo"):
    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "Input Validation Photo",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        key,
    )
    asset = submission.assets.get()
    return PlacePhoto.objects.get(asset=asset)


@pytest.mark.django_db
def test_consistent_error_response_shape(client):
    # Unauthenticated access error structure
    resp = client.get("/api/v1/auth/me/")
    assert resp.status_code == 401
    assert "code" in resp.data
    assert "message" in resp.data
    assert "request_id" in resp.data
    assert "fields" in resp.data
    assert "traceback" not in resp.data
    assert "sql" not in str(resp.data).lower()


@pytest.mark.django_db
def test_path_parameter_validation(client, owner):
    client.force_login(owner)

    # 1. Invalid non-UUID format on UUID path parameter returns 404 cleanly
    assert client.get("/api/v1/photos/not-a-uuid/").status_code == 404
    assert client.get("/api/v1/places/12345/").status_code == 404
    assert client.get("/public-photo-media/invalid-uuid/").status_code == 404

    # 2. Invalid non-integer on integer path parameter returns 404 cleanly
    assert client.delete("/api/v1/comments/abc/").status_code == 404


@pytest.mark.django_db
def test_non_editable_fields_rejection(owner, place):
    test_photo = create_sample_photo(owner, place, key="non-editable-test")
    client = APIClient()
    client.force_login(owner)

    # 1. Non-editable fields on photo manage are ignored by serializer
    initial_cover = test_photo.is_cover
    resp_photo = client.patch(
        f"/api/v1/photos/{test_photo.id}/manage/",
        {"caption": "Mô tả mới", "is_cover": not initial_cover, "status": "withdrawn"},
        format="json",
    )
    assert resp_photo.status_code == 200
    test_photo.refresh_from_db()
    assert test_photo.caption == "Mô tả mới"
    assert test_photo.is_cover == initial_cover
    assert test_photo.status == "published"

    # 2. Non-editable fields on profile patch are ignored by serializer
    resp_me = client.patch(
        "/api/v1/auth/me/",
        {"display_name": "Tên mới", "email": "hacked@example.test", "is_staff": True},
        format="json",
    )
    assert resp_me.status_code == 200
    owner.refresh_from_db()
    assert owner.display_name == "Tên mới"
    assert owner.email != "hacked@example.test"
    assert owner.is_staff is False

    # 3. Read-only fields on report cannot be overwritten
    resp_report = client.post(
        f"/api/v1/photos/{test_photo.id}/report/",
        {"reason": "copyright", "note": "ghi chú", "status": "resolved"},
        format="json",
    )
    assert resp_report.status_code == 201
    assert resp_report.data["status"] == "pending"


@pytest.mark.django_db
def test_filter_and_sorting_query_validation(client, owner):
    client.force_login(owner)

    # 1. Invalid sort value rejected
    resp_sort = client.get("/api/v1/places/?sort=invalid_sort")
    assert resp_sort.status_code == 400
    assert "sort" in resp_sort.data["fields"]

    # 2. Overly long search query (> 100 chars) rejected
    resp_q = client.get(f"/api/v1/places/?q={'a' * 101}")
    assert resp_q.status_code == 400
    assert "q" in resp_q.data["fields"]

    # 3. Invalid category slug rejected
    resp_cat = client.get("/api/v1/places/?category=non_existent_category")
    assert resp_cat.status_code == 400
    assert "category" in resp_cat.data["fields"]

    # 4. Valid sort values: recent and name
    assert client.get("/api/v1/places/?sort=recent").status_code == 200
    assert client.get("/api/v1/places/?sort=name").status_code == 200


@pytest.mark.django_db
def test_map_bbox_coordinates_and_bounds_validation(client, owner):
    client.force_login(owner)

    # 1. Missing bbox
    assert client.get("/api/v1/places/map/").status_code == 400

    # 2. Malformed bbox values
    assert client.get("/api/v1/places/map/?bbox=a,b,c,d").status_code == 400
    assert client.get("/api/v1/places/map/?bbox=108.2,16").status_code == 400

    # 3. Non-finite values (NaN, Inf)
    assert client.get("/api/v1/places/map/?bbox=nan,16,108.3,16.1").status_code == 400
    assert client.get("/api/v1/places/map/?bbox=108.2,16,inf,16.1").status_code == 400

    # 4. Inverted coordinates (west >= east or south >= north)
    assert client.get("/api/v1/places/map/?bbox=108.5,16,108.2,16.1").status_code == 400
    assert client.get("/api/v1/places/map/?bbox=108.2,16.5,108.3,16.1").status_code == 400

    # 5. Out of geographic range (-180..180, -90..90)
    assert client.get("/api/v1/places/map/?bbox=190,16,191,17").status_code == 400
    assert client.get("/api/v1/places/map/?bbox=108,-95,109,-91").status_code == 400

    # 6. Span too large (> 2 degrees)
    assert client.get("/api/v1/places/map/?bbox=100,10,105,15").status_code == 400

    # 7. Valid bbox
    assert client.get("/api/v1/places/map/?bbox=108.2,16.0,108.3,16.1").status_code == 200


@pytest.mark.django_db
def test_pagination_boundary_cases(client, owner):
    client.force_login(owner)

    # 1. Invalid non-integer page number: 404
    assert client.get("/api/v1/places/?page=abc").status_code == 404

    # 2. Negative page number: 404
    assert client.get("/api/v1/places/?page=-1").status_code == 404

    # 3. Excessive page number beyond results: 404
    assert client.get("/api/v1/places/?page=999999").status_code == 404

    # 4. Valid first page
    assert client.get("/api/v1/places/?page=1").status_code == 200


@pytest.mark.django_db
def test_registration_and_password_validation():
    client = APIClient()

    # 1. Extra unsupported fields in registration are dropped, preventing privilege escalation
    res_extra = client.post(
        "/api/v1/auth/register/",
        {
            "email": "fresh@example.test",
            "password": "Valid-Password-123",
            "display_name": "Người Dùng Mới",
            "is_staff": True,
            "is_superuser": True,
        },
        format="json",
    )
    assert res_extra.status_code == 201
    user = User.objects.get(email="fresh@example.test")
    assert user.is_staff is False
    assert user.is_superuser is False

    # 2. Too short display name rejected
    res_short = client.post(
        "/api/v1/auth/register/",
        {
            "email": "short@example.test",
            "password": "Valid-Password-123",
            "display_name": "a",
        },
        format="json",
    )
    assert res_short.status_code == 400


@pytest.mark.django_db
def test_geocode_input_validation(client):
    # 1. Empty query
    assert client.get("/api/v1/places/geocode/?q=").status_code == 400

    # 2. Overly long address (> 300 chars)
    assert client.get(f"/api/v1/places/geocode/?q={'a' * 301}").status_code == 400

    # 3. Valid address query format
    resp = client.get("/api/v1/places/geocode/?q=Bạch Đằng, Đà Nẵng")
    assert resp.status_code == 200
    assert "success" in resp.data
