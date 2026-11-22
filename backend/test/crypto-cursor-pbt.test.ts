import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { decryptJsonForUser, encryptJsonForUser, hmacIdentifier } from "../src/lib/crypto"
import {
  decodeCursor,
  decodePlaceCursor,
  encodeCursor,
  encodePlaceCursor,
  SLUG_ID_RE,
  UUID_ID_RE,
} from "../src/lib/cursor"
import { percentile } from "../src/lib/eval-metrics"
import { calculateEgrfK, fuseRrfScored, RRF_K } from "../src/lib/search/rrf"

describe("crypto.ts — AES-256-GCM AAD Isolation & Bit-Flip Tampering (PBT)", () => {
  test("round-trip với mọi payload JSON hợp lệ và chặn tuyệt đối khi giải mã sai userId (AAD)", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lng: fc.double({ min: -180, max: 180, noNaN: true }),
          label: fc.string({ maxLength: 100 }),
        }),
        (userA, userB, payload) => {
          fc.pre(userA !== userB)
          // JSON chuẩn hoá `-0` thành `0`, chuẩn hoá input trước khi so sánh exact
          const normalized = {
            lat: Object.is(payload.lat, -0) ? 0 : payload.lat,
            lng: Object.is(payload.lng, -0) ? 0 : payload.lng,
            label: payload.label,
          }
          const token = encryptJsonForUser(userA, normalized)
          expect(decryptJsonForUser<typeof normalized>(userA, token)).toEqual(normalized)
          // Tráo userId (AAD mismatch) bắt buộc thất bại
          expect(decryptJsonForUser(userB, token)).toBeNull()
        },
      ),
      { numRuns: 80 },
    )
  })

  test("sửa 1 ký tự trong iv / authTag / ciphertext hoặc cắt ngắn token đều trả null", () => {
    const userId = "00000000-0000-4000-8000-000000000001"
    const token = encryptJsonForUser(userId, { lat: 16.0544, lng: 108.2022 })
    const parts = token.split(".")
    expect(parts.length).toBe(4)

    // Đổi 1 ký tự ở từng phân đoạn (version, iv, tag, ciphertext)
    for (let idx = 0; idx < 4; idx++) {
      const mutated = [...parts]
      const seg = mutated[idx]!
      const flippedChar = seg[0] === "A" ? "B" : "A"
      mutated[idx] = flippedChar + seg.slice(1)
      expect(decryptJsonForUser(userId, mutated.join("."))).toBeNull()
    }

    // Thiếu phân đoạn hoặc chuỗi rác
    expect(decryptJsonForUser(userId, parts.slice(0, 3).join("."))).toBeNull()
    expect(decryptJsonForUser(userId, "")).toBeNull()
  })

  test("fuzz chuỗi token bất kỳ không bao giờ throw", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (junk) => {
        expect(decryptJsonForUser("user-1", junk)).toBeNull()
      }),
      { numRuns: 200 },
    )
  })

  test("hmacIdentifier tách biệt theo namespace và deterministic", () => {
    const a = hmacIdentifier("loc", "u1")
    const b = hmacIdentifier("loc", "u1")
    const c = hmacIdentifier("rate", "u1")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a.length).toBe(64)
  })
})

