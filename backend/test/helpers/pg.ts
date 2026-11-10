import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"

/**
 * Harness Postgres thật cho integration test (T0.6).
 *
 * Mỗi file test gọi `startTestDb()` trong `beforeAll`: khởi container
 * `postgres:17-alpine`, chạy `prisma migrate deploy` để schema khớp migration
 * đã commit (không dùng `db push` — test phải kiểm chính migration thật).
 *
 * Container dùng tiền tố `rendez-test-` và luôn bị `stopTestDb()` dọn ở
 * `afterAll` (quy tắc dọn container test).
 */
let container: StartedPostgreSqlContainer | null = null
let connectionUrl = ""

export async function startTestDb(): Promise<string> {
  if (connectionUrl) return connectionUrl

  container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("rendez_test")
    .withUsername("rendez")
    .withPassword("rendez_test")
    .start()

  connectionUrl = container.getConnectionUri()

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

  return connectionUrl
}

export async function stopTestDb(): Promise<void> {
  await container?.stop()
  container = null
  connectionUrl = ""
}
