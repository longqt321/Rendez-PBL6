/**
 * Rule intent parse: cụm từ tiếng Việt → thuộc tính có cấu trúc của venue.
 *
 * Vì sao cần: dense retrieval giỏi "ý định mơ hồ" nhưng kém khi người dùng nêu
 * ĐÚNG một thuộc tính có trong dữ liệu ("quán chay", "hải sản", "ở Sơn Trà").
 * Nhánh structured biến các cụm đó thành điều kiện tag/category/district, đưa
 * vào RRF như nhánh thứ ba — không hard filter (tránh 0 kết quả khi nhận sai).
 *
 * Từ vựng lấy từ chính dữ liệu: 23 tag và 5 category đang có trong DB + cách
 * người Việt hay gọi. KHÔNG chứa câu truy vấn cụ thể của bộ eval — thêm từ mới
 * phải dựa trên từ vựng dữ liệu, không dựa trên một query đang chấm điểm.
 */

export interface IntentAttributes {
  tags: string[]
  categories: string[]
  districts: string[]
  /** Người dùng cần quán mở 24/7 / ăn khuya. */
  alwaysOpen: boolean
}

interface LexiconEntry {
  /** Cụm so khớp trên chuỗi đã chuẩn hoá (không dấu, chữ thường). */
  phrases: string[]
  tags?: string[]
  categories?: string[]
  districts?: string[]
  alwaysOpen?: boolean
}

/** Tên quận trong dữ liệu — dùng cho cả lexicon lẫn kiểm tra đầu vào. */
export const DISTRICT_NAMES = [
  "Hải Châu",
  "Ngũ Hành Sơn",
  "Thanh Khê",
  "Liên Chiểu",
  "Sơn Trà",
  "Cẩm Lệ",
] as const

const LEXICON: LexiconEntry[] = [
  // --- Thuộc tính tiện ích / không gian ---
  {
    phrases: ["lam viec", "hoc bai", "hoc tap", "study", "laptop", "lam viec nhom", "yen tinh"],
    tags: ["Làm việc"],
  },
  { phrases: ["wifi", "internet", "mang internet", "mang wifi"], tags: ["Wifi"] },
  {
    phrases: ["ngoai troi", "san vuon", "view dep", "view bien", "thoang mat", "lang man"],
    tags: ["Ngoài trời"],
  },
  { phrases: ["mang di", "take away", "takeaway", "mua ve", "mang ve"], tags: ["Mang đi"] },
  { phrases: ["chay", "an chay", "vegan", "vegetarian"], tags: ["Chay"] },
  { phrases: ["nhau", "quan nhau", "bia", "pub", "nhau nhet"], tags: ["Nhậu nhẹt"] },
  { phrases: ["giai tri", "vui choi", "tro choi", "game"], tags: ["Giải trí"] },
  // --- Món ăn ---
  // Chỉ giữ cụm ≥ 2 từ hoặc từ đơn KHÔNG trùng từ tiếng Việt thường: "cua" trùng
  // "cửa" (mở cửa), "ghe" trùng "ghế", "banh" trùng "bánh canh/bánh xèo" — khớp
  // từ đơn mơ hồ này từng gán nhầm tag Hải sản cho query "quán nào mở cửa cả đêm".
  {
    phrases: ["hai san", "hai san tuoi", "tom", "tom hum", "cua ghe", "oc", "seafood"],
    tags: ["Hải sản"],
  },
  { phrases: ["pizza"], tags: ["Pizza"] },
  { phrases: ["bit tet", "steak", "bo ne"], tags: ["Bít tết"] },
  { phrases: ["burger", "hamburger"], tags: ["Burger"] },
  { phrases: ["ga ran", "fried chicken", "kfc"], tags: ["Gà rán"] },
  { phrases: ["sushi", "mon nhat", "nhat ban", "sashimi"], tags: ["Món Nhật"] },
  { phrases: ["mon han", "han quoc", "kim chi", "tokbokki"], tags: ["Món Hàn"] },
  { phrases: ["dac san", "mon dia phuong"], tags: ["Đặc sản địa phương"] },
  { phrases: ["mon viet", "viet nam", "com viet"], tags: ["Món Việt"] },
  { phrases: ["mon a", "mon thai"], tags: ["Món Á"] },
  // --- Loại hình ---
  {
    phrases: ["ca phe", "caphe", "coffee", "cafe", "tra sua", "quan nuoc"],
    categories: ["cafe"],
  },
  { phrases: ["nha hang", "quan an", "an toi", "an trua"], categories: ["restaurant"] },
  {
    phrases: ["an vat", "duong pho", "street food", "quan via he", "ban hang rong"],
    categories: ["street-food"],
  },
  { phrases: ["banh mi", "banh ngot", "tiem banh", "bakery", "banh kem"], categories: ["bakery"] },
  { phrases: ["bar", "quan bia", "cocktail"], categories: ["bar"] },
  // --- Giờ mở cửa (dữ liệu `opening_hours = '24/7'`) ---
  {
    phrases: [
      "24/7",
      "24h",
      "mo cua 24",
      "mo ca dem",
      "an khuya",
      "mo khuya",
      "qua dem",
      "mo cua ca ngay",
    ],
    alwaysOpen: true,
  },
  // --- Địa bàn ---
  { phrases: ["hai chau"], districts: ["Hải Châu"] },
  { phrases: ["ngu hanh son", "non nuoc"], districts: ["Ngũ Hành Sơn"] },
  { phrases: ["thanh khe"], districts: ["Thanh Khê"] },
  { phrases: ["lien chieu"], districts: ["Liên Chiểu"] },
  { phrases: ["son tra", "ban dao son tra"], districts: ["Sơn Trà"] },
  { phrases: ["cam le"], districts: ["Cẩm Lệ"] },
]

/** Bỏ dấu tiếng Việt + lowercase, giữ khoảng trắng — khớp với `normalizeSearchText`. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Khớp cụm theo RANH GIỚI TỪ trên chuỗi đã fold, không phải `includes` thô:
 * "bar" không được khớp trong "barbecue", "cafe" không khớp trong "cafeteria".
 */
function hasPhrase(folded: string, phrase: string): boolean {
  let from = 0
  for (;;) {
    const index = folded.indexOf(phrase, from)
    if (index === -1) return false
    const before = index === 0 ? "" : (folded[index - 1] ?? "")
    const after = folded[index + phrase.length] ?? ""
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true
    from = index + 1
  }
}

/**
 * Trích thuộc tính có cấu trúc từ câu truy vấn. Trả mảng rỗng khi không khớp
 * (nhánh structured bị bỏ qua, hybrid giữ nguyên hành vi cũ).
 */
export function detectIntentAttributes(query: string): IntentAttributes {
  const folded = fold(query)
  const tags = new Set<string>()
  const categories = new Set<string>()
  const districts = new Set<string>()
  let alwaysOpen = false

  for (const entry of LEXICON) {
    if (!entry.phrases.some((phrase) => hasPhrase(folded, phrase))) continue
    for (const tag of entry.tags ?? []) tags.add(tag)
    for (const category of entry.categories ?? []) categories.add(category)
    for (const district of entry.districts ?? []) districts.add(district)
    if (entry.alwaysOpen) alwaysOpen = true
  }

  // "quán ăn" là cụm chung: nếu người dùng đã nêu loại hình cụ thể (cà phê,
  // bánh, bar…) thì bỏ restaurant để không mở rộng sai phạm vi.
  if (categories.size > 1) categories.delete("restaurant")

  return { tags: [...tags], categories: [...categories], districts: [...districts], alwaysOpen }
}
