import type { PlaceCategory } from "../types/place"

export type DanangDistrictName =
  | "Hải Châu"
  | "Thanh Khê"
  | "Sơn Trà"
  | "Ngũ Hành Sơn"
  | "Liên Chiểu"
  | "Cẩm Lệ"

export const DANANG_DISTRICTS_CANONICAL: readonly DanangDistrictName[] = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Liên Chiểu",
  "Cẩm Lệ",
] as const

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: "Quán ăn",
  cafe: "Cà phê",
  "street-food": "Ăn vặt",
  bakery: "Tiệm bánh",
  dessert: "Tráng miệng",
  bar: "Quán bar",
}

export interface ParsedFilterChip {
  id: string
  kind: "include" | "exclude"
  field: "category" | "district" | "priceMax" | "tag" | "nearMe" | "alwaysOpen" | "keyword"
  value: string
  label: string
  rawPhrase: string
}

export interface ParsedNaturalQuery {
  categories: PlaceCategory[]
  excludeCategories: PlaceCategory[]
  districts: DanangDistrictName[]
  excludeDistricts: DanangDistrictName[]
  priceMax?: 1 | 2 | 3
  tags: string[]
  excludeKeywords: string[]
  alwaysOpen: boolean
  nearMe: boolean
  residualQuery: string
  matchedPhrases: string[]
  chips: ParsedFilterChip[]
}

export function normalizeQueryText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

function foldToken(token: string): string {
  return normalizeQueryText(token)
}

export interface RawToken {
  original: string
  folded: string
  start: number
  end: number
  isSeparator: boolean
}

export function tokenizeWithSpans(input: string): RawToken[] {
  const tokens: RawToken[] = []
  // Giữ dấu phẩy / chấm phẩy làm ranh giới mệnh đề để phủ định không lan sang vế sau.
  const re = /([,;]|[^\s,;]+)/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(input)) !== null) {
    const raw = match[0]
    if (raw === "," || raw === ";") {
      tokens.push({
        original: raw,
        folded: raw,
        start: match.index,
        end: match.index + raw.length,
        isSeparator: true,
      })
      continue
    }
    const folded = foldToken(raw)
    if (!folded) continue
    // Nếu 1 token gốc tách thành nhiều phần (vd "24/7" -> "24 7" hoặc "quán," -> "quan"), đẩy từng sub-token
    const subParts = folded.split(" ").filter(Boolean)
    if (subParts.length === 1) {
      tokens.push({
        original: raw,
        folded: subParts[0]!,
        start: match.index,
        end: match.index + raw.length,
        isSeparator: false,
      })
    } else {
      for (const part of subParts) {
        tokens.push({
          original: part,
          folded: part,
          start: match.index,
          end: match.index + raw.length,
          isSeparator: false,
        })
      }
    }
  }
  return tokens
}
