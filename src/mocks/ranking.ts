import type { PlaceCategory } from "@/features/places/types/place"
import type { MockPlace } from "./fixtures/cold-start-places"
import { normalizeText } from "./text"

/**
 * Xếp hạng địa điểm phù hợp với nội dung bài đăng.
 *
 * ĐÂY LÀ LOGIC PHÍA SERVER. Toàn bộ phần chấm điểm, so khớp mờ, chọn top N nằm ở
 * đây và chỉ chạy bên trong `src/mocks/server.ts`. Frontend không import file này;
 * nó chỉ nhận mảng `PlaceSuggestion` đã xếp hạng sẵn qua API.
 *
 * Khi có backend thật, file này bị xoá cùng `src/mocks/`.
 */

const STOP_WORDS = new Set([
  "va",
  "cua",
  "cho",
  "voi",
  "thi",
  "la",
  "co",
  "mot",
  "nay",
  "do",
  "khi",
  "de",
  "o",
  "tai",
  "trong",
  "ra",
  "vao",
  "luc",
  "rat",
  "kha",
  "nhung",
  "minh",
  "ban",
  "an",
])

/** Từ khoá loại hình — dữ liệu của server, không phải của UI. */
const CATEGORY_KEYWORDS: Record<PlaceCategory, string[]> = {
  cafe: ["ca phe", "cafe", "coffee", "quan nuoc"],
  restaurant: ["quan an", "nha hang", "an com", "com tam", "bun bo", "pho", "lau"],
  "street-food": ["an vat", "banh mi", "banh canh", "banh khot", "xoi", "oc", "banh xeo"],
  bakery: ["tien banh", "banh ngot", "banh my", "bakery"],
  dessert: ["che", "kem", "flan", "trang mieng"],
  bar: ["bar", "bia", "cocktail", "rooftop", "pub"],
}

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  cafe: "Cà phê",
  restaurant: "Quán ăn",
  "street-food": "Ăn vặt",
  bakery: "Tiệm bánh",
  dessert: "Tráng miệng",
  bar: "Quán bar",
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

export interface RankedPlace {
  place: MockPlace
  score: number
  reason: string
}

export function rankPlaceSuggestions(
  caption: string,
  candidates: MockPlace[],
  limit = 3,
): RankedPlace[] {
  const normalizedCaption = normalizeText(caption)
  const captionTokens = new Set(tokenize(caption))

  if (captionTokens.size === 0) return []

  const scored = candidates.map((place) => {
    let score = 0
    const reasons: string[] = []

    // 1. Tên địa điểm xuất hiện nguyên cụm trong bài — tín hiệu mạnh nhất.
    const normalizedName = normalizeText(place.name)
    if (normalizedName.length >= 4 && normalizedCaption.includes(normalizedName)) {
      score += 60
      reasons.push("tên quán xuất hiện trong bài")
    } else {
      const nameHits = tokenize(place.name).filter((token) => captionTokens.has(token))
      if (nameHits.length > 0) {
        score += nameHits.length * 12
        reasons.push(`khớp tên: ${nameHits.slice(0, 2).join(", ")}`)
      }
    }

    // 2. Tag của địa điểm khớp với nội dung.
    const tagHits = place.tags.filter((tag) => {
      const normalizedTag = normalizeText(tag)
      return normalizedTag.length >= 3 && normalizedCaption.includes(normalizedTag)
    })
    if (tagHits.length > 0) {
      score += tagHits.length * 10
      reasons.push(`khớp tag: ${tagHits.slice(0, 2).join(", ")}`)
    }

    // 3. Từ khoá loại hình xuất hiện trong bài.
    const categoryKeywords = CATEGORY_KEYWORDS[place.category].filter((keyword) =>
      normalizedCaption.includes(keyword),
    )
    if (categoryKeywords.length > 0) {
      score += categoryKeywords.length * 8
      reasons.push(`cùng loại hình: ${CATEGORY_LABEL[place.category]}`)
    }

    // 4. Tên đường / thành phố được nhắc tới.
    const addressTokens = tokenize(place.address).filter((token) => captionTokens.has(token))
    if (addressTokens.length > 0) {
      score += addressTokens.length * 6
      reasons.push(`cùng khu vực: ${addressTokens.slice(0, 2).join(", ")}`)
    }
    if (normalizedCaption.includes(normalizeText(place.city))) {
      score += 5
      reasons.push(`cùng thành phố: ${place.city}`)
    }

    // 5. Điểm đánh giá chỉ dùng để phá hoà, không lấn át tín hiệu nội dung.
    score += place.rating * 0.6
    score += Math.min(place.reviewCount, 5000) / 5000

    return {
      place,
      score: Math.round(score * 10) / 10,
      reason: reasons.length > 0 ? reasons.slice(0, 2).join(" · ") : "cùng khu vực và loại hình",
    }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
