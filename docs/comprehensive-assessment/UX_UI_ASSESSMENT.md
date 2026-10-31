# UX/UI Assessment

Date: 2026-10-31. Basis: source + prior audit + Playwright E2E evidence (22/23 pass).

## Current experience assessment
- Feed: Masonry với ResizeObserver, aspect-ratio preserved. Visual-first đúng nguyên tắc.
- Search: input + category chips + attribute filter. URL state sync.
- Map: lazy-loaded, marker click → place preview, bbox sync.
- Place detail: header, gallery, attribute evidence, share, directions (Google Maps handoff).
- Photo detail: viewer, author, similar places.
- Saved: riêng route.
- Contribution: multi-step form với consent + idempotency.

## Information architecture
Routes hợp lý. RequireLogin guard toàn bộ protected routes. Login/register ngoài shell.

## Navigation assessment
Topbar + account menu, keyboard accessible (Escape, focus management). Mobile: responsive CSS breakpoints, chưa visually verified trên mobile viewport thực tế.

## Screen-by-screen evaluation
| Screen | Status | Ghi chú |
|---|---|---|
| Discover feed | PASS | Masonry ổn định |
| Search results | PASS | Filter hoạt động |
| Place detail | PASS | Gallery + evidence |
| Photo detail | PASS | Similar places |
| Map | PASS | Lazy loaded |
| Saved | PASS | Empty state có |
| Contribution | PASS | Consent + idempotency |
| Login/Register | PASS | Demo login chỉ DEBUG |
| Creator profile | PASS | Author attribution |

## Design system assessment
Tokens nhất quán (Warm Botanical Pine & Clay). CSS thuần, không dùng Tailwind utilities trong components (Tailwind 4 installed nhưng ít sử dụng thực tế — inconsistency nhẹ).

## Accessibility
Skip link, ARIA labels, focus mgmt, semantic HTML. 6 accessibility tests pass. Color contrast chưa đo tự động.

## UX recommendations
1. Generalize copy (bỏ hardcode Đà Nẵng/cà phê) — P2.
2. Empty state cho feed khi không có ảnh — đã có.
3. Mobile viewport visual verification — NOT VERIFIED (cần chạy thật trên device).
4. Không đề xuất redesign giao diện mới — hiện tại phục vụ visual discovery tốt.
