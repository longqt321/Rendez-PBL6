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
})
