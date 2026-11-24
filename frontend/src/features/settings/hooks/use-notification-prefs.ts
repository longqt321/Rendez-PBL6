import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"

export interface NotificationPrefs {
  dmNotifications?: boolean
  roomActivity?: boolean
  emailDigest?: boolean
  marketingUpdates?: boolean
}

export function useNotificationPrefs(enabled = true) {
  return useQuery({
    queryKey: ["me", "notification-prefs"],
    queryFn: async () => {
      const { data } = await api.get<{ prefs: NotificationPrefs }>("/me/notification-prefs")
      return data.prefs
    },
    enabled,
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prefs: NotificationPrefs) => {
      const { data } = await api.patch<{ ok: true; prefs: NotificationPrefs }>(
        "/me/notification-prefs",
        prefs,
      )
      return data.prefs
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["me", "notification-prefs"], updated)
    },
  })
}
