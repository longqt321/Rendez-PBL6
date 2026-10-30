# Practical Examples: Debugging and Root Cause Analysis

## Example: Fixing an Intermittent IntegrityError in Place Photo Deletion

### The Symptom
Intermittent crash in production logs:
`django.db.utils.IntegrityError: update or delete on table "photos_placephoto" violates foreign key constraint on "photos_primaryphoto"`

---

### Flawed Debugging (Symptom-Masking)
```python
# The engineer blindly wraps deletion in a try-catch block:
try:
    place_photo.delete()
except IntegrityError:
    # "Ignore the error to stop 500 crashes"
    pass
```
- *Result:* Orphaned photos remain in database; primary photo pointer points to non-existent image; UI displays broken image icons.

---

### Scientific Debugging Applying `debugging-root-cause`

#### 1. Minimal Reproducible Example (MRE)
```python
def test_delete_primary_photo_fails():
    place = Place.objects.create(name="Cafe A", slug="cafe-a")
    photo = PlacePhoto.objects.create(place=place, file_path="a.jpg", is_primary=True)
    place.primary_photo = photo
    place.save()

    # Trigger MRE
    photo.delete()  # Explodes with IntegrityError!
```

#### 2. Root Cause Analysis (5 Whys)
1. *Why did it explode?* The database foreign key `Place.primary_photo_id` still references the deleted `PlacePhoto`.
2. *Why does it reference a deleted photo?* The `PlacePhoto.delete()` method does not reset `place.primary_photo`.
3. *Why wasn't on_delete=SET_NULL triggered?* The foreign key in `Place` had `on_delete=models.PROTECT` to prevent accidental deletion, but the service logic had no clean handoff procedure.
4. *Root Cause:* Absence of an atomic domain transition method `retire_or_replace_primary_photo()` that safely re-assigns or nullifies the primary pointer inside `transaction.atomic()` before photo record deletion.

#### 3. Test-First Resolution
1. **Red Test:** Add `test_retire_primary_photo_reassigns_secondary_or_nulls()` in `test_photos.py`. Test fails as expected.
2. **Surgical Fix:** Update `PhotoService.delete_photo()` to execute within `transaction.atomic()`, reassigning primary status to the next available photo or setting null before calling `photo.delete()`.
3. **Green Test:** Re-run test. It passes. Re-run entire test suite. All pass.