describe("cursor.ts — Round-trip & Malformed Input Fuzzing (PBT)", () => {
  test("encodeCursor / decodeCursor round-trip chuẩn cho UUID và từ chối mọi rác base64", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2020-01-01T00:00:00Z"),
          max: new Date("2035-01-01T00:00:00Z"),
          noInvalidDate: true,
        }),
        fc.uuid(),
        (createdAt, id) => {
          const encoded = encodeCursor({ createdAt, id })
          const decoded = decodeCursor(encoded, UUID_ID_RE)
          expect(decoded).not.toBeNull()
          expect(decoded!.id).toBe(id)
          expect(decoded!.createdAt.getTime()).toBe(createdAt.getTime())
        },
      ),
      { numRuns: 100 },
    )

    // Fuzz rác bất kỳ
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (raw) => {
        const res = decodeCursor(raw, UUID_ID_RE)
        if (res !== null) {
          expect(Number.isNaN(res.createdAt.getTime())).toBe(false)
          expect(UUID_ID_RE.test(res.id)).toBe(true)
        }
      }),
      { numRuns: 250 },
    )
  })

  test("encodePlaceCursor / decodePlaceCursor round-trip đủ 3 loại sort (newest, rating, distance kể cả distance=null)", () => {
    const now = new Date("2026-11-22T10:00:00.000Z")
    const slug = "ca-phe-son-tra-1"

    const newestRaw = encodePlaceCursor({ kind: "newest", createdAt: now, id: slug })
    expect(decodePlaceCursor(newestRaw, SLUG_ID_RE)).toEqual({
      kind: "newest",
      createdAt: now,
      id: slug,
    })

    const ratingRaw = encodePlaceCursor({
      kind: "rating",
      rating: 4.75,
      reviewCount: 42,
      createdAt: now,
      id: slug,
    })
    expect(decodePlaceCursor(ratingRaw, SLUG_ID_RE)).toEqual({
      kind: "rating",
      rating: 4.75,
      reviewCount: 42,
      createdAt: now,
      id: slug,
    })

    const distRaw = encodePlaceCursor({ kind: "distance", distance: 1.25, id: slug })
    expect(decodePlaceCursor(distRaw, SLUG_ID_RE)).toEqual({
      kind: "distance",
      distance: 1.25,
      id: slug,
    })

    const distNullRaw = encodePlaceCursor({ kind: "distance", distance: null, id: slug })
    expect(decodePlaceCursor(distNullRaw, SLUG_ID_RE)).toEqual({
      kind: "distance",
      distance: null,
      id: slug,
    })

    // Từ chối injection hoặc NaN/Infinity trong cursor
    for (const tampered of [
      "distance|NaN|ca-phe-1",
      "distance|Infinity|ca-phe-1",
      "rating|4.5|NaN|2026-11-22T10:00:00.000Z|ca-phe-1",
      "newest|not-a-date|ca-phe-1",
      "newest|2026-11-22T10:00:00.000Z|../drop-table",
    ]) {
      const b64 = Buffer.from(tampered, "utf8").toString("base64url")
      expect(decodePlaceCursor(b64, SLUG_ID_RE)).toBeNull()
    }
  })
})

describe("search/rrf.ts & eval-metrics.ts — Mathematical Invariants (PBT)", () => {
  test("calculateEgrfK biên âm/0/undefined trả RRF_K, dương luôn >= 10", () => {
    expect(calculateEgrfK(undefined)).toBe(RRF_K)
    expect(calculateEgrfK(0)).toBe(RRF_K)
    expect(calculateEgrfK(-50)).toBe(RRF_K)
    expect(calculateEgrfK(1)).toBe(10)
    expect(calculateEgrfK(1000)).toBe(63)
  })

  test("fuseRrfScored: kết quả sắp giảm dần theo score, không trùng id, trọng số <= 0 bị bỏ qua", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 15 }),
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 15 }),
        (a, b) => {
          const uniqA = [...new Set(a)]
          const uniqB = [...new Set(b)]
          const fused = fuseRrfScored([
            { ids: uniqA, weight: 1 },
            { ids: uniqB, weight: 0.5 },
            { ids: ["ignored-item"], weight: 0 },
            { ids: ["ignored-neg"], weight: -2 },
          ])
          const seen = new Set<string>()
          for (let i = 0; i < fused.length; i++) {
            expect(seen.has(fused[i]!.id)).toBe(false)
            seen.add(fused[i]!.id)
            expect(fused[i]!.id).not.toBe("ignored-item")
            expect(fused[i]!.id).not.toBe("ignored-neg")
            if (i > 0) {
              expect(fused[i - 1]!.score).toBeGreaterThanOrEqual(fused[i]!.score)
            }
          }
        },
      ),
      { numRuns: 120 },
    )
  })

  test("percentile: bất biến đơn điệu p1 <= p2 => percentile(v, p1) <= percentile(v, p2) và nằm trong [min, max]", () => {
    expect(percentile([], 95)).toBe(0)
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -1000, max: 10000, noNaN: true }), {
          minLength: 1,
          maxLength: 50,
        }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (values, a, b) => {
          const p1 = Math.min(a, b)
          const p2 = Math.max(a, b)
          const v1 = percentile(values, p1)
          const v2 = percentile(values, p2)
          const min = Math.floor(Math.min(...values))
          const max = Math.ceil(Math.max(...values))
          expect(v1).toBeGreaterThanOrEqual(min)
          expect(v2).toBeLessThanOrEqual(max)
          expect(v1).toBeLessThanOrEqual(v2)
        },
      ),
      { numRuns: 150 },
    )
  })
})
