import type { MockPost } from "../types"

/**
 * Feed /social khởi tạo.
 *
 * Cold-start TUYỆT ĐỐI không chứa dữ liệu giả (quyết định D-049): không có bài
 * đăng bịa, không có tài khoản ảo. Feed bắt đầu rỗng và chỉ có nội dung khi
 * người dùng thật đăng bài — mock server tự thêm vào `db.posts` lúc chạy.
 */
export const MOCK_POSTS: MockPost[] = []
