import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios"
import type { PlaceCategory } from "@/features/places/types/place"
import type { Room, RoomFilter, RoomProposal } from "@/features/rooms/types/room"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import { CURRENT_USER } from "../fixtures/users"
import { resolveScenario } from "../scenarios"
import { env } from "@/lib/env"
import {
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "@rendez/schema"
import type { MockRoom, MockRoomMember } from "../types"
import { db, getRoomVotingState } from "./db-core"

export const RESPONSE_DELAY_MS = 320

/**
 * Kịch bản lỗi đọc MỘT LẦN lúc khởi tạo module (`VITE_MOCK_SCENARIO`).
 * Đổi giá trị cần restart dev server — đủ dùng cho việc thử UI, và tránh phải
 * đọc biến môi trường trên mỗi request.
 */
export const scenario = resolveScenario(env.mockScenario)

declare global {
  interface Window {
    __setMockScenario?: (name: string) => void
  }
}

// Cho phép E2E / dev test ghi đè kịch bản động trên window mà không cần restart server
if (typeof window !== "undefined") {
  window.__setMockScenario = (name: string) => {
    Object.assign(scenario, resolveScenario(name))
  }
}

/** Route GET trả danh sách — dùng để áp kịch bản `empty`. */
export const LIST_ROUTES: readonly RegExp[] = [
  /^\/places$/,
  /^\/places\/daily-picks$/,
  /^\/places\/recommended$/,
  /^\/posts$/,
  /^\/notifications$/,
  /^\/users$/,
  /^\/users\/[^/]+\/posts$/,
  /^\/users\/[^/]+\/collections$/,
  /^\/collections$/,
  /^\/places\/[^/]+\/reviews$/,
  /^\/places\/[^/]+\/posts$/,
]

export function wait(ms: number, config: InternalAxiosRequestConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const signal = config.signal
    if (signal?.aborted) {
      reject(new CanceledError(undefined, config))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      signal?.removeEventListener?.("abort", onAbort)
      reject(new CanceledError(undefined, config))
    }

    signal?.addEventListener?.("abort", onAbort)
  })
}

export function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  }
}

/** 201 cho `POST /register` — giữ đúng mã trạng thái của backend thật. */
export function created<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { ...ok(config, data), status: 201, statusText: "Created" }
}

export function notFound(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 404,
    statusText: "Not Found",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function badRequest(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 400,
    statusText: "Bad Request",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function forbidden(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_FORBIDDEN", config, undefined, {
    data: { detail: message },
    status: 403,
    statusText: "Forbidden",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** 409 — trùng email/handle khi đăng ký (khớp backend thật). */
export function conflict(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 409,
    statusText: "Conflict",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function unauthorized(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 401,
    statusText: "Unauthorized",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi máy chủ 500 — dùng cho kịch bản `server-error`. */
export function serverError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 500,
    statusText: "Internal Server Error",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi mạng (status 0, không response) — dùng cho kịch bản `offline`. */
export function networkError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, AxiosError.ERR_NETWORK, config)
}

/** 503 — tính năng chưa được cấu hình phía server (kịch bản `media-unavailable`). */
export function serviceUnavailable(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 503,
    statusText: "Service Unavailable",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function parseBody<T>(config: InternalAxiosRequestConfig): T {
  const raw: unknown = config.data
  if (typeof raw !== "string" || raw.length === 0) return {} as T
  return JSON.parse(raw) as T
}

export function query(config: InternalAxiosRequestConfig): Record<string, string> {
  const params = (config.params ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") result[key] = value
    else if (typeof value === "number" || typeof value === "boolean") result[key] = String(value)
  }
  return result
}

/**
 * `PATCH /me` — cập nhật hồ sơ.
 *
 * Validate trùng quy tắc của form `/settings` (dùng chung `lib/constants`).
 * Chỉ nhận đúng các trường trong hợp đồng; trường lạ bị bỏ qua để client không
 * thể ghi đè dữ liệu server không cho sửa.
 */
/** Ảnh hồ sơ: `null` = xoá, chuỗi = URL mới, khác = 400 — khớp hợp đồng `PATCH /me`. */
export function normalizeProfileImageUrl(
  value: unknown,
  config: InternalAxiosRequestConfig,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "string" && value.length > 0) return value
  badRequest(config, "URL ảnh không hợp lệ")
}

export function updateMe(config: InternalAxiosRequestConfig): typeof db.me {
  const body = parseBody<Record<string, unknown>>(config)
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const bio = typeof body.bio === "string" ? body.bio.trim() : ""
  const location = typeof body.location === "string" ? body.location.trim() : ""
  const privateProfile = body.privateProfile

  if (name.length < 2) badRequest(config, "Tên cần ít nhất 2 ký tự")
  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    badRequest(config, `Tên tối đa ${MAX_PROFILE_NAME_LENGTH} ký tự`)
  }
  if (bio.length > MAX_PROFILE_BIO_LENGTH) {
    badRequest(config, `Giới thiệu tối đa ${MAX_PROFILE_BIO_LENGTH} ký tự`)
  }
  if (location.length > MAX_PROFILE_LOCATION_LENGTH) {
    badRequest(config, `Địa điểm tối đa ${MAX_PROFILE_LOCATION_LENGTH} ký tự`)
  }
  if (typeof privateProfile !== "boolean") {
    badRequest(config, "Trường riêng tư phải là boolean")
  }

  // Ảnh hồ sơ: `null` = xoá, bỏ trống = giữ nguyên. Mock không kiểm prefix R2
  // (không có bucket thật) nhưng vẫn giữ đúng kiểu dữ liệu của hợp đồng.
  const avatarUrl = normalizeProfileImageUrl(body.avatarUrl, config)
  const coverUrl = normalizeProfileImageUrl(body.coverUrl, config)

  db.me = {
    ...db.me,
    name,
    bio,
    location,
    privateProfile,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    ...(coverUrl !== undefined ? { coverUrl } : {}),
  }
  db.users[db.me.id] = { ...db.me }
  return { ...db.me }
}

// ---------------------------------------------------------------------------
// Phòng lọc nhóm — port hành vi backend thật (backend/src/lib/rooms.ts).
// ---------------------------------------------------------------------------

/** Base32 Crockford — bỏ I, L, O, U (khớp backend). */
export const ROOM_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** Sinh mã phòng 6 ký tự từ CSPRNG của trình duyệt. */
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ""
  for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]
  return code
}

