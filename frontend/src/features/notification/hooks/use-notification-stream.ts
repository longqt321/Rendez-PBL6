import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { env } from "@/lib/env"
import { notificationsQueryKey } from "./use-notifications"

/**
 * Kênh SSE thông báo (G6.3) — badge và danh sách cập nhật NGAY khi server ghi
 * thông báo mới, không chờ poll 60 giây.
 *
 * - Chỉ mở stream khi đã đăng nhập: `GET /notifications/events` cần cookie
 *   phiên, guest mở stream sẽ bị server ngắt rồi EventSource tự reconnect
 *   lặp vô hạn (ERR_INCOMPLETE_CHUNKED_ENCODING). Guest vẫn thấy thông báo
 *   nhờ poll 60s của `use-notifications` (kết quả rỗng/bình thường).
 * - Mock bật → không mở EventSource (adapter không hỗ trợ stream); poll 60s
 *   vẫn hoạt động như cũ.
 * - Mock tắt + đã đăng nhập → mở `GET /notifications/events` (kênh của chính
 *   mình, cookie phiên tự gửi). Server chỉ phát `notification-created` +
 *   `{version}` trung tính; client invalidate để refetch DTO theo phiên của
 *   mình.
 * - SSE lỗi → đóng stream; poll 60s vẫn là lưới an toàn nên không cần tự
 *   dựng vòng retry phức tạp (EventSource tự reconnect, nhưng khi lỗi lặp
 *   liên tục thì poll đã đủ).
 * - Đăng xuất → `me` về `undefined` → effect dọn dẹp, stream được đóng.
 */
export function useNotificationStream(): void {
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const meId = me?.id

  useEffect(() => {
    if (env.enableMocks) return
    if (!meId) return

    const base = env.apiBaseUrl.replace(/\/$/, "")
    const source = new EventSource(`${base}/notifications/events`)
    source.addEventListener("notification-created", () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    })

    return () => {
      source.close()
    }
  }, [queryClient, meId])
}
