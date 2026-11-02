# Decisions

**Date:** 2026-11-03

## D-001 — Dedicated feature branch

Created feat/ai-smart-search from main.

**Reason:** Isolate the requested work from the existing product baseline.

## D-002 — No runtime changes without an executable baseline

No application code, migration, package, frontend behavior or existing data was changed.

**Reason:** The checkout is not mounted in this execution container, DNS resolution prevents a local clone, and the required test gate could not be run. Changing runtime code without the baseline would violate the no-regression requirement.

## D-003 — Exclude generated placeholder images

The committed data/README.md describes 36 images as automatically generated illustrations/placeholders rather than field photographs. They are not licensed POI photographs and are not visual ground truth.

**Reason:** Synthetic placeholders are not evidence of a place's appearance and have no per-image external attribution records.

## D-004 — Exclude direct gated Foursquare download

The Hugging Face dataset card reports Apache 2.0 but the files are gated behind access conditions. No agreement was accepted.

**Reason:** The access page requires sharing account data and marketing-related permissions; no authority to accept that agreement on behalf of the project owner was provided.

## D-005 — Preserve per-source license and field provenance

Overture Places has per-source license conditions. OSM-derived data uses ODbL. Preserve source IDs, per-source licenses, field-level provenance and original snapshots. Do not redistribute a conflated database until its ODbL classification is reviewed.

**Reason:** Conflation must not erase materially different license conditions.

## D-006 — Keep business type separate from vibe

Canonical business types (cafe, restaurant, park, lodging, etc.) are separate from existing seed categories (study, night, vintage, garden, checkin, classic).

**Reason:** They describe different dimensions and should not share one mutually exclusive category field.

## D-007 — Unknown remains unknown

Unparsed or absent opening-hours data stays unknown. Missing image labels remain neutral with an explicit missing-feature flag.

**Reason:** Do not infer opening hours or visual properties from marketing copy, nearby entities or generated images.

## D-008 — No PostGIS migration without a verified need

The inspected code uses scalar latitude/longitude, bounding-box filtering, unaccent, pg_trgm and btree_gist. Current project assessments defer PostGIS. No live database inspection was possible.

**Reason:** A new geospatial dependency is not needed to specify the initial ranking pipeline.

## D-009 — Documentation-only implementation in this environment

Only AI research/status documents, empty manifests and variable names in .env.example are being added. No runtime behavior is claimed.

**Reason:** Documentation is the only safely verifiable change while code execution and source downloads are blocked.

## D-010 — Boundary definition remains a project decision

No Da Nang polygon was downloaded or selected. The owner must decide whether this dataset uses the current municipality boundary or a historical urban/administrative definition, then version that exact polygon and snapshot.

**Reason:** Do not silently mix changing administrative boundaries or guess from an approximate bounding box.
