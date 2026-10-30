# Practical Examples: Codebase Exploration and Understanding

## Example: Tracing the Place Discovery Flow in Rendez-Web

### Step 1: Entry Point Identification
- Router inspection: `backend/config/urls.py` maps `/api/v1/places/` to `apps.places.views.PlaceViewSet` (or API views).
- Request entry: `backend/apps/places/views.py` receives query parameters (`category`, `lat`, `lng`, `radius`).

### Step 2: Boundary & Validation Check
- Input validation: `backend/apps/places/views.py` deserializes query parameters using `PlaceQuerySerializer`.
- Boundary rule: Rejects malformed bounding box coordinates with HTTP 400 before hitting the database.

### Step 3: Domain Selector Execution
- Traversal into `backend/apps/places/selectors.py`:
  - Function `list_places_with_filters()` applies `select_related('place_type')` and `prefetch_related('photos')`.
  - Discovers that spatial distance calculation is already implemented using PostgreSQL PostGIS extensions (`ST_DWithin` / GiST index).
- **Insight:** No need to write a custom Haversine Python distance calculation; the database layer already handles it with high efficiency.

### Step 4: Model Invariants Verification
- Inspection of `backend/apps/places/models.py`:
  - `Place` model requires unique `slug`.
  - Status transitions (`is_verified`, `is_active`) govern public visibility.
  - Photos are connected via `PlacePhoto` junction model with explicit ordering constraints.
