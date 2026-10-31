# Requirement Traceability

| Requirement | Expected behavior | Implementation evidence | Test evidence | Status |
|---|---|---|---|---|
| REQ-01 Visual feed | Masonry feed of real photos, aspect preserved | masonry.tsx ResizeObserver, discovery.tsx Feed | visual.spec.ts (E2E), image_perf.test.tsx | PASS |
| REQ-02 Search & filters | Keyword + category + attributes | places/selectors.py visual_places (unaccent + trgm) | test_postgresql_multimodel.py accent test; API tests | PASS |
| REQ-03 Map exploration | MapLibre with markers, bbox | map.tsx, VisualMap view | map.test.tsx, test_map_resources.py | PASS |
| REQ-04 Place detail | Name, category, photos, address, coords | VisualPlaceDetail view, PlaceDetailPage | API tests; E2E visual | PASS |
| REQ-05 Save places | Favorite per user | Favorite model + FavoriteDetail | test_favorite_and_report_scope | PASS |
| REQ-06 Contribute photos | Upload with consent + idempotency | submit in services.py, SubmissionList | test_auto_publication.py, test_upload_safety.py | PASS |
| REQ-07 Interactions | Like / comment / report | PhotoLikes, PhotoComments, Report | test_interactions_and_social.py | PASS |
| REQ-08 Share | Share button with clipboard / navigator.share | social.tsx ShareButton | Not directly tested | PARTIAL |
| NFR Accessibility | Basic a11y | skip-link, aria labels, focus mgmt | accessibility.test.tsx (6 tests) | PASS |
| NFR Responsive | Mobile/tablet/desktop | CSS breakpoints in styles/ | Not visually verified across breakpoints | NOT VERIFIED |
| NFR Performance | No N+1, lazy images | select_related / prefetch_related; lazy loading | test_feed_query_count_does_not_grow_per_photo | PASS |
| AI restriction | No AI components | grep shows no AI deps or code | grep verification | PASS |
| Data migration safety | Additive migrations, no data loss | 16 migrations, makemigrations --check clean | test_backup_restore_lifecycle | PASS |
| Security | Auth, CSRF, IDOR, media protection | settings.py, views.py, media view | test_file_serving_security, test_authorization | PASS |
| Documentation | Docs match reality | docs/redesign/*, GLOSSARY updated | N/A | PASS |
