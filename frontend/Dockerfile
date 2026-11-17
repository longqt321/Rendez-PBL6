# syntax=docker/dockerfile:1.7.0
# FE RendeZ — Production Multi-stage Build bằng Bun & serve qua Nginx Alpine.
#
# builder : cài deps workspace bằng BuildKit cache mount, pre-build asset, tsc + vite build.
# runtime : nginx alpine tối giản phục vụ SPA + proxy nội bộ /api.

FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY packages packages
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Cache bun global package cache
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts --filter frontend

COPY frontend frontend

ARG VITE_APP_ORIGIN=""
ARG VITE_ENABLE_MOCKS="false"
ARG VITE_DEV_BYPASS_AUTH="false"
ARG VITE_MOCK_SCENARIO="ok"
WORKDIR /app/frontend
RUN VITE_APP_ORIGIN="$VITE_APP_ORIGIN" bun scripts/copy-cold-start-images.mjs \
  && VITE_APP_ORIGIN="$VITE_APP_ORIGIN" bunx tsc@~6.0.3 -b \
  && VITE_APP_ORIGIN="$VITE_APP_ORIGIN" \
     VITE_ENABLE_MOCKS="$VITE_ENABLE_MOCKS" \
     VITE_DEV_BYPASS_AUTH="$VITE_DEV_BYPASS_AUTH" \
     VITE_MOCK_SCENARIO="$VITE_MOCK_SCENARIO" \
     bunx vite@^8.3.6 build

# ---------------------------------------------------------------------------
# Runtime: Nginx Alpine
# ---------------------------------------------------------------------------

FROM nginx:1.27.5-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
