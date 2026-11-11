/**
 * Helper dùng chung cho test tích hợp: tạo user đã xác thực email.
 *
 * Từ 2026-11-12 backend bắt buộc xác thực email (D-056) — `POST /register` KHÔNG
 * trả phiên nữa. Helper đánh dấu `email_verified` trực tiếp trong DB test (mô
 * phỏng người dùng đã bấm link trong mail) rồi đăng nhập để lấy cookie phiên.
 */

/** App Hono của test — chỉ cần phương thức `request`. */
type AppLike = { request(path: string, init?: RequestInit): Response | Promise<Response> }

/** Client Prisma của test — chỉ cần các thao tác trên bảng `users`. */
type PrismaUserLike = {
  user: {
    update(args: { where: { email: string }; data: { emailVerified: boolean } }): Promise<unknown>
    findUnique(args: { where: { email: string }; select: { id: true } }): Promise<{
      id: string
    } | null>
  }
}

export interface TestUser {
  cookie: string
  id: string
}

export async function registerVerifiedUser(
  app: AppLike,
  prisma: PrismaUserLike,
  input: {
    name: string
    handle: string
    email?: string
    password?: string
    /** Header thêm cho request đăng ký (ví dụ IP riêng để né rate limit). */
    headers?: Record<string, string>
  },
): Promise<TestUser> {
  const email = input.email ?? `${input.handle}@rendez.test`
  const password = input.password ?? "password123"

  const register = await app.request("/api/v1/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...input.headers },
    body: JSON.stringify({ name: input.name, email, password, handle: input.handle }),
  })
  if (register.status !== 201) {
    throw new Error(`Đăng ký test thất bại: ${register.status} ${await register.text()}`)
  }

  await prisma.user.update({ where: { email }, data: { emailVerified: true } })

  const login = await app.request("/api/v1/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (login.status !== 200) {
    throw new Error(`Đăng nhập test thất bại sau khi xác thực: ${login.status}`)
  }
  const cookie = (login.headers.getSetCookie()[0] ?? "").split(";")[0] ?? ""
  if (!cookie) throw new Error("Đăng nhập test không trả cookie phiên")

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) throw new Error(`Không tìm thấy user test vừa tạo: ${email}`)
  return { cookie, id: user.id }
}
