import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { env } from "@/lib/env"
import { notificationsQueryKey } from "./use-notifications"

/**
 * Kênh SSE thông báo (G6.3) — badge và danh sách cập nhật NGAY khi server ghi
 * thông báo mới, không chờ poll 60 giây.
 *
 * - Mock bật → không mở EventSource (adapter không hỗ trợ stream); poll 60s
 *   của `use-notifications` vẫn hoạt động như cũ.
 * - Mock tắt → mở `GET /notifications/events` (kênh của chính mình, cookie
 *   phiên tự gửi). Server chỉ phát `notification-created` + `{version}` trung
 *   tính; client invalidate để refetch DTO theo phiên của mình.
 * - SSE lỗi → đóng stream; poll 60s vẫn là lưới an toàn nên không cần tự
 *   dựng vòng retry phức tạp (EventSource tự reconnect, nhưng khi lỗi lặp
 *   liên tục thì poll đã đủ).
 */
export function useNotificationStream(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (env.enableMocks) return

    const base = env.apiBaseUrl.replace(/\/$/, "")
    const source = new EventSource(`${base}/notifications/events`)
    source.addEventListener("notification-created", () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    })

    return () => {
      source.close()
    }
  }, [queryClient])
}
