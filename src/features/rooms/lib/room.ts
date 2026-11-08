import { categoryLabel } from "@/features/places/lib/category-meta"
import type { Place, PlaceCategory } from "@/features/places/types/place"
import type { Room, RoomFilter, RoomProposal } from "../types/room"

/** Thành viên mặc định của người dùng hiện tại — app mock chỉ có 1 user ME. */
export const ME_MEMBER = { id: "u-me", displayName: "Bạn" } as const

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Sinh mã phòng 6 ký tự (bỏ ký tự dễ nhầm O/0, I/1). */
export function generateRoomCode(): string {
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

/** Bộ lọc ban đầu — không giới hạn gì cả. */
export function createEmptyFilter(): RoomFilter {
  return {
    categories: [],
    excludedCategories: [],
    districts: [],
    excludedDistricts: [],
    includeKeywords: [],
    excludeKeywords: [],
  }
}

/** Tạo phòng mới: chủ phòng là ME, chưa có đề xuất nào. */
export function createRoom(name: string, code: string): Room {
  return {
    id: crypto.randomUUID(),
    code,
    name: name.trim() || "Phòng lọc nhóm",
    members: [
      {
        id: ME_MEMBER.id,
        displayName: ME_MEMBER.displayName,
        isMe: true,
        joinedAt: new Date().toISOString(),
      },
    ],
    proposals: [],
    filter: createEmptyFilter(),
    createdAt: new Date().toISOString(),
  }
}

/** Thêm thành viên mới vào phòng (mock: tham gia bằng tên hiển thị). */
export function joinRoom(room: Room, displayName: string): Room {
  const name = displayName.trim()
  if (!name) return room
  if (room.members.some((member) => member.displayName.toLowerCase() === name.toLowerCase())) {
    return room
  }
  const member = {
    id: crypto.randomUUID(),
    displayName: name,
    isMe: false,
    joinedAt: new Date().toISOString(),
  }
  return { ...room, members: [...room.members, member] }
}

/** Thêm đề xuất mới (mặc định trạng thái `open`). */
export function addProposal(
  room: Room,
  input: {
    memberId: string
    kind: RoomProposal["kind"]
    field: RoomProposal["field"]
    value: string
  },
): Room {
  const proposal: RoomProposal = {
    id: crypto.randomUUID(),
    memberId: input.memberId,
    kind: input.kind,
    field: input.field,
    value: input.value.trim(),
    status: "open",
    createdAt: new Date().toISOString(),
  }
  return { ...room, proposals: [proposal, ...room.proposals] }
}

/** Ghi nhận một đề xuất vào bộ lọc chung và đánh dấu `applied`. */
export function applyProposal(room: Room, proposalId: string): Room {
  const proposal = room.proposals.find((item) => item.id === proposalId)
  if (!proposal || proposal.status !== "open") return room
  const value = proposal.value

  let filter = room.filter
  if (proposal.field === "category") {
    const category = value as PlaceCategory
    if (proposal.kind === "include") {
      filter = {
        ...filter,
        categories: [...new Set([...filter.categories, category])],
        excludedCategories: filter.excludedCategories.filter((item) => item !== category),
      }
    } else {
      filter = {
        ...filter,
        excludedCategories: [...new Set([...filter.excludedCategories, category])],
        categories: filter.categories.filter((item) => item !== category),
      }
    }
  } else if (proposal.field === "district") {
    if (proposal.kind === "include") {
      filter = {
        ...filter,
        districts: [...new Set([...filter.districts, value])],
        excludedDistricts: filter.excludedDistricts.filter((item) => item !== value),
      }
    } else {
      filter = {
        ...filter,
        excludedDistricts: [...new Set([...filter.excludedDistricts, value])],
        districts: filter.districts.filter((item) => item !== value),
      }
    }
  } else if (proposal.field === "priceMax") {
    // "exclude" với mức giá không có nghĩa — chỉ ghi nhận khi là include.
    if (proposal.kind === "include") {
      filter = { ...filter, priceMax: (Number(value) || 3) as 1 | 2 | 3 }
    }
  } else if (proposal.field === "keyword") {
    if (proposal.kind === "include") {
      filter = { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    } else {
      filter = { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
    }
  }

  return {
    ...room,
    filter,
    proposals: room.proposals.map((item) =>
      item.id === proposalId ? { ...item, status: "applied" as const } : item,
    ),
  }
}

/** Bỏ qua một đề xuất — không đổi filter. */
export function dismissProposal(room: Room, proposalId: string): Room {
  return {
    ...room,
    proposals: room.proposals.map((item) =>
      item.id === proposalId ? { ...item, status: "dismissed" as const } : item,
    ),
  }
}

/** Rời phòng: xoá thành viên `isMe` và mọi đề xuất của họ. */
export function leaveRoom(room: Room): Room {
  return {
    ...room,
    members: room.members.filter((member) => !member.isMe),
    proposals: room.proposals.filter((proposal) => proposal.memberId !== ME_MEMBER.id),
  }
}

/** Chuỗi mô tả một đề xuất, dùng cho toast và danh sách — vd "＋ Loại hình: Cà phê". */
export function describeProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    return `＋ Mức giá tối đa: ${"₫".repeat(Number(proposal.value) || 3)}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

/**
 * Địa điểm có thỏa bộ lọc chung của phòng không.
 *
 * Chạy client-side vì `GET /places` của mock chỉ nhận `category`/`district`/`q`
 * (xem D-030/BACKLOG): các ràng buộc còn lại lọc trên danh sách đã fetch.
 */
export function matchesRoomFilter(place: Place, filter: RoomFilter): boolean {
  if (filter.categories.length > 0 && !filter.categories.includes(place.category)) return false
  if (filter.excludedCategories.includes(place.category)) return false
  if (filter.districts.length > 0 && !filter.districts.includes(place.district ?? "")) return false
  if (filter.excludedDistricts.includes(place.district ?? "")) return false
  if (filter.priceMax !== undefined && place.priceLevel > filter.priceMax) return false

  const haystack = [place.name.toLowerCase(), ...place.tags.map((tag) => tag.toLowerCase())]
  if (
    filter.includeKeywords.length > 0 &&
    !filter.includeKeywords.some((keyword) =>
      haystack.some((text) => text.includes(keyword.toLowerCase())),
    )
  ) {
    return false
  }
  if (
    filter.excludeKeywords.some((keyword) =>
      haystack.some((text) => text.includes(keyword.toLowerCase())),
    )
  ) {
    return false
  }
  return true
}
