import type { PlaceSuggestion } from "@/features/places/types/place"

interface NotificationBase {
  id: string
  createdAt: string
  read: boolean
}

/**
 * Thông báo "Đề xuất thêm địa điểm" do server sinh ra.
 *
 * `suggestions` đã được server xếp hạng sẵn (tối đa 3 mục). `postPlaceId` là địa
 * điểm hiện tại của bài — server tính, frontend chỉ dùng để hiển thị trạng thái
 * "Đã gắn", không tự tra cứu.
 */
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
  /** Nội dung bình luận, chỉ có với kind = "comment" */
  excerpt?: string
}

export interface SystemNotification extends NotificationBase {
  kind: "system"
  title: string
  body: string
}

export type AppNotification = PlaceSuggestionNotification | ActorNotification | SystemNotification
