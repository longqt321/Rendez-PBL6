# FE RendeZ — build bằng Bun, serve bằng nginx (T-web).
#
# builder : cài deps workspace, chép ảnh cold-start, build production (tsc + vite).
# runtime : nginx phục vụ static + reverse proxy "/api" → service `api` (compose).
#
# Lưu ý: script prebuild dùng `node`, nhưng image oven/bun không có node —
# chạy trực tiếp bằng `bun` (script chỉ dùng node:fs/path, tương thích Bun).

FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

# Manifest trước để tận dụng cache layer khi chỉ đổi source.
COPY package.json bun.lock ./
COPY packages packages
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Cài đủ workspace (root khai báo cả backend — phải có manifest của nó,
# nhưng chỉ cài dependency của frontend + schema để layer cache tốt).
RUN bun install --frozen-lockfile --filter frontend

COPY frontend frontend

# Build production: VITE_API_BASE_URL mặc định "/api/v1" (đường dẫn tương đối —
# nginx proxy cùng origin nên không vướng CORS). Mock tự tắt khi build prod.
# VITE_APP_ORIGIN: origin công khai cho canonical/og + robots/sitemap (mặc định localhost).
#
# Ba biến mock PHẢI truyền tường minh: `bun` tự nạp `frontend/.env` vào
# process.env (dotenv built-in), mà `.env` cục bộ để các biến này rỗng ("") —
# Vite ưu tiên process env hơn `.env.production`, nên chuỗi rỗng bị nướng vào
# bundle và zod enum trong `src/lib/env.ts` từ chối lúc runtime (app trắng trang).
# Giá trị mặc định dưới đây là cấu hình production đúng: mock tắt.
ARG VITE_APP_ORIGIN=""
ARG VITE_ENABLE_MOCKS="false"
ARG VITE_DEV_BYPASS_AUTH="false"
ARG VITE_MOCK_SCENARIO="ok"
RUN cd frontend \
  && VITE_APP_ORIGIN="$VITE_APP_ORIGIN" bun scripts/copy-cold-start-images.mjs \
  && VITE_APP_ORIGIN="$VITE_APP_ORIGIN" bunx tsc -b \
  && VITE_APP_ORIGIN="$VITE_APP_ORIGIN" \
     VITE_ENABLE_MOCKS="$VITE_ENABLE_MOCKS" \
     VITE_DEV_BYPASS_AUTH="$VITE_DEV_BYPASS_AUTH" \
     VITE_MOCK_SCENARIO="$VITE_MOCK_SCENARIO" \
     bunx vite build

# ---------------------------------------------------------------------------
# Runtime: nginx + static bundle.
# ---------------------------------------------------------------------------

FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
