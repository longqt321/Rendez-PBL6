import { useLocation, useNavigate } from "react-router"
import type { MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { useMe } from "@/features/profile/hooks/use-me"
import { useSetFollow } from "@/features/profile/hooks/use-set-follow"
import { loginRedirectUrl } from "@/lib/axios"
import type { UserProfile } from "@rendez/schema"

/** Nút follow nằm ở đâu — dùng để log sự kiện đúng nguồn (tim-nguoi.md §chỉ số). */
export type FollowSource = "search" | "suggestion"

interface FollowButtonProps {
  user: UserProfile
  /** Nguồn render nút — mặc định `"search"` cho chỗ gọi cũ chưa truyền. */
  source?: FollowSource
}

/**
 * Nút "Theo dõi"/"Đang theo dõi" dùng chung cho kết quả tìm kiếm và khối gợi ý.
 *
 * Điểm DUY NHẤT xử lý guest (V6-03): bấm khi chưa đăng nhập → điều hướng
 * `/login?next=<path hiện tại + query>` thay vì im lặng. `loginRedirectUrl` có
 * sẵn đã encode `next` và chặn open redirect — không tự dựng chuỗi.
 */
export function FollowButton({ user, source = "search" }: FollowButtonProps) {
  const setFollow = useSetFollow(user.handle)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: me } = useMe()

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Nút nằm trong `Item` render thành `<a>` — chặn điều hướng để bấm follow
    // không rời trang (preventDefault ở bất kỳ đâu trên đường lan sự kiện đều
    // huỷ hành động mặc định của anchor).
    event.preventDefault()
    event.stopPropagation()

    if (!me) {
      // `navigate` có thể trả Promise (react-router) — không chờ.
      void navigate(loginRedirectUrl(`${location.pathname}${location.search}`))
      return
    }

    // Đo hiệu quả gợi ý (tim-nguoi.md §chỉ số): chưa có hạ tầng analytics nên
    // chỉ log console, tách tên sự kiện theo nguồn render.
    console.log(
      source === "suggestion" ? "follow_from_suggestion_click" : "follow_from_search_click",
      { handle: user.handle, followed: !user.followedByMe },
    )

    setFollow.mutate({ followed: !user.followedByMe })
  }

  return (
    <Button
      size="sm"
      variant={user.followedByMe ? "outline" : "default"}
      onClick={handleClick}
      disabled={setFollow.isPending}
    >
      {user.followedByMe ? "Đang theo dõi" : "Theo dõi"}
    </Button>
  )
}
