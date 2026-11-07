import type { Place } from "../types/place"
import { CATEGORY_META } from "./category-meta"

export interface RankedSuggestion {
  place: Place
  score: number
  reason: string
}

/** Bỏ dấu tiếng Việt + chữ thường để so khớp không phân biệt dấu. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

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

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

/**
 * Xếp hạng địa điểm phù hợp với nội dung một bài đăng.
 *
 * Đây là mô phỏng thuật toán gợi ý ở phía client: chấm điểm theo mức độ trùng
 * khớp giữa nội dung bài viết và thông tin địa điểm. Khi có backend, hàm này
 * được thay bằng kết quả ranking do server trả về — phần UI không phải đổi.
 */
export function rankPlaceSuggestions(
  caption: string,
  candidates: Place[],
  limit = 3,
): RankedSuggestion[] {
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
      // Hoặc khớp theo từng từ có nghĩa của tên quán.
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

    // 3. Từ khoá của loại hình (cà phê, bánh mì, ốc…) xuất hiện trong bài.
    const categoryKeywords = CATEGORY_META[place.category].keywords.filter((keyword) =>
      normalizedCaption.includes(keyword),
    )
    if (categoryKeywords.length > 0) {
      score += categoryKeywords.length * 8
      reasons.push(`cùng loại hình: ${CATEGORY_META[place.category].label}`)
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
