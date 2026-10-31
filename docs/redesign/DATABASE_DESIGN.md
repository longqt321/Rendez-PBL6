# Database Design (Prompt 04)

ERD (To-Be, extends As-Is):
- Category 1..* Place; Place 1..* PlacePhoto; PlacePhoto 1..1 PhotoAsset; PlacePhoto *..* VisualAttribute via PhotoAttribute; User 1..* PlacePhoto (creator); User 1..* Favorite -> Place; PhotoLike, PhotoComment on PlacePhoto; ContentReport on content entities; VenueProposal pending decision.

Constraints/Indexes: unique(place, user) on Favorite; indexes on PlacePhoto(place, status, created_at), PhotoAttribute(photo, attribute).

PostgreSQL 17. PostGIS only if spatial queries exceed bbox filtering; current bbox filtering works with plain lat/lon columns. Decision recorded in DECISION_LOG.

Deletion behavior: PROTECT on asset FK; soft delete Place via deleted_at; photos withdrawn not deleted.
