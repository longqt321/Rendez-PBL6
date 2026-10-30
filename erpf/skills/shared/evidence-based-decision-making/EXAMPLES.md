# Practical Examples: Evidence-Based Decision-Making

## Example: Choosing Between PostgreSQL GiST Index vs External Elasticsearch for Geospatial Place Search

### Problem Context
The application needs to query places within a bounding box / radius and filter by opening hours. The team is deciding whether to introduce an Elasticsearch cluster or leverage native PostgreSQL GiST spatial indexing with PostGIS / geo extensions.

---

### Trade-Off Evaluation Matrix

| Decision Criteria | Weight ($w_i$) | Option A: PostgreSQL GiST / PostGIS | Option B: Dedicated Elasticsearch Cluster |
| :--- | :---: | :--- | :--- |
| **Operational Simplicity** | 0.30 | **Score: 5** — Single DB, no extra daemon, backups unified, zero sync lag. | **Score: 2** — New cluster, sync pipeline (Debezium/CDC), split-brain risks. |
| **Query Latency (P95 $< 50\text{ms}$)** | 0.25 | **Score: 4** — GiST index satisfies queries in $4.2\text{ms}$ on 50,000 places. | **Score: 5** — Inverted index responds in $2.8\text{ms}$. |
| **Data Consistency (ACID)** | 0.20 | **Score: 5** — Strict transactional consistency on place updates. | **Score: 2** — Eventual consistency; places updated in DB may lag in search. |
| **Infrastructure Cost & Licensing**| 0.15 | **Score: 5** — Zero additional memory overhead or cloud hosting fee. | **Score: 1** — Requires at least 4GB RAM JVM cluster; adds hosting cost. |
| **Feature Richness (Fuzzy Text)** | 0.10 | **Score: 3** — `pg_trgm` provides adequate trigram fuzzy search. | **Score: 5** — World-class BM25 full-text and typo-tolerance. |
| **Weighted Total Score** | **1.00** | **4.55 / 5.00** | **2.80 / 5.00** |

---

### Resulting Architecture Decision Record (ADR-014 Excerpt)

- **Title:** Use PostgreSQL GiST Extensions for Geospatial Place Discovery.
- **Status:** Accepted.
- **Context:** The system needs sub-50ms radius queries for coffee places. Introducing Elasticsearch was proposed.
- **Decision:** We choose native PostgreSQL spatial capabilities (GiST index on coordinate pairs) and reject introducing an external search cluster.
- **Consequences:**
  - *Positive:* Zero new infrastructure dependencies, instant transactional consistency, zero operational maintenance overhead for CDC pipelines.
  - *Negative:* Advanced full-text typo tolerance is limited to PostgreSQL `pg_trgm` capabilities (accepted trade-off).
- **Escape Hatch:** If place catalog exceeds 1,000,000 active records and spatial join latency exceeds 80ms, re-evaluate specialized vector/search engines behind the existing `PlaceSelector` interface.
