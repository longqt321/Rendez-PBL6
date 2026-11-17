import type { AppNotification } from "@/features/notification/types/notification"

/**
 * Thông báo của mock server — đủ 3 nhánh của `notificationSchema` (actor,
 * place-suggestion, system) để trang `/notification` và badge hiển thị thật.
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    kind: "like",
    id: "n-mock-1",
    createdAt: "2026-11-16T09:20:00+07:00",
    read: false,
    actorName: "Lan Anh",
    actorInitials: "LA",
    postId: "p-mock-1",
    excerpt: "Bánh xèo Bà Dưỡng — vỏ giòn, tôm tươi…",
  },
  {
    kind: "comment",
    id: "n-mock-2",
    createdAt: "2026-11-16T08:05:00+07:00",
    read: false,
    actorName: "Hiếu Food",
    actorInitials: "HF",
    postId: "p-mock-1",
    excerpt: "Bánh xèo ở đây nhỏ hơn chỗ khác nhưng bù lại tôm nhiều.",
  },
  {
    kind: "follow",
    id: "n-mock-3",
    createdAt: "2026-11-15T21:40:00+07:00",
    read: true,
    actorName: "Mai Nguyễn",
    actorInitials: "MN",
  },
  {
    kind: "place-suggestion",
    id: "n-mock-4",
    createdAt: "2026-11-15T18:10:00+07:00",
    read: true,
    postId: "p-mock-4",
    postCaption: "Đến Đà Nẵng hai ngày, đã ăn mì Quảng ba bữa. Bữa nào cũng ngon khác nhau.",
    postPlaceId: null,
    suggestions: [
      {
        place: {
          id: "mi-quang-1a",
          name: "Mì Quảng 1A",
          address: "Hải Châu, Đà Nẵng",
          district: "Hải Châu",
          category: "restaurant",
          isPublished: true,
        },
        reason: "Tên quán trùng với món bạn nhắc trong bài.",
      },
      {
        place: {
          id: "mi-quang-ech-bep-trang",
          name: "Mì Quảng Ếch Bếp Trang",
          address: "Hải Châu, Đà Nẵng",
          district: "Hải Châu",
          category: "restaurant",
          isPublished: true,
        },
        reason: "Cùng món mì Quảng, khác quận — gợi ý để so sánh.",
      },
    ],
  },
  {
    kind: "system",
    id: "n-mock-5",
    createdAt: "2026-11-14T10:00:00+07:00",
    read: true,
    title: "Chào mừng đến Rendez",
    body: "Lưu quán vào bộ sưu tập để lần sau tìm lại nhanh hơn.",
  },
]
