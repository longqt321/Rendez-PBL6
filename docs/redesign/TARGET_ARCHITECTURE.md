# Target Architecture (Prompt 04)

Modular Monolith retained. Layers: Frontend SPA (React 19 + Vite), Backend Django modular monolith (apps: places, photos, accounts, favorites), PostgreSQL 17 (+ PostGIS when geospatial queries require it), local media storage, MapLibre GL client with local tiles.

## Modules
- places: Category, Place, geocoding.
- photos: VisualAttribute, PhotoAsset, PlacePhoto, PhotoAttribute, PhotoSubmission, PhotoComment, PhotoLike, ContentReport, VenueProposal.
- accounts: User, Profile, CreatorProfile.
- favorites: Favorite.

## API layer
DRF + drf-spectacular OpenAPI. Boundaries per app.

## Auth
Django session + CSRF.

## No new architectural layers introduced.
