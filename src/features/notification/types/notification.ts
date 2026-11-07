export type NotificationKind = "place-suggestion" | "like" | "comment" | "follow" | "system"

export interface PlaceSuggestion {
  placeId: string
  score: number
  /** Lý do ngắn gọn để người dùng hiểu vì sao được đề xuất */
  reason: string
}

interface NotificationBase {
  id: string
  createdAt: string
  read: boolean
}

export interface PlaceSuggestionNotification extends NotificationBase {
  kind: "place-suggestion"
  postId: string
  postCaption: string
  suggestions: PlaceSuggestion[]
}

export interface ActorNotification extends NotificationBase {
  kind: "like" | "comment" | "follow"
  actorName: string
  actorInitials: string
  postId?: string
  /** Nội dung bình luận, chỉ có với kind = "comment" */
  excerpt?: string
}

export interface SystemNotification extends NotificationBase {
  kind: "system"
  title: string
  body: string
}

export type AppNotification = PlaceSuggestionNotification | ActorNotification | SystemNotification
