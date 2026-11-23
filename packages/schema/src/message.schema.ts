import { z } from "zod"

export const directMessagePeerSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
  avatarUrl: z.string().nullable().optional(),
})

export const directMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  recipientId: z.string(),
  body: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})

export const conversationSummarySchema = z.object({
  peer: directMessagePeerSchema,
  lastMessage: directMessageSchema,
  unreadCount: z.number().int().min(0),
})

export const sendDirectMessageInputSchema = z.object({
  body: z.string().trim().min(1, "Tin nhắn không được để trống").max(1000, "Tối đa 1000 ký tự"),
})

export type DirectMessagePeer = z.infer<typeof directMessagePeerSchema>
export type DirectMessage = z.infer<typeof directMessageSchema>
export type ConversationSummary = z.infer<typeof conversationSummarySchema>
export type SendDirectMessageInput = z.infer<typeof sendDirectMessageInputSchema>
