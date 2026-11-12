import type { InternalAxiosRequestConfig } from "axios"
import type { UserSuggestion } from "@rendez/schema"
import { ME, MOCK_USERS } from "./fixtures/users"

/**
 * Route mock cho `GET /users/suggestions` — tách riêng khỏi `server.ts` để
 * không đụng file đang được agent khác sửa; `server.ts` chỉ import và spread
 * mảng này vào danh sách route (route GET `/users/suggestions` phải đứng trước
 * `/users/:handle`, khớp thứ tự khai báo của backend).
 *
 * Tín hiệu mock là dữ liệu mẫu tĩnh (không có DB): mọi người dùng khác chưa
 * được theo dõi đều là ứng viên, reason minh hoạ các nhánh của backend. FE chỉ
 * gọi endpoint này khi đã đăng nhập (`enabled: !!me`) nên handler không cần
 * kiểm tra phiên — khác backend thật (401) ở điểm này, có chủ đích.
 *
 * `setFollow` của `server.ts` sửa trực tiếp object trong `MOCK_USERS` (cùng
 * tham chiếu với `db.users`), nên người vừa follow tự động rời khỏi gợi ý.
 */

/** Route mock — cấu trúc khớp `Route` trong `server.ts` (không export được vì vòng import). */
interface MockSuggestionRoute {
  method: string
  pattern: RegExp
  handler: (config: InternalAxiosRequestConfig, params: string[]) => unknown
}

/** Tối đa 5 gợi ý — khớp `userSuggestionsSchema` của backend. */
const MAX_SUGGESTIONS = 5

/** Reason minh hoạ theo thứ tự ứng viên — đủ để UI hiện các nhánh khác nhau. */
const MOCK_REASONS = ["Gợi ý cho bạn", "Đang hoạt động gần đây", "Mới tham gia Rendez"]

function suggestMockUsers(): UserSuggestion[] {
  return Object.values(MOCK_USERS)
    .filter((user) => user.id !== ME.id && !user.followedByMe)
    .slice(0, MAX_SUGGESTIONS)
    .map((user, index) => ({
      user,
      reason: MOCK_REASONS[index % MOCK_REASONS.length] ?? "Gợi ý cho bạn",
    }))
}

export const userSuggestionRoutes: MockSuggestionRoute[] = [
  {
    method: "get",
    pattern: /^\/users\/suggestions$/,
    handler: () => ({ items: suggestMockUsers() }),
  },
]
