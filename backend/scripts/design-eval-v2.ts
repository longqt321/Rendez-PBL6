/**
 * Sinh `data/eval/search-eval-v2.json` từ danh sách biên soạn tay.
 *
 * Vì sao có script: 100+ entry viết tay dễ sai id/thứ tự; script chỉ serialize
 * literal bên dưới thành JSON hợp lệ. Nội dung query/ràng buộc là do người viết
 * quyết định, KHÔNG sinh tự động từ dữ liệu (tránh selection bias).
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"

type C = {
  category?: string[]
  tagsAll?: string[]
  tagsAny?: string[]
  district?: string[]
  alwaysOpen?: boolean
}
type Row = [intent: string, variant: string, query: string, constraints: C]

const HC = ["Hải Châu"],
  NHS = ["Ngũ Hành Sơn"],
  TK = ["Thanh Khê"]
const LC = ["Liên Chiểu"],
  ST = ["Sơn Trà"],
  CL = ["Cẩm Lệ"]
const cafe = { category: ["cafe"] },
  restaurant = { category: ["restaurant"] }
const tag = (t: string): C => ({ tagsAll: [t] })

const ROWS: Row[] = [
  // --- Học / làm việc ---
  ["study", "natural", "quán cà phê yên tĩnh để học bài", { ...cafe, tagsAll: ["Làm việc"] }],
  ["study", "natural", "chỗ ngồi làm việc bằng laptop cả buổi", { ...cafe, tagsAll: ["Làm việc"] }],
  [
    "study",
    "long",
    "tìm quán cà phê phù hợp làm việc nhóm buổi chiều, ngồi lâu không bị đuổi",
    { ...cafe, tagsAll: ["Làm việc"] },
  ],
  ["study", "no-diacritic", "quan ca phe lam viec", { ...cafe, tagsAll: ["Làm việc"] }],
  [
    "study-district",
    "with-district",
    "quán cà phê làm việc ở Hải Châu",
    { ...cafe, tagsAll: ["Làm việc"], district: HC },
  ],
  [
    "study-district",
    "with-district",
    "cafe học bài khu Hải Châu",
    { ...cafe, tagsAll: ["Làm việc"], district: HC },
  ],
  [
    "study-district",
    "with-district",
    "quán cà phê làm việc gần Hải Châu",
    { ...cafe, tagsAll: ["Làm việc"], district: HC },
  ],
  // --- Không gian ngoài trời ---
  ["outdoor", "natural", "quán có không gian ngoài trời thoáng mát", tag("Ngoài trời")],
  ["outdoor", "keyword", "ngồi ngoài trời", tag("Ngoài trời")],
  ["outdoor", "long", "quán ăn ngoài trời view đẹp lãng mạn cho buổi tối", tag("Ngoài trời")],
  [
    "outdoor-district",
    "with-district",
    "quán ngoài trời ở Ngũ Hành Sơn",
    { tagsAll: ["Ngoài trời"], district: NHS },
  ],
  [
    "outdoor-district",
    "with-district",
    "cafe sân vườn Ngũ Hành Sơn",
    { tagsAll: ["Ngoài trời"], district: NHS },
  ],
  // --- Hẹn hò ---
  ["date", "natural", "quán cà phê hẹn hò lãng mạn", { ...cafe, tagsAll: ["Ngoài trời"] }],
  ["date", "natural", "cafe view đẹp cho buổi hẹn đầu tiên", { ...cafe, tagsAll: ["Ngoài trời"] }],
  ["date", "english", "romantic outdoor cafe", { ...cafe, tagsAll: ["Ngoài trời"] }],
  ["date", "keyword", "quán cà phê ngoài trời hẹn hò", { ...cafe, tagsAll: ["Ngoài trời"] }],
  // --- Nhóm bạn ---
  [
    "friends",
    "natural",
    "quán nhậu tụ tập bạn bè cuối tuần",
    { tagsAny: ["Nhậu nhẹt", "Giải trí"] },
  ],
  ["friends", "natural", "đi đâu chơi với hội bạn thân", { tagsAny: ["Nhậu nhẹt", "Giải trí"] }],
  ["friends", "keyword", "quán bia nhậu nhẹt", { tagsAny: ["Nhậu nhẹt", "Giải trí"] }],
  [
    "friends",
    "long",
    "quán có trò chơi cho nhóm bạn đông người buổi tối",
    { tagsAny: ["Nhậu nhẹt", "Giải trí"] },
  ],
  [
    "friends-district",
    "with-district",
    "quán nhậu ở Hải Châu",
    { tagsAny: ["Nhậu nhẹt", "Giải trí"], district: HC },
  ],
  [
    "friends-district",
    "with-district",
    "tụ tập bạn bè ở Hải Châu",
    { tagsAny: ["Nhậu nhẹt", "Giải trí"], district: HC },
  ],
  // --- Bar ---
  ["bar", "natural", "quán bar cocktail ngồi tối", { category: ["bar"] }],
  ["bar", "keyword", "bar", { category: ["bar"] }],
  ["bar", "long", "quán bia pub không gian tối phù hợp ngồi nói chuyện", { category: ["bar"] }],
  ["bar", "no-diacritic", "quan bar o da nang", { category: ["bar"] }],
  // --- Mang đi ---
  ["takeaway", "natural", "quán cho mang về", tag("Mang đi")],
  ["takeaway", "keyword", "mua mang đi", tag("Mang đi")],
  ["takeaway", "long", "đồ ăn sáng mua mang đi làm cho kịp giờ", tag("Mang đi")],
  ["takeaway", "english", "takeaway food", tag("Mang đi")],
  [
    "takeaway-district",
    "with-district",
    "quán mang về ở Hải Châu",
    { tagsAll: ["Mang đi"], district: HC },
  ],
  [
    "takeaway-district",
    "with-district",
    "mua đồ ăn mang đi Hải Châu",
    { tagsAll: ["Mang đi"], district: HC },
  ],
  // --- Chay ---
  ["veg", "natural", "quán chay ngon", tag("Chay")],
  ["veg", "keyword", "ăn chay", tag("Chay")],
  ["veg", "long", "quán cơm chay thanh đạm cho người ăn chay trường", tag("Chay")],
  ["veg", "english", "vegan vegetarian restaurant", tag("Chay")],
  ["veg-district", "with-district", "quán chay ở Hải Châu", { tagsAll: ["Chay"], district: HC }],
  ["veg-district", "with-district", "cơm chay Hải Châu", { tagsAll: ["Chay"], district: HC }],
  // --- Bánh ---
  ["bakery", "natural", "tiệm bánh ngọt", { category: ["bakery"] }],
  ["bakery", "keyword", "bánh mì", { category: ["bakery"] }],
  ["bakery", "long", "tiệm bánh mì ăn sáng gần đây mở sớm", { category: ["bakery"] }],
  ["bakery", "typo", "tiệm bánk ngọt", { category: ["bakery"] }],
  // --- Ăn vặt / đường phố ---
  ["streetfood", "natural", "quán ăn vặt vỉa hè", { category: ["street-food"] }],
  ["streetfood", "keyword", "đồ ăn đường phố", { category: ["street-food"] }],
  [
    "streetfood",
    "long",
    "quán ăn vặt buổi chiều cho học sinh sinh viên",
    { category: ["street-food"] },
  ],
  ["streetfood", "english", "street food", { category: ["street-food"] }],
  [
    "streetfood-district",
    "with-district",
    "quán ăn vặt ở Hải Châu",
    { category: ["street-food"], district: HC },
  ],
  [
    "streetfood-district",
    "with-district",
    "đồ ăn đường phố Hải Châu",
    { category: ["street-food"], district: HC },
  ],
  // --- Cà phê ---
  ["cafe", "natural", "quán cà phê đẹp", cafe],
  ["cafe", "keyword", "cà phê", cafe],
  ["cafe-district", "with-district", "quán cà phê ở Hải Châu", { ...cafe, district: HC }],
  ["cafe-district", "with-district", "cafe Hải Châu", { ...cafe, district: HC }],
  // --- Nhà hàng ---
  ["restaurant", "natural", "quán ăn tối", restaurant],
  ["restaurant", "keyword", "nhà hàng", restaurant],
  [
    "restaurant-district",
    "with-district",
    "nhà hàng ở Ngũ Hành Sơn",
    { ...restaurant, district: NHS },
  ],
  [
    "restaurant-district",
    "with-district",
    "quán ăn Ngũ Hành Sơn",
    { ...restaurant, district: NHS },
  ],
  // --- Wifi ---
  ["wifi", "natural", "quán có wifi miễn phí", tag("Wifi")],
  ["wifi-cafe", "natural", "quán cà phê có wifi", { ...cafe, tagsAll: ["Wifi"] }],
  ["wifi-cafe", "keyword", "cafe wifi", { ...cafe, tagsAll: ["Wifi"] }],
  // --- Món Việt ---
  ["vietnamese", "natural", "quán ăn món Việt", { ...restaurant, tagsAll: ["Món Việt"] }],
  ["vietnamese", "keyword", "cơm Việt Nam", { ...restaurant, tagsAll: ["Món Việt"] }],
  [
    "vietnamese",
    "long",
    "quán món ăn Việt truyền thống đậm vị miền Trung",
    { ...restaurant, tagsAll: ["Món Việt"] },
  ],
  // --- Hải sản ---
  ["seafood", "natural", "quán hải sản tươi ngon", tag("Hải sản")],
  ["seafood", "keyword", "hải sản", tag("Hải sản")],
  ["seafood", "long", "quán tôm hùm cua ghẹ tươi sống giá hợp lý", tag("Hải sản")],
  ["seafood", "typo", "quán hải sãn tươi", tag("Hải sản")],
  // --- Món Nhật ---
  ["japanese", "natural", "quán món Nhật", tag("Món Nhật")],
  ["japanese", "keyword", "sushi", tag("Món Nhật")],
  ["japanese", "long", "quán sashimi Nhật Bản tươi cho bữa tối", tag("Món Nhật")],
  ["japanese", "typo", "quán susi ngon", tag("Món Nhật")],
  // --- Món Hàn ---
  ["korean", "natural", "quán món Hàn", tag("Món Hàn")],
  ["korean", "keyword", "kim chi tokbokki", tag("Món Hàn")],
  ["korean", "long", "quán ăn Hàn Quốc nướng tại bàn cho nhóm bạn", tag("Món Hàn")],
  ["korean", "english", "korean food", tag("Món Hàn")],
  // --- Pizza ---
  ["pizza", "natural", "quán pizza ngon", tag("Pizza")],
  ["pizza", "keyword", "pizza", tag("Pizza")],
  ["pizza", "long", "tiệm pizza kiểu Ý đế mỏng nướng lò củi", tag("Pizza")],
  ["pizza", "typo", "quán piza ngon", tag("Pizza")],
  // --- Burger ---
  ["burger", "natural", "quán burger bò phô mai", tag("Burger")],
  ["burger", "keyword", "hamburger", tag("Burger")],
  ["burger", "long", "quán burger Mỹ ăn kèm khoai tây chiên", tag("Burger")],
  ["burger", "typo", "quán buger ngon", tag("Burger")],
  // --- Gà rán ---
  ["chicken", "natural", "quán gà rán giòn", tag("Gà rán")],
  ["chicken", "keyword", "gà rán", tag("Gà rán")],
  ["chicken", "long", "quán gà rán Hàn Quốc sốt cay cho nhóm bạn", tag("Gà rán")],
  ["chicken", "english", "fried chicken", tag("Gà rán")],
  // --- Bít tết ---
  ["steak", "natural", "quán bít tết ngon", tag("Bít tết")],
  ["steak", "keyword", "steak", tag("Bít tết")],
  ["steak", "long", "quán bò né bít tết ăn kèm bánh mì", tag("Bít tết")],
  ["steak", "english", "steak house", tag("Bít tết")],
  // --- Đặc sản ---
  ["specialty", "natural", "quán đặc sản địa phương", tag("Đặc sản địa phương")],
  ["specialty", "keyword", "đặc sản Đà Nẵng", tag("Đặc sản địa phương")],
  ["specialty", "long", "quán món địa phương ăn là nhớ Đà Nẵng", tag("Đặc sản địa phương")],
  ["specialty", "english", "local specialty food", tag("Đặc sản địa phương")],
  // --- Giải trí ---
  ["entertainment", "natural", "quán giải trí cho gia đình", tag("Giải trí")],
  ["entertainment", "keyword", "chỗ vui chơi", tag("Giải trí")],
  ["entertainment", "long", "quán có trò chơi giải trí cho trẻ em và người lớn", tag("Giải trí")],
  ["entertainment", "english", "entertainment place", tag("Giải trí")],
  // --- Mở 24/7 ---
  ["always-open", "natural", "quán mở cửa cả đêm để ăn khuya", { alwaysOpen: true }],
  ["always-open", "keyword", "quán mở 24/7", { alwaysOpen: true }],
  ["always-open", "long", "quán mở cả ngày lẫn đêm, ăn khuya lúc 2 giờ sáng", { alwaysOpen: true }],
  ["always-open", "no-diacritic", "quan mo 24h", { alwaysOpen: true }],
  // --- Theo quận (thuần địa bàn) ---
  ["district-hc", "natural", "quán ở Hải Châu", { district: HC }],
  ["district-nhs", "natural", "quán ở Ngũ Hành Sơn", { district: NHS }],
  ["district-tk", "natural", "quán ở Thanh Khê", { district: TK }],
  ["district-tk", "keyword", "Thanh Khê", { district: TK }],
  ["district-lc", "natural", "quán ở Liên Chiểu", { district: LC }],
  ["district-lc", "keyword", "Liên Chiểu", { district: LC }],
  ["district-st", "natural", "quán ở Sơn Trà", { district: ST }],
  ["district-st", "keyword", "Sơn Trà", { district: ST }],
  ["district-cl", "natural", "quán ở Cẩm Lệ", { district: CL }],
  ["district-cl", "keyword", "Cẩm Lệ", { district: CL }],
]

const queries = ROWS.map(([intent, variant, query, constraints], i) => ({
  id: `v2-${String(i + 1).padStart(3, "0")}`,
  intent,
  variant,
  query,
  constraints,
}))

const out = join(import.meta.dir, "..", "data", "eval", "search-eval-v2.json")
writeFileSync(out, `${JSON.stringify({ version: 2, queries }, null, 2)}\n`)
const byVariant = new Map<string, number>()
for (const q of queries) byVariant.set(q.variant, (byVariant.get(q.variant) ?? 0) + 1)
console.log(
  `Đã ghi ${out}: ${queries.length} query, ${new Set(queries.map((q) => q.intent)).size} intent`,
)
console.log([...byVariant.entries()].map(([k, v]) => `${k}=${v}`).join(" "))
