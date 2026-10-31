# API Design (Prompt 04)

Keep DRF + OpenAPI (drf-spectacular). Endpoints grouped:
- /api/places/ (list, detail, categories)
- /api/photos/ (feed, detail, submit, like, comment, report)
- /api/favorites/
- /api/accounts/ (profile, creators)
- /api/map/ (region, bbox query)

Auth: session/CSRF. Versioning: none yet (single consumer). Pagination: cursor/limit-offset per existing patterns.
