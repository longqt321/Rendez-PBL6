# Prioritized Roadmap

## P0 — Phải giải quyết trước
- ROAD-001: Investigate & fix E2E failure visual.spec.ts:338. Effort 0.5h. Acceptance: bun run e2e 23/23 pass.
- ROAD-002: Frontend bundle split (manualChunks). Effort 1h. Acceptance: main chunk < 300KB.
- ROAD-003: Fix backend test test_postgresql_multimodel.py::test_database_config_explicit_postgres_failure (env mock issue). Effort 0.5h.

## P1 — Nền tảng cốt lõi
- ROAD-004: Content acquisition plan — seed 50–100 places thật với ảnh. Effort: ongoing. Acceptance: ≥ 50 places published, ≥ 3 ảnh/place.
- ROAD-005: User interview / usability test với 5 người dùng thật. Effort 4h. Acceptance: báo cáo findings.
- ROAD-006: Mobile viewport visual verification (Playwright mobile emulation + manual device). Effort 2h.

## P2 — Cải thiện sản phẩm
- ROAD-007: Generalize UI copy (bỏ hardcode Đà Nẵng/cà phê). Effort 2h. Acceptance: grep không còn hardcode trong components.
- ROAD-008: Parameterize map maxBounds + center theo cấu hình. Effort 1h.
- ROAD-009: ShareButton test coverage. Effort 1h.
- ROAD-010: Generalize geocoding city-center fallback theo config. Effort 1h.
- ROAD-011: Color contrast audit tự động. Effort 1h.

## P3 — Mở rộng tương lai
- ROAD-012: Self-host vector tiles (Martin + PMTiles + OSM) thay Esri raster. Effort 8h. Acceptance: map render từ tile server local.
- ROAD-013: Media storage lên MinIO/S3-compatible. Effort 8h.
- ROAD-014: CI pipeline (GitHub Actions) — lint + test + build. Effort 4h.
- ROAD-015: Error monitoring (self-hosted Sentry/GlitchTip). Effort 4h.
- ROAD-016: Search benchmark với ground truth thủ công. Effort 4h.
- ROAD-017: AI pilot (theo FUTURE_AI_STRATEGY) khi điều kiện đạt. Effort: TBD.

## Không nên làm bây giờ
- Không rearchitecture. Không thêm microservices. Không thêm PostGIS. Không thêm dependency mới. Không triển khai AI. Không thêm tính năng discovery mới trước khi validate với người dùng.
