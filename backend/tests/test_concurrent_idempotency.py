import concurrent.futures
import pytest
from django.db import connection
from apps.photos.models import PhotoSubmission
from apps.photos.services import submit
from .conftest import photo

pytestmark = pytest.mark.postgres


@pytest.mark.django_db(transaction=True)
def test_concurrent_submissions_with_same_idempotency_key(owner, place):
    """
    Simulates race condition: two threads attempting submit() concurrently
    with the exact same user and idempotency_key.
    """
    key = "concurrent-race-key-123"
    payload = {
        "place_id": place,
        "caption": "Ảnh gửi đồng thời",
        "consent_version": "photo-rights-v2",
    }

    def perform_submit():
        # Open separate database connection for thread
        connection.close()
        try:
            sub = submit(owner, payload, [photo()], key)
            return ("success", sub.id)
        except Exception as exc:
            return ("error", type(exc).__name__, str(exc))

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(perform_submit)
        f2 = executor.submit(perform_submit)
        r1 = f1.result()
        r2 = f2.result()

    # Both requests must either return the same submission ID (idempotent replay)
    # or one succeeds and the other receives Conflict/Integrity error, but NEVER duplicate records.
    matching = PhotoSubmission.objects.filter(submitted_by=owner, idempotency_key=key)
    assert matching.count() == 1, f"Expected exactly 1 submission row, found {matching.count()}"

    # Verify at least one thread succeeded
    successes = [r for r in [r1, r2] if r[0] == "success"]
    assert len(successes) >= 1
    if len(successes) == 2:
        # Both got the same submission
        assert r1[1] == r2[1]
