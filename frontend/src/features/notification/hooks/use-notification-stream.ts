import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { env } from "@/lib/env"
import { notificationsQueryKey } from "./use-notifications"

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
