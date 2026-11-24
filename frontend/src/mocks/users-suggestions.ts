import type { InternalAxiosRequestConfig } from "axios"
import type { UserSuggestion } from "@rendez/schema"
import { ME, MOCK_USERS } from "./fixtures/users"

interface MockSuggestionRoute {
  method: string
  pattern: RegExp
  handler: (config: InternalAxiosRequestConfig, params: string[]) => unknown
}

const MAX_SUGGESTIONS = 5

const MOCK_REASONS = ["Gợi ý cho bạn", "Đang hoạt động gần đây", "Mới tham gia Rendez"]

function suggestMockUsers(): UserSuggestion[] {
  return Object.values(MOCK_USERS)
    .filter(
      (user) =>
        user.id !== ME.id &&
        user.role !== "admin" &&
        user.role !== "moderator" &&
        !user.followedByMe,
    )
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
