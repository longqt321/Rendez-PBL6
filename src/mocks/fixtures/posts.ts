import type { MockPost } from "../types"
import { AUTHOR_LIST as AUTHORS } from "./users"

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
      "Sáng sớm ghé Reply 1988 Café trên Lê Hồng Phong, không gian hoài niệm ấm áp, ly cà phê muối béo vừa phải. Đáng đi trước 9h để có chỗ yên tĩnh.",
    imageSeed: "post-caphe-muoi",
    imageHeight: 420,
    createdAt: "2026-11-07T08:10:00+07:00",
    placeId: "reply-1988-cafe",
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
    placeId: "mi-quang-ba-mua",
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
    placeId: "bun-cha-ca-hon-12350543701",
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
    // Trỏ tới địa điểm CHƯA duyệt (bánh cuốn OSM) — server nhúng `isPublished: false`,
    // client hiện loại hình thay vì nhãn "Trên Khám phá".
    placeId: "banh-cuon-11361296208",
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
    placeId: "dac-san-tran",
    likeCount: 268,
    commentCount: 31,
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "post-07",
    author: AUTHORS[1],
    caption:
      "Sơn Trà Marina chiều muộn: ngồi nhìn biển từ trên cao, đồ uống ổn, không gian thoáng. Hoàng hôn ở đây rất đáng chờ.",
    imageSeed: "post-rooftop",
    imageHeight: 440,
    createdAt: "2026-11-03T18:50:00+07:00",
    placeId: "son-tra-marina",
    likeCount: 512,
    commentCount: 44,
    likedByMe: true,
    savedByMe: false,
  },
  {
    id: "post-08",
    author: AUTHORS[3],
    caption:
      "Cơm gà Bà Buội trưa nào cũng đông: gà ta xé đậm vị, cơm nghệ vàng ươm, chấm muối ớt xanh là chuẩn. Quán nhỏ nên đi sớm khỏi chờ.",
    imageSeed: "post-ga-nuong",
    imageHeight: 360,
    createdAt: "2026-11-02T12:10:00+07:00",
    placeId: "com-ga-ba-buoi",
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
    placeId: "banh-trang-kep-di-hoa",
    likeCount: 402,
    commentCount: 27,
    likedByMe: true,
    savedByMe: false,
  },
]
