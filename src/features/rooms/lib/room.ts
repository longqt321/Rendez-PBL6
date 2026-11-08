import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
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

/** Rời phòng: xoá thành viên theo id và mọi đề xuất của họ. */
export function leaveRoom(room: Room, memberId: string): Room {
  return {
    ...room,
    members: room.members.filter((member) => member.id !== memberId),
    proposals: room.proposals.filter((proposal) => proposal.memberId !== memberId),
  }
}

/** Chuỗi mô tả một đề xuất, dùng cho toast và danh sách — vd "＋ Loại hình: Cà phê". */
export function describeProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    return `＋ Mức giá tối đa: ${priceLevelLabel((Number(proposal.value) || 3) as 1 | 2 | 3)}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}
