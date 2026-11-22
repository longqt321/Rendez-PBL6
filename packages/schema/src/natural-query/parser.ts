import type { PlaceCategory } from "../types/place"
import {
  PLACE_CATEGORY_LABELS,
  normalizeQueryText,
  tokenizeWithSpans,
  type DanangDistrictName,
  type ParsedFilterChip,
  type ParsedNaturalQuery,
  type RawToken,
} from "./constants"
import { FILLER_CONNECTORS, matchNegationAt, matchPhraseAt } from "./lexicon"

function priceLabel(level: 1 | 2 | 3): string {
  if (level === 1) return "Giá: ₫ (Bình dân)"
  if (level === 2) return "Giá: ₫₫ trở xuống"
  return "Giá: ₫₫₫"
}

export function parseNaturalFilterQuery(rawQuery: string): ParsedNaturalQuery {
  const trimmed = rawQuery.trim()
  if (!trimmed) {
    return {
      categories: [],
      excludeCategories: [],
      districts: [],
      excludeDistricts: [],
      tags: [],
      excludeKeywords: [],
      alwaysOpen: false,
      nearMe: false,
      residualQuery: "",
      matchedPhrases: [],
      chips: [],
    }
  }

  const tokens = tokenizeWithSpans(trimmed)
  const maskedForResidual = new Array<boolean>(tokens.length).fill(false)

  const categories = new Set<PlaceCategory>()
  const excludeCategories = new Set<PlaceCategory>()
  const districts = new Set<DanangDistrictName>()
  const excludeDistricts = new Set<DanangDistrictName>()
  const tags = new Set<string>()
  const excludeKeywords = new Set<string>()
  const matchedPhrases: string[] = []
  const chips: ParsedFilterChip[] = []
  let priceMax: 1 | 2 | 3 | undefined
  let alwaysOpen = false
  let nearMe = false

  const seenChipKeys = new Set<string>()
  const pushChip = (chip: ParsedFilterChip) => {
    const key = `${chip.kind}:${chip.field}:${chip.value}`
    if (seenChipKeys.has(key)) return
    seenChipKeys.add(key)
    chips.push(chip)
  }

  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]!
    if (tok.isSeparator) {
      maskedForResidual[i] = true
      i += 1
      continue
    }

    // 1. Kiểm tra tiền tố phủ định ("không", "không ăn", "né", "trừ"...)
    const negLen = matchNegationAt(tokens, i)
    if (negLen > 0) {
      const targetStart = i + negLen
      // Bỏ qua từ đệm nếu người dùng viết "né quận Cẩm Lệ"
      let afterFiller = targetStart
      if (
        afterFiller < tokens.length &&
        !tokens[afterFiller]!.isSeparator &&
        tokens[afterFiller]!.folded === "quan"
      ) {
        const afterQuan = matchPhraseAt(tokens, afterFiller + 1)
        if (afterQuan?.kind === "district") {
          afterFiller += 1
        }
      }

      const negMatch = afterFiller < tokens.length ? matchPhraseAt(tokens, afterFiller) : null
      if (negMatch) {
        const spanEnd = afterFiller + negMatch.tokens.length
        const rawPhrase = tokens
          .slice(i, spanEnd)
          .map((t) => t.original)
          .join(" ")
        for (let m = i; m < spanEnd; m += 1) maskedForResidual[m] = true
        matchedPhrases.push(negMatch.phrase)

        if (negMatch.kind === "category" && negMatch.category) {
          excludeCategories.add(negMatch.category)
          pushChip({
            id: `exclude-category-${negMatch.category}`,
            kind: "exclude",
            field: "category",
            value: negMatch.category,
            label: `Không ${PLACE_CATEGORY_LABELS[negMatch.category].toLowerCase()}`,
            rawPhrase,
          })
          i = spanEnd
          continue
        }

        if (negMatch.kind === "district" && negMatch.district) {
          excludeDistricts.add(negMatch.district)
          pushChip({
            id: `exclude-district-${negMatch.district}`,
            kind: "exclude",
            field: "district",
            value: negMatch.district,
            label: `Không ${negMatch.district}`,
            rawPhrase,
          })
          i = spanEnd
          continue
        }

        // Phủ định tag / món ăn (vd "không ăn hải sản") -> excludeKeywords
        const kwOriginal = tokens
          .slice(afterFiller, spanEnd)
          .map((t) => t.original)
          .join(" ")
        if (kwOriginal) {
          excludeKeywords.add(kwOriginal)
          pushChip({
            id: `exclude-keyword-${normalizeQueryText(kwOriginal)}`,
            kind: "exclude",
            field: "keyword",
            value: kwOriginal,
            label: `Không “${kwOriginal}”`,
            rawPhrase,
          })
        }
        i = spanEnd
        continue
      }

      // Không khớp từ điển: gom tối đa 3 token tự do cho đến dấu phẩy / liên từ / từ điển mới
      let kwEnd = targetStart
      while (kwEnd < tokens.length && kwEnd - targetStart < 3) {
        const cur = tokens[kwEnd]!
        if (cur.isSeparator) break
        if (cur.folded === "va" || cur.folded === "hoac" || cur.folded === "nhung") break
        if (matchNegationAt(tokens, kwEnd) > 0) break
        const nextSpec = matchPhraseAt(tokens, kwEnd)
        if (nextSpec && nextSpec.kind !== "tag") break
        kwEnd += 1
      }

      if (kwEnd > targetStart) {
        const rawPhrase = tokens
          .slice(i, kwEnd)
          .map((t) => t.original)
          .join(" ")
        const kwOriginal = tokens
          .slice(targetStart, kwEnd)
          .map((t) => t.original)
          .join(" ")
        for (let m = i; m < kwEnd; m += 1) maskedForResidual[m] = true
        excludeKeywords.add(kwOriginal)
        pushChip({
          id: `exclude-keyword-${normalizeQueryText(kwOriginal)}`,
          kind: "exclude",
          field: "keyword",
          value: kwOriginal,
          label: `Không “${kwOriginal}”`,
          rawPhrase,
        })
        i = kwEnd
        continue
      }
    }

    // 2. Khớp cụm từ điển dương
    const match = matchPhraseAt(tokens, i)
    if (match) {
      const spanEnd = i + match.tokens.length
      const rawPhrase = tokens
        .slice(i, spanEnd)
        .map((t) => t.original)
        .join(" ")
      matchedPhrases.push(match.phrase)

      if (match.maskFromResidual) {
        for (let m = i; m < spanEnd; m += 1) maskedForResidual[m] = true
        // Nuốt các từ đệm ngay trước cụm đã mask (vd: "ở Hải Châu", "tại quận Sơn Trà")
        let back = i - 1
        while (back >= 0 && !maskedForResidual[back] && FILLER_CONNECTORS.has(tokens[back]!.folded)) {
          maskedForResidual[back] = true
          back -= 1
        }
      }

      if (match.kind === "category" && match.category) {
        categories.add(match.category)
        pushChip({
          id: `include-category-${match.category}`,
          kind: "include",
          field: "category",
          value: match.category,
          label: PLACE_CATEGORY_LABELS[match.category],
          rawPhrase,
        })
      } else if (match.kind === "district" && match.district) {
        districts.add(match.district)
        pushChip({
          id: `include-district-${match.district}`,
          kind: "include",
          field: "district",
          value: match.district,
          label: match.district,
          rawPhrase,
        })
      } else if (match.kind === "priceMax" && match.priceMax) {
        priceMax = priceMax ? (Math.min(priceMax, match.priceMax) as 1 | 2 | 3) : match.priceMax
        pushChip({
          id: `include-priceMax-${priceMax}`,
          kind: "include",
          field: "priceMax",
          value: String(priceMax),
          label: priceLabel(priceMax),
          rawPhrase,
        })
      } else if (match.kind === "nearMe") {
        nearMe = true
        pushChip({
          id: "include-nearMe-1",
          kind: "include",
          field: "nearMe",
          value: "1",
          label: "Gần tôi",
          rawPhrase,
        })
      } else if (match.kind === "alwaysOpen") {
        alwaysOpen = true
        pushChip({
          id: "include-alwaysOpen-1",
          kind: "include",
          field: "alwaysOpen",
          value: "1",
          label: "Mở khuya / 24h",
          rawPhrase,
        })
      } else if (match.kind === "tag" && match.tags) {
        for (const t of match.tags) tags.add(t)
      }

      i = spanEnd
      continue
    }

    i += 1
  }

  // Nếu có >1 loại hình cụ thể đi kèm "restaurant" không chủ đích, tránh mở rộng quá tay nếu "an" trùng phụ
  // (với danh sách OR ở câu như "cà phê hoặc tiệm bánh", categories chứa ["cafe", "bakery"] vẫn giữ nguyên cả hai).

  // Dọn các liên từ / giới từ đứng lẻ loi ở rìa cụm residual (vd "có", "ở", "tại", "và", "hoặc")
  const remainingTokens: RawToken[] = []
  for (let idx = 0; idx < tokens.length; idx += 1) {
    if (maskedForResidual[idx]) continue
    remainingTokens.push(tokens[idx]!)
  }
  while (remainingTokens.length > 0 && FILLER_CONNECTORS.has(remainingTokens[0]!.folded)) {
    remainingTokens.shift()
  }
  while (
    remainingTokens.length > 0 &&
    FILLER_CONNECTORS.has(remainingTokens[remainingTokens.length - 1]!.folded)
  ) {
    remainingTokens.pop()
  }

  const residualQuery = remainingTokens
    .filter((t) => !t.isSeparator)
    .map((t) => t.original)
    .join(" ")
    .trim()

  return {
    categories: [...categories],
    excludeCategories: [...excludeCategories],
    districts: [...districts],
    excludeDistricts: [...excludeDistricts],
    ...(priceMax !== undefined ? { priceMax } : {}),
    tags: [...tags],
    excludeKeywords: [...excludeKeywords],
    alwaysOpen,
    nearMe,
    residualQuery,
    matchedPhrases,
    chips,
  }
}

