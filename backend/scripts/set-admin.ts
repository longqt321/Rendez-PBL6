/**
 * Cấp/đổi vai trò người dùng (`admin`, `moderator`, `user`).
 *
 * Chạy:
 *   cd backend && bun run scripts/set-admin.ts <email-hoac-handle> [--role admin|moderator|user]
 */
import type { UserRole } from "@rendez/schema"
import { prisma } from "../src/lib/prisma"

const VALID_ROLES = new Set<UserRole>(["user", "moderator", "admin"])

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let target = ""
  let role: UserRole = "admin"

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--role") {
      const next = args[i + 1] as UserRole | undefined
      if (!next || !VALID_ROLES.has(next)) {
        throw new Error("Vai trò hợp lệ gồm: admin, moderator, user")
      }
      role = next
      i += 1
      continue
    }
    if (!target && arg) target = arg.trim()
  }

  if (!target) {
    throw new Error(
      "Cần truyền email hoặc handle người dùng: bun run scripts/set-admin.ts <target>",
    )
  }

  const normalized = target.startsWith("@") ? target.slice(1) : target
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: normalized.toLowerCase() }, { handle: normalized.toLowerCase() }],
    },
    select: { id: true, name: true, handle: true, email: true, role: true },
  })

  if (!user) {
    throw new Error(`Không tìm thấy tài khoản khớp "${target}"`)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: { id: true, name: true, handle: true, email: true, role: true },
  })

  console.info(
    `Đã cập nhật vai trò @${updated.handle} (${updated.email}): ${user.role} -> ${updated.role}`,
  )
}

try {
  await main()
} catch (error) {
  console.error("[set-admin] Lỗi:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