export function emptyRoomFilter(): RoomFilter {
  return {
    categories: [],
    excludedCategories: [],
    districts: [],
    excludedDistricts: [],
    includeKeywords: [],
    excludeKeywords: [],
  }
}

/** DTO Room — `isMe` tính từ "cookie" mock (roomTokens) hoặc phiên đăng nhập. */
export function toRoomDto(room: MockRoom): Room {
  const tokenMemberId = db.roomTokens[room.code]
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    ...(() => {
      const st = getRoomVotingState(room.code)
      const me = room.members.find((m) => m.userId === CURRENT_USER.id)
      const votedIds = new Set<string>()
      const voteSummaries = st.candidates.map((c) => {
        const cv = st.votes.filter((v) => v.candidateId === c.id)
        let likeCount = 0
        let passCount = 0
        let myDecision: "like" | "pass" | undefined
        let myRank: number | undefined
        for (const v of cv) {
          votedIds.add(v.memberId)
          if (v.decision === "like") likeCount++
          if (v.decision === "pass") passCount++
          if (me && v.memberId === me.id) {
            myDecision = v.decision
            myRank = v.rank
          }
        }
        return {
          candidateId: c.id,
          likeCount,
          passCount,
          ...(myDecision ? { myDecision } : {}),
          ...(myRank ? { myRank } : {}),
        }
      })
      return {
        phase: st.phase,
        votingMode: st.votingMode,
        votingDeadlineAt: null,
        winnerPlaceId: st.winnerPlaceId,
        lockedAt: st.phase === "locked" ? new Date().toISOString() : null,
        candidates: st.candidates,
        voteSummaries,
        votingProgress: {
          votedMemberIds: [...votedIds],
          totalActiveMembers: room.members.length,
          matchedCandidateIds: voteSummaries
            .filter((vs) => vs.likeCount >= room.members.length && room.members.length > 0)
            .map((vs) => vs.candidateId),
        },
      }
    })(),
    members: room.members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      isMe: (db.authenticated && member.userId === CURRENT_USER.id) || member.id === tokenMemberId,
      joinedAt: member.joinedAt,
    })),
    // Bản sao sâu — không trả tham chiếu tới "db" nội bộ, nếu không React state
    // bị mutate tại chỗ (unshift vào proposals) và JSON-compare tưởng không đổi.
    proposals: room.proposals.map((proposal) => ({ ...proposal })),
    filter: {
      categories: [...room.filter.categories],
      excludedCategories: [...room.filter.excludedCategories],
      districts: [...room.filter.districts],
      excludedDistricts: [...room.filter.excludedDistricts],
      includeKeywords: [...room.filter.includeKeywords],
      excludeKeywords: [...room.filter.excludeKeywords],
      ...(room.filter.priceMax ? { priceMax: room.filter.priceMax } : {}),
    },
    createdAt: room.createdAt,
  }
}

/**
 * Actor của một mutation phòng: phiên đăng nhập (chủ phòng) trước, "cookie"
 * guest sau — khớp thứ tự resolve của backend (`resolveRoomActor`).
 */
