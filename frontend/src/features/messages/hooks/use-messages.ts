import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getConversations, getConversationThread, sendDirectMessage } from "../api/messages"

export const conversationsQueryKey = ["messages", "conversations"] as const

export function conversationThreadQueryKey(handle: string) {
  return ["messages", "thread", handle] as const
}

export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: getConversations,
    refetchInterval: 10_000,
  })
}

export function useConversationThread(handle: string | undefined) {
  return useQuery({
    queryKey: conversationThreadQueryKey(handle ?? ""),
    queryFn: () => getConversationThread(handle!),
    enabled: Boolean(handle),
    refetchInterval: 5_000,
  })
}

export function useSendDirectMessage(handle: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => sendDirectMessage(handle, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationThreadQueryKey(handle) })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
  })
}
