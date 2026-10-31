# Decision Register

## Accepted
- Modular monolith (scale MVP) — research: no microservices need.
- PostgreSQL 17 + unaccent/pg_trgm/btree_gist — verified by migration + tests.
- No PostGIS now — bbox filtering đủ; add when spatial queries require.
- No AI in current scope — explicit constraint.
- Local media + Django FileResponse — MVP; defer S3/MinIO.
- Keep custom masonry (YAGNI) — browser CSS masonry not standard.
- Keep Warm Botanical palette — acceptable; no evidence to change.

## Proposed
- Generalize UI copy (ROAD-007).
- Parameterize map bounds (ROAD-008).
- Bundle split (ROAD-002).
- Content acquisition plan (ROAD-004).

## Rejected
- Full rearchitecture (Option C) — no evidence current arch insufficient.
- Adding Elasticsearch/OpenSearch — Postgres trgm sufficient.
- Adding PostGIS now — no spatial query need.
- Adding Tailwind utility classes everywhere — components already styled; refactor not justified.
- Implementing AI now — out of scope by constraint.

## Decision Pending
- Place Identity Continuity (venue change of ownership/space) — preserved from old docs.
- VenueProposal workflow — preserved.
- Archived Photo display — preserved.
- First target user segment — needs user research.
- Contribution incentive model — needs user research.
- City expansion order — needs data.
