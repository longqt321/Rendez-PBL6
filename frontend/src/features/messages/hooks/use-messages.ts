import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { MessageAttachment } from "@rendez/schema"
import {
  blockUser,
  getConversations,
  getConversationThread,
  sendDirectMessage,
  unblockUser,
} from "../api/messages"

export const conversationsQueryKey = ["messages", "conversations"] as const

export function conversationThreadQueryKey(handle: string) {
  return ["messages", "thread", handle] as const
}

export function useConversations(folder?: "primary" | "requests", enabled = true) {
  return useQuery({
    queryKey: [...conversationsQueryKey, folder ?? "all"],
    queryFn: () => getConversations(folder),
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  })
}

export function useUnreadMessagesCount(enabled: boolean) {
  const { data } = useConversations("primary", enabled)
  if (!enabled || !data) return 0
  return data.reduce((sum, item) => sum + item.unreadCount, 0)
}

export function useConversationThread(handle: string | undefined) {
  return useQuery({
    queryKey: conversationThreadQueryKey(handle ?? ""),
    queryFn: () => getConversationThread(handle!),
    enabled: Boolean(handle),
    refetchInterval: 5_000,
  })
}

export function useDirectMessageEvents() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource("/api/messages/events", { withCredentials: true })
      es.addEventListener("message", () => {
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
        void queryClient.invalidateQueries({ queryKey: ["messages", "thread"] })
      })
    } catch {
      // EventSource fallback to polling
    }

    return () => {
      es?.close()
    }
  }, [queryClient])
}

export function useSendDirectMessage(handle: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: string | { body: string; attachment?: MessageAttachment }) =>
      sendDirectMessage(handle, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationThreadQueryKey(handle) })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
  })
}

export function useBlockUser(handle: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => blockUser(handle),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationThreadQueryKey(handle) })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
  })
}

export function useUnblockUser(handle: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => unblockUser(handle),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationThreadQueryKey(handle) })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
  })
}
