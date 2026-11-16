# syntax=docker/dockerfile:1.7
# API RendeZ — Production Multi-stage Build bằng Bun & BuildKit.
#
# builder  : cài deps với BuildKit cache mount, sinh Prisma client, bundle server.
# migrator : = builder (có Prisma CLI đúng version) để chạy `prisma migrate deploy`.
# runtime  : base distroless / minimal bun runtime + bundle + Prisma engine.

FROM oven/bun:1.3.14 AS builder
WORKDIR /app

# Khai báo manifest trước để tận dụng layer caching khi code thay đổi
COPY package.json bun.lock ./
COPY packages/schema/package.json packages/schema/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Tận dụng BuildKit Cache Mount cho bun package store: không tải lại package qua mạng
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --filter @rendez/api

COPY packages packages
COPY backend backend

# Cache Prisma query engine binary giữa các lần build
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN --mount=type=cache,target=/root/.cache/prisma \
    cd backend && bunx prisma generate

RUN cd backend && bun build src/server.ts --target bun --outdir dist \
  --external pg-boss --external sharp --external onnxruntime-node

# ---------------------------------------------------------------------------
# Migrator: Chạy migration schema và seed data
# ---------------------------------------------------------------------------

FROM builder AS migrator
WORKDIR /app/backend
USER bun
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run scripts/seed.ts"]

# ---------------------------------------------------------------------------
# Runtime: Giữ nguyên cấu trúc symlink workspace của Bun
# ---------------------------------------------------------------------------

FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/backend/node_modules backend/node_modules
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/generated backend/generated
COPY --from=builder /app/backend/package.json backend/package.json
COPY --from=builder /app/packages packages
COPY backend/scripts/start-cluster.sh backend/scripts/start-cluster.sh

USER bun

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:8000/healthz'); process.exit(r.ok ? 0 : 1)"

CMD ["sh", "backend/scripts/start-cluster.sh"]
