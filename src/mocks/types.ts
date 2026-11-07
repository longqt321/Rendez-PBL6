import type { Post } from "@/features/social/types/post"

/**
 * Bản ghi bài đăng trong "database" của server giả lập.
 *
 * Server chỉ lưu `placeId`; object `place` được nhúng vào response lúc serialize.
 * Đây là chi tiết nội bộ phía server — frontend không bao giờ thấy type này.
 */
export type MockPost = Omit<Post, "place">
