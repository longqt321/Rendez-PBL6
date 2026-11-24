import {
  conversationSummarySchema,
  directMessagePeerSchema,
  directMessageSchema,
  type ConversationSummary,
  type DirectMessage,
  type DirectMessagePeer,
  type MessageAttachment,
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

export async function getConversations(
  folder?: "primary" | "requests",
): Promise<ConversationSummary[]> {
  const params = folder ? { folder } : undefined
  const { data } = await api.get<unknown>("/messages/conversations", { params })
  return conversationsResponseSchema.parse(data).items
}

export async function getConversationThread(
  handle: string,
): Promise<{ peer: DirectMessagePeer; items: DirectMessage[] }> {
  const { data } = await api.get<unknown>(`/messages/with/${encodeURIComponent(handle)}`)
  return threadResponseSchema.parse(data)
}

export async function sendDirectMessage(
  handle: string,
  payload: string | { body: string; attachment?: MessageAttachment },
): Promise<DirectMessage> {
  const bodyData = typeof payload === "string" ? { body: payload } : payload
  const { data } = await api.post<unknown>(`/messages/with/${encodeURIComponent(handle)}`, bodyData)
  return directMessageSchema.parse(data)
}

export async function blockUser(handle: string): Promise<void> {
  await api.post(`/users/${encodeURIComponent(handle)}/block`)
}

export async function unblockUser(handle: string): Promise<void> {
  await api.delete(`/users/${encodeURIComponent(handle)}/block`)
}
