import type { PlaceCategory } from "@rendez/schema"
import { CATEGORY_LABEL } from "./enums"

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

const CATEGORY_KEYWORDS: Record<PlaceCategory, string[]> = {
  cafe: ["ca phe", "cafe", "coffee", "quan nuoc"],
  restaurant: ["quan an", "nha hang", "an com", "com tam", "bun bo", "pho", "lau"],
  "street-food": ["an vat", "banh mi", "banh canh", "banh khot", "xoi", "oc", "banh xeo"],
  bakery: ["tiem banh", "banh ngot", "banh my", "bakery"],
  dessert: ["che", "kem", "flan", "trang mieng"],
  bar: ["bar", "bia", "cocktail", "rooftop", "pub"],
}

export interface RankCandidate {
  id: string
  category: PlaceCategory
  rating: number
  reviewCount: number

  city: string
  district?: string | null
  districtNorm?: string
  nameNorm: string
  addressNorm: string
  cityNorm: string
  tags?: string[]
  tagsNorm: string[]
}

export function hasNormalizedPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) return false
  let from = 0
  for (;;) {
    const idx = haystack.indexOf(phrase, from)
    if (idx === -1) return false
    const before = idx === 0 ? "" : (haystack[idx - 1] ?? "")
    const after = haystack[idx + phrase.length] ?? ""
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true
    from = idx + 1
  }
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
    if (candidate.nameNorm.length >= 4 && hasNormalizedPhrase(captionNorm, candidate.nameNorm)) {
      score += 60
      reasons.push("Nhắc đúng tên quán trong bài")
    } else {
      const nameHits = tokenize(candidate.nameNorm).filter((token) => captionTokens.has(token))
      if (nameHits.length > 0) {
        score += nameHits.length * 12
        reasons.push("Tên quán gần khớp nội dung bài")
      }
    }

    // 2. Tag của địa điểm khớp với nội dung.
    const tagHitLabels: string[] = []
    let tagHitCount = 0
    candidate.tagsNorm.forEach((tag, idx) => {
      if (tag.length >= 3 && hasNormalizedPhrase(captionNorm, tag)) {
        tagHitCount += 1
        const label = candidate.tags?.[idx]
        if (label && !tagHitLabels.includes(label)) tagHitLabels.push(label)
      }
    })
    if (tagHitCount > 0) {
      score += tagHitCount * 10
      reasons.push(
        tagHitLabels.length > 0
          ? `Phù hợp: ${tagHitLabels.slice(0, 2).join(", ")}`
          : "Khớp đặc điểm bạn nhắc tới",
      )
    }

    // 3. Từ khoá loại hình xuất hiện trong bài.
    const categoryKeywords = CATEGORY_KEYWORDS[candidate.category].filter((keyword) =>
      hasNormalizedPhrase(captionNorm, keyword),
    )
    if (categoryKeywords.length > 0) {
      score += categoryKeywords.length * 8
      reasons.push(`Cùng nhóm ${CATEGORY_LABEL[candidate.category]}`)
    }

    // 4. Quận / tên đường / thành phố được nhắc tới.
    if (
      candidate.district &&
      candidate.districtNorm &&
      hasNormalizedPhrase(captionNorm, candidate.districtNorm)
    ) {
      score += 8
      reasons.push(`Khu vực ${candidate.district}`)
    } else {
      const addressTokens = tokenize(candidate.addressNorm).filter((token) =>
        captionTokens.has(token),
      )
      if (addressTokens.length > 0) {
        score += addressTokens.length * 6
        reasons.push("Trùng tên đường trong bài")
      }
    }
    if (candidate.cityNorm.length > 0 && hasNormalizedPhrase(captionNorm, candidate.cityNorm)) {
      score += 5
      reasons.push(`Tại ${candidate.city}`)
    }

    // 5. Điểm đánh giá chỉ dùng để phá hoà, không lấn át tín hiệu nội dung.
    score += candidate.rating * 0.6
    score += Math.min(candidate.reviewCount, 5000) / 5000

    return {
      candidate,
      score: Math.round(score * 10) / 10,
      reason: reasons.length > 0 ? reasons.slice(0, 2).join(" · ") : "Gợi ý theo nội dung bài viết",
    }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
