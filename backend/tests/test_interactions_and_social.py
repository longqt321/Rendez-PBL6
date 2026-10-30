import pytest
from apps.favorites.models import Favorite
from apps.photos.models import PhotoComment, PhotoLike
from .conftest import photo


def _create_public_photo(owner, place):
    from apps.photos.services import submit

    submission = submit(
        owner,
        {
            "place_id": place,
            "caption": "Ảnh cho kiểm thử tương tác",
            "consent_version": "photo-rights-v2",
        },
        [photo()],
        "interaction-test-key",
    )
    return submission.assets.get().public_photo


@pytest.mark.django_db
def test_photo_likes_lifecycle_and_idempotency(client, owner, other, place):
    public_photo = _create_public_photo(owner, place)
    url = f"/api/v1/photos/{public_photo.id}/likes/"

    # 1. Anonymous access rejected (401)
    assert client.get(url).status_code == 401
    assert client.post(url).status_code == 401
    assert client.delete(url).status_code == 401

    # 2. Authenticated user retrieves initial state (0 likes)
    client.force_authenticate(other)
    res_initial = client.get(url)
    assert res_initial.status_code == 200
    assert res_initial.data == {"liked": False, "count": 0}

    # 3. Add like (POST) succeeds
    res_like = client.post(url)
    assert res_like.status_code == 200
    assert res_like.data == {"liked": True, "count": 1}
    assert PhotoLike.objects.filter(photo=public_photo, user=other).count() == 1

    # 4. Repeated like (POST) does NOT duplicate record or increment count falsely
    res_like_repeat = client.post(url)
    assert res_like_repeat.status_code == 200
    assert res_like_repeat.data == {"liked": True, "count": 1}
    assert PhotoLike.objects.filter(photo=public_photo, user=other).count() == 1

    # 5. Remove like (DELETE) succeeds
    res_unlike = client.delete(url)
    assert res_unlike.status_code == 200
    assert res_unlike.data == {"liked": False, "count": 0}
    assert PhotoLike.objects.filter(photo=public_photo, user=other).count() == 0

    # 6. Repeated remove (DELETE) is idempotent
    res_unlike_repeat = client.delete(url)
    assert res_unlike_repeat.status_code == 200
    assert res_unlike_repeat.data == {"liked": False, "count": 0}
    assert PhotoLike.objects.filter(photo=public_photo, user=other).count() == 0


@pytest.mark.django_db
def test_favorites_lifecycle_and_idempotency(client, owner, other, place):
    url = f"/api/v1/favorites/{place.id}/"

    # 1. Anonymous access rejected (401)
    assert client.put(url).status_code == 401
    assert client.delete(url).status_code == 401

    # 2. Save place (PUT) succeeds
    client.force_authenticate(other)
    assert client.put(url).status_code == 204
    assert Favorite.objects.filter(place=place, user=other).count() == 1

    # 3. Repeated save (PUT) does NOT create duplicate records
    assert client.put(url).status_code == 204
    assert Favorite.objects.filter(place=place, user=other).count() == 1

    # 4. Unsave place (DELETE) succeeds
    assert client.delete(url).status_code == 204
    assert Favorite.objects.filter(place=place, user=other).count() == 0

    # 5. Repeated unsave (DELETE) safely returns 204
    assert client.delete(url).status_code == 204
    assert Favorite.objects.filter(place=place, user=other).count() == 0

    # 6. Saving a non-existent or hidden place returns 404
    place.status = "hidden"
    place.save()
    assert client.put(url).status_code == 404


@pytest.mark.django_db
def test_photo_comments_create_edit_delete_lifecycle(client, owner, other, staff, place):
    public_photo = _create_public_photo(owner, place)
    comments_url = f"/api/v1/photos/{public_photo.id}/comments/"

    # 1. Anonymous access rejected
    assert client.get(comments_url).status_code == 401
    assert client.post(comments_url, {"body": "Test"}).status_code == 401

    # 2. Validation: Empty or whitespace-only comment rejected (400)
    client.force_authenticate(other)
    res_empty = client.post(comments_url, {"body": "   "})
    assert res_empty.status_code == 400

    # 3. Validation: Comment exceeding 1000 characters rejected (400)
    res_long = client.post(comments_url, {"body": "a" * 1001})
    assert res_long.status_code == 400

    # 4. Valid comment creation (POST 201)
    res_create = client.post(comments_url, {"body": "Quán có không gian rất chill!"})
    assert res_create.status_code == 201
    comment_id = res_create.data["id"]
    assert res_create.data["body"] == "Quán có không gian rất chill!"
    assert res_create.data["author_name"] == other.display_name
    assert res_create.data["is_owner"] is True

    comment_detail_url = f"/api/v1/comments/{comment_id}/"

    # 5. Non-owner (owner account) cannot edit other's comment (403 PermissionDenied)
    client.force_authenticate(owner)
    res_forbidden_edit = client.patch(comment_detail_url, {"body": "Sửa trái phép bởi người khác"})
    assert res_forbidden_edit.status_code == 403

    # 6. Non-owner cannot delete other's comment (403 PermissionDenied)
    res_forbidden_delete = client.delete(comment_detail_url)
    assert res_forbidden_delete.status_code == 403

    # 7. Author can edit their comment (PATCH 200)
    client.force_authenticate(other)
    res_edit = client.patch(
        comment_detail_url, {"body": "Quán có không gian rất chill và nước ngon!"}
    )
    assert res_edit.status_code == 200
    assert res_edit.data["body"] == "Quán có không gian rất chill và nước ngon!"
    assert (
        PhotoComment.objects.get(pk=comment_id).body == "Quán có không gian rất chill và nước ngon!"
    )

    # 8. Staff / Moderator can also edit/moderate comment
    client.force_authenticate(staff)
    res_staff_edit = client.patch(
        comment_detail_url, {"body": "[Đã kiểm duyệt]: Bình luận phù hợp."}
    )
    assert res_staff_edit.status_code == 200
    assert PhotoComment.objects.get(pk=comment_id).body == "[Đã kiểm duyệt]: Bình luận phù hợp."

    # 9. Author deletes comment (DELETE 204)
    client.force_authenticate(other)
    assert client.delete(comment_detail_url).status_code == 204
    assert not PhotoComment.objects.filter(pk=comment_id).exists()

    # 10. Repeated DELETE is idempotent (returns 204)
    assert client.delete(comment_detail_url).status_code == 204


@pytest.mark.django_db
def test_comment_edit_on_withdrawn_photo_rejected(client, owner, other, place):
    public_photo = _create_public_photo(owner, place)
    comments_url = f"/api/v1/photos/{public_photo.id}/comments/"

    client.force_authenticate(other)
    res_create = client.post(comments_url, {"body": "Bình luận trước khi gỡ ảnh"})
    assert res_create.status_code == 201
    comment_id = res_create.data["id"]

    # Withdraw the photo
    public_photo.status = "withdrawn"
    public_photo.save()

    # Attempting to post new comments returns 404
    assert client.post(comments_url, {"body": "Bình luận mới"}).status_code == 404

    # Attempting to edit existing comment on withdrawn photo is rejected
    res_edit = client.patch(f"/api/v1/comments/{comment_id}/", {"body": "Sửa nội dung"})
    assert res_edit.status_code == 400
    assert "Ảnh này đã bị gỡ" in str(res_edit.data)
