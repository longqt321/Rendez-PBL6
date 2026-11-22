import type { PlaceCategory } from "../types/place"
import type { DanangDistrictName, RawToken } from "./constants"

export interface PhraseSpec {
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

export const FILLER_CONNECTORS = new Set([
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

export function matchPhraseAt(tokens: RawToken[], startIdx: number): PhraseSpec | null {
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

export function matchNegationAt(tokens: RawToken[], startIdx: number): number {
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
