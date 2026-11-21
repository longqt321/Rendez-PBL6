import type { PlaceCategory } from "./types/place"

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

interface RawToken {
  original: string
  folded: string
  start: number
  end: number
  isSeparator: boolean
}

function tokenizeWithSpans(input: string): RawToken[] {
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

interface PhraseSpec {
  phrase: string
  tokens: string[]
  kind: "category" | "district" | "priceMax" | "nearMe" | "alwaysOpen" | "tag"
  category?: PlaceCategory
  district?: DanangDistrictName
  priceMax?: 1 | 2 | 3
  tags?: string[]
  /** Chỉ mask khỏi residualQuery nếu đây là thuộc tính SQL cứng (category/district/price/nearMe/alwaysOpen). */
  maskFromResidual: boolean
}

function spec(
  phrases: string[],
  rest: Omit<PhraseSpec, "phrase" | "tokens">,
): PhraseSpec[] {
  return phrases.map((phrase) => ({
    phrase,
    tokens: phrase.split(" ").filter(Boolean),
    ...rest,
  }))
}

const PHRASE_SPECS: PhraseSpec[] = [
  // --- Loại hình (Broad categories -> promote thành SQL WHERE & mask khỏi residualQuery) ---
  ...spec(
    [
      "quan ca phe",
      "tiem ca phe",
      "ca phe",
      "caphe",
      "coffee shop",
      "coffeehouse",
      "coffee",
      "cafe",
      "tra sua",
      "quan nuoc",
    ],
    { kind: "category", category: "cafe", maskFromResidual: true },
  ),
  ...spec(["nha hang", "quan an", "an toi", "an trua"], {
    kind: "category",
    category: "restaurant",
    maskFromResidual: true,
  }),
  ...spec(["quan an vat", "an vat", "duong pho", "street food", "quan via he", "via he", "ban hang rong"], {
    kind: "category",
    category: "street-food",
    maskFromResidual: true,
  }),
  ...spec(["tiem banh", "banh ngot", "bakery"], {
    kind: "category",
    category: "bakery",
    maskFromResidual: true,
  }),
  ...spec(["trang mieng", "quan che", "tiem che", "che thai", "che sau", "che buoi", "tiem kem", "gelato", "bingsu"], {
    kind: "category",
    category: "dessert",
    maskFromResidual: true,
  }),
  ...spec(["quan bar", "cocktail bar", "sports bar", "wine bar", "dive bar", "quan bia", "quan nhau", "craft beer", "bar", "pub", "cocktail"], {
    kind: "category",
    category: "bar",
    maskFromResidual: true,
  }),

  // --- 6 Quận Đà Nẵng ---
  ...spec(["hai chau"], { kind: "district", district: "Hải Châu", maskFromResidual: true }),
  ...spec(["thanh khe"], { kind: "district", district: "Thanh Khê", maskFromResidual: true }),
  ...spec(["ban dao son tra", "son tra"], {
    kind: "district",
    district: "Sơn Trà",
    maskFromResidual: true,
  }),
  ...spec(["ngu hanh son", "non nuoc"], {
    kind: "district",
    district: "Ngũ Hành Sơn",
    maskFromResidual: true,
  }),
  ...spec(["lien chieu"], { kind: "district", district: "Liên Chiểu", maskFromResidual: true }),
  ...spec(["cam le"], { kind: "district", district: "Cẩm Lệ", maskFromResidual: true }),

  // --- Mức giá ---
  ...spec(["duoi 50k", "duoi 40k", "duoi 30k", "gia re", "binh dan", "gia sinh vien", "sinh vien"], {
    kind: "priceMax",
    priceMax: 1,
    maskFromResidual: true,
  }),
  ...spec(["duoi 100k", "duoi 150k", "duoi 200k", "tam trung", "vua tui tien", "trung binh"], {
    kind: "priceMax",
    priceMax: 2,
    maskFromResidual: true,
  }),
  ...spec(["cao cap", "sang trong", "fine dining"], {
    kind: "priceMax",
    priceMax: 3,
    maskFromResidual: true,
  }),

  // --- Gần tôi / vị trí ---
  ...spec(["gan toi", "gan day", "quanh day", "xung quanh"], {
    kind: "nearMe",
    maskFromResidual: true,
  }),

  // --- Giờ mở cửa 24/7 / khuya ---
  ...spec(
    [
      "24 7",
      "24h",
      "mo cua 24",
      "mo ca dem",
      "an khuya",
      "an dem",
      "mo khuya",
      "qua dem",
      "xuyen dem",
      "mo cua ca ngay",
    ],
    { kind: "alwaysOpen", maskFromResidual: true },
  ),

  // --- Tags tiện ích, không gian & món ăn (giữ trong residualQuery khi dương để vector/trigram bám sát, chỉ mask khi bị phủ định) ---
  ...spec(["lam viec nhom", "lam viec", "hoc bai", "hoc tap", "study", "laptop", "yen tinh"], {
    kind: "tag",
    tags: ["Làm việc"],
    maskFromResidual: false,
  }),
  ...spec(["mang internet", "mang wifi", "wifi", "internet"], {
    kind: "tag",
    tags: ["Wifi"],
    maskFromResidual: false,
  }),
  ...spec(["ngoai troi", "san vuon", "view dep", "view bien", "thoang mat", "lang man"], {
    kind: "tag",
    tags: ["Ngoài trời"],
    maskFromResidual: false,
  }),
  ...spec(["mang di", "take away", "takeaway", "mua ve", "mang ve"], {
    kind: "tag",
    tags: ["Mang đi"],
    maskFromResidual: false,
  }),
  ...spec(["an chay", "chay", "vegan", "vegetarian"], {
    kind: "tag",
    tags: ["Chay"],
    maskFromResidual: false,
  }),
  ...spec(["nhau nhet", "nhau", "bia"], {
    kind: "tag",
    tags: ["Nhậu nhẹt"],
    maskFromResidual: false,
  }),
  ...spec(["giai tri", "vui choi", "tro choi", "game"], {
    kind: "tag",
    tags: ["Giải trí"],
    maskFromResidual: false,
  }),
  ...spec(["hai san tuoi", "hai san", "tom hum", "cua ghe", "tom", "oc", "seafood"], {
    kind: "tag",
    tags: ["Hải sản"],
    maskFromResidual: false,
  }),
  ...spec(["pizza"], { kind: "tag", tags: ["Pizza"], maskFromResidual: false }),
  ...spec(["bit tet", "steak", "bo ne"], { kind: "tag", tags: ["Bít tết"], maskFromResidual: false }),
  ...spec(["hamburger", "burger"], { kind: "tag", tags: ["Burger"], maskFromResidual: false }),
  ...spec(["ga ran", "fried chicken", "kfc"], { kind: "tag", tags: ["Gà rán"], maskFromResidual: false }),
  ...spec(["mon nhat", "nhat ban", "sashimi", "sushi"], {
    kind: "tag",
    tags: ["Món Nhật"],
    maskFromResidual: false,
  }),
  ...spec(["mon han", "han quoc", "kim chi", "tokbokki"], {
    kind: "tag",
    tags: ["Món Hàn"],
    maskFromResidual: false,
  }),
  ...spec(["dac san", "mon dia phuong"], {
    kind: "tag",
    tags: ["Đặc sản địa phương"],
    maskFromResidual: false,
  }),
  ...spec(["mon viet", "viet nam", "com viet"], {
    kind: "tag",
    tags: ["Món Việt"],
    maskFromResidual: false,
  }),
  ...spec(["mon a", "mon thai"], { kind: "tag", tags: ["Món Á"], maskFromResidual: false }),

  // --- Từ khoá tiếng Anh (giữ tương thích dữ liệu thử nghiệm đa ngữ) ---
  ...spec(["outdoor seating", "outside seating", "patio"], {
    kind: "tag",
    tags: ["Outdoor Seating"],
    maskFromResidual: false,
  }),
  ...spec(["takeout", "take out", "to go"], {
    kind: "tag",
    tags: ["Takeout"],
    maskFromResidual: false,
  }),
  ...spec(["good for groups", "group friendly"], {
    kind: "tag",
    tags: ["Good for Groups"],
    maskFromResidual: false,
  }),
  ...spec(["happy hour"], { kind: "tag", tags: ["Happy Hour"], maskFromResidual: false }),
  ...spec(["reservations", "reservation", "book a table"], {
    kind: "tag",
    tags: ["Reservations"],
    maskFromResidual: false,
  }),
  ...spec(["table service", "waiter service"], {
    kind: "tag",
    tags: ["Waiter Service"],
    maskFromResidual: false,
  }),
  ...spec(["veggie"], { kind: "tag", tags: ["Vegetarian"], maskFromResidual: false }),
  ...spec(["gluten free"], { kind: "tag", tags: ["Gluten-Free"], maskFromResidual: false }),
  ...spec(["fish and chips"], { kind: "tag", tags: ["Seafood", "Hải sản"], maskFromResidual: false }),
  ...spec(["steakhouse"], { kind: "tag", tags: ["Steakhouses", "Bít tết"], maskFromResidual: false }),
  ...spec(["burgers"], { kind: "tag", tags: ["Burgers", "Burger"], maskFromResidual: false }),
  ...spec(["barbecue", "bbq", "ribs"], { kind: "tag", tags: ["Barbeque"], maskFromResidual: false }),
  ...spec(["chicken wings", "wings"], { kind: "tag", tags: ["Chicken Wings"], maskFromResidual: false }),
  ...spec(["sandwiches", "sandwich"], { kind: "tag", tags: ["Sandwiches"], maskFromResidual: false }),
  ...spec(["salad"], { kind: "tag", tags: ["Salad"], maskFromResidual: false }),
  ...spec(["delis", "deli"], { kind: "tag", tags: ["Delis"], maskFromResidual: false }),
  ...spec(["ramen"], { kind: "tag", tags: ["Ramen"], maskFromResidual: false }),
  ...spec(["noodles", "noodle"], { kind: "tag", tags: ["Noodles"], maskFromResidual: false }),
  ...spec(["bubble tea", "boba"], { kind: "tag", tags: ["Bubble Tea"], maskFromResidual: false }),
  ...spec(["cheesesteak", "cheese steak"], {
    kind: "tag",
    tags: ["Cheesesteaks"],
    maskFromResidual: false,
  }),
  ...spec(["food truck"], { kind: "tag", tags: ["Food Trucks"], maskFromResidual: false }),
  ...spec(["japanese"], { kind: "tag", tags: ["Japanese", "Món Nhật"], maskFromResidual: false }),
  ...spec(["korean", "kimchi"], { kind: "tag", tags: ["Korean", "Món Hàn"], maskFromResidual: false }),
  ...spec(["vietnamese", "pho"], { kind: "tag", tags: ["Vietnamese", "Món Việt"], maskFromResidual: false }),
  ...spec(["thai"], { kind: "tag", tags: ["Thai", "Món Á"], maskFromResidual: false }),
  ...spec(["indian", "curry"], { kind: "tag", tags: ["Indian"], maskFromResidual: false }),
  ...spec(["chinese"], { kind: "tag", tags: ["Chinese"], maskFromResidual: false }),
  ...spec(["italian"], { kind: "tag", tags: ["Italian"], maskFromResidual: false }),
  ...spec(["mexican", "taco", "tacos", "burrito"], {
    kind: "tag",
    tags: ["Mexican"],
    maskFromResidual: false,
  }),
  ...spec(["breakfast", "brunch"], { kind: "tag", tags: ["Breakfast & Brunch"], maskFromResidual: false }),
  ...spec(["diners", "diner"], { kind: "tag", tags: ["Diners"], maskFromResidual: false }),
  ...spec(["soup"], { kind: "tag", tags: ["Soup"], maskFromResidual: false }),
  ...spec(["bagels", "bagel"], { kind: "tag", tags: ["Bagels"], maskFromResidual: false }),
  ...spec(["hot dogs", "hot dog"], { kind: "tag", tags: ["Hot Dogs"], maskFromResidual: false }),
  ...spec(["fast food"], { kind: "tag", tags: ["Fast Food"], maskFromResidual: false }),
  ...spec(["desserts", "dessert", "sweets"], { kind: "tag", tags: ["Desserts"], maskFromResidual: false }),
  ...spec(["donuts", "donut", "doughnut"], { kind: "tag", tags: ["Donuts"], maskFromResidual: false }),
  ...spec(["ice cream", "frozen yogurt"], {
    kind: "tag",
    tags: ["Ice Cream & Frozen Yogurt"],
    maskFromResidual: false,
  }),
  ...spec(["smoothie", "juice bar"], {
    kind: "tag",
    tags: ["Juice Bars & Smoothies"],
    maskFromResidual: false,
  }),
  ...spec(["cocktails"], { kind: "tag", tags: ["Cocktail Bars"], maskFromResidual: false }),
  ...spec(["pubs"], { kind: "tag", tags: ["Pubs"], maskFromResidual: false }),
  ...spec(["breweries", "brewery"], { kind: "tag", tags: ["Breweries"], maskFromResidual: false }),
  ...spec(["wine bars"], { kind: "tag", tags: ["Wine Bars"], maskFromResidual: false }),
].sort((a, b) => b.tokens.length - a.tokens.length || b.phrase.length - a.phrase.length)

const NEGATION_TRIGGERS: readonly string[][] = [
  ["khong", "an"],
  ["khong", "uong"],
  ["khong", "di"],
  ["khong", "muon"],
  ["khong", "chon"],
  ["khong", "thich"],
  ["ngoai", "tru"],
  ["loai", "tru"],
  ["loai", "bo"],
  ["bo", "qua"],
  ["khong"],
  ["tranh"],
]

const ACCENTED_SINGLE_NEGATIONS = new Set(["né", "trừ"])

const FILLER_CONNECTORS = new Set([
  "o",
  "tai",
  "quan",
  "khu",
  "vuc",
  "va",
  "hoac",
  "voi",
  "muc",
  "gia",
  "tam",
  "duoi",
])

function matchPhraseAt(tokens: RawToken[], startIdx: number): PhraseSpec | null {
  for (const entry of PHRASE_SPECS) {
    const len = entry.tokens.length
    if (startIdx + len > tokens.length) continue
    let ok = true
    for (let k = 0; k < len; k += 1) {
      const tok = tokens[startIdx + k]!
      if (tok.isSeparator || tok.folded !== entry.tokens[k]) {
        ok = false
        break
      }
    }
    if (ok) return entry
  }
  return null
}

function matchNegationAt(tokens: RawToken[], startIdx: number): number {
  for (const neg of NEGATION_TRIGGERS) {
    if (startIdx + neg.length > tokens.length) continue
    let ok = true
    for (let k = 0; k < neg.length; k += 1) {
      const tok = tokens[startIdx + k]!
      if (tok.isSeparator || tok.folded !== neg[k]) {
        ok = false
        break
      }
    }
    if (ok) return neg.length
  }
  const cur = tokens[startIdx]
  if (cur && !cur.isSeparator) {
    const lowerOrig = cur.original.toLowerCase()
    if (ACCENTED_SINGLE_NEGATIONS.has(lowerOrig)) {
      // Tránh hiểu nhầm "bò né" thành phủ định
      const prevFolded = startIdx > 0 ? tokens[startIdx - 1]?.folded : undefined
      if (lowerOrig === "né" && prevFolded === "bo") return 0
      return 1
    }
  }
  return 0
}

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
