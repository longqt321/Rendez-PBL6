import { describe, expect, it } from "vitest"
import type { Place } from "@/features/places/types/place"
import type { Room } from "../types/room"
import { scoreAndRankRoomCandidates } from "./room-scoring"

function makePlace(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: `Quán ${id}`,
    address: "10 Bạch Đằng",
    city: "Đà Nẵng",
    district: "Hải Châu",
    category: "cafe",
    tags: ["yên tĩnh"],
    positiveRatio: 90,
    reviewCount: 10,
    priceLevel: 1,
    imageHeight: 200,
    lat: 16.0678,
    lng: 108.2208,
    publishedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("scoreAndRankRoomCandidates", () => {
  it("xếp hạng quán ít mâu thuẫn & đáp ứng nhiều tiêu chí nhất lên đầu, tính khoảng cách tới từng thành viên", () => {
    const room: Room = {
      id: "r1",
      code: "ABCDEF",
      name: "Nhóm đi chơi",
      phase: "filtering",
      votingMode: "swipe_match",
      members: [
        { id: "m1", displayName: "Minh", isMe: true, joinedAt: "", lat: 16.06, lng: 108.22 },
        { id: "m2", displayName: "Lan", isMe: false, joinedAt: "", lat: 16.05, lng: 108.21 },
      ],
      proposals: [
        {
          id: "p1",
          memberId: "m1",
          kind: "include",
          field: "category",
          value: "cafe",
          status: "open",
          createdAt: "",
        },
        {
          id: "p2",
          memberId: "m2",
          kind: "include",
          field: "priceMax",
          value: "1",
          status: "open",
          createdAt: "",
        },
      ],
      candidates: [
        {
          id: "c1",
          placeId: "place-expensive",
          addedByMemberId: "m1",
          createdAt: "",
          place: makePlace("place-expensive", { priceLevel: 3, category: "restaurant" }),
        },
        {
          id: "c2",
          placeId: "place-best",
          addedByMemberId: "m2",
          createdAt: "",
          place: makePlace("place-best", { priceLevel: 1, category: "cafe" }),
        },
      ],
      voteSummaries: [],
      votingProgress: { votedMemberIds: [], totalActiveMembers: 2, matchedCandidateIds: [] },
      filter: {
        categories: [],
        excludedCategories: [],
        districts: [],
        excludedDistricts: [],
        includeKeywords: [],
        excludeKeywords: [],
      },
      createdAt: "",
    }

    const ranked = scoreAndRankRoomCandidates(room)
    expect(ranked).toHaveLength(2)
    expect(ranked[0]?.candidate.placeId).toBe("place-best")
    expect(ranked[0]?.satisfiedCount).toBe(2)
    expect(ranked[0]?.conflicts).toHaveLength(0)
    expect(ranked[0]?.distances).toHaveLength(2)
    expect(ranked[0]?.avgDistanceKm).toBeGreaterThan(0)

    expect(ranked[1]?.candidate.placeId).toBe("place-expensive")
    expect(ranked[1]?.conflicts).toHaveLength(2)
    expect(ranked[1]?.conflicts.map((c) => c.memberName)).toEqual(["Minh", "Lan"])
  })

  it("gom nhóm OR trong cùng 1 thành viên (không báo mâu thuẫn giả) và xếp hạng theo khoảng cách công bằng", () => {
    const room: Room = {
      id: "r2",
      code: "XYZ123",
      name: "Nhóm OR",
      phase: "filtering",
      votingMode: "swipe_match",
      members: [
        { id: "m1", displayName: "Lan", isMe: true, joinedAt: "", lat: 16.06, lng: 108.22 },
        { id: "m2", displayName: "Nam", isMe: false, joinedAt: "", lat: 16.06, lng: 108.24 },
      ],
      proposals: [
        {
          id: "p1",
          memberId: "m1",
          kind: "include",
          field: "category",
          value: "cafe",
          status: "open",
          createdAt: "",
        },
        {
          id: "p2",
          memberId: "m1",
          kind: "include",
          field: "category",
          value: "bakery",
          status: "open",
          createdAt: "",
        },
        {
          id: "p3",
          memberId: "m1",
          kind: "include",
          field: "district",
          value: "Hải Châu",
          status: "open",
          createdAt: "",
        },
        {
          id: "p4",
          memberId: "m1",
          kind: "include",
          field: "district",
          value: "Sơn Trà",
          status: "open",
          createdAt: "",
        },
      ],
      candidates: [
        {
          id: "c-far-one",
          placeId: "place-far-one",
          addedByMemberId: "m1",
          createdAt: "",
          // Nằm ngay chỗ Lan nhưng xa Nam
          place: makePlace("place-far-one", {
            category: "cafe",
            district: "Hải Châu",
            lat: 16.06,
            lng: 108.21,
          }),
        },
        {
          id: "c-mid",
          placeId: "place-mid",
          addedByMemberId: "m2",
          createdAt: "",
          // Nằm ở giữa Lan và Nam
          place: makePlace("place-mid", {
            category: "bakery",
            district: "Sơn Trà",
            lat: 16.06,
            lng: 108.23,
          }),
        },
      ],
      voteSummaries: [],
      votingProgress: { votedMemberIds: [], totalActiveMembers: 2, matchedCandidateIds: [] },
      filter: {
        categories: [],
        excludedCategories: [],
        districts: [],
        excludedDistricts: [],
        includeKeywords: [],
        excludeKeywords: [],
      },
      createdAt: "",
    }

    const ranked = scoreAndRankRoomCandidates(room)
    // Cả hai quán đều đáp ứng 2/2 tiêu chí nhóm của Lan (OR category & OR district), 0 mâu thuẫn
    expect(ranked[0]?.conflicts).toHaveLength(0)
    expect(ranked[0]?.satisfiedCount).toBe(2)
    expect(ranked[0]?.totalCriteriaCount).toBe(2)
    expect(ranked[1]?.conflicts).toHaveLength(0)
    // Quán nằm giữa 2 người có điểm khoảng cách công bằng tốt hơn (maxDistance nhỏ hơn) -> xếp #1
    expect(ranked[0]?.candidate.placeId).toBe("place-mid")
  })
})
