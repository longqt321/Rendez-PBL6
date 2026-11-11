import { execSync } from "node:child_process"

/**
 * Dọn dữ liệu e2e sau khi project `backend` chạy xong.
 *
 * Mỗi lần chạy tạo tài khoản demo (`*@rendez.local`) và `auth.spec` đăng ký
 * thêm `e2e_*@rendez.test` — nếu không xoá, bài đăng kiểm thử cộng dồn trong
 * DB dev qua các lần chạy. Toàn bộ khoá ngoại từ `users` đều `onDelete: Cascade`
 * nên xoá user là sạch bài/bình luận/like/bộ sưu tập/phòng liên quan.
 *
 * Chỉ xoá email thuộc miền kiểm thử (`rendez.local`, `rendez.test`) và handle
 * `e2e_%` — tài khoản thật của người dùng (miền khác) không bị đụng tới.
 * Chạy khi có `E2E_BACKEND_URL` (project mock không có DB, không cần).
 */
export default async function globalTeardown(): Promise<void> {
  if (!process.env.E2E_BACKEND_URL) return

  const sql =
    "delete from users where email like '%@rendez.local' or email like '%@rendez.test' or handle like 'e2e\\_%';"
  try {
    execSync(`docker exec rendez-postgres psql -U rendez -d rendez -c "${sql}"`, { stdio: "pipe" })
  } catch (error) {
    // Không làm fail cả lần chạy e2e vì việc dọn dẹp — ghi ra để biết.
    console.warn("[e2e-teardown] Không dọn được dữ liệu kiểm thử:", error)
  }
}
