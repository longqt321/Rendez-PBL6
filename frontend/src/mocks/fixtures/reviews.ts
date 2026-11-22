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
    tier: "must_try",
    recommendedDishes: ["Bánh xèo", "Nem lụi"],
    quickTags: ["dam-vi"],
    content: "Vỏ giòn rụm, nhân đầy đặn. Nước mắm pha đúng vị Đà Nẵng, ăn một cái là nghiện.",
    createdAt: "2026-11-10T12:00:00+07:00",
  },
  {
    id: "r-mock-2",
    placeId: "banh-xeo-ba-duong",
    author: MOCK_USERS["u-hieu"],
    tier: "good",
    recommendedDishes: ["Bánh xèo"],
    quickTags: [],
    content: "Quán nhỏ, chỗ ngồi hạn chế. Đồ ăn ngon, giá bình dân. Nên đi giờ ít người.",
    createdAt: "2026-11-08T18:30:00+07:00",
  },
  {
    id: "r-mock-3",
    placeId: "mi-quang-1a",
    author: MOCK_USERS["u-mai"],
    tier: "must_try",
    recommendedDishes: ["Mì Quảng gà", "Mì Quảng tôm thịt"],
    quickTags: ["phuc-vu-nhanh"],
    content: "Sợi mì vàng đẹp, thịt gà xé thơm. Nước dùng đậm đà, đúng vị Quảng Nam.",
    createdAt: "2026-11-09T08:00:00+07:00",
  },
  {
    id: "r-mock-4",
    placeId: "mi-quang-1a",
    author: MOCK_USERS["u-hieu"],
    tier: "good",
    recommendedDishes: ["Mì Quảng đặc biệt"],
    quickTags: [],
    content: "Chuẩn vị, giá phải chăng. Chỗ đậu xe hơi chật giờ cao điểm.",
    createdAt: "2026-11-07T11:15:00+07:00",
  },
  {
    id: "r-mock-5",
    placeId: "mi-quang-ech-bep-trang",
    author: MOCK_USERS["u-lan"],
    tier: "good",
    recommendedDishes: ["Mì Quảng ếch"],
    quickTags: ["khau-phan-nhieu"],
    content: "Ếch chiên giòn tan, cay vừa phải. Bún tươi, ăn kèm rau sống tươi mới.",
    createdAt: "2026-11-06T19:00:00+07:00",
  },
]
