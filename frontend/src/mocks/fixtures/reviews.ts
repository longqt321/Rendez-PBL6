import type { MockReviewSeed } from "../types"
import { MOCK_USERS } from "./users"

/**
 * Đánh giá địa điểm của mock server — gắn vào các quán có thật trong dataset
 * cold-start, dùng chính các user trong `fixtures/users.ts`.
 */
export const MOCK_REVIEWS: MockReviewSeed[] = [
  {
    id: "r-mock-1",
    placeId: "banh-xeo-ba-duong",
    author: MOCK_USERS["u-lan"],
    rating: 5,
    content: "Vỏ giòn rụm, nhân đầy đặn. Nước mắm pha đúng vị Đà Nẵng, ăn một cái là nghiện.",
    createdAt: "2026-11-10T12:00:00+07:00",
  },
  {
    id: "r-mock-2",
    placeId: "banh-xeo-ba-duong",
    author: MOCK_USERS["u-hieu"],
    rating: 4,
    content: "Quán nhỏ, chỗ ngồi hạn chế. Đồ ăn ngon, giá bình dân. Nên đi giờ ít người.",
    createdAt: "2026-11-08T18:30:00+07:00",
  },
  {
    id: "r-mock-3",
    placeId: "mi-quang-1a",
    author: MOCK_USERS["u-mai"],
    rating: 5,
    content: "Sợi mì vàng đẹp, thịt gà xé thơm. Nước dùng đậm đà, đúng vị Quảng Nam.",
    createdAt: "2026-11-09T08:00:00+07:00",
  },
  {
    id: "r-mock-4",
    placeId: "mi-quang-1a",
    author: MOCK_USERS["u-hieu"],
    rating: 4,
    content: "Chuẩn vị, giá phải chăng. Chỗ đậu xe hơi chật giờ cao điểm.",
    createdAt: "2026-11-07T11:15:00+07:00",
  },
  {
    id: "r-mock-5",
    placeId: "mi-quang-ech-bep-trang",
    author: MOCK_USERS["u-lan"],
    rating: 4,
    content: "Ếch chiên giòn tan, cay vừa phải. Bún tươi, ăn kèm rau sống tươi mới.",
    createdAt: "2026-11-06T19:00:00+07:00",
  },
]
