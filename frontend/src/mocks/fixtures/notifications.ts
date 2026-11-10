import type { AppNotification } from "@/features/notification/types/notification"

/**
 * Thông báo khởi tạo — rỗng.
 *
 * `place-suggestion` do server sinh khi phát hiện địa điểm mới khớp bài đăng
 * chưa gắn địa điểm; không seed thông báo bịa (quyết định D-049).
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = []
