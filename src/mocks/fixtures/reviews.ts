import type { Author } from "@/features/social/types/post"
import type { MockReviewSeed } from "../types"

const AUTHORS: Record<string, Author> = {
  "u-1": { id: "u-1", name: "Trần Bảo", handle: "bao.an.day", initials: "TB" },
  "u-2": { id: "u-2", name: "Lê Thu Hà", handle: "thuha.foodmap", initials: "TH" },
  "u-3": { id: "u-3", name: "Phạm Quốc", handle: "quoc.around", initials: "PQ" },
  "u-4": { id: "u-4", name: "Nguyễn Yến", handle: "yen.saigon", initials: "NY" },
}

/**
 * Đánh giá mẫu cho địa điểm — chỉ text + số sao (form không nhận ảnh/file).
 * Mỗi (placeId, authorId) chỉ một bản ghi: đánh giá lại là ghi đè.
 */
export const MOCK_REVIEWS: MockReviewSeed[] = [
  // ---- p-01 (Cà phê Muối Chú Long) ----
  {
    id: "r-01-1",
    placeId: "p-01",
    author: AUTHORS["u-2"],
    rating: 5,
    content:
      "Cà phê muối đậm vị, foam béo mượt mà không gắt. View cổ điển ngồi làm việc cả buổi vẫn thoải mái.",
    createdAt: "2026-11-05T09:30:00+07:00",
  },
  {
    id: "r-01-2",
    placeId: "p-01",
    author: AUTHORS["u-4"],
    rating: 4,
    content: "Quán đông cuối tuần, nên đặt trước. Bánh mì chà bong ăn kèm cũng ổn.",
    createdAt: "2026-11-02T15:10:00+07:00",
  },
  // ---- p-02 (Bánh Mì Huỳnh Hoa) ----
  {
    id: "r-02-1",
    placeId: "p-02",
    author: AUTHORS["u-1"],
    rating: 5,
    content: "Đầy ụ pate, giá hợp lý. Hàng luôn dài nhưng chạy nhanh, chờ 10 phút là có bánh nóng.",
    createdAt: "2026-11-04T11:45:00+07:00",
  },
  // ---- p-03 ----
  {
    id: "r-03-1",
    placeId: "p-03",
    author: AUTHORS["u-3"],
    rating: 4,
    content: "Nước cam ép nguyên chất, không gian nhỏ xinh. Hơi khó tìm chỗ để xe.",
    createdAt: "2026-11-01T08:20:00+07:00",
  },
]
