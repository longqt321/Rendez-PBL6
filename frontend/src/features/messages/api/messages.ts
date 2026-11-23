import {
  conversationSummarySchema,
  directMessagePeerSchema,
  directMessageSchema,
  type ConversationSummary,
  type DirectMessage,
  type DirectMessagePeer,
} from "@rendez/schema"
import { z } from "zod"
import { api } from "@/lib/axios"

const conversationsResponseSchema = z.object({
  items: z.array(conversationSummarySchema),
})

const threadResponseSchema = z.object({
  peer: directMessagePeerSchema,
  items: z.array(directMessageSchema),
})

export async function getConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<unknown>("/messages/conversations")
  return conversationsResponseSchema.parse(data).items
}

export async function getConversationThread(
  handle: string,
): Promise<{ peer: DirectMessagePeer; items: DirectMessage[] }> {
  const { data } = await api.get<unknown>(`/messages/with/${encodeURIComponent(handle)}`)
  return threadResponseSchema.parse(data)
}

export async function sendDirectMessage(handle: string, body: string): Promise<DirectMessage> {
  const { data } = await api.post<unknown>(`/messages/with/${encodeURIComponent(handle)}`, {
    body,
  })
  return directMessageSchema.parse(data)
}
