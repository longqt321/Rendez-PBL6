import { ME } from "./users"
import type { Author } from "@/features/social/types/post"
import type { MockCollection } from "../types"

/** `ME` là `UserProfile` đầy đủ — bộ sưu tập chỉ cần trường `Author`. */
const ME_AS_AUTHOR: Author = {
  id: ME.id,
  name: ME.name,
  handle: ME.handle,
  initials: ME.initials,
}

/**
 * Bộ sưu tập mẫu — của người dùng hiện tại (ME) để tab "Bộ sưu tập" tại /saved
 * có nội dung ngay từ lần chạy đầu.
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
  },
  {
    id: "c-02",
    name: "Ăn vặt cuối tuần",
    description: "Địa điểm ăn vặt sẽ rủ hội bạn đi.\nBí mật chứ chưa public.",
    isPrivate: true,
    owner: ME_AS_AUTHOR,
    placeIds: ["p-02"],
    createdAt: "2026-11-01T18:30:00+07:00",
  },
]
