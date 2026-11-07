import type { Author } from "@/features/social/types/post"
import type { MockPost } from "../types"

/** Người dùng đang đăng nhập, phía server dùng khi tạo bài mới. */
export const CURRENT_USER: Author = {
  id: "u-me",
  name: "Minh Anh",
  handle: "minhanh.eats",
  initials: "MA",
}

const AUTHORS: Author[] = [
  { id: "u-1", name: "Trần Bảo", handle: "bao.an.day", initials: "TB" },
  { id: "u-2", name: "Lê Thu Hà", handle: "thuha.foodmap", initials: "TH" },
  { id: "u-3", name: "Phạm Quốc", handle: "quoc.around", initials: "PQ" },
  { id: "u-4", name: "Nguyễn Yến", handle: "yen.danang", initials: "NY" },
  { id: "u-5", name: "Đỗ Khánh", handle: "khanh.brunch", initials: "ĐK" },
]

/**
 * Feed /social. Độc lập hoàn toàn với /discover: có bài gắn địa điểm đã lên
 * /discover, có bài gắn địa điểm CHƯA lên, và có bài chưa gắn gì cả.
 *
 * Nội dung caption luôn khớp với `placeId` — bài nói về quán nào thì gắn đúng
 * quán đó, để thẻ bài đăng trên feed không tự mâu thuẫn.
 */
export const MOCK_POSTS: MockPost[] = [
  {
    id: "post-01",
    author: AUTHORS[0],
    caption:
      "Sáng sớm ghé Cà phê Út Tịch bên Bạch Đằng, ly cà phê muối béo vừa phải, ngồi nhìn sông Hàn chạy xe qua. Đáng đi trước 9h để có bàn sát cửa sổ.",
    imageSeed: "post-caphe-muoi",
    imageHeight: 420,
    createdAt: "2026-11-07T08:10:00+07:00",
    placeId: "p-03",
    likeCount: 214,
    commentCount: 18,
    likedByMe: false,
    savedByMe: true,
  },
  {
    id: "post-02",
    author: AUTHORS[1],
    caption:
      "Mì Quảng Bà Mua trưa nào cũng đông, sợi mì dai, nước dùng đậm, thêm miếng bánh tráng nướng giòn rụm. Gọi thêm ếch om là chuẩn bài.",
    imageSeed: "post-miquang",
    imageHeight: 330,
    createdAt: "2026-11-07T01:25:00+07:00",
    placeId: "p-02",
    likeCount: 986,
    commentCount: 74,
    likedByMe: true,
    savedByMe: false,
  },
  {
    id: "post-03",
    author: AUTHORS[2],
    caption:
      "Tìm được quán cà phê trong hẻm nhỏ, không biển hiệu, bàn gỗ cũ, nhạc Trịnh. Không khí yên tĩnh đúng kiểu mình cần để làm việc cả buổi chiều.",
    imageSeed: "post-caphe-hem",
    imageHeight: 460,
    createdAt: "2026-11-06T16:40:00+07:00",
    // Chưa gắn địa điểm: server sẽ đề xuất khi có địa điểm phù hợp
    placeId: null,
    likeCount: 132,
    commentCount: 9,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "post-04",
    author: AUTHORS[3],
    caption:
      "Bún chả cá Hờn sáng sớm: nước lèo ngọt thanh từ cá tươi, chả cá chiên và hấp đều dai mịn. Thêm ớt xanh là đúng vị Đà Nẵng.",
    imageSeed: "post-bunchaca",
    imageHeight: 380,
    createdAt: "2026-11-06T09:05:00+07:00",
    placeId: "p-04",
    likeCount: 341,
    commentCount: 22,
    likedByMe: true,
    savedByMe: true,
  },
  {
    id: "post-05",
    author: AUTHORS[4],
    caption:
      "Bánh cuốn nóng trong hẻm, tráng tay tại chỗ, ăn kèm chả và nước mắm pha vừa. Sáng nào cũng muốn quay lại.",
    imageSeed: "post-banhcuon",
    imageHeight: 340,
    createdAt: "2026-11-05T07:30:00+07:00",
    // Trỏ tới địa điểm CHƯA duyệt (p-28) — server nhúng `isPublished: false`,
    // client hiện loại hình thay vì nhãn "Trên Khám phá".
    placeId: "p-28",
    likeCount: 87,
    commentCount: 5,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "post-06",
    author: AUTHORS[0],
    caption:
      "Đặc Sản Trần cuối tuần: bánh tráng thịt heo hai đầu da cuốn rau sống, chấm mắm nêm pha. Đông nhưng lên món nhanh, giá ổn.",
    imageSeed: "post-banhtrang",
    imageHeight: 400,
    createdAt: "2026-11-04T20:15:00+07:00",
    placeId: "p-05",
    likeCount: 268,
    commentCount: 31,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "post-07",
    author: AUTHORS[1],
    caption:
      "Rooftop Sky36 lúc hoàng hôn, cocktail ổn nhưng giá hơi cao. View nhìn trọn cầu Rồng và sông Hàn thì không chê vào đâu được.",
    imageSeed: "post-rooftop",
    imageHeight: 440,
    createdAt: "2026-11-03T18:50:00+07:00",
    placeId: "p-08",
    likeCount: 512,
    commentCount: 44,
    likedByMe: true,
    savedByMe: false,
  },
  {
    id: "post-08",
    author: AUTHORS[3],
    caption:
      "Gà nướng Đồng Đỏ: gà nướng lu da giòn thơm, xôi cháy ăn kèm, không gian rất nhẹ. Hợp cho bữa tối đông người ở Cẩm Lệ.",
    imageSeed: "post-ga-nuong",
    imageHeight: 360,
    createdAt: "2026-11-02T12:10:00+07:00",
    placeId: "p-23",
    likeCount: 156,
    commentCount: 12,
    likedByMe: false,
    savedByMe: true,
  },
  {
    id: "post-09",
    author: AUTHORS[2],
    caption:
      "Cuối tuần rồi, ai ở Đà Nẵng thì thử cơm tấm sườn nướng ở đây. Sườn ướp đậm, cơm tơi, nước mắm chua ngọt vừa miệng.",
    imageSeed: "post-com-tam",
    imageHeight: 350,
    createdAt: "2026-11-01T11:45:00+07:00",
    // Chưa gắn địa điểm
    placeId: null,
    likeCount: 73,
    commentCount: 6,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "post-10",
    author: AUTHORS[4],
    caption:
      "Bánh tráng kẹp Dì Hoa chiều se lạnh, vỏ nướng giòn ăn với pate, trứng cút và rau răm. Một cái không đủ, phải gọi hai.",
    imageSeed: "post-banh-trang-kep",
    imageHeight: 320,
    createdAt: "2026-10-31T07:20:00+07:00",
    placeId: "p-19",
    likeCount: 402,
    commentCount: 27,
    likedByMe: true,
    savedByMe: false,
  },
]
