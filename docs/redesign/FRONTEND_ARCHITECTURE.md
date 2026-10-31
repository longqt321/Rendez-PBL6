# Frontend Architecture (Prompt 04)

- Routes: react-router 7 (data router), path-based as IA doc.
- Server state: TanStack Query 5.
- URL state: search params for bbox/category/filters.
- Forms: react-hook-form + zod resolvers.
- API layer: typed client generated from openapi.yaml (openapi-typescript).
- Shared components: Radix slot-based primitives, existing /components/ui.
- Map: react-map-gl + maplibre-gl.
- Images: aspect-ratio preserved masonry; lazy loading.
- Error handling: route-level error boundaries + query error states.
