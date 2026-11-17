import type { MockPost } from "../types"
import { CURRENT_USER, MOCK_USERS } from "./users"

/**
 * Dữ liệu bài đăng của mock server — chỉ tham chiếu id quán có thật trong
 * dataset cold-start (`data/cold-start/places.json`). `place` không khai ở đây:
 * mock server tự tra từ `placeId` trong `toPostDto`.
 */
export const MOCK_POSTS: MockPost[] = [
  {
    id: "p-mock-1",
    author: CURRENT_USER,
    caption:
      "Bánh xèo Bà Dưỡng — vỏ giòn, tôm tươi, nước mắm đậm vị. Quán nhỏ nhưng lúc nào cũng đầy.",
    createdAt: "2026-11-15T11:30:00+07:00",
    placeId: "banh-xeo-ba-duong",
    likeCount: 12,
    commentCount: 2,
    likedByMe: false,
    savedByMe: false,
    images: [],
  },
  {
    id: "p-mock-2",
    author: MOCK_USERS["u-lan"]!,
    caption: "Mì Quảng 1A — sợi mì vàng óng, thịt gà xé, nước dùng đậm đà kiểu Quảng Nam.",
    createdAt: "2026-11-14T08:15:00+07:00",
    placeId: "mi-quang-1a",
    likeCount: 34,
    commentCount: 1,
    likedByMe: true,
    savedByMe: true,
    images: [],
  },
  {
    id: "p-mock-3",
    author: MOCK_USERS["u-hieu"]!,
    caption: "Mì Quảng ếch Bếp Trang — ếch chiên giòn, ăn kèm bún tươi, vị cay nồng khó quên.",
    createdAt: "2026-11-13T19:45:00+07:00",
    placeId: "mi-quang-ech-bep-trang",
    likeCount: 7,
    commentCount: 1,
    likedByMe: false,
    savedByMe: false,
    images: [],
  },
  {
    id: "p-mock-4",
    author: MOCK_USERS["u-mai"]!,
    caption: "Đến Đà Nẵng hai ngày, đã ăn mì Quảng ba bữa. Bữa nào cũng ngon khác nhau.",
    createdAt: "2026-11-12T07:50:00+07:00",
    placeId: null,
    likeCount: 2,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
    images: [],
  },
]
