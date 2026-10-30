# Practical Examples: Software Architecture Review

## Example: Reviewing a Shallow Photo Upload Service vs Deep Module Refactoring

### Proposed Shallow Architecture (Anti-Pattern)
```python
# Shallow module: Exposes 5 separate classes with 1 method each
class PhotoFileValidator:
    def validate(self, file): pass

class PhotoDimensionsExtractor:
    def get_dims(self, file): pass

class PhotoStorageWriter:
    def save(self, file, path): pass

class PlacePhotoRelationCreator:
    def link(self, place_id, photo_id): pass

class PhotoAuditLogger:
    def log(self, photo_id, user_id): pass
```
- *Critique:* Callers must coordinate 5 distinct objects in a rigid sequence. Any caller can forget to link the relation or forget to write the audit log, corrupting invariants. The interface is wide, while the implementation inside each class is thin.

---

### Deep Module Refactoring (Exemplary)
```python
# Deep module: Small interface, encapsulates all validation, storage, and transaction invariants
class PhotoService:
    @classmethod
    @transaction.atomic
    def ingest_place_photo(
        cls,
        *,
        place: Place,
        uploader: User,
        file: UploadedFile,
        is_primary: bool = False
    ) -> PlacePhoto:
        """
        Validates image magic bytes, extracts dimensions, generates secure storage hash,
        persists binary to storage, links to Place maintaining ordering invariants,
        and creates an immutable audit record inside an atomic transaction.
        """
        ...
```
- *Benefits:*
  - **Leverage:** Callers learn 1 function with 4 parameters.
  - **Locality:** State invariants (atomic commit, audit logging) are enforced in exactly one place.
  - **Blast Radius:** Call sites are decoupled from storage engine details.
