import { ME, MOCK_USERS } from "./users"
import type { Author } from "@/features/social/types/post"
import type { MockCollection } from "../types"

/** `ME` là `UserProfile` đầy đủ — bộ sưu tập chỉ cần trường `Author`. */
const ME_AS_AUTHOR: Author = {
  id: ME.id,
  name: ME.name,
  handle: ME.handle,
  initials: ME.initials,
}

/** Rút gọn `UserProfile` thành `Author` cho chủ sở hữu bộ sưu tập. */
function asAuthor(userId: string): Author {
  const user = MOCK_USERS[userId]
  return { id: user.id, name: user.name, handle: user.handle, initials: user.initials }
}

/**
 * Bộ sưu tập mẫu.
 *
 * `c-01`/`c-02` thuộc về người dùng hiện tại (ME) để tab "Bộ sưu tập" tại /saved
 * có nội dung ngay từ lần chạy đầu. `c-03`/`c-04` thuộc người khác và công khai
 * — dùng để thấy tab "Bộ sưu tập" ở trang cá nhân `/u/:handle`.
 */
export const MOCK_COLLECTIONS: MockCollection[] = [
  {
    id: "c-01",
    name: "Cà phê làm việc",
    description: "Ngồi dài giờ, wifi ổn, không quá ồn.",
    isPrivate: false,
    owner: ME_AS_AUTHOR,
    placeIds: ["p-01", "p-03"],
    createdAt: "2026-10-20T09:00:00+07:00",
    likeCount: 12,
    likedByMe: false,
  },
  {
    id: "c-02",
    name: "Ăn vặt cuối tuần",
    description: "Địa điểm ăn vặt sẽ rủ hội bạn đi.\nBí mật chứ chưa public.",
    isPrivate: true,
    owner: ME_AS_AUTHOR,
    placeIds: ["p-02"],
    createdAt: "2026-11-01T18:30:00+07:00",
    likeCount: 3,
    likedByMe: false,
  },
  {
    id: "c-03",
    name: "Hải sản Sơn Trà",
    description: "Danh sách quán hải sản tươi, giá hợp lý dọc bãi biển Mỹ Khê.",
    isPrivate: false,
    owner: asAuthor("u-1"),
    placeIds: ["p-04", "p-05", "p-06"],
    createdAt: "2026-09-28T10:15:00+07:00",
    likeCount: 48,
    likedByMe: true,
  },
  {
    id: "c-04",
    name: "Đặc sản Hải Châu",
    description: "Món bản địa phải thử khi ghé trung tâm Đà Nẵng.",
    isPrivate: false,
    owner: asAuthor("u-1"),
    placeIds: ["p-07", "p-08"],
    createdAt: "2026-10-05T14:45:00+07:00",
    likeCount: 21,
    likedByMe: false,
  },
]
