import type { AppNotification } from "@/features/notification/types/notification"

/**
 * Thông báo khởi tạo phía server.
 *
 * `place-suggestion` được server sinh ra khi phát hiện địa điểm mới khớp với
 * bài đăng cũ chưa gắn địa điểm — frontend không tự tạo loại thông báo này.
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
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
    body: "Khu vực Quận Sơn Trà có thêm 12 địa điểm mới. Xem ở trang Khám phá.",
    createdAt: "2026-11-06T10:00:00+07:00",
    read: true,
  },
]
