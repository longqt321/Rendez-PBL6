import type { PlaceSuggestion } from "./place"

interface NotificationBase {
  id: string
  createdAt: string
  read: boolean
}

export interface PlaceSuggestionNotification extends NotificationBase {
  kind: "place-suggestion"
  postId: string
  postCaption: string
  postPlaceId: string | null
  suggestions: PlaceSuggestion[]
}

export interface ActorNotification extends NotificationBase {
  kind: "like" | "comment" | "follow"
  actorName: string
  actorInitials: string
  actorHandle?: string
  actorAvatarUrl?: string | null
  postId?: string

  excerpt?: string
}

export interface SystemNotification extends NotificationBase {
  kind: "system"
  title: string
  body: string
}

export interface DirectMessageNotification extends NotificationBase {
  kind: "direct-message"
  actorName: string
  actorInitials: string
  actorHandle?: string
  actorAvatarUrl?: string | null
  messageExcerpt?: string
}

export interface RoomEventNotification extends NotificationBase {
  kind: "room-event"
  roomCode: string
  roomName: string
  eventType: "voting_started" | "room_finalized"
  winnerPlaceName?: string
}

export type AppNotification =
  | PlaceSuggestionNotification
  | ActorNotification
  | SystemNotification
  | DirectMessageNotification
  | RoomEventNotification