export function removeChipFromQuery(rawQuery: string, chip: Pick<ParsedFilterChip, "rawPhrase">): string {
  if (!chip.rawPhrase.trim()) return rawQuery.trim()
  const tokens = tokenizeWithSpans(rawQuery)
  const targetTokens = tokenizeWithSpans(chip.rawPhrase).map((t) => t.folded)
  if (targetTokens.length === 0) return rawQuery.trim()

  const toRemove = new Array<boolean>(tokens.length).fill(false)
  for (let i = 0; i <= tokens.length - targetTokens.length; i += 1) {
    let ok = true
    for (let j = 0; j < targetTokens.length; j += 1) {
      if (tokens[i + j]!.folded !== targetTokens[j]) {
        ok = false
        break
      }
    }
    if (ok) {
      for (let j = i; j < i + targetTokens.length; j += 1) {
        toRemove[j] = true
      }
      // Xoá luôn giới từ đệm ngay phía trước nếu có ("ở", "tại", "quận")
      let back = i - 1
      while (back >= 0 && FILLER_CONNECTORS.has(tokens[back]!.folded)) {
        toRemove[back] = true
        back -= 1
      }
      break
    }
  }

  const next = tokens
    .filter((t, idx) => !toRemove[idx] && !t.isSeparator)
    .map((t) => t.original)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim()

  return next
}
