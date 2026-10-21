import pytest
from django.utils import timezone

from apps.photos.models import PhotoAttribute, VisualAttribute
from apps.photos.services import submit
from apps.places.models import Category, Place
from tests.conftest import photo

pytestmark = pytest.mark.django_db


def publish(owner, place, key):
    item = submit(owner, {"place_id": place, "consent_version": "photo-rights-v2"}, [photo()], key)
    return item.assets.first().public_photo


def test_similar_places_ranking_and_gallery_scope(client, owner, place, staff):
    source = publish(owner, place, "source")
    same = Place.objects.create(
        name="Cùng loại",
        address="Địa chỉ",
        category=place.category,
        status="published",
        created_by=staff,
        updated_by=staff,
    )
    other_category = Category.objects.create(slug="beach", name="Bãi biển")
    other = Place.objects.create(
        name="Khác loại",
        address="Địa chỉ",
        category=other_category,
        status="published",
        created_by=staff,
        updated_by=staff,
    )
    same_photo = publish(owner, same, "same")
    publish(owner, same, "same-second")
    other_photo = publish(owner, other, "other")
    tag = VisualAttribute.objects.create(code="plants", display_name_vi="Cây xanh", active=True)
    for item in (source, other_photo):
        PhotoAttribute.objects.create(
            photo=item, attribute=tag, reviewed_by=staff, reviewed_at=timezone.now()
        )
    url = f"/api/v1/photos/{source.id}/similar/"
    assert client.get(url).status_code == 401
    client.force_authenticate(owner)
    response = client.get(url + "?q=khong-khop&category=beach")
    assert response.status_code == 200
    assert [row["place"]["id"] for row in response.data] == [str(same.id), str(other.id)]
    assert len(response.data) == 2
    assert client.get(url).data == response.data
    detail = client.get(f"/api/v1/photos/{source.id}/?q=khong-khop&category=beach")
    assert detail.status_code == 200
    assert detail.data["photo_ids"] == [str(source.id)]
    assert detail.data["place"]["cover_photo_id"] == str(source.id)
    same.status = "hidden"
    same.save()
    assert [row["place"]["id"] for row in client.get(url).data] == [str(other.id)]
    source.status = "withdrawn"
    source.withdrawn_at = timezone.now()
    source.save()
    assert client.get(url).status_code == 404
    assert same_photo.place_id != source.place_id


def test_similar_places_empty_when_no_match(client, owner, place):
    source = publish(owner, place, "source")
    client.force_authenticate(owner)
    assert client.get(f"/api/v1/photos/{source.id}/similar/").data == []
