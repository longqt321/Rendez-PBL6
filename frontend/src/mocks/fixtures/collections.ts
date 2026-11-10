import type { MockCollection } from "../types"

/**
 * Bộ sưu tập khởi tạo — rỗng.
 *
 * Cold-start không chứa bộ sưu tập bịa; người dùng tự tạo trong phiên chạy
 * (quyết định D-049).
 */
export const MOCK_COLLECTIONS: MockCollection[] = []
