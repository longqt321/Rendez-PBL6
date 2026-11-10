import type { MockReviewSeed } from "../types"

/**
 * Đánh giá khởi tạo — rỗng.
 *
 * `rating`/`reviewCount` của địa điểm cũng để 0 vì chưa ai đánh giá thật trên hệ
 * thống. Không seed đánh giá bịa (quyết định D-049).
 */
export const MOCK_REVIEWS: MockReviewSeed[] = []
