# API RendeZ — build nhiều tầng, chạy bằng Bun (T8.1).
#
# builder  : cài dev deps, sinh Prisma client, bundle server.
# migrator : = builder (có Prisma CLI đúng version) để chạy `prisma migrate deploy`.
# runtime  : bundle + node_modules (từ builder) + Prisma client.

FROM oven/bun:1.3.14 AS builder
WORKDIR /app

# Manifest trước để tận dụng cache layer khi chỉ đổi source.
COPY package.json bun.lock ./
COPY packages/schema/package.json packages/schema/
COPY backend/package.json backend/
# Manifest của frontend vẫn phải có mặt: root khai báo workspace "frontend".
COPY frontend/package.json frontend/
# Chỉ cài dependency của API (+ schema workspace), không kéo dependency FE.
RUN bun install --frozen-lockfile --filter @rendez/api

COPY packages packages
COPY backend backend

# Prisma client sinh vào backend/generated (xem generator.output) — cần DATABASE_URL
# giả để `generate` không đòi kết nối thật.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN cd backend && bunx prisma generate

RUN cd backend && bun build src/server.ts --target bun --outdir dist \
  --external pg-boss --external sharp --external onnxruntime-node

# ---------------------------------------------------------------------------
# Migrator: dùng lại builder vì cần `prisma` CLI đúng version trong node_modules.
# ---------------------------------------------------------------------------

FROM builder AS migrator
WORKDIR /app/backend
USER bun
CMD ["bunx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# Lưu ý: Bun workspace install đặt store ở node_modules/.bun và symlink của
# workspace con trong backend/node_modules (trỏ ../../node_modules/.bun).
# Runtime phải GIỮ NGUYÊN cấu trúc này — COPY từng phần về đúng vị trí,
# không gộp về /app vì symlink tương đối sẽ gãy.
# ---------------------------------------------------------------------------

FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/backend/node_modules backend/node_modules
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/generated backend/generated
COPY --from=builder /app/backend/package.json backend/package.json
# Workspace @rendez/schema (backend/node_modules/@rendez/schema trỏ tới đây).
COPY --from=builder /app/packages packages

# Chạy bằng user không phải root.
USER bun

EXPOSE 8000
# Healthcheck dùng chính endpoint liveness — không phụ thuộc curl trong image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:8000/healthz'); process.exit(r.ok ? 0 : 1)"

# Migration do service `migrate` lo (compose depends_on: service_completed_successfully).
CMD ["bun", "backend/dist/server.js"]