export function resolveMockRoomActor(
  config: InternalAxiosRequestConfig,
  room: MockRoom,
): MockRoomMember {
  if (db.authenticated) {
    const owner = room.members.find((member) => member.userId === CURRENT_USER.id)
    if (owner) return owner
  }
  const member = room.members.find((item) => item.id === db.roomTokens[room.code])
  if (member) return member
  forbidden(config, "Bạn không ở trong phòng này")
}

/** Chuỗi mô tả đề xuất — khớp `describeProposal` của backend (giá trị lạ → "—"). */
export function describeMockProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value)
    const label = level === 1 || level === 2 || level === 3 ? priceLevelLabel(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

/** Áp đề xuất vào filter — port 1:1 `applyProposalToFilter` của backend. */
export function applyMockProposalToFilter(
  filter: RoomFilter,
  proposal: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  const value = proposal.value
  if (proposal.field === "category") {
    const category = value as PlaceCategory
    return proposal.kind === "include"
      ? {
          ...filter,
          categories: [...new Set([...filter.categories, category])],
          excludedCategories: filter.excludedCategories.filter((item) => item !== category),
        }
      : {
          ...filter,
          excludedCategories: [...new Set([...filter.excludedCategories, category])],
          categories: filter.categories.filter((item) => item !== category),
        }
  }
  if (proposal.field === "district") {
    return proposal.kind === "include"
      ? {
          ...filter,
          districts: [...new Set([...filter.districts, value])],
          excludedDistricts: filter.excludedDistricts.filter((item) => item !== value),
        }
      : {
          ...filter,
          excludedDistricts: [...new Set([...filter.excludedDistricts, value])],
          districts: filter.districts.filter((item) => item !== value),
        }
  }
  if (proposal.field === "priceMax") {
    if (proposal.kind !== "include") return filter
    const parsed = Number(value)
    if (parsed !== 1 && parsed !== 2 && parsed !== 3) return filter
    return { ...filter, priceMax: parsed }
  }
  return proposal.kind === "include"
    ? { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    : { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
}

export function removeMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = value as PlaceCategory
    return target.kind === "include"
      ? { ...filter, categories: filter.categories.filter((c) => c !== category) }
      : { ...filter, excludedCategories: filter.excludedCategories.filter((c) => c !== category) }
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? { ...filter, districts: filter.districts.filter((d) => d !== value) }
      : { ...filter, excludedDistricts: filter.excludedDistricts.filter((d) => d !== value) }
  }
  if (target.field === "priceMax") {
    const next = { ...filter }
    delete next.priceMax
    return next
  }
  return target.kind === "include"
    ? { ...filter, includeKeywords: filter.includeKeywords.filter((k) => k !== value) }
    : { ...filter, excludeKeywords: filter.excludeKeywords.filter((k) => k !== value) }
}

export function hasMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): boolean {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = value as PlaceCategory
    return target.kind === "include"
      ? filter.categories.includes(category)
      : filter.excludedCategories.includes(category)
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? filter.districts.includes(value)
      : filter.excludedDistricts.includes(value)
  }
  if (target.field === "priceMax") {
    return filter.priceMax !== undefined && String(filter.priceMax) === value
  }
  return target.kind === "include"
    ? filter.includeKeywords.includes(value)
    : filter.excludeKeywords.includes(value)
}

export function toggleMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  return hasMockFilterConstraint(filter, target)
    ? removeMockFilterConstraint(filter, target)
    : applyMockProposalToFilter(filter, target)
}

export const VALID_ROOM_CATEGORIES: ReadonlySet<PlaceCategory> = new Set([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

/** Chuẩn hoá giá trị đề xuất theo field — `null` = không hợp lệ (400). */
export function normalizeMockProposalValue(
  field: RoomProposal["field"],
  value: string,
): string | null {
  if (field === "category") {
    // Dạng Prisma (`street_food`) được chuẩn hoá về dạng API (`street-food`).
    const normalized = value.trim().replace(/_/gu, "-")
    return VALID_ROOM_CATEGORIES.has(normalized as PlaceCategory) ? normalized : null
  }
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

export type Handler = (config: InternalAxiosRequestConfig, params: string[]) => unknown
export interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  /** Mã trạng thái trả về — mặc định 200 (201 dùng `created`). */
  status?: 201
}

/**
 * Bộ đếm request của mock cho trang `/system` (demo vận hành). Đây là số liệu
 * CỦA PHIÊN mock — không phải số liệu backend thật; trang ghi rõ điều đó.
 */
export const mockMetrics = {
  startedAt: Date.now(),
  routes: new Map<string, number>(),
}

export function recordMockMetric(method: string, path: string): void {
  const key = `${method.toUpperCase()} ${path}`
  mockMetrics.routes.set(key, (mockMetrics.routes.get(key) ?? 0) + 1)
}
