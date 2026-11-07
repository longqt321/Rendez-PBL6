import { create } from "zustand"
import { MOCK_POSTS } from "@/features/social/api/mock-posts"
import type { Post } from "@/features/social/types/post"
import { MOCK_PLACES } from "@/features/places/api/mock-places"
import { rankPlaceSuggestions } from "@/features/places/lib/rank-suggestions"
import type { AppNotification } from "@/features/notification/types/notification"

/**
 * State dùng chung giữa /discover, /social và /notification.
 *
 * Vì chưa có backend, đây là nguồn sự thật duy nhất cho:
 * - bài đăng (tạo mới, gắn địa điểm, like/save)
 * - địa điểm đã được "duyệt" lên /discover
 * - thông báo sinh ra từ luồng đề xuất địa điểm
 *
 * Khi có API thật, store này chỉ còn giữ state UI (optimistic update),
 * còn dữ liệu server chuyển sang TanStack Query.
 */

interface CreatePostInput {
  caption: string
  imageSeed: string
  placeId: string | null
}

interface AppState {
  posts: Post[]
  /** id các địa điểm đã lên /discover (bắt đầu từ publishedAt !== null trong mock) */
  publishedPlaceIds: string[]
  notifications: AppNotification[]
  /** id địa điểm đã được thuật toán đưa lên /discover trong phiên này */
  newlyPublishedPlaceIds: string[]

  createPost: (input: CreatePostInput) => Post
  setPostPlace: (postId: string, placeId: string) => void
  toggleLike: (postId: string) => void
  toggleSave: (postId: string) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  /** Mô phỏng thuật toán phát hiện địa điểm mới và tạo thông báo đề xuất */
  runPlaceDetection: () => void
  reset: () => void
}

const INITIAL_PUBLISHED = MOCK_PLACES.filter((place) => place.publishedAt !== null).map(
  (place) => place.id,
)

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-01",
    kind: "like",
    actorName: "Trần Bảo",
    actorInitials: "TB",
    postId: "post-01",
    createdAt: "2026-11-07T09:12:00+07:00",
    read: false,
  },
  {
    id: "notif-02",
    kind: "comment",
    actorName: "Lê Thu Hà",
    actorInitials: "TH",
    postId: "post-01",
    excerpt: "Quán này sáng nào cũng đông, bạn đi tầm 8h là vừa đẹp.",
    createdAt: "2026-11-07T08:55:00+07:00",
    read: false,
  },
  {
    id: "notif-03",
    kind: "follow",
    actorName: "Đỗ Khánh",
    actorInitials: "ĐK",
    createdAt: "2026-11-06T21:30:00+07:00",
    read: true,
  },
  {
    id: "notif-04",
    kind: "system",
    title: "Bản đồ địa điểm vừa được cập nhật",
    body: "Khu vực Quận 1 có thêm 12 địa điểm mới. Xem ở trang Khám phá.",
    createdAt: "2026-11-06T10:00:00+07:00",
    read: true,
  },
]

let postSeq = 0
let notifSeq = 0

export const useAppStore = create<AppState>((set, get) => ({
  posts: MOCK_POSTS,
  publishedPlaceIds: INITIAL_PUBLISHED,
  notifications: INITIAL_NOTIFICATIONS,
  newlyPublishedPlaceIds: [],

  createPost: ({ caption, imageSeed, placeId }) => {
    postSeq += 1
    const post: Post = {
      id: `post-new-${postSeq}`,
      author: {
        id: "u-me",
        name: "Minh Anh",
        handle: "minhanh.eats",
        initials: "MA",
      },
      caption,
      imageSeed,
      imageHeight: 380,
      createdAt: new Date().toISOString(),
      placeId,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      savedByMe: false,
    }
    set((state) => ({ posts: [post, ...state.posts] }))
    return post
  },

  setPostPlace: (postId, placeId) => {
    set((state) => ({
      posts: state.posts.map((post) => (post.id === postId ? { ...post, placeId } : post)),
      // Người dùng đã xác nhận đề xuất → địa điểm được đưa lên /discover.
      publishedPlaceIds: state.publishedPlaceIds.includes(placeId)
        ? state.publishedPlaceIds
        : [...state.publishedPlaceIds, placeId],
      notifications: state.notifications.map((notification) =>
        notification.kind === "place-suggestion" && notification.postId === postId
          ? { ...notification, read: true }
          : notification,
      ),
    }))
  },

  toggleLike: (postId) => {
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByMe: !post.likedByMe,
              likeCount: post.likeCount + (post.likedByMe ? -1 : 1),
            }
          : post,
      ),
    }))
  },

  toggleSave: (postId) => {
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, savedByMe: !post.savedByMe } : post,
      ),
    }))
  },

  markNotificationRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    }))
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }))
  },

  /**
   * Mô phỏng thuật toán: quét các bài đăng CHƯA gắn địa điểm, tìm địa điểm
   * chưa lên /discover khớp nội dung, rồi tạo thông báo "Đề xuất thêm địa điểm"
   * kèm 3 địa điểm được xếp hạng.
   */
  runPlaceDetection: () => {
    const { posts, publishedPlaceIds, notifications } = get()
    const unpublished = MOCK_PLACES.filter(
      (place) => !publishedPlaceIds.includes(place.id) && place.publishedAt === null,
    )
    if (unpublished.length === 0) return

    const alreadyNotified = new Set(
      notifications
        .filter(
          (n): n is Extract<AppNotification, { kind: "place-suggestion" }> =>
            n.kind === "place-suggestion",
        )
        .map((n) => n.postId),
    )

    const pending = posts.filter((post) => post.placeId === null && !alreadyNotified.has(post.id))
    if (pending.length === 0) return

    const created: AppNotification[] = []

    for (const post of pending) {
      const ranked = rankPlaceSuggestions(post.caption, unpublished, 3)
      if (ranked.length === 0) continue

      notifSeq += 1
      created.push({
        id: `notif-suggest-${notifSeq}`,
        kind: "place-suggestion",
        postId: post.id,
        postCaption: post.caption,
        suggestions: ranked.map((item) => ({
          placeId: item.place.id,
          score: item.score,
          reason: item.reason,
        })),
        createdAt: new Date().toISOString(),
        read: false,
      })
    }

    if (created.length === 0) return

    set((state) => ({
      notifications: [...created, ...state.notifications],
      // Địa điểm vừa được thuật toán phát hiện → giờ hiển thị được ở /discover.
      publishedPlaceIds: [
        ...state.publishedPlaceIds,
        ...created.flatMap((n) =>
          n.kind === "place-suggestion" ? n.suggestions.map((s) => s.placeId) : [],
        ),
      ],
      newlyPublishedPlaceIds: [
        ...state.newlyPublishedPlaceIds,
        ...created.flatMap((n) =>
          n.kind === "place-suggestion" ? n.suggestions.map((s) => s.placeId) : [],
        ),
      ],
    }))
  },

  reset: () => {
    postSeq = 0
    notifSeq = 0
    set({
      posts: MOCK_POSTS,
      publishedPlaceIds: INITIAL_PUBLISHED,
      notifications: INITIAL_NOTIFICATIONS,
      newlyPublishedPlaceIds: [],
    })
  },
}))
