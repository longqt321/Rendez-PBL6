import type { MockCollection } from "../types"
import { CURRENT_USER, MOCK_USERS } from "./users"

/**
 * Bộ sưu tập của mock server — `placeIds` chỉ tham chiếu quán có trong dataset
 * cold-start (xem `data/cold-start/places.json`) để thẻ địa điểm render đúng.
 */
export const MOCK_COLLECTIONS: MockCollection[] = [
  {
    id: "col-mock-1",
    name: "Ăn sáng Đà Nẵng",
    description: "Những quán mở từ 6h, hợp cho bữa sáng nhanh mà vẫn đúng vị.",
    isPrivate: false,
    owner: CURRENT_USER,
    placeIds: ["mi-quang-1a", "banh-xeo-ba-duong"],
    createdAt: "2026-11-05T07:00:00+07:00",
    likeCount: 15,
    likedByMe: false,
  },
  {
    id: "col-mock-2",
    name: "Món Quảng phải thử",
    description: "Mì Quảng, bánh xèo, bánh căn — danh sách dài dần sau mỗi chuyến đi.",
    isPrivate: false,
    owner: MOCK_USERS["u-hieu"]!,
    placeIds: ["mi-quang-1a", "mi-quang-ech-bep-trang", "banh-xeo-ba-duong"],
    createdAt: "2026-11-03T20:00:00+07:00",
    likeCount: 28,
    likedByMe: true,
  },
  {
    id: "col-mock-3",
    name: "Quán ruột của tôi",
    description: "Sổ tay riêng — không chia sẻ.",
    isPrivate: true,
    owner: CURRENT_USER,
    placeIds: ["banh-xeo-ba-duong"],
    createdAt: "2026-11-01T09:30:00+07:00",
    likeCount: 0,
    likedByMe: false,
  },
]
