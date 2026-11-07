import type { Author } from "@/features/social/types/post"
import type { MockCommentSeed } from "../types"

/** Người dùng đang đăng nhập — dùng khi tạo bình luận mới. */
export const CURRENT_USER: Author = {
  id: "u-me",
  name: "Minh Anh",
  handle: "minhanh.eats",
  initials: "MA",
}

const AUTHORS: Record<string, Author> = {
  "u-1": { id: "u-1", name: "Trần Bảo", handle: "bao.an.day", initials: "TB" },
  "u-2": { id: "u-2", name: "Lê Thu Hà", handle: "thuha.foodmap", initials: "TH" },
  "u-3": { id: "u-3", name: "Phạm Quốc", handle: "quoc.around", initials: "PQ" },
  "u-4": { id: "u-4", name: "Nguyễn Yến", handle: "yen.danang", initials: "NY" },
  "u-5": { id: "u-5", name: "Đỗ Khánh", handle: "khanh.brunch", initials: "ĐK" },
}

/**
 * Bình luận mẫu cho từng bài. Chỉ post-01..post-05 có sẵn bình luận; bài còn
 * lại bắt đầu rỗng (empty state thật). `parentId` = trả lời bình luận khác
 * (lồng 1 cấp), `replyTo` do server tự suy ra từ bình luận cha lúc serialize.
 */
export const MOCK_COMMENTS: MockCommentSeed[] = [
  // ---- post-01 (Cà phê Út Tịch) ----
  {
    id: "c-01-1",
    postId: "post-01",
    author: AUTHORS["u-2"],
    body: "Quán này sáng 7h đã đông rồi, mình đi 2 lần toàn đứng chờ. Nên đi sớm thật!",
    createdAt: "2026-11-07T09:00:00+07:00",
    likeCount: 24,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-01-2",
    postId: "post-01",
    author: AUTHORS["u-1"],
    body: "Cà phê muối của quán có vị gì nổi bật vậy bạn, so với muối Cà Mau thì sao?",
    createdAt: "2026-11-07T09:20:00+07:00",
    likeCount: 5,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-01-3",
    postId: "post-01",
    author: AUTHORS["u-2"],
    body: "Béo nhẹ hơn, có vị mặn hậu ngọt. Nên gọi size nhỏ nếu ăn kèm bánh.",
    createdAt: "2026-11-07T09:35:00+07:00",
    likeCount: 8,
    likedByMe: false,
    parentId: "c-01-2",
  },
  {
    id: "c-01-4",
    postId: "post-01",
    author: AUTHORS["u-4"],
    body: "Bàn sát cửa sổ nhìn sông Hàn có màn chống muỗi không, định chiều cuối tuần đưa ba mẹ qua.",
    createdAt: "2026-11-07T10:05:00+07:00",
    likeCount: 3,
    likedByMe: false,
    parentId: null,
  },

  // ---- post-02 (Mì Quảng Bà Mua) ----
  {
    id: "c-02-1",
    postId: "post-02",
    author: AUTHORS["u-3"],
    body: "Chuẩn bài! Trưa mà chờ 15 phút là thường, đáng từng phút.",
    createdAt: "2026-11-07T02:00:00+07:00",
    likeCount: 41,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-02-2",
    postId: "post-02",
    author: AUTHORS["u-5"],
    body: "Mình toàn gọi thêm ếch om, nước dùng đậm không biết chốn nào.",
    createdAt: "2026-11-07T02:30:00+07:00",
    likeCount: 17,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-02-3",
    postId: "post-02",
    author: AUTHORS["u-1"],
    body: "Giá giờ đã lên 60k chưa nhỉ, lần trước qua là 55k.",
    createdAt: "2026-11-07T03:10:00+07:00",
    likeCount: 2,
    likedByMe: false,
    parentId: null,
  },

  // ---- post-03 (cà phê hẻm) ----
  {
    id: "c-03-1",
    postId: "post-03",
    author: AUTHORS["u-4"],
    body: "Quán này có ổ điện bàn không? Mình cần ngồi làm việc buổi chiều.",
    createdAt: "2026-11-06T17:20:00+07:00",
    likeCount: 6,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-03-2",
    postId: "post-03",
    author: AUTHORS["u-3"],
    body: "Có nha, bàn sát tường là đầy đủ. Wifi ổn định 30 Mbps.",
    createdAt: "2026-11-06T17:45:00+07:00",
    likeCount: 4,
    likedByMe: false,
    parentId: "c-03-1",
  },
  {
    id: "c-03-3",
    postId: "post-03",
    author: AUTHORS["u-2"],
    body: "Nhạc Trịnh + hẻm yên tĩnh, nghe nói đã mê rồi. Hẹn cuối tuần!",
    createdAt: "2026-11-06T18:00:00+07:00",
    likeCount: 9,
    likedByMe: false,
    parentId: null,
  },

  // ---- post-04 (bún chả cá Hờn) ----
  {
    id: "c-04-1",
    postId: "post-04",
    author: AUTHORS["u-5"],
    body: "Chả cá ở đây chiên và hấp đều ngon, mình gọi thêm một chén riêng ăn kèm.",
    createdAt: "2026-11-06T10:00:00+07:00",
    likeCount: 12,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-04-2",
    postId: "post-04",
    author: AUTHORS["u-1"],
    body: "Ăn kèm ớt xanh và mắm ruốc là vibe chuẩn của quán luôn.",
    createdAt: "2026-11-06T10:30:00+07:00",
    likeCount: 7,
    likedByMe: false,
    parentId: null,
  },

  // ---- post-05 (bánh cuốn) ----
  {
    id: "c-05-1",
    postId: "post-05",
    author: AUTHORS["u-3"],
    body: "Chả của quán tự nướng luôn á? Nhìn đĩa mà thèm.",
    createdAt: "2026-11-05T08:00:00+07:00",
    likeCount: 5,
    likedByMe: false,
    parentId: null,
  },
]
