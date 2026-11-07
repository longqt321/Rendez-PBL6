import type { Author } from "@/features/social/types/post"
import type { MockReviewSeed } from "../types"

const AUTHORS: Record<string, Author> = {
  "u-1": { id: "u-1", name: "Trần Bảo", handle: "bao.an.day", initials: "TB" },
  "u-2": { id: "u-2", name: "Lê Thu Hà", handle: "thuha.foodmap", initials: "TH" },
  "u-3": { id: "u-3", name: "Phạm Quốc", handle: "quoc.around", initials: "PQ" },
  "u-4": { id: "u-4", name: "Nguyễn Yến", handle: "yen.danang", initials: "NY" },
}

/**
 * Đánh giá mẫu cho địa điểm — chỉ text + số sao (form không nhận ảnh/file).
 * Mỗi (placeId, authorId) chỉ một bản ghi: đánh giá lại là ghi đè.
 */
export const MOCK_REVIEWS: MockReviewSeed[] = [
  // ---- p-01 (Bánh Xèo Bà Dưỡng) ----
  {
    id: "r-01-1",
    placeId: "p-01",
    author: AUTHORS["u-2"],
    rating: 5,
    content:
      "Bánh xèo giòn rụm, nước sốt gan heo mè đậu phộng độc quyền ăn hoài không ngán. Nem lụi nướng thơm nức mũi, đi Đà Nẵng nhất định phải ghé!",
    createdAt: "2026-11-05T09:30:00+07:00",
  },
  {
    id: "r-01-2",
    placeId: "p-01",
    author: AUTHORS["u-4"],
    rating: 4,
    content:
      "Quán nằm sâu trong kiệt Hoàng Diệu nhưng cực kỳ đông khách. Bánh mang ra nóng hổi, rau sống tươi rói.",
    createdAt: "2026-11-02T15:10:00+07:00",
  },
  // ---- p-02 (Mì Quảng Bà Mua) ----
  {
    id: "r-02-1",
    placeId: "p-02",
    author: AUTHORS["u-1"],
    rating: 5,
    content:
      "Mì quảng gà ta thịt chắc thơm, nước nhưn đậm đà chan vừa phải, bánh tráng nướng mè giòn tan ăn kèm chuẩn vị xứ Quảng.",
    createdAt: "2026-11-04T11:45:00+07:00",
  },
  // ---- p-03 (Cà phê Út Tịch) ----
  {
    id: "r-03-1",
    placeId: "p-03",
    author: AUTHORS["u-3"],
    rating: 4,
    content:
      "Quán cà phê mang phong cách phố cổ ngay mặt đường Bạch Đằng, view nhìn thẳng ra cầu sông Hàn gió mát rượi.",
    createdAt: "2026-11-01T08:20:00+07:00",
  },
]
