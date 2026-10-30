# Practical Examples: Problem Formulation & Decomposition

## Example 1: Vague Feature Request vs Rigorous Technical Problem Formulation

### Context
Stakeholder request: *"We need to add Redis caching to the place detail endpoint because the app feels sluggish."*

### Anti-Pattern Application (Shallow / Solution-in-Disguise)
- *Formulation:* "Install Redis and wrap the `get_place_detail` view in a cache decorator with a 10-minute TTL."
- *Consequences:* Does not address why it's slow. Caching masks expensive N+1 queries. Cache invalidation bugs arise when place photos are updated. Cache hit rate is low because users query long-tail places.

---

### Exemplary Application (Applying `problem-formulation`)

#### 1. Core Problem Statement
The place detail endpoint (`GET /api/v1/places/{id}/`) exhibits P95 latency of 1,250ms under moderate load (50 req/s), caused by un-eager-loaded foreign key lookups triggering 42 separate database queries per single place detail request (`PlacePhoto`, `PlaceAmenity`, and `OpeningHourSpecification`).

#### 2. 5W2H Scoping Table
- **Who:** Mobile web consumers visiting place detail pages over mobile networks.
- **What:** Unbounded N+1 query waterfall blocking Django worker thread.
- **Where:** `backend/apps/places/selectors.py` (`get_place_detail_by_slug`) and serializer query relations.
- **When:** On every single place detail request; worsened during local evening hours.
- **Why:** Degrades mobile UX and exhausts PostgreSQL database connection pool.
- **How:** Blocking SQL query executions (`EXPLAIN ANALYZE` indicates 38 redundant index scans).
- **How Much:** P95 latency of 1,250ms (target: $\le 150\text{ms}$).

#### 3. Explicit Boundaries & Non-Goals
- **In-Scope:** Optimizing the ORM query selector using `select_related()` and `prefetch_related()`; reducing query count from 42 to $\le 3$.
- **Non-Goals (Out of Scope):**
  - Introducing external infrastructure dependencies (No Redis or Memcached).
  - Changing the JSON response payload schema (Zero breaking API changes).
  - Redesigning the frontend Place Card presentation.

#### 4. Acceptance Criteria
- **AC-1 (Query Count):** Given a place with 10 photos and 5 amenities, when `get_place_detail` is called, then the total database query count executed is $\le 3$.
- **AC-2 (Latency):** P95 latency measured locally under 50 req/s load must be $< 100\text{ms}$.
- **AC-3 (Schema Fidelity):** Existing unit tests in `test_places_api.py` pass without modifying assertion fixtures.
