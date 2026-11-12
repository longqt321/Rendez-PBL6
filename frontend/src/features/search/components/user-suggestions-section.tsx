import { Link } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/features/profile/hooks/use-me"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { FollowButton } from "./follow-button"

/**
 * Khối "Gợi ý theo dõi" của tab Người.
 *
 * Render độc lập với trạng thái kết quả tìm kiếm (kể cả khi kết quả loading/lỗi),
 * nhưng **thu gọn im lặng** khi guest/rỗng/lỗi: gợi ý là tính năng "thêm",
 * không được phá trang tìm kiếm.
 */
export function UserSuggestionsSection() {
  const { data: me } = useMe()
  const { data: suggestions, isPending, isError } = useUserSuggestions()

  // Guest: endpoint cần đăng nhập nên hook không chạy — không hiện khối.
  if (!me || isError) return null

  if (isPending) {
    return (
      <section className="mb-4" aria-label="Gợi ý theo dõi">
        <h2 className="text-sm font-semibold">Gợi ý theo dõi</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </section>
    )
  }

  const items = suggestions ?? []
  if (items.length === 0) return null

  return (
    <section className="mb-4" aria-label="Gợi ý theo dõi">
      <h2 className="text-sm font-semibold">Gợi ý theo dõi</h2>
      <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {items.map((suggestion) => (
          <li key={suggestion.user.id}>
            {/* Cùng cấu trúc `Item` của tab Người — không viết card mới. */}
            <Item
              variant="outline"
              className="transition-colors hover:bg-muted"
              render={<Link to={`/u/${suggestion.user.handle}`} />}
            >
              <ItemMedia>
                <Avatar size="lg">
                  <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
                    {suggestion.user.initials}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-sm font-semibold">{suggestion.user.name}</ItemTitle>
                <ItemDescription className="text-xs">
                  @{suggestion.user.handle} · {suggestion.reason}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <FollowButton user={suggestion.user} />
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
    </section>
  )
}
