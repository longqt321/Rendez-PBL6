# Practical Examples: Performance Investigation & Optimization

## Example: Diagnosing and Fixing N+1 Queries on Place Discovery List API

### Context
`GET /api/v1/places/` returns 20 places per page. Under load, P95 latency is 480ms on a local test database.

---

### Phase 1: Baseline Profiling with Django Query Logging
Running a benchmark with query capture:
```python
from django.db import connection, reset_queries

reset_queries()
response = client.get("/api/v1/places/?limit=20")
query_count = len(connection.queries)
print(f"Total SQL Queries: {query_count}")  # Output: 41 queries!
```
- **Finding:** 1 initial query to fetch 20 places, followed by 20 queries to fetch `PlaceType` and 20 queries to fetch primary `PlacePhoto`. Classic N+1 query waterfall!

---

### Phase 2: Pareto Optimization
In `backend/apps/places/selectors.py`:

```python
# BEFORE (Triggering 41 queries)
def list_places():
    return Place.objects.filter(is_active=True)[:20]

# AFTER (Targeted Pareto Optimization: exactly 2 queries)
def list_places():
    return (
        Place.objects.filter(is_active=True)
        .select_related("place_type")
        .prefetch_related(
            Prefetch(
                "photos",
                queryset=PlacePhoto.objects.filter(is_primary=True),
                to_attr="primary_photos",
            )
        )[:20]
    )
```

---

### Phase 3: Post-Optimization Verification

| Metric | Before Optimization | After Optimization | Delta Improvement |
| :--- | :---: | :---: | :---: |
| **SQL Query Count** | 41 queries | **2 queries** | **-95.1%** |
| **P50 Latency** | 120ms | **14ms** | **-88.3%** |
| **P95 Latency** | 480ms | **32ms** | **-93.3%** |
| **Database CPU Utilization** | 78% | **8%** | **-89.7%** |
| **Functional Tests** | 100% Pass | **100% Pass** | No regressions |
