// Prisma 7 — cấu hình CLI/migrate. Runtime dùng driver adapter (`src/lib/prisma.ts`).
// Prisma 7 KHÔNG tự nạp .env; dùng API có sẵn của Node (>= 20.12) thay vì thêm dotenv.
import { defineConfig, env } from "prisma/config";

const loadEnvFile = (
  process as unknown as { loadEnvFile?: (path?: string) => void }
).loadEnvFile;
try {
  loadEnvFile?.();
} catch {
  // .env không bắt buộc khi CI đã export biến môi trường.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "bun run scripts/seed.ts",
  },
});
