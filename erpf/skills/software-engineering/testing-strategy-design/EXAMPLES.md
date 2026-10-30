# Practical Examples: Testing Strategy Design

## Example: Testing Strategy for the Photo Upload Subsystem

### Context
Users upload photos of coffee shops. The system extracts EXIF metadata, creates webp thumbnails, calculates SHA-256 content hashes, and links to a `Place`.

---

### Layered Testing Strategy Allocation

#### 1. Unit Tests (Sub-millisecond execution, zero DB, zero network)
- **Target:** `ImageValidator` & `HashCalculator`.
- **Cases:**
  - Valid JPEG magic bytes (`\xff\xd8\xff`) return `True`.
  - Disguised executable `.exe` renamed to `.jpg` rejected with `InvalidImageFormatError`.
  - Corrupt 0-byte file rejected.
  - SHA-256 hash calculation matches known standard fixture.

#### 2. Integration Tests (Database transactional rollback, real PostgreSQL)
- **Target:** `PhotoService.ingest_place_photo()` and `PlacePhotoViewSet`.
- **Cases:**
  - Successfully uploads a photo, creates `PlacePhoto` row, assigns correct `ordering_index`.
  - Primary photo invariant: Uploading with `is_primary=True` demotes previous primary photo within atomic transaction.
  - Foreign key constraint: Uploading for non-existent `place_id` returns HTTP 404, zero records created.
  - Duplicate upload check: Uploading identical SHA-256 hash returns existing photo ID without re-processing.

#### 3. E2E Acceptance Test (Playwright Headless, top critical flow only)
- **Target:** Single user flow: Login $\rightarrow$ Navigate to Place $\rightarrow$ Click Upload $\rightarrow$ Photo visible in Masonry Grid.
- **Guardrail:** Mock Cloudflare CDN upload endpoint; run in $< 4\text{ seconds}$.
