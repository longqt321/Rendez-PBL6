# Rendez

Web app khám phá quán ăn / địa điểm ở Đà Nẵng: tìm kiếm và lọc theo loại hình, quận,
mức giá, xem trên bản đồ, lưu địa điểm vào bộ sưu tập, đọc/đăng bài cộng đồng, và
**lọc nhóm** — nhiều người cùng đề xuất include/exclude để ra một kết quả chung.

Tính năng nổi bật:

- **Gợi ý hôm nay**: 3 quán hệ thống chọn mỗi ngày (job nền chạy 00:05 giờ VN).
- **Tìm người & gợi ý theo dõi**: tab Người ở `/search` + khối gợi ý ở `/discover`.
- **Chia sẻ bài/quán** kèm preview Open Graph cho Facebook/Zalo/Messenger.
- **Lọc mức giá + sắp xếp** (Mới nhất / Đánh giá cao / Gần tôi) chạy server-side;
  ảnh responsive WebP.
- **Bắt buộc xác thực email** trước khi đăng nhập; đăng nhập bằng email.
- Rate limit hành động xã hội; đồng bộ đăng xuất đa tab.

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `frontend/` | SPA React 19 + Vite 8 + TypeScript strict. Mặc định nối backend thật qua proxy (`/api/v1`), hoặc chạy độc lập bằng mock in-memory qua `bun run dev:mock` (`VITE_ENABLE_MOCKS=true`). 40 file / 193 unit test (Vitest). |
| `backend/` | API Hono 4 + Prisma 7 + PostgreSQL 17 (pgvector) + better-auth + pg-boss. 40 file test (`test-all.sh` + Testcontainers); 20 migration; 29 model Prisma; seed 358 địa điểm (`backend/data/places-expanded.json`). |
| `packages/schema/` | zod schema dùng chung frontend ↔ backend (8 file, chuyển từ frontend). |
| `docs/` | Tài liệu chung: quyết định kiến trúc, hợp đồng API, bài học, kế hoạch backend, báo cáo đồ án, tài liệu thiết kế tính năng (`docs/thiet-ke/`). |

## Chạy dự án

```bash
bun install                 # cài cho cả workspace
bun run dev                 # frontend nối backend thật (:8000) → http://localhost:5173
cd frontend && bun run dev:mock  # frontend chạy độc lập bằng mock in-memory
bun run db:up               # Postgres 17 cho backend
bun run dev:api             # backend :8000 (cần backend/.env)
```

| Lệnh | Việc |
| --- | --- |
| `bun run dev` | Dev server frontend |
| `bun run build` | Typecheck + build production frontend |
| `bun run typecheck` / `lint` / `test` | Kiểm tra frontend + backend |
| `bun run test:api` | Test backend (Testcontainers Postgres, chạy tuần tự) |
| `bun run e2e` | Playwright (16 spec mock, 42 test) |
| `E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend` | Playwright với backend thật |
| `bun run db:up` / `db:down` | Postgres dev |
| `docker compose up -d` | Dựng Postgres + migration + API trong container |
| `docker compose build web` | Build frontend tĩnh vào image nginx. Đặt `APP_ORIGIN` (origin public https của FE) để build arg `VITE_APP_ORIGIN` sinh đúng canonical/OG + `robots.txt`/`sitemap.xml` lúc build. Biến runtime cần cho API: xem `deploy/.env.example`. |

## Tài liệu

- Hợp đồng API (nguồn sự thật hiện tại): `docs/DECISIONS.md` (D-011).
- Kế hoạch triển khai backend: `docs/backend/ke-hoach-backend-chi-tiet.md`.
- API đã triển khai: `docs/backend/API.md`. Vận hành: `docs/backend/RUNBOOK.md`.
- Thiết kế tính năng mới: `docs/thiet-ke/` — `goi-y-hom-nay.md`, `tim-nguoi.md`,
  `chia-se-og-dong.md`, `loc-gia-sap-xep-anh.md`, `xac-thuc-email.md`,
  `cache-va-phien.md` (cache/phiên/rate limit).
- Hướng dẫn chạy & nghiệm thu: `docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md`.
- Báo cáo kỹ thuật backend: `docs/backend/REPORT.md`. Báo cáo đồ án: `docs/bao-cao/BAO-CAO-DO-AN.md`.
- Quy ước code: `docs/CONVENTIONS.md`. Bài học: `docs/LESSONS.md`. Tồn đọng: `docs/BACKLOG.md`.
