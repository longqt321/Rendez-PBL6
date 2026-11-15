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
  postId?: string

  excerpt?: string
}

export interface SystemNotification extends NotificationBase {
  kind: "system"
  title: string
  body: string
}

export type AppNotification = PlaceSuggestionNotification | ActorNotification | SystemNotification
