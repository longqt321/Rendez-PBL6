import type { MockCommentSeed } from "../types"

/**
 * Bình luận khởi tạo — rỗng.
 *
 * Cold-start không chứa bình luận bịa; bình luận chỉ sinh ra từ thao tác thật
 * của người dùng trong phiên chạy (quyết định D-049).
 */
export const MOCK_COMMENTS: MockCommentSeed[] = []
