import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"

/**
 * Harness Postgres thật cho integration test (T0.6).
 *
 * Mỗi file test gọi `startTestDb()` trong `beforeAll`: khởi container RIÊNG
 * `pgvector/pgvector:0.8.7-pg17` (cùng image với compose.yaml — có sẵn extension
 * vector, migration `20261113080000_search_rec_foundation` cần type `vector`),
 * bật extension `vector` trong DB test rồi chạy `prisma migrate deploy` để
 * đã commit (không dùng `db push` — test phải kiểm chính migration thật), rồi
 * seed dataset cold-start.
 *
 * Không dùng chung container giữa các file: `afterAll` của mỗi file dừng
 * container của chính nó — nếu cache dùng chung thì file sau nhận connection
 * đến container đã bị dừng (ECONNREFUSED).
 */
let container: StartedPostgreSqlContainer | null = null

export async function startTestDb(): Promise<string> {
  container = await new PostgreSqlContainer("pgvector/pgvector:0.8.7-pg17")
    .withDatabase("rendez_test")
    .withUsername("rendez")
    .withPassword("rendez_test")
    .start()

  // Image pgvector chỉ CÀI sẵn extension, chưa bật trong DB mới tạo. Migration
  // `20261113080000_search_rec_foundation` dùng type `vector` nên phải bật trước.
  const createExtension = await container.exec([
    "psql",
    "-U",
    "rendez",
    "-d",
    "rendez_test",
    "-c",
    "CREATE EXTENSION IF NOT EXISTS vector",
  ])
  if (createExtension.exitCode !== 0) {
    await stopTestDb()
    throw new Error(
      `CREATE EXTENSION vector thất bại trong container test:\n${createExtension.stderr}`,
    )
  }

  const connectionUrl = container.getConnectionUri()
  const backendDir = new URL("../..", import.meta.url).pathname

  const migrate = Bun.spawnSync(["bunx", "prisma", "migrate", "deploy"], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: connectionUrl },
    stdout: "pipe",
    stderr: "pipe",
  })
  if (migrate.exitCode !== 0) {
    const stderr = migrate.stderr.toString()
    await stopTestDb()
    throw new Error(`prisma migrate deploy thất bại trong container test:\n${stderr}`)
  }

  // Seed dataset cold-start — các test places/posts phụ thuộc dữ liệu thật.
  const seed = Bun.spawnSync(["bun", "run", "scripts/seed.ts"], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: connectionUrl, SEED_MODE: "test" },
    stdout: "pipe",
    stderr: "pipe",
  })
  if (seed.exitCode !== 0) {
    const stderr = seed.stderr.toString()
    await stopTestDb()
    throw new Error(`seed thất bại trong container test:\n${stderr}`)
  }

  return connectionUrl
}

export async function stopTestDb(): Promise<void> {
  await container?.stop()
  container = null
}
