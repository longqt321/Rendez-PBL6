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
RUN cd frontend \
  && bun scripts/copy-cold-start-images.mjs \
  && bunx tsc -b \
  && bunx vite build

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
