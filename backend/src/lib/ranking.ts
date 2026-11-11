import type { PlaceCategory } from "@rendez/schema"
import { CATEGORY_LABEL } from "./enums"

/**
 * Xếp hạng địa điểm phù hợp với nội dung bài đăng — port 1:1 từ
 * `frontend/src/mocks/ranking.ts` (A7.1).
 *
 * Khác biệt duy nhất: chuỗi đã được chuẩn hoá (bỏ dấu, lowercase, dấu câu →
 * khoảng trắng) bằng `immutable_search_normalize()` của Postgres ở tầng SQL thay
 * vì `normalizeText` của JS — một nguồn chuẩn hoá duy nhất, không lặp logic
 * tiếng Việt ở 2 nơi. Trọng số, thứ tự xét, cách ghép `reason` giữ nguyên.
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

/** Ứng viên đã chuẩn hoá sẵn — SQL tính `*Norm`, ranking chỉ so khớp. */
export interface RankCandidate {
  id: string
  category: PlaceCategory
  rating: number
  reviewCount: number
  /** Tên gốc để hiển thị trong `reason` khi cần. */
  city: string
  nameNorm: string
  addressNorm: string
  cityNorm: string
  tagsNorm: string[]
}

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

export interface RankedCandidate<T extends RankCandidate = RankCandidate> {
  candidate: T
  score: number
  reason: string
}

export function rankPlaceSuggestions<T extends RankCandidate>(
  captionNorm: string,
  candidates: T[],
  limit = 3,
): RankedCandidate<T>[] {
  const captionTokens = new Set(tokenize(captionNorm))
  if (captionTokens.size === 0) return []

  const scored = candidates.map((candidate) => {
    let score = 0
    const reasons: string[] = []

    // 1. Tên địa điểm xuất hiện nguyên cụm trong bài — tín hiệu mạnh nhất.
    if (candidate.nameNorm.length >= 4 && captionNorm.includes(candidate.nameNorm)) {
      score += 60
      reasons.push("tên quán xuất hiện trong bài")
    } else {
      const nameHits = tokenize(candidate.nameNorm).filter((token) => captionTokens.has(token))
      if (nameHits.length > 0) {
        score += nameHits.length * 12
        reasons.push(`khớp tên: ${nameHits.slice(0, 2).join(", ")}`)
      }
    }

    // 2. Tag của địa điểm khớp với nội dung.
    const tagHits = candidate.tagsNorm.filter((tag) => tag.length >= 3 && captionNorm.includes(tag))
    if (tagHits.length > 0) {
      score += tagHits.length * 10
      reasons.push(`khớp tag: ${tagHits.slice(0, 2).join(", ")}`)
    }

    // 3. Từ khoá loại hình xuất hiện trong bài.
    const categoryKeywords = CATEGORY_KEYWORDS[candidate.category].filter((keyword) =>
      captionNorm.includes(keyword),
    )
    if (categoryKeywords.length > 0) {
      score += categoryKeywords.length * 8
      reasons.push(`cùng loại hình: ${CATEGORY_LABEL[candidate.category]}`)
    }

    // 4. Tên đường / thành phố được nhắc tới.
    const addressTokens = tokenize(candidate.addressNorm).filter((token) =>
      captionTokens.has(token),
    )
    if (addressTokens.length > 0) {
      score += addressTokens.length * 6
      reasons.push(`cùng khu vực: ${addressTokens.slice(0, 2).join(", ")}`)
    }
    if (candidate.cityNorm.length > 0 && captionNorm.includes(candidate.cityNorm)) {
      score += 5
      reasons.push(`cùng thành phố: ${candidate.city}`)
    }

    // 5. Điểm đánh giá chỉ dùng để phá hoà, không lấn át tín hiệu nội dung.
    score += candidate.rating * 0.6
    score += Math.min(candidate.reviewCount, 5000) / 5000

    return {
      candidate,
      score: Math.round(score * 10) / 10,
      reason: reasons.length > 0 ? reasons.slice(0, 2).join(" · ") : "cùng khu vực và loại hình",
    }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
