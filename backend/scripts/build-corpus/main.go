// build-corpus: biến raw Overpass JSON thành corpus POI đã lọc, kèm bảng funnel.
//
// Chạy: cd backend/scripts/build-corpus && go build -o build-corpus . && ./build-corpus
//
// Đọc mọi file trong ../data/raw/osm-*.json (không ghi đè), lọc 6 tầng, in
// bảng funnel + phân bố, xuất ../data/places-expanded.json theo ĐÚNG shape của
// frontend/data/cold-start/places.json để seed.ts dùng lại không cần sửa logic.
//
// Nguyên tắc: mỗi tầng phải đếm số vào/ra. Không tầng nào lọc im lặng.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
)

// ---------- Kiểu dữ liệu raw OSM ----------

type rawElement struct {
	Type      string            `json:"type"`
	ID        int64             `json:"id"`
	Lat       *float64          `json:"lat"`
	Lon       *float64          `json:"lon"`
	Timestamp string            `json:"timestamp"` // chỉ có khi query dùng `out meta`
	Version   int               `json:"version"`
	Center    *struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"center"`
	Tags map[string]string `json:"tags"`
}

type rawFile struct {
	Elements []rawElement `json:"elements"`
}

// ---------- Kiểu dữ liệu xuất ra (khớp ColdStartPlace) ----------

type outPlace struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Category     string   `json:"category"`
	District     *string  `json:"district"`
	Address      *string  `json:"address"`
	Lat          *float64 `json:"lat"`
	Lng          *float64 `json:"lng"`
	Phone        *string  `json:"phone"`
	OpeningHours *string  `json:"openingHours"`
	Description  *string  `json:"description"`
	Sources      []string `json:"sources"`
	GeoSource    *string  `json:"geoSource"`
	GeoPrecision *string  `json:"geoPrecision"`
	OsmID        *string  `json:"osmId"`
	Image        *string  `json:"image"`
	ImageKind    *string  `json:"imageKind"`
	ImageNote    *string  `json:"imageNote"`
	Images       []string `json:"images"`
	VenuePageURL *string  `json:"venuePageUrl"`
	Verified     bool     `json:"verified"`
	CollectedAt  *string  `json:"collectedAt"`
	Tier         *string  `json:"tier"`
	Status       string   `json:"status"`
	// Tags: nhãn tiện ích/ẩm thực sinh từ tag OSM thật (cuisine, diet:vegetarian,
	// outdoor_seating, takeaway, internet_access). Curated giữ nguyên như cũ.
	Tags []string `json:"tags"`
	// Quality: điểm 0–100 do build-corpus chấm (tên + metadata + độ mới).
	// Chỉ dùng để CHỌN quán khi cần cắt bớt, không dùng trong ranker.
	Quality int `json:"quality"`
	// Vibes: tối đa 3 nhãn "không khí" sinh từ tín hiệu OSM THẬT (internet_access,
	// outdoor_seating, takeaway, diet:vegetarian, amenity=bar/pub, category
	// quan-nhau/karaoke/cinema/arcade). Không suy đoán — place không có tín hiệu
	// nào thì vibes rỗng (card tự ẩn). Curated luôn rỗng (không có dữ liệu gốc).
	Vibes []string `json:"vibes"`
	// DistrictApprox=true nghĩa là district là PHỎNG ĐOÁN theo centroid gần
	// nhất, không phải addr:district thật của OSM. Feature f_district của
	// ranker phải coi những bản ghi này là "xấp xỉ" (ghi rõ trong báo cáo).
	DistrictApprox bool `json:"districtApprox,omitempty"`
	// Cờ metadata NỘI BỘ (không serialize) — thống kê tính SAU khi gộp curated
	// và cap-cafe để % khớp đúng corpus cuối (L-002).
	mHours, mPhone, mCuisine, mWebsite bool
}

type outDataset struct {
	Meta   map[string]any `json:"meta"`
	Places []outPlace     `json:"places"`
}

// ---------- Bộ đếm funnel ----------

type funnel struct {
	Raw, T1, T2, T2b, T3, T4, T4b, T5, T6 int
}

// dropReasons: đếm lý do loại của T2b + T4b để in bảng.
var dropReasons = map[string]int{}

// ---------- Lexicon món ăn (longest-match, khớp TRỌN TỪ) ----------

// Thứ tự quan trọng: dài trước, ngắn sau. Map sang nhãn category của dataset.
// Mọi term được khớp bằng containsWord (biên từ) — xem chú thích ở đó.
// Nhãn mới ngoài 34 nhãn gốc: quan-nhau, mart, farm, trung (D-AI-32).
var dishLexicon = []struct {
	term string
	cat  string
}{
	// --- Nhật (dài trước) ---
	{"nhat ban", "nhat"}, {"japanese", "nhat"},
	{"sashimi", "nhat"}, {"yakitori", "nhat"}, {"izakaya", "nhat"},
	{"onigiri", "nhat"}, {"tempura", "nhat"}, {"sushi", "nhat"},
	{"ramen", "nhat"}, {"udon", "nhat"}, {"soba", "nhat"},
	{"bento", "nhat"}, {"matcha", "nhat"},
	// --- Hàn ---
	{"han quoc", "han"}, {"korean", "han"}, {"korea", "han"},
	{"samgyeopsal", "han"}, {"bibimbap", "han"}, {"bulgogi", "han"},
	{"tteokbokki", "han"}, {"tokbokki", "han"}, {"kimchi", "han"},
	{"gogi", "han"}, {"soju", "han"},
	// --- Thái ---
	{"thai lan", "thai"}, {"pad thai", "thai"},
	{"tom yum", "thai"}, {"tom yam", "thai"}, {"thai", "thai"},
	// --- Trung (trước đây sai thành `khac`) ---
	{"trung hoa", "trung"}, {"trung quoc", "trung"}, {"chinese", "trung"},
	{"xiao long bao", "trung"}, {"dim sum", "trung"}, {"dimsun", "trung"},
	{"dumpling", "trung"},
	// --- Ấn ---
	{"an do", "an-do"}, {"indian", "an-do"}, {"biryani", "an-do"},
	{"masala", "an-do"}, {"naan", "an-do"}, {"curry", "an-do"},
	// --- Âu / Mỹ ---
	{"spaghetti", "y"}, {"pho mai", "y"}, {"pizza", "y"}, {"pasta", "y"},
	{"burger", "an-vat"}, {"steak", "y"},
	// --- Món Việt dài ---
	{"banh trang thit heo", "banh-trang-thit-heo"},
	{"banh canh ca loc", "banh-canh"},
	{"bun mam nem", "bun-mam-nem"},
	{"bun bo hue", "bun"},
	{"banh bot loc", "banh"},
	{"mi quang", "mi-quang"},
	{"cao lau", "mi-quang"},
	{"bun cha ca", "bun-cha-ca"},
	{"com ga", "com-ga"},
	{"banh xeo", "banh-xeo"},
	{"banh beo", "banh-beo"},
	{"banh khoai", "banh-khoai"},
	{"banh canh", "banh-canh"},
	{"banh mi", "banh-mi"},
	{"banh cuon", "banh"},
	{"banh uot", "banh"},
	{"banh ngot", "banh-ngot"},
	{"goi cuon", "an-vat"},
	{"cha gio", "an-vat"},
	{"nem lui", "nem-lui"},
	{"nem nuong", "nem-lui"},
	{"kem bo", "kem-bo"},
	{"hu tieu", "hu-tieu"},
	{"sinh to", "sinh-to"},
	{"tra sua", "tra-sua"},
	{"hai san", "hai-san"},
	{"do bien", "hai-san"},
	{"goi ca", "goi-ca"},
	{"bun mam", "bun-mam"},
	{"bun bo", "bun"},
	{"bun rieu", "bun"},
	{"bun thit", "bun"},
	{"quan nhau", "quan-nhau"},
	// "quan an" / "nha hang" ĐÃ BỎ: từ chung chung, đứng trước "chay"/món cụ thể
	// nên đè nhãn ("Nhà hàng chay" từng ra quan-an thay vì chay — MAJOR 4).
	// Loại hình này do tag amenity quyết định ở fallback.
	// --- Món nước / một âm tiết ---
	{"bun", "bun"}, {"pho", "pho"}, {"chao", "chao"}, {"lau", "lau"},
	{"nuong", "nuong"}, {"oc", "hai-san"}, {"com", "com"}, {"che", "che"},
	{"kem", "kem-bo"}, {"bia", "quan-nhau"}, {"xoi", "com"},
	{"an vat", "an-vat"}, {"ca phe", "cafe"}, {"cafe", "cafe"},
	{"coffee", "cafe"}, {"chay", "chay"}, {"vegan", "chay"},
	{"banh", "banh"},
}

// init: sắp dishLexicon theo ĐỘ DÀI term GIẢM DẦN — longest-match đúng nghĩa,
// không phụ thuộc thứ tự khai báo (MAJOR 4: "bun bo hue" phải thắng "bun").
func init() {
	sort.SliceStable(dishLexicon, func(i, j int) bool {
		return len(dishLexicon[i].term) > len(dishLexicon[j].term)
	})
}

var cuisineMap = map[string]string{
	"vietnamese": "viet-nam", "viet_nam": "viet-nam",
	"japanese": "nhat", "sushi": "nhat", "ramen": "nhat",
	"udon": "nhat", "soba": "nhat", "izakaya": "nhat", "tempura": "nhat",
	"korean": "han", "korean_bbq": "han", "bibimbap": "han", "kimchi": "han",
	"thai": "thai", "thai_food": "thai", "vietnamese_street_food": "viet-nam",
	"indian": "an-do", "curry": "an-do", "biryani": "an-do",
	// `chinese` KHÔNG map về `khac` nữa — `khac` là thùng nhiễu bị cảnh báo >20%,
	// đẩy quán Trung vào đó vừa mất thông tin vừa làm nhiễu chỉ tiêu A7.
	"chinese": "trung", "dim_sum": "trung", "cantonese": "trung",
	"sichuan": "trung", "taiwanese": "trung", "hotpot": "lau", "hot_pot": "lau",
	"seafood": "hai-san", "fish": "hai-san",
	"italian": "y", "pizza": "y", "french": "y", "western": "y",
	"american": "y", "mexican": "y", "spanish": "y", "german": "y",
	"bbq": "nuong", "barbecue": "nuong", "grill": "nuong",
	"coffee_shop": "cafe", "coffee": "cafe", "cafe": "cafe",
	"bubble_tea": "tra-sua", "tea": "cafe",
	"bakery": "banh-mi", "cake": "banh-ngot",
	"ice_cream": "kem-bo", "dessert": "kem-bo",
	"fast_food": "an-vat", "burger": "an-vat",
	"vegetarian": "chay", "vegan": "chay",
	"noodle": "bun", "breakfast": "quan-an",
	"sandwich": "banh-mi", "juice": "sinh-to", "smoothie": "sinh-to",
}

// tagCuisineMap: cuisine OSM → nhãn tiếng Việt cho trường tags. Cuisine lạ
// KHÔNG có trong map → bỏ (không dịch máy móc bừa — D-049).
var tagCuisineMap = map[string]string{
	"vietnamese": "Món Việt", "coffee_shop": "Cà phê", "seafood": "Hải sản",
	"korean": "Món Hàn", "japanese": "Món Nhật", "indian": "Món Ấn",
	"pizza": "Pizza", "pasta": "Pizza", "steak_house": "Bít tết",
	"regional": "Đặc sản địa phương", "burger": "Burger", "asian": "Món Á",
	"thai": "Món Thái", "mexican": "Món Mexico", "american": "Món Mỹ",
	"chicken": "Gà rán", "noodle": "Mì/noodle", "vegetarian": "Chay",
	"chinese": "Món Trung",
}

// buildTags: sinh tags từ tag OSM thật. Dedup, sort alphabet (thứ tự ổn định),
// tối đa 6 tag.
func buildTags(tags map[string]string) []string {
	set := map[string]bool{}
	add := func(l string) {
		if l != "" && !set[l] {
			set[l] = true
		}
	}
	if c := tags["cuisine"]; c != "" {
		for _, part := range strings.Split(c, ";") {
			add(tagCuisineMap[strings.ToLower(strings.TrimSpace(part))])
		}
	}
	switch tags["diet:vegetarian"] {
	case "yes", "only":
		add("Chay")
	}
	if tags["outdoor_seating"] == "yes" {
		add("Ngồi ngoài trời")
	}
	if tags["takeaway"] == "yes" {
		add("Mang đi")
	}
	switch tags["internet_access"] {
	case "yes", "wlan":
		add("Wifi")
	}
	out := make([]string, 0, len(set))
	for l := range set {
		out = append(out, l)
	}
	sort.Strings(out)
	if len(out) > 6 {
		out = out[:6]
	}
	return out
}

// buildVibes: sinh nhãn "không khí" từ tín hiệu OSM THẬT, tối đa 3, thứ tự ưu
// tiên cố định (Làm việc → Ngoài trời → Mang đi → Nhậu nhẹt → Giải trí → Chay).
//
// Nguyên tắc: KHÔNG suy đoán. Cafe không khai internet_access thì KHÔNG gán
// "Làm việc" (nhiều quán có wifi nhưng OSM không ghi — bịa là sai). Place không
// có tín hiệu nào → mảng rỗng, card tự ẩn khối vibes.
func buildVibes(tags map[string]string, cat string) []string {
	out := make([]string, 0, 3)
	add := func(v string) {
		if len(out) >= 3 {
			return
		}
		for _, e := range out {
			if e == v {
				return
			}
		}
		out = append(out, v)
	}
	switch tags["internet_access"] {
	case "yes", "wlan":
		if cat == "cafe" {
			add("Làm việc")
		}
	}
	if tags["outdoor_seating"] == "yes" {
		add("Ngoài trời")
	}
	if tags["takeaway"] == "yes" {
		add("Mang đi")
	}
	switch tags["amenity"] {
	case "bar", "pub":
		add("Nhậu nhẹt")
	}
	if cat == "quan-nhau" {
		add("Nhậu nhẹt")
	}
	switch cat {
	case "karaoke", "cinema", "arcade":
		add("Giải trí")
	}
	switch tags["diet:vegetarian"] {
	case "yes", "only":
		add("Chay")
	}
	return out
}

// ---------- Trọng tâm 6 quận (xấp xỉ — dùng khi thiếu addr:district) ----------
//
// Đà Nẵng có 8 đơn vị cấp huyện: 6 quận (Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành
// Sơn, Liên Chiểu, Cẩm Lệ) + 2 huyện (Hòa Vang, Hoàng Sa). Ứng dụng CHỈ lọc theo
// 6 quận — 2 huyện bị loại: Hòa Vang là huyện ngoại thành gần như không có POI
// ăn uống trong corpus (2/344), Hoàng Sa là huyện đảo không có POI đất liền nào;
// giữ trong bộ lọc chỉ cho kết quả rỗng, gây hiểu nhầm là app lỗi.
// LƯU Ý TRUNG THỰC: từ 01/7/2025 Đà Nẵng bãi bỏ cấp quận/huyện (còn phường/xã
// trực thuộc TP), nên đây là PHÂN NHÓM XẤP XỈ theo quận cũ, không phải đơn vị
// hành chính hiện hành.
var districtCentroids = map[string][2]float64{
	"Hải Châu":     {16.0678, 108.2208},
	"Thanh Khê":    {16.0450, 108.2050},
	"Sơn Trà":      {16.1000, 108.2500},
	"Ngũ Hành Sơn": {16.0200, 108.2500},
	"Liên Chiểu":   {16.0700, 108.1500},
	"Cẩm Lệ":       {16.0100, 108.2000},
}

var (
	letterRe    = regexp.MustCompile(`\p{L}`)
	stripPrefix = []string{"quán ", "quan ", "cà phê ", "ca phe ", "cafe ", "tiệm ", "tiem ", "nhà hàng ", "nha hang "}
	reMenuList  = regexp.MustCompile(`(,\s*){2,}`) // ≥3 món liệt kê liên tiếp
)

// ---------- Từ điển phụ trợ cho việc ĐÁNH GIÁ TÊN ----------

// nonFoodMarkers: tên nói rõ KHÔNG phải quán ăn/giải trí. Gặp là loại ở T2b
// và không bao giờ được gán nhãn ẩm thực (L-021).
var nonFoodMarkers = []string{
	"khach san", "hotel", "resort", "homestay", "nha nghi", "guesthouse",
	"thu cung", "pet shop", "nobipet", "thu y",
	"dien thoai", "thegioididong", "fpt shop", "vien thong",
	"tuong niem", "nghia trang", "bia da", "nha tho", "nghia dia",
	"ngan hang", "cay xang", "tram xang",
	// Văn phòng / kho / showroom — không phải điểm đến (audit 2026-11-11:
	// "Văn phòng Tổng công ty Doticom" → banh-mi, 4× "TaKing Kho" → sieu-thi).
	"van phong", "cong ty", "showroom", "kho so", "kho hang", "trung tam bao hanh",
	// Bán lẻ phi thực phẩm lọt qua từ khoá "mart"/"siêu thị" trong tên.
	"noi that", "thiet bi", "dien may", "luu niem", "souvenir",
}

// nearMarkers: tên mô tả VỊ TRÍ so với POI khác — không phải tên cơ sở (L-020).
var nearMarkers = []string{"gan", "near", "doi dien", "ke ben", "ben canh", "phia sau", "sau lung"}

// addrMarkers: dấu hiệu tên là ĐỊA CHỈ chứ không phải tên quán.
var addrMarkers = []string{"doi dien", "gan", "kiet", "hem", "ngo", "nga ba", "nga tu", "ben canh", "phia sau"}

// vnGivenNames: âm tiết thường dùng làm TÊN RIÊNG của người Việt (không dấu).
// Dùng để nhận diện tên trơ kiểu "hường", "nga", "oanh" — KHÔNG dùng để loại
// "Bà Dưỡng"/"Cô Sáu" (có kính ngữ, 2 từ → chỉ bị phạt nhẹ).
// Cố ý KHÔNG có: thai, han, nhat, trung, y, mi... vì trùng tên món/quốc gia.
// "huong" CÓ trong danh sách — "hường"/"hương" là tên người phổ biến nhất lọt corpus.
var vnGivenNames = map[string]bool{
	"an": true, "anh": true, "bach": true, "bang": true, "bao": true,
	"bich": true, "binh": true, "cam": true, "chau": true, "chi": true,
	"chien": true, "chinh": true, "cuong": true, "dao": true, "dat": true,
	"diem": true, "diep": true, "dinh": true, "doan": true, "duc": true,
	"duong": true, "duy": true, "dung": true, "giang": true, "ha": true,
	"hai": true, "hang": true, "hanh": true, "hao": true, "hieu": true,
	"hoa": true, "hoai": true, "hoan": true, "hong": true, "hue": true,
	"hung": true, "huong": true, "huyen": true, "huy": true, "khanh": true,
	"khoa": true, "kien": true, "kiet": true, "kim": true, "lan": true,
	"linh": true, "loan": true, "loc": true, "long": true, "luan": true,
	"ly": true, "mai": true, "man": true, "minh": true, "my": true,
	"nam": true, "nga": true, "ngan": true, "ngoc": true, "nguyet": true,
	"nhan": true, "nhi": true, "nhu": true, "nhung": true, "nu": true,
	"oanh": true, "phong": true, "phu": true, "phuc": true, "phuong": true,
	"quang": true, "que": true, "quoc": true, "quy": true, "quyen": true,
	"sang": true, "son": true, "suong": true, "tam": true, "tan": true,
	"thang": true, "thanh": true, "thao": true, "thi": true, "tho": true,
	"thong": true, "thu": true, "thuan": true, "thuy": true, "tien": true,
	"tin": true, "toan": true, "tram": true, "trang": true, "tri": true,
	"trinh": true, "truc": true, "truong": true, "tu": true, "tuan": true,
	"tung": true, "tuyet": true, "uyen": true, "van": true, "vi": true,
	"vinh": true, "vu": true, "vy": true, "xuan": true, "yen": true,
}

// dishWordSet: từ đơn là TÊN MÓN — không bao giờ coi là tên người.
var dishWordSet = map[string]bool{
	"com": true, "bun": true, "pho": true, "chao": true, "che": true,
	"kem": true, "oc": true, "lau": true, "xoi": true, "banh": true,
	"bia": true, "chay": true, "nuong": true, "goi": true, "mi": true,
	"hu": true, "tieu": true, "mam": true, "nem": true, "canh": true,
	"tra": true, "sua": true, "sinh": true, "to": true, "hai": true,
	"san": true, "do": true, "bien": true, "khoai": true, "beo": true,
	"xeo": true, "ngot": true, "cuon": true, "gio": true, "lui": true,
	"trang": true, "thit": true, "heo": true, "ga": true, "ca": true,
	"cha": true, "pizza": true, "burger": true, "sushi": true, "ramen": true,
}

// ---------- Hàm phụ ----------

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0
	p1, p2 := lat1*math.Pi/180, lat2*math.Pi/180
	dp := (lat2 - lat1) * math.Pi / 180
	dl := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dp/2)*math.Sin(dp/2) + math.Cos(p1)*math.Cos(p2)*math.Sin(dl/2)*math.Sin(dl/2)
	return 2 * R * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

// normalizeName: bỏ dấu, lowercase, bỏ tiền tố loại hình, gộp khoảng trắng.
func normalizeName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = removeDiacritics(s)
	for _, p := range stripPrefix {
		if strings.HasPrefix(s, p) {
			s = strings.TrimPrefix(s, p)
			break
		}
	}
	s = strings.Join(strings.Fields(s), " ")
	return s
}

// isWordByte: ký tự ASCII chữ/số. Dùng cho biên từ.
func isWordByte(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9')
}

// containsWord: khớp `term` như MỘT TỪ trọn vẹn trong `flat` (đã bỏ dấu).
//
// Vì sao không dùng strings.Contains: "Comfort Cafe" chứa "com" (cơm),
// "Ocean" chứa "oc" (ốc), "Smart Coffee" chứa "mart" (mart), "Phoenix" chứa
// "pho" (phở) — tất cả đều bị gán nhãn sai. Biên từ là ký tự không phải chữ/số.
func containsWord(flat, term string) bool {
	if term == "" {
		return false
	}
	for idx := 0; idx <= len(flat)-len(term); {
		i := strings.Index(flat[idx:], term)
		if i < 0 {
			return false
		}
		start := idx + i
		end := start + len(term)
		okStart := start == 0 || !isWordByte(flat[start-1])
		okEnd := end == len(flat) || !isWordByte(flat[end])
		if okStart && okEnd {
			return true
		}
		idx = start + 1
	}
	return false
}

func removeDiacritics(s string) string {
	// Bảng thay thế tiếng Việt đầy đủ (NFC đã chuẩn hoá ở OSM).
	repl := strings.NewReplacer(
		"à", "a", "á", "a", "ả", "a", "ã", "a", "ạ", "a",
		"ă", "a", "ằ", "a", "ắ", "a", "ẳ", "a", "ẵ", "a", "ặ", "a",
		"â", "a", "ầ", "a", "ấ", "a", "ẩ", "a", "ẫ", "a", "ậ", "a",
		"đ", "d",
		"è", "e", "é", "e", "ẻ", "e", "ẽ", "e", "ẹ", "e",
		"ê", "e", "ề", "e", "ế", "e", "ể", "e", "ễ", "e", "ệ", "e",
		"ì", "i", "í", "i", "ỉ", "i", "ĩ", "i", "ị", "i",
		"ò", "o", "ó", "o", "ỏ", "o", "õ", "o", "ọ", "o",
		"ô", "o", "ồ", "o", "ố", "o", "ổ", "o", "ỗ", "o", "ộ", "o",
		"ơ", "o", "ờ", "o", "ớ", "o", "ở", "o", "ỡ", "o", "ợ", "o",
		"ù", "u", "ú", "u", "ủ", "u", "ũ", "u", "ụ", "u",
		"ư", "u", "ừ", "u", "ứ", "u", "ử", "u", "ữ", "u", "ự", "u",
		"ỳ", "y", "ý", "y", "ỷ", "y", "ỹ", "y", "ỵ", "y",
	)
	return repl.Replace(s)
}

// ---------- Tập nhãn hợp lệ (chống lệch code ↔ dữ liệu) ----------

// validCategories: TẬP NHÃN DUY NHẤT được phép xuất hiện trong corpus.
// assignCategory trả nhãn ngoài tập này → build FAIL, không ghi file.
// Lý do: lần trước code đổi `mart`→`sieu-thi` nhưng JSON trên đĩa vẫn là bản
// build cũ; mọi phân tích đo trên dữ liệu không khớp code (L-019).
var validCategories = map[string]bool{
	"cafe": true, "quan-an": true, "quan-nhau": true, "an-vat": true,
	"viet-nam": true, "banh-mi": true, "pho": true, "bun": true, "com": true,
	"com-ga": true, "mi-quang": true, "banh": true, "banh-xeo": true,
	"banh-beo": true, "banh-khoai": true, "banh-canh": true, "banh-ngot": true,
	"banh-trang-thit-heo": true, "bun-cha-ca": true, "bun-mam": true,
	"bun-mam-nem": true, "cao-lau": true, "chao": true, "che": true,
	"kem-bo": true, "lau": true, "nuong": true, "nem-lui": true,
	"goi-ca": true, "hai-san": true, "hu-tieu": true, "sinh-to": true,
	"tra-sua": true, "xoi": true,
	"nhat": true, "han": true, "thai": true, "trung": true, "an-do": true,
	"y": true, "chay": true,
	"sieu-thi": true, "cua-hang-tien-loi": true, "cua-hang-thuc-pham": true,
	"cua-hang-ruou": true, "tap-hoa": true, "cho": true, "mall": true, "farm": true,
	"karaoke": true, "music-box": true, "cinema": true, "bida": true,
	"bowling": true, "arcade": true, "water-park": true, "spa": true, "massage": true,
	"khac": true,
}

// ---------- Đánh giá tên: tên có SEARCHABLE không? ----------

type nameVerdict struct {
	drop    bool
	penalty int
	reason  string
}

// longestAlphaRun: chuỗi chữ cái dài nhất liền mạch.
// "3C"→1, "B&B"→1, "N&M"→1, "F29"→1, "AMP"→3, "K7 burger"→6.
func longestAlphaRun(s string) int {
	best, cur := 0, 0
	for _, r := range s {
		if unicode.IsLetter(r) {
			cur++
			if cur > best {
				best = cur
			}
		} else {
			cur = 0
		}
	}
	return best
}

// isAddressOnly: tên là ĐỊA CHỈ ("43 Hòa Phú 9", "741 Ngô Quyền - Đối diện
// Vincom Plaza"), không phải tên quán. Giữ lại nếu phần còn lại chứa tên món
// ("Mì Quảng 1A" — bắt đầu bằng chữ nên không vào đây).
func isAddressOnly(name string) bool {
	flat := removeDiacritics(strings.ToLower(strings.TrimSpace(name)))
	if flat == "" || flat[0] < '0' || flat[0] > '9' {
		return false
	}
	rest := strings.TrimLeft(flat, "0123456789-/., ")
	if rest == "" {
		return true
	}
	for _, m := range addrMarkers {
		if containsWord(rest, m) {
			return true
		}
	}
	for _, e := range dishLexicon {
		if containsWord(rest, e.term) {
			return false
		}
	}
	return len(strings.Fields(rest)) <= 4
}

// isBareGivenName: MỘT từ, là âm tiết tên người, không có kính ngữ, không phải
// tên món ("hường", "nga", "oanh"). KHÔNG chạm "Bà Dưỡng"/"Cô Sáu" (2 từ).
func isBareGivenName(name string) bool {
	flat := removeDiacritics(strings.ToLower(strings.TrimSpace(name)))
	if flat == "" || strings.Contains(flat, " ") {
		return false
	}
	return vnGivenNames[flat] && !dishWordSet[flat]
}

// allWordsAreGivenNames: mọi từ đều là âm tiết tên người ("Diễm Hồng") —
// chỉ PHẠT nhẹ, không loại (có thể là tên quán thật).
func allWordsAreGivenNames(flat string) bool {
	fs := strings.Fields(flat)
	if len(fs) == 0 || len(fs) > 3 {
		return false
	}
	for _, w := range fs {
		if !vnGivenNames[w] || dishWordSet[w] {
			return false
		}
	}
	return true
}

// isDishOnly: tên CHỈ là tên món, không có thương hiệu ("Bánh cuốn", "Hu Tieu").
// Chỉ phạt nhẹ — vẫn cần cho query theo món.
func isDishOnly(flat string) bool {
	for _, e := range dishLexicon {
		if flat == e.term {
			return true
		}
	}
	return false
}

// judgeName: quyết định loại / phạt tên. Chạy TRƯỚC T3 dedup để key dedup
// không bị tên rác làm bẩn.
func judgeName(name string) nameVerdict {
	flat := removeDiacritics(strings.ToLower(strings.TrimSpace(name)))
	for _, m := range nonFoodMarkers {
		if containsWord(flat, m) {
			return nameVerdict{drop: true, reason: "phi-am-thuc"}
		}
	}
	if isAddressOnly(name) {
		return nameVerdict{drop: true, reason: "dia-chi"}
	}
	if longestAlphaRun(name) < 2 {
		return nameVerdict{drop: true, reason: "ky-hieu"}
	}
	if isBareGivenName(name) {
		return nameVerdict{drop: true, reason: "ten-nguoi-tro"}
	}

	p := 0
	if hasNearMarker(flat) {
		p -= 10
	}
	if allWordsAreGivenNames(flat) {
		p -= 10
	}
	if isDishOnly(flat) {
		p -= 5
	}
	if reMenuList.MatchString(name) {
		p -= 10 // tên là cả thực đơn
	}
	return nameVerdict{penalty: p, reason: "mem"}
}

// ---------- Kiểm tra metadata giả (OSM vandalism) ----------

// looksFakePhone: số điện thoại không thể là thật — toàn số giống nhau, quá
// ngắn/dài, hoặc dãy đếm quen thuộc ("123456789").
func looksFakePhone(p string) bool {
	d := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, p)
	if len(d) < 9 || len(d) > 12 {
		return true
	}
	allSame := true
	for i := 1; i < len(d); i++ {
		if d[i] != d[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return true
	}
	for _, bad := range []string{"123456789", "0123456789", "0987654321", "111111111"} {
		if strings.HasPrefix(d, bad) {
			return true
		}
	}
	return false
}

// looksFakeWebsite: không có dấu chấm, có khoảng trắng, hoặc quá ngắn.
func looksFakeWebsite(w string) bool {
	w = strings.TrimSpace(w)
	if w == "" || strings.ContainsAny(w, " \t") {
		return true
	}
	if !strings.Contains(w, ".") {
		return true
	}
	return len(w) < 5
}

func realPhone(tags map[string]string) string {
	p := tags["phone"]
	if p == "" {
		p = tags["contact:phone"]
	}
	if p == "" || looksFakePhone(p) {
		return ""
	}
	return p
}

func realWebsite(tags map[string]string) string {
	w := tags["website"]
	if w == "" {
		w = tags["contact:website"]
	}
	if w == "" || looksFakeWebsite(w) {
		return ""
	}
	return w
}

// ---------- Bộ lọc "địa điểm nổi bật" (D-AI-42) ----------
//
// App hướng tới điểm ĐI CHƠI cho giới trẻ, không phải tiện ích Google Maps.
// Loại hẳn: cửa hàng tiện lợi, tạp hóa, cửa hàng thực phẩm, cửa hàng rượu,
// nông trại. Giữ: mall + siêu thị lớn (điểm mua sắm thật), chợ nổi tiếng.

var dropCategories = map[string]bool{
	"cua-hang-tien-loi": true, "tap-hoa": true,
	"cua-hang-thuc-pham": true, "cua-hang-ruou": true, "farm": true,
}

var keepRetailCategories = map[string]bool{"mall": true, "sieu-thi": true}

// famousMarkets: chợ lớn/nổi tiếng ở Đà Nẵng (nguồn: cổng du lịch ĐN).
var famousMarkets = []string{
	"cho han", "cho con", "cho dong da", "cho bac my an", "cho hoa khanh",
	"cho cam le", "cho hoa an", "cho hoa cam", "cho tuy loan", "cho non nuoc",
	"cho man thai", "cho nai hien dong", "cho an hai",
}

// chainNames: chuỗi F&B/giải trí có mặt thật ở ĐN — tín hiệu "kinh doanh thật"
// dù OSM thiếu phone/website.
var chainNames = []string{
	"highlands", "katinat", "phe la", "the coffee house", "trung nguyen",
	"passio", "cong ca phe", "starbucks", "phuc long", "milano",
	"cgv", "lotte cinema", "galaxy cinema", "beta cinemas",
}

// businessSignals: đếm tín hiệu "cơ sở kinh doanh thật" (0–5).
func businessSignals(tags map[string]string, name string) int {
	n := 0
	if realPhone(tags) != "" {
		n++
	}
	if realWebsite(tags) != "" {
		n++
	}
	if tags["opening_hours"] != "" {
		n++
	}
	if tags["brand"] != "" || tags["brand:wikidata"] != "" {
		n++
	}
	flat := removeDiacritics(strings.ToLower(name))
	for _, b := range chainNames {
		if containsWord(flat, b) {
			n++
			break
		}
	}
	return n
}

// isNotable: giữ địa điểm? Trả (giữ, lý do loại).
func isNotable(tags map[string]string, name, cat string, minSignals int) (bool, string) {
	if dropCategories[cat] {
		return false, "loai-hinh-tien-ich"
	}
	if keepRetailCategories[cat] {
		return true, ""
	}
	if cat == "cho" {
		flat := removeDiacritics(strings.ToLower(name))
		for _, m := range famousMarkets {
			if containsWord(flat, m) {
				return true, ""
			}
		}
		return false, "cho-nho"
	}
	if businessSignals(tags, name) >= minSignals {
		return true, ""
	}
	return false, "thieu-tin-hieu"
}

// hasNearMarker: tên mô tả VỊ TRÍ so với POI khác ("Gần Vincom Plaza",
// "Đối diện chợ") — không phải tên cơ sở, không được dùng để gán loại hình.
func hasNearMarker(flat string) bool {
	for _, m := range nearMarkers {
		if containsWord(flat, m) {
			return true
		}
	}
	return false
}

// assignCategory: tag OSM (đáng tin nhất) → tên → cuisine → fallback → khac.
//
// Thứ tự đã sửa sau phản biện độc lập (L-020, L-021):
//  1. Tên nói rõ KHÔNG phải quán ăn (khách sạn, thú cưng, điện thoại) → khac.
//  2. TAG quyết định trước tên: shop=supermarket → sieu-thi,
//     shop=convenience → cua-hang-tien-loi, amenity=marketplace → cho,
//     shop=mall/department_store → mall. Tên chỉ dùng khi KHÔNG có tag.
//  3. Từ khoá thương hiệu trong tên bị chặn nếu tên chứa "gần/near/đối diện"
//     ("Gần Vincom Plaza" là POI lân cận, "Crowne Plaza" là khách sạn).
func assignCategory(tags map[string]string, name string) string {
	flat := removeDiacritics(strings.ToLower(strings.TrimSpace(name)))

	// 1. Loại hình KHÔNG thuộc corpus (lọt vào qua tag phụ: khách sạn có
	// amenity=restaurant, cửa hàng thú cưng tên "Siêu Thị Thú Cưng"...).
	for _, m := range nonFoodMarkers {
		if containsWord(flat, m) {
			return "khac"
		}
	}

	// 2. TAG quyết định — đáng tin hơn tên (OSM wiki: chọn theo tag, không theo tên).
	switch tags["shop"] {
	case "mall", "department_store":
		return "mall"
	case "supermarket":
		return "sieu-thi"
	case "convenience":
		return "cua-hang-tien-loi"
	case "greengrocer", "seafood", "butcher", "deli", "wholesale":
		return "cua-hang-thuc-pham"
	case "wine", "alcohol":
		// Cửa hàng BÁN rượu ≠ quán nhậu (MAJOR 6).
		return "cua-hang-ruou"
	case "massage":
		// shop=massage ở VN là cơ sở massage, KHÔNG phải wellness spa (MAJOR 5).
		return "massage"
	case "bakery":
		return "banh-mi"
	case "coffee":
		// shop=coffee = bán hạt/đóng gói, nhưng ở ĐN gần như chắc chắn là cafe
		// (10 cái; wiki: map quán cà phê thì dùng amenity=cafe).
		return "cafe"
	case "farm":
		return "farm"
	}
	switch tags["amenity"] {
	case "marketplace":
		// Chợ truyền thống — 48 cái ở ĐN, khác hẳn siêu thị.
		return "cho"
	case "karaoke_box":
		return "karaoke"
	case "music_venue":
		return "music-box"
	case "cinema":
		return "cinema"
	}
	if tags["sport"] == "billiards" {
		return "bida"
	}
	switch tags["leisure"] {
	case "bowling_alley":
		return "bowling"
	case "amusement_arcade", "escape_game", "adult_gaming_centre":
		return "arcade"
	case "water_park":
		return "water-park"
	}

	// 3. Tên — chỉ khi tag không nói gì.
	near := hasNearMarker(flat)
	if containsWord(flat, "farm") || containsWord(flat, "nong trai") {
		return "farm"
	}
	if !near {
		// TTTM: phải tự khai "trung tâm thương mại"/"tttm" hoặc là thương hiệu
		// TTTM thật. "plaza"/"mall" một mình KHÔNG đủ (Crowne Plaza = khách sạn).
		if containsWord(flat, "trung tam thuong mai") || containsWord(flat, "tttm") ||
			containsWord(flat, "vincom") || containsWord(flat, "aeon mall") ||
			containsWord(flat, "parkson") || containsWord(flat, "indochina riverside") {
			return "mall"
		}
		// Siêu thị: CHỈ thương hiệu lớn (D-AI-44). "Siêu thị X"/"Y Mart" không
		// có thương hiệu lớn → minimart/tạp hóa → cua-hang-tien-loi (T4b loại).
		// Audit: 49 sieu-thi chỉ 9 là thương hiệu lớn, còn lại minimart nhỏ.
		if containsWord(flat, "sieu thi") || containsWord(flat, "coopmart") ||
			containsWord(flat, "winmart") || containsWord(flat, "lotte mart") ||
			containsWord(flat, "big c") || containsWord(flat, "go!") ||
			containsWord(flat, "mm mega market") || containsWord(flat, "satrafoods") {
			return "sieu-thi"
		}
		if containsWord(flat, "circle k") || containsWord(flat, "gs25") ||
			containsWord(flat, "family mart") || containsWord(flat, "winmart+") ||
			containsWord(flat, "bach hoa xanh") || containsWord(flat, "vinmart+") ||
			containsWord(flat, "mart") {
			return "cua-hang-tien-loi"
		}
		if containsWord(flat, "tap hoa") {
			return "tap-hoa"
		}
		// "Chợ X" — chỉ nhận khi "cho" đứng ĐẦU tên, tránh "chỗ"/"chợ" giữa câu.
		if strings.HasPrefix(flat, "cho ") {
			return "cho"
		}
		if containsWord(flat, "mart") {
			return "sieu-thi"
		}
	}
	if containsWord(flat, "quan nhau") {
		return "quan-nhau"
	}
	if containsWord(flat, "karaoke") {
		return "karaoke"
	}
	// Music box / nhạc sống / acoustic — quán cà phê hát (rất phổ biến ở Đà Nẵng)
	if containsWord(flat, "music box") || containsWord(flat, "nhac song") ||
		containsWord(flat, "live music") || containsWord(flat, "acoustic") {
		return "music-box"
	}
	if containsWord(flat, "bida") || containsWord(flat, "bi a") ||
		containsWord(flat, "billiard") {
		return "bida"
	}
	if containsWord(flat, "cinema") || containsWord(flat, "rap phim") {
		return "cinema"
	}
	if containsWord(flat, "bowling") {
		return "bowling"
	}
	if containsWord(flat, "arcade") {
		return "arcade"
	}
	// spa ≠ massage: shop=massage ở VN phần lớn là cơ sở massage, không phải
	// wellness spa, và nổi tiếng nhiễu nội dung người lớn (MAJOR 5).
	if containsWord(flat, "spa") {
		return "spa"
	}
	if containsWord(flat, "massage") {
		return "massage"
	}

	// Tên món CỤ THỂ thắng cuisine chung chung (audit: "Bánh Bèo Nóng" có
	// cuisine=vietnamese nên bị gán viet-nam, mất nhãn banh-beo). Lexicon đã
	// sort dài→ngắn nên "banh beo" thắng "banh".
	for _, entry := range dishLexicon {
		if containsWord(flat, entry.term) {
			return entry.cat
		}
	}

	if c, ok := tags["cuisine"]; ok && c != "" {
		// cuisine có thể là "vietnamese;seafood"
		for _, part := range strings.Split(strings.ToLower(c), ";") {
			part = strings.TrimSpace(part)
			if cat, ok := cuisineMap[part]; ok {
				return cat
			}
		}
	}

	switch tags["amenity"] {
	case "cafe":
		return "cafe"
	case "restaurant":
		return "quan-an"
	case "fast_food":
		return "an-vat"
	case "bar", "pub", "biergarten", "nightclub":
		return "quan-nhau"
	case "ice_cream":
		return "kem-bo"
	case "food_court", "canteen":
		return "quan-an"
	case "karaoke_box":
		return "karaoke"
	case "music_venue":
		return "music-box"
	case "cinema":
		return "cinema"
	}

	// Giải trí — leisure/sport/shop (L7)
	switch tags["leisure"] {
	case "bowling_alley":
		return "bowling"
	case "amusement_arcade", "escape_game", "adult_gaming_centre":
		return "arcade"
	case "water_park":
		return "water-park"
	}
	if tags["sport"] == "billiards" {
		return "bida"
	}

	switch tags["shop"] {
	case "bakery":
		return "banh-mi"
	// TÁCH 3 loại bán lẻ — số đếm thật từ Overpass (2026-11-11):
	//   shop=supermarket 32 · shop=convenience 410 · amenity=marketplace 48
	// Gộp cả ba thành "sieu-thi" là sai bản chất: cửa hàng tiện lợi (Circle K,
	// GS25, WinMart+, Bách Hóa Xanh) KHÔNG phải siêu thị (D-AI-40).
	// T4b sẽ loại tiếp các nhãn tiện ích — ở đây vẫn phân loại đúng để funnel
	// đếm được lý do (D-AI-42).
	case "supermarket":
		return "sieu-thi"
	case "convenience":
		return "cua-hang-tien-loi"
	case "greengrocer", "seafood", "butcher", "deli", "wholesale":
		return "cua-hang-thuc-pham"
	case "farm":
		return "farm"
	case "wine", "alcohol":
		return "cua-hang-ruou"
	}

	return "khac"
}

// districtCanonical: 6 nhãn quận (xấp xỉ theo quận cũ, xem comment trên
// `districtCentroids`).
var districtCanonical = map[string]bool{
	"Hải Châu": true, "Thanh Khê": true, "Sơn Trà": true,
	"Ngũ Hành Sơn": true, "Liên Chiểu": true, "Cẩm Lệ": true,
}

// Chuẩn hoá addr:district từ OSM (viết không dấu, có tiền tố, sai chính tả,
// hoặc là đơn vị cũ trước sáp nhập 2025). Trả về "" nếu không nhận ra →
// fallback sang nearest-centroid trong 7 quận.
//
// Map đơn vị cũ (phường/quận trước 2025) → phân nhóm 6 quận:
//   - An Hải → Sơn Trà; Hòa Cường → Hải Châu
//   - Hòa Khánh, Hải Vân → Liên Chiểu; Hòa Xuân → Cẩm Lệ
//   - Hòa Vang, Hoàng Sa (2 huyện) → "" để fallback nearest-centroid về quận
//     gần nhất (dữ liệu POI ở vùng này thuộc lân cận quận nào thì nhận quận đó)
func normalizeDistrict(s string) string {
	s = strings.TrimSpace(s)
	// bỏ tiền tố "Quận " / "Huyện "
	for _, p := range []string{"Quận ", "Huyện ", "quan ", "huyen "} {
		s = strings.TrimPrefix(s, p)
	}
	s = strings.TrimSpace(s)
	if districtCanonical[s] {
		return s
	}
	// map không dấu → có dấu, gồm cả đơn vị cũ trước sáp nhập 2025
	ascii := map[string]string{
		"Hai Chau": "Hải Châu", "Hai Chau District": "Hải Châu",
		"Ngu Hanh Son": "Ngũ Hành Sơn",
		"Son Tra":      "Sơn Trà", "Lien Chieu": "Liên Chiểu",
		"Cam Le": "Cẩm Lệ",
		// Đơn vị cũ → đơn vị mới sau sáp nhập 2025
		"An Hai":    "Sơn Trà", // An Hải Đông/Bắc/Tây là phường của Sơn Trà
		"Hoa Cuong": "Hải Châu",
		"An Khe":    "Thanh Khê", // An Khê là phường thuộc Thanh Khê cũ
		"Thanh Khe": "Thanh Khê",
		"Hoa Khanh": "Liên Chiểu",
		"Hai Van":   "Liên Chiểu",
		"Hoa Xuan":  "Cẩm Lệ",
	}
	if mapped, ok := ascii[s]; ok {
		return mapped
	}
	return "" // không nhận ra
}

// qualityScore: chấm 0–100 để CHỌN quán tốt thay vì theo thứ tự OSM.
//
// Ba nhóm tín hiệu, đều có trong dữ liệu OSM (không bịa):
//
//	1. Chất lượng tên (0–40) — có dấu tiếng Việt, nhiều từ, không viết hoa toàn bộ
//	2. Độ đầy đủ metadata (0–30) — giờ mở cửa, điện thoại, website, cuisine, địa chỉ
//	3. Độ "còn sống" (0–30) — timestamp sửa đổi gần đây + số version
//
// KHÔNG dùng review/rating vì OSM không có. KHÔNG gọi Google vì không có API key
// và sẽ bị rate-limit khi quét hàng nghìn POI — xem ghi chú trong runbook.
func qualityScore(e rawElement, name string) int {
	score := 0

	// --- 1. Chất lượng tên (0–40) ---
	if hasDiacritics(name) {
		score += 20 // tên có dấu = người Việt nhập cẩn thận
	}
	words := len(strings.Fields(name))
	if words >= 2 {
		score += 10
	}
	if name != strings.ToUpper(name) {
		score += 5 // không phải VIẾT HOA TOÀN BỘ
	}
	if len([]rune(name)) >= 5 && len([]rune(name)) <= 60 {
		score += 5
	}

	// --- 2. Metadata (0–30) ---
	t := e.Tags
	if t["opening_hours"] != "" {
		score += 10
	}
	if t["phone"] != "" || t["contact:phone"] != "" {
		score += 8
	}
	if t["website"] != "" || t["contact:website"] != "" {
		score += 6
	}
	if t["cuisine"] != "" {
		score += 3
	}
	if t["addr:street"] != "" {
		score += 3
	}

	// --- 3. Còn hoạt động (0–30) ---
	if e.Timestamp != "" {
		if ts, err := time.Parse(time.RFC3339, e.Timestamp); err == nil {
			years := time.Since(ts).Hours() / 24 / 365
			switch {
			case years < 2:
				score += 20
			case years < 5:
				score += 10
			case years < 10:
				score += 5
			}
		}
	}
	if e.Version >= 5 {
		score += 10 // được sửa nhiều lần = có người quan tâm
	} else if e.Version >= 3 {
		score += 5
	}

	return score
}

// hasDiacritics: tên có ký tự Latin mở rộng (ắ, ộ, ữ...) → người Việt nhập đúng.
func hasDiacritics(s string) bool {
	for _, r := range s {
		if r > 127 {
			return true
		}
	}
	return false
}

// nearestDistrict: trả về tên quận gần nhất + khoảng cách (m) tới centroid.
// Gọi nơi dùng kết quả phải kiểm khoảng cách: > maxDistrictDist = không tin được.
func nearestDistrict(lat, lng float64) (string, float64) {
	best, bestD := "", math.MaxFloat64
	for name, c := range districtCentroids {
		d := haversine(lat, lng, c[0], c[1])
		if d < bestD {
			best, bestD = name, d
		}
	}
	return best, bestD
}

// maxDistrictDist: ĐÃ BỎ NGƯỠNG. Mọi venue phải có district thuộc 7 đơn vị cấp
// quận — district rỗng làm filter theo quận ở FE bỏ sót place. Vẫn đánh dấu
// districtApprox=true để ranker biết đây là phỏng đoán theo centroid.

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// capChainBranches: mỗi THƯƠNG HIỆU chỉ giữ tối đa `max` chi nhánh điểm cao nhất.
//
// Audit 2026-11-11: 76/84 "bánh mì" là chi nhánh Đồng Tiến Bakery — một chuỗi
// bakery chiếm 17% corpus, làm loãng mọi phân bố và khiến query "bánh mì" trả
// về 20 chi nhánh giống nhau. Key thương hiệu = tên chuẩn hoá BỎ số nhà/đường
// ("Đồng Tiến Bakery - 07 Nguyễn Đình Tựu" và "Đồng Tiến Bakery" cùng key).
// Tất định: sort quality giảm dần, hoà → theo tên.
func capChainBranches(places []outPlace, max int) int {
	if max <= 0 {
		return 0
	}
	chainKey := func(p outPlace) string {
		k := normalizeName(p.Name)
		// cắt tại "-" đầu tiên: "dong tien bakery - 07 nguyen dinh tuu" →
		// "dong tien bakery" (tên chi nhánh luôn sau dấu gạch).
		if i := strings.Index(k, "-"); i > 0 {
			k = strings.TrimSpace(k[:i])
		}
		// bỏ token số ("07", "575") — chi nhánh hay ghi số nhà trong tên.
		fs := strings.Fields(k)
		keep := fs[:0]
		for _, w := range fs {
			if !isAllDigits(w) {
				keep = append(keep, w)
			}
		}
		return strings.Join(keep, " ")
	}
	groups := map[string][]int{}
	for i, p := range places {
		k := chainKey(p)
		// Key 1 từ quá chung ("Bánh mì", "Cà phê") — gộp sẽ giết oan quán khác
		// nhau cùng tên chung. Chỉ áp dụng cho tên thương hiệu ≥2 từ.
		if len(strings.Fields(k)) < 2 {
			continue
		}
		groups[k] = append(groups[k], i)
	}
	drop := map[int]bool{}
	dropped := 0
	for _, idxs := range groups {
		if len(idxs) <= max {
			continue
		}
		sort.SliceStable(idxs, func(a, b int) bool {
			pa, pb := places[idxs[a]], places[idxs[b]]
			if pa.Quality != pb.Quality {
				return pa.Quality > pb.Quality
			}
			return pa.Name < pb.Name
		})
		for _, i := range idxs[max:] {
			drop[i] = true
			dropped++
		}
	}
	if dropped == 0 {
		return 0
	}
	kept := make([]outPlace, 0, len(places)-dropped)
	for i, p := range places {
		if !drop[i] {
			kept = append(kept, p)
		}
	}
	// Ghi đè tại chỗ — caller cắt slice theo số trả về.
	copy(places, kept)
	for i := len(kept); i < len(places); i++ {
		places[i] = outPlace{}
	}
	return dropped
}

func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ---------- main ----------

func main() {
	rawDir := flag.String("raw", "../../data/raw", "thư mục chứa osm-*.json (tính từ backend/scripts/build-corpus)")
	outPath := flag.String("out", "../../data/places-expanded.json", "file kết quả (seed.ts đọc backend/data/places-expanded.json)")
	origPath := flag.String("original", "../../../frontend/data/cold-start/places.json", "dataset gốc 491 — giữ lại quán curated/curated-v2")
	capCafe := flag.Float64("cap-cafe", 0.35, "tỉ lệ cafe tối đa trong corpus (0 = không giới hạn). Downsample có seed cố định")
	minSignals := flag.Int("min-signals", 2, "số tín hiệu kinh doanh thật tối thiểu (phone/website/giờ mở/brand/chuỗi) để giữ quán ăn-cafe-giải trí")
	maxBranch := flag.Int("max-branch", 3, "số chi nhánh tối đa giữ lại cho mỗi thương hiệu (0 = không giới hạn)")
	flag.Parse()

	files, err := filepath.Glob(filepath.Join(*rawDir, "osm-*.json"))
	if err != nil || len(files) == 0 {
		fmt.Fprintf(os.Stderr, "[build] không tìm thấy file raw trong %s\n", *rawDir)
		os.Exit(1)
	}
	sort.Strings(files)

	// Gộp mọi element từ mọi file, dedup theo (type,id) — vòng sau ghi đè vòng trước.
	seen := map[string]rawElement{}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[build] bỏ qua %s: %v\n", f, err)
			continue
		}
		var rf rawFile
		if err := json.Unmarshal(b, &rf); err != nil {
			fmt.Fprintf(os.Stderr, "[build] %s JSON lỗi: %v\n", f, err)
			continue
		}
		for _, e := range rf.Elements {
			seen[fmt.Sprintf("%s/%d", e.Type, e.ID)] = e
		}
		fmt.Printf("[build] %s: %d element\n", filepath.Base(f), len(rf.Elements))
	}

	var fn funnel
	fn.Raw = len(seen)
	fmt.Printf("[build] RAW (sau dedup theo OSM id): %d\n", fn.Raw)

	// T1: bỏ không có name
	type cand struct {
		e           rawElement
		name        string
		lat         float64
		lng         float64
		namePenalty int // điểm phạt từ judgeName (âm hoặc 0)
	}
	var afterT1 []cand
	for _, e := range seen {
		name := strings.TrimSpace(e.Tags["name"])
		if name == "" {
			continue
		}
		var lat, lng float64
		if e.Lat != nil && e.Lon != nil {
			lat, lng = *e.Lat, *e.Lon
		} else if e.Center != nil {
			lat, lng = e.Center.Lat, e.Center.Lon
		} else {
			continue // không có toạ độ → không dùng được
		}
		afterT1 = append(afterT1, cand{e: e, name: name, lat: lat, lng: lng})
	}
	fn.T1 = len(afterT1)
	fmt.Printf("[build] T1 (có name + toạ độ): %d\n", fn.T1)

	// T2: bỏ name không có chữ cái
	var afterT2 []cand
	for _, c := range afterT1 {
		if !letterRe.MatchString(c.name) {
			continue
		}
		afterT2 = append(afterT2, c)
	}
	fn.T2 = len(afterT2)
	fmt.Printf("[build] T2 (name có chữ cái): %d\n", fn.T2)

	// T2b: đánh giá TÊN — loại tên trơ (địa chỉ, ký hiệu, tên người, phi ẩm thực),
	// phạt mềm tên mơ hồ. Chạy TRƯỚC T3 dedup để key dedup không bị tên rác
	// làm bẩn (L-021). Penalty trừ thẳng vào qualityScore.
	var afterT2b []cand
	for _, c := range afterT2 {
		v := judgeName(c.name)
		if v.drop {
			dropReasons["T2b/"+v.reason]++
			continue
		}
		c.namePenalty = v.penalty
		afterT2b = append(afterT2b, c)
	}
	fn.T2b = len(afterT2b)
	fmt.Printf("[build] T2b (tên searchable): %d (loại %d)\n", fn.T2b, fn.T2-fn.T2b)

	// T3: dedup theo tên chuẩn hoá + <50m
	var afterT3 []cand
	byKey := map[string][]int{} // key → index trong afterT3
	merged := 0
	for _, c := range afterT2b {
		key := normalizeName(c.name)
		dup := false
		for _, idx := range byKey[key] {
			if haversine(c.lat, c.lng, afterT3[idx].lat, afterT3[idx].lng) < 50 {
				dup = true
				// giữ bản ghi có nhiều tag hơn
				if len(c.e.Tags) > len(afterT3[idx].e.Tags) {
					afterT3[idx] = c
				}
				merged++
				break
			}
		}
		if !dup {
			byKey[key] = append(byKey[key], len(afterT3))
			afterT3 = append(afterT3, c)
		}
	}
	fn.T3 = len(afterT3)
	fmt.Printf("[build] T3 (dedup <50m, gộp %d): %d\n", merged, fn.T3)

	// T4: bỏ ngoài bbox
	var afterT4 []cand
	for _, c := range afterT3 {
		if c.lat < 15.90 || c.lat > 16.30 || c.lng < 107.60 || c.lng > 108.45 {
			continue
		}
		afterT4 = append(afterT4, c)
	}
	fn.T4 = len(afterT4)
	fmt.Printf("[build] T4 (trong bbox): %d\n", fn.T4)

	// T4b: chỉ giữ ĐỊA ĐIỂM NỔI BẬT (D-AI-42). Loại hẳn tiện ích (tạp hóa,
	// cửa hàng tiện lợi, cửa hàng thực phẩm/rượu, nông trại) và quán không có
	// tín hiệu kinh doanh thật. Mall + siêu thị lớn + chợ nổi tiếng luôn giữ.
	var afterT4b []cand
	cats := make([]string, 0, len(afterT4))
	for _, c := range afterT4 {
		cat := assignCategory(c.e.Tags, c.name)
		keep, reason := isNotable(c.e.Tags, c.name, cat, *minSignals)
		if !keep {
			dropReasons["T4b/"+reason]++
			continue
		}
		afterT4b = append(afterT4b, c)
		cats = append(cats, cat)
	}
	fn.T4b = len(afterT4b)
	fmt.Printf("[build] T4b (địa điểm nổi bật): %d (loại %d)\n", fn.T4b, fn.T4-fn.T4b)

	// T5 + T6: gán nhãn + chuẩn hoá
	out := make([]outPlace, 0, len(afterT4b))

	for i, c := range afterT4b {
		cat := cats[i]
		// Chống lệch code ↔ dữ liệu: nhãn lạ = build FAIL, không ghi file (L-019).
		if !validCategories[cat] {
			fmt.Fprintf(os.Stderr, "[build] LỖI: nhãn %q không nằm trong validCategories — sửa assignCategory hoặc bổ sung nhãn (L-019)\n", cat)
			os.Exit(1)
		}

		var district *string
		geoPrec := ""
		districtApprox := false
		if d := normalizeDistrict(c.e.Tags["addr:district"]); d != "" {
			district = strPtr(d)
			geoPrec = "addr-tag"
		} else {
			// Luôn gán quận gần nhất trong 7 đơn vị — không để trống.
			d, _ := nearestDistrict(c.lat, c.lng)
			district = strPtr(d)
			geoPrec = "district-centroid"
			districtApprox = true
		}
		addr := strings.TrimSpace(strings.Join([]string{
			c.e.Tags["addr:housenumber"], c.e.Tags["addr:street"],
		}, " "))
		addr = strings.TrimSpace(addr)

		// Chỉ nhận phone/website THẬT — số "123456789"/"Loren.com" là OSM
		// vandalism, không được tính vào coverage A9/A10 (MINOR 7).
		phone := realPhone(c.e.Tags)
		website := realWebsite(c.e.Tags)

		lat, lng := c.lat, c.lng
		src := "osm"
		osmID := fmt.Sprintf("osm:%s/%d", c.e.Type, c.e.ID)
		tier := "osm"
		status := "unknown"

		q := qualityScore(c.e, c.name) + c.namePenalty
		if q < 0 {
			q = 0
		}

		out = append(out, outPlace{
			ID:           fmt.Sprintf("osm-%s-%d", c.e.Type, c.e.ID),
			Name:         c.name,
			Category:     cat,
			District:     district,
			Address:      strPtr(addr),
			Lat:          &lat,
			Lng:          &lng,
			Phone:        strPtr(phone),
			OpeningHours: strPtr(c.e.Tags["opening_hours"]),
			Description:  nil, // OSM không có mô tả — không bịa
			Sources:      []string{src},
			GeoSource:    strPtr("osm"),
			GeoPrecision: strPtr(geoPrec),
			OsmID:        strPtr(osmID),
			Image:        nil,
			ImageKind:    nil,
			ImageNote:    nil,
			Images:       []string{},
			VenuePageURL: strPtr(website),
			Verified:     false,
			CollectedAt:  nil,
			Tier:         &tier,
			Status:       status,
			Tags:         buildTags(c.e.Tags),
			Vibes:        buildVibes(c.e.Tags, cat),
			Quality:      q,

			DistrictApprox: districtApprox,
			mHours:       c.e.Tags["opening_hours"] != "",
			mPhone:       phone != "",
			mCuisine:     c.e.Tags["cuisine"] != "",
			mWebsite:     website != "",
		})
	}
	// ---------- Gộp quán curated từ dataset gốc (giữ description + ảnh) ----------
	// Chỉ giữ tier curated / curated-v2. POI OSM cũ trong dataset gốc BỎ, vì
	// corpus mới đã có bản OSM đầy đủ hơn (tránh trùng lặp khi seed).
	var curated []outPlace
	if b, err := os.ReadFile(*origPath); err == nil {
		var orig struct {
			Places []outPlace `json:"places"`
		}
		if err := json.Unmarshal(b, &orig); err != nil {
			fmt.Fprintf(os.Stderr, "[build] dataset gốc JSON lỗi: %v\n", err)
		} else {
			for _, p := range orig.Places {
				tier := ""
				if p.Tier != nil {
					tier = *p.Tier
				}
				if tier == "curated" || tier == "curated-v2" {
					// Curated là quán đã kiểm tay thủ công — dataset gốc không có
					// trường quality nên mặc định 0, sẽ bị cap-cafe cắt đầu tiên.
					// Gán sàn 60 (tương đương tên tốt + metadata đầy đủ).
					if p.Quality < 60 {
						p.Quality = 60
					}
					// Curated không có tag OSM → vibes rỗng (không bịa).
					p.Vibes = []string{}
					// Chuẩn hoá district của curated về 7 đơn vị cấp quận. Dataset
					// gốc còn nhãn cũ (Thanh Khê, An Hải, Hòa Cường...) — map theo
					// sáp nhập 2025; không nhận ra thì lấy centroid gần nhất.
					curDistrict := ""
					if p.District != nil {
						curDistrict = normalizeDistrict(*p.District)
					}
					if curDistrict == "" && p.Lat != nil && p.Lng != nil {
						curDistrict, _ = nearestDistrict(*p.Lat, *p.Lng)
					}
					if curDistrict != "" {
						p.District = strPtr(curDistrict)
					}
					p.mHours = p.OpeningHours != nil && *p.OpeningHours != ""
					p.mPhone = p.Phone != nil && *p.Phone != ""
					p.mCuisine = false // dataset gốc không có trường cuisine
					p.mWebsite = p.VenuePageURL != nil && *p.VenuePageURL != ""
					curated = append(curated, p)
				}
			}
			fmt.Printf("[build] dataset gốc: giữ %d quán curated (bỏ %d POI OSM cũ)\n",
				len(curated), len(orig.Places)-len(curated))
		}
	} else {
		fmt.Fprintf(os.Stderr, "[build] CẢNH BÁO: không đọc được %s — corpus sẽ thiếu quán curated: %v\n", *origPath, err)
	}

	// Dedup OSM mới với curated: nếu trùng tên + <50m thì BỎ bản OSM (giữ curated
	// vì có description/ảnh/đã kiểm).
	kept := out[:0]
	dropped := 0
	for _, p := range out {
		dup := false
		if p.Lat != nil && p.Lng != nil {
			for _, c := range curated {
				if c.Lat == nil || c.Lng == nil {
					continue
				}
				if normalizeName(p.Name) == normalizeName(c.Name) &&
					haversine(*p.Lat, *p.Lng, *c.Lat, *c.Lng) < 50 {
					dup = true
					break
				}
			}
		}
		if dup {
			dropped++
			continue
		}
		kept = append(kept, p)
	}
	out = kept
	fmt.Printf("[build] dedup với curated: bỏ %d POI OSM trùng → còn %d\n", dropped, len(out))

	// Thêm curated vào cuối
	out = append(out, curated...)
	fn.T5 = len(out) // sau gộp curated

// ---------- Giới hạn chi nhánh mỗi thương hiệu (D-AI-44) ----------
// Audit: 76/84 "bánh mì" là chi nhánh Đồng Tiến Bakery → 1 chuỗi chiếm 17%
// corpus. Chỉ giữ `maxBranch` chi nhánh điểm cao nhất mỗi thương hiệu.
chainDropped := capChainBranches(out, *maxBranch)
if chainDropped > 0 {
	out = out[:len(out)-chainDropped]
	fmt.Printf("[build] GIỚI HẠN CHUỖI: bỏ %d chi nhánh trùng thương hiệu (giữ tối đa %d/thương hiệu)\n",
		chainDropped, *maxBranch)
}

// ---------- Cân bằng lớp: giới hạn tỉ lệ cafe, GIỮ QUÁN ĐIỂM CAO ----------
// Không phải để "làm đẹp số liệu" mà để tránh corpus lệch lớp làm ranker
// thiên về cafe. Khi phải cắt, giữ quán chất lượng cao nhất (qualityScore),
// không theo thứ tự OSM. Hoà điểm → theo tên để tất định.
//
// Công thức: cắt cafe làm THAY ĐỔI cả mẫu số. Muốn tỉ lệ CUỐI = cap:
//   keep / (N - C + keep) = cap  →  keep = cap*(N-C)/(1-cap)
// (công thức cũ keep = cap*N cho ra tỉ lệ cuối vẫn > cap — L-016)
cafeDropped := 0
if *capCafe > 0 && *capCafe < 1 && len(out) > 0 {
		cafeIdx := []int{}
		for i, p := range out {
			if p.Category == "cafe" {
				cafeIdx = append(cafeIdx, i)
			}
		}
		share := float64(len(cafeIdx)) / float64(len(out))
		if share > *capCafe {
			nonCafe := len(out) - len(cafeIdx)
			keep := int(*capCafe * float64(nonCafe) / (1 - *capCafe))
			if keep < 0 {
				keep = 0
			}
			if keep > len(cafeIdx) {
				keep = len(cafeIdx)
			}
			// sắp giảm dần theo quality; hoà → theo tên để tất định
			sort.SliceStable(cafeIdx, func(a, b int) bool {
				pa, pb := out[cafeIdx[a]], out[cafeIdx[b]]
				if pa.Quality != pb.Quality {
					return pa.Quality > pb.Quality
				}
				return pa.Name < pb.Name
			})
			drop := map[int]bool{}
			for _, i := range cafeIdx[keep:] {
				drop[i] = true
			}
			filtered := make([]outPlace, 0, len(out)-len(drop))
			for i, p := range out {
				if !drop[i] {
					filtered = append(filtered, p)
				}
			}
			cafeDropped = len(drop)
			out = filtered
			finalShare := float64(keep) / float64(len(out))
			fmt.Printf("[build] CÂN BẰNG LỚP: cafe %.1f%% > %.0f%% → bỏ %d cafe ĐIỂM THẤP NHẤT, còn %.1f%%\n",
				share*100, *capCafe*100, cafeDropped, finalShare*100)
		}
	}
	fn.T6 = len(out) // sau cap-cafe

	// Sắp toàn corpus giảm dần theo quality → seed/DB có thứ tự ổn định,
	// và nếu sau này cần cắt thêm thì cắt từ cuối.
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Quality != out[j].Quality {
			return out[i].Quality > out[j].Quality
		}
		return out[i].Name < out[j].Name
	})

	// ---------- Thống kê trên CORPUS CUỐI (sau gộp curated + cap-cafe) ----------
	catCount := map[string]int{}
	distCount := map[string]int{}
	approxDistrict := 0
	hasHours, hasPhone, hasCuisine, hasWebsite := 0, 0, 0, 0
	tagCount := map[string]int{}
	tagsFilled := 0
	vibesFilled := 0
	vibeCount := map[string]int{}
	for _, p := range out {
		catCount[p.Category]++
		if len(p.Tags) > 0 {
			tagsFilled++
		}
		for _, t := range p.Tags {
			tagCount[t]++
		}
		if len(p.Vibes) > 0 {
			vibesFilled++
		}
		for _, v := range p.Vibes {
			vibeCount[v]++
		}
		if p.District != nil {
			distCount[*p.District]++
		}
		if p.DistrictApprox {
			approxDistrict++
		}
		if p.mHours {
			hasHours++
		}
		if p.mPhone {
			hasPhone++
		}
		if p.mCuisine {
			hasCuisine++
		}
		if p.mWebsite {
			hasWebsite++
		}
	}

	// ---------- In bảng funnel ----------
	fmt.Println()
	fmt.Println("| Tầng | Vào | Ra | Loại | Tỉ lệ | Lý do |")
	fmt.Println("|------|-----|-----|------|-------|-------|")
	fmt.Printf("| RAW  |  -  | %d | - | - | Overpass (dedup theo OSM id) |\n", fn.Raw)
	fmt.Printf("| T1   | %d | %d | %d | %.1f%% | không có name hoặc toạ độ |\n",
		fn.Raw, fn.T1, fn.Raw-fn.T1, pct(fn.Raw-fn.T1, fn.Raw))
	fmt.Printf("| T2   | %d | %d | %d | %.1f%% | name không có chữ cái |\n",
		fn.T1, fn.T2, fn.T1-fn.T2, pct(fn.T1-fn.T2, fn.T1))
	fmt.Printf("| T2b  | %d | %d | %d | %.1f%% | tên không searchable (địa chỉ/ký hiệu/tên người/phi ẩm thực) |\n",
		fn.T2, fn.T2b, fn.T2-fn.T2b, pct(fn.T2-fn.T2b, fn.T2))
	fmt.Printf("| T3   | %d | %d | %d | %.1f%% | trùng tên + <50m |\n",
		fn.T2b, fn.T3, fn.T2b-fn.T3, pct(fn.T2b-fn.T3, fn.T2b))
	fmt.Printf("| T4   | %d | %d | %d | %.1f%% | ngoài bbox |\n",
		fn.T3, fn.T4, fn.T3-fn.T4, pct(fn.T3-fn.T4, fn.T3))
	fmt.Printf("| T4b  | %d | %d | %d | %.1f%% | không phải địa điểm nổi bật (tiện ích / thiếu tín hiệu) |\n",
		fn.T4, fn.T4b, fn.T4-fn.T4b, pct(fn.T4-fn.T4b, fn.T4))
	// T5 có thể TĂNG so với T4b (thêm curated sau khi trừ trùng) → in có dấu.
	if fn.T5 >= fn.T4b {
		fmt.Printf("| T5   | %d | %d | +%d | - | gộp curated (+%d, trừ %d trùng với OSM) |\n",
			fn.T4b, fn.T5, fn.T5-fn.T4b, len(curated), dropped)
	} else {
		fmt.Printf("| T5   | %d | %d | %d | %.1f%% | gộp curated + dedup với curated |\n",
			fn.T4b, fn.T5, fn.T4b-fn.T5, pct(fn.T4b-fn.T5, fn.T4b))
	}
	fmt.Printf("| T6   | %d | %d | %d | %.1f%% | giới hạn chuỗi + cap-cafe |\n",
		fn.T5, fn.T6, fn.T5-fn.T6, pct(fn.T5-fn.T6, fn.T5))
	fmt.Printf("| CUỐI | - | **%d** | - | - | corpus |\n", fn.T6)

	// Lý do loại chi tiết của T2b + T4b — mỗi tầng phải đếm, không lọc im lặng.
	if len(dropReasons) > 0 {
		keys := make([]string, 0, len(dropReasons))
		for k := range dropReasons {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		fmt.Println("\n## Lý do loại (T2b + T4b)")
		for _, k := range keys {
			fmt.Printf("- %-28s %5d\n", k, dropReasons[k])
		}
	}

	// ---------- Phân bố ----------
	fmt.Println("\n## Phân bố quận")
	fmt.Printf("- (nguồn: %d từ addr:district thật, %d PHỎNG ĐOÁN theo centroid — districtApprox=true)\n",
		fn.T6-approxDistrict, approxDistrict)
	for _, kv := range topN(distCount, 20) {
		fmt.Printf("- %-15s %5d  %5.1f%%\n", kv.k, kv.v, pct(kv.v, fn.T6))
	}
	fmt.Println("\n## Phân bố category")
	for _, kv := range topN(catCount, 20) {
		fmt.Printf("- %-22s %5d  %5.1f%%\n", kv.k, kv.v, pct(kv.v, fn.T6))
	}

	// Tách 3 nhóm nội dung — corpus KHÔNG còn thuần ẩm thực (D-AI-37, D-AI-38).
	// Sau D-AI-42, bán lẻ chỉ còn mall + siêu thị lớn + chợ nổi tiếng.
	entertainment := map[string]bool{
		"karaoke": true, "music-box": true, "cinema": true, "bida": true,
		"bowling": true, "arcade": true, "water-park": true, "spa": true,
		"massage": true,
	}
	retail := map[string]bool{
		"sieu-thi": true, "cho": true, "mall": true,
	}
	entCount, retailCount := 0, 0
	for cat, n := range catCount {
		if entertainment[cat] {
			entCount += n
		}
		if retail[cat] {
			retailCount += n
		}
	}
	foodCount := fn.T6 - entCount - retailCount
	fmt.Println("\n## Nhóm nội dung")
	fmt.Printf("- ẩm thực   %5d  %5.1f%%\n", foodCount, pct(foodCount, fn.T6))
	fmt.Printf("- mua sắm   %5d  %5.1f%%  (sieu-thi/cho/mall — chỉ địa điểm lớn)\n", retailCount, pct(retailCount, fn.T6))
	fmt.Printf("- giải trí  %5d  %5.1f%%  (karaoke/music-box/cinema/bida/bowling/arcade/water-park/spa/massage)\n",
		entCount, pct(entCount, fn.T6))
	fmt.Println("\n## Metadata coverage")
	fmt.Printf("- openingHours %d (%.1f%%)\n", hasHours, pct(hasHours, fn.T6))
	fmt.Printf("- phone        %d (%.1f%%)\n", hasPhone, pct(hasPhone, fn.T6))
	fmt.Printf("- cuisine      %d (%.1f%%)\n", hasCuisine, pct(hasCuisine, fn.T6))
	fmt.Printf("- website      %d (%.1f%%)\n", hasWebsite, pct(hasWebsite, fn.T6))

	// ---------- Phân bố tags (sinh từ tag OSM thật) ----------
	fmt.Println("\n## Tags (từ OSM)")
	fmt.Printf("- place có tags %d/%d (%.1f%%)\n", tagsFilled, fn.T6, pct(tagsFilled, fn.T6))
	for _, kv := range topN(tagCount, 15) {
		fmt.Printf("- %-24s %5d\n", kv.k, kv.v)
	}

	// ---------- Phân bố vibes (sinh từ tín hiệu OSM thật) ----------
	fmt.Println("\n## Vibes (từ tín hiệu OSM)")
	fmt.Printf("- place có vibes %d/%d (%.1f%%)\n", vibesFilled, fn.T6, pct(vibesFilled, fn.T6))
	for _, kv := range topN(vibeCount, 10) {
		fmt.Printf("- %-24s %5d\n", kv.k, kv.v)
	}

	// ---------- Phân bố điểm chất lượng ----------
	fmt.Println("\n## Điểm chất lượng (qualityScore 0–100)")
	buckets := map[string]int{"0-19": 0, "20-39": 0, "40-59": 0, "60-79": 0, "80-100": 0}
	sumQ, maxQ, minQ := 0, 0, 100
	for _, p := range out {
		sumQ += p.Quality
		if p.Quality > maxQ {
			maxQ = p.Quality
		}
		if p.Quality < minQ {
			minQ = p.Quality
		}
		switch {
		case p.Quality < 20:
			buckets["0-19"]++
		case p.Quality < 40:
			buckets["20-39"]++
		case p.Quality < 60:
			buckets["40-59"]++
		case p.Quality < 80:
			buckets["60-79"]++
		default:
			buckets["80-100"]++
		}
	}
	for _, k := range []string{"0-19", "20-39", "40-59", "60-79", "80-100"} {
		fmt.Printf("- %-7s %5d  %5.1f%%\n", k, buckets[k], pct(buckets[k], fn.T6))
	}
	if fn.T6 > 0 {
		fmt.Printf("- trung bình %.1f · min %d · max %d\n", float64(sumQ)/float64(fn.T6), minQ, maxQ)
	}

	fmt.Println("\n## Tên có dấu tiếng Việt")
	withDia := 0
	for _, p := range out {
		if hasDiacritics(p.Name) {
			withDia++
		}
	}
	fmt.Printf("- có dấu %d (%.1f%%) · không dấu %d (%.1f%%)\n",
		withDia, pct(withDia, fn.T6), fn.T6-withDia, pct(fn.T6-withDia, fn.T6))

	// ---------- Cảnh báo ----------
	// Nguyên tắc: mỗi cảnh báo phải nêu (a) số thật, (b) ngưỡng, (c) việc cần làm.
	// Ngưỡng cảnh báo phải KHỚP ngưỡng dùng để cắt dữ liệu ở trên — nếu cap-cafe là
	// 35% mà cảnh báo chỉ kêu ở 50% thì lúc cap hỏng sẽ không ai biết (L-018).
	fmt.Println("\n## Cảnh báo")
	warned := false
	warn := func(format string, a ...any) {
		fmt.Printf("⚠️  "+format+"\n", a...)
		warned = true
	}

	if fn.T6 == 0 {
		warn("CORPUS RỖNG: không còn bản ghi nào — kiểm tra thư mục raw và các tầng lọc")
	}

	// 1. Quận lệch — tính trên số POI CÓ quận, không phải toàn corpus (nếu nhiều
	//    POI district=null thì chia cho tổng sẽ báo thấp giả tạo).
	withDistrict := 0
	for _, n := range distCount {
		withDistrict += n
	}
	if kv := topN(distCount, 1); len(kv) > 0 && withDistrict > 0 {
		if p := pct(kv[0].v, withDistrict); p > 40 {
			warn("LỆCH QUẬN: %s chiếm %.1f%% (>40%% của %d POI có quận) — fetch bổ sung vùng thiếu",
				kv[0].k, p, withDistrict)
		}
	}

	// 2. cafe vượt ngưỡng cap — so với CHÍNH cap, không phải 50%.
	cafePct := pct(catCount["cafe"], fn.T6)
	if *capCafe > 0 && *capCafe < 1 {
		if cafePct > *capCafe*100+0.5 {
			warn("CAP-CAFE KHÔNG ĐẠT: cafe %.1f%% > ngưỡng %.0f%% — kiểm tra bước downsample",
				cafePct, *capCafe*100)
		}
	} else if cafePct > 50 {
		warn("LỆCH CATEGORY: cafe chiếm %.1f%% (>50%%, cap đang tắt)", cafePct)
	}

	// 3. Nhãn nhiễu
	if p := pct(catCount["khac"], fn.T6); p > 20 {
		warn("NHIỄU CAO: khac chiếm %.1f%% (>20%%) — siết lexicon / assignCategory", p)
	}

	// 4. Bất kỳ category nào khác lấn át (không chỉ cafe)
	for cat, n := range catCount {
		if cat == "cafe" {
			continue
		}
		if p := pct(n, fn.T6); p > 40 {
			warn("LỆCH CATEGORY: %s chiếm %.1f%% (>40%%)", cat, p)
		}
	}

	// 5. Quy mô — mục tiêu ĐÃ ĐỔI theo D-AI-42: app chỉ giữ địa điểm nổi bật
	// (≥2 tín hiệu kinh doanh thật), corpus nhỏ hơn là chấp nhận được.
	if fn.T6 < 600 {
		warn("QUY MÔ NHỎ: %d (<600) — cân nhắc giảm -min-signals xuống 1 hoặc fetch thêm vùng", fn.T6)
	}

	// 6. Tỉ lệ giải trí — corpus không còn thuần ẩm thực (D-AI-37)
	if p := pct(entCount, fn.T6); p > 30 {
		warn("GIẢI TRÍ CHIẾM %.1f%% (>30%%) — nên tách corpus ẩm thực / giải trí khi đánh giá", p)
	}
	if entCount == 0 {
		warn("KHÔNG CÓ POI GIẢI TRÍ: vòng L7 chưa chạy hoặc query không khớp")
	}

	// 7. Loại hình user yêu cầu phải có mặt (sau D-AI-42 chỉ còn mall + siêu thị lớn)
	for _, cat := range []string{"sieu-thi", "mall"} {
		if catCount[cat] == 0 {
			warn("THIẾU LOẠI HÌNH: không có POI nào nhãn %q (siêu thị lớn / TTTM) — kiểm tra L6", cat)
		}
	}

	// 7b. Bộ lọc nổi bật loại quá nhiều → corpus có thể đã mất quán nổi tiếng
	if fn.T4 > 0 {
		if p := pct(fn.T4-fn.T4b, fn.T4); p > 85 {
			warn("LỌC NỔI BẬT LOẠI %.1f%% (>85%%) — kiểm tra -min-signals, có thể đang bỏ oan quán thật", p)
		}
	}

	// 8. District phần lớn là phỏng đoán
	if p := pct(approxDistrict, fn.T6); p > 60 {
		warn("DISTRICT PHỎNG ĐOÁN %.1f%% (>60%%) — f_district trong ranker chỉ là tín hiệu yếu", p)
	}

	// 9. cap-cafe cắt quá nhiều → corpus bị bóp méo
	if cafeDropped > 0 {
		if p := pct(cafeDropped, cafeDropped+catCount["cafe"]); p > 30 {
			warn("CAP-CAFE CẮT %.1f%% số cafe — corpus bị bóp méo, cân nhắc bỏ cap hoặc fetch thêm loại khác", p)
		}
	}

	// 10. Metadata thấp so với chỉ tiêu A9/A10
	if p := pct(hasHours, fn.T6); p < 25 {
		warn("METADATA THẤP: openingHours %.1f%% (<25%%) — f_hours sẽ thiếu ở phần lớn POI", p)
	}
	if p := pct(hasPhone, fn.T6); p < 20 {
		warn("METADATA THẤP: phone %.1f%% (<20%%)", p)
	}

	if !warned {
		fmt.Println("✅ không có cảnh báo")
	}

	// ---------- Ghi file ----------
	ds := outDataset{
		Meta: map[string]any{
			"count":     len(out),
			"generated": "build-corpus",
			"curated":   len(curated),
			"osm":       len(out) - len(curated),
			"cafe_dropped_by_cap": cafeDropped,
			"tags_filled":         tagsFilled,
			"vibes_filled":        vibesFilled,
			"district_approx":     approxDistrict,
			"min_signals":         *minSignals,
			"max_branch":          *maxBranch,
			"chain_dropped":       chainDropped,
			"funnel": map[string]int{
				"raw": fn.Raw, "t1": fn.T1, "t2": fn.T2, "t2b": fn.T2b,
				"t3": fn.T3, "t4": fn.T4, "t4b": fn.T4b, "t5": fn.T5, "t6": fn.T6,
			},
			"drop_reasons": dropReasons,
			"note": "Sinh tự động từ OSM + dataset gốc curated. district dùng addr-tag hoặc district-centroid (xấp xỉ) — bản ghi phỏng đoán có districtApprox=true.",
		},
		Places: out,
	}
	b, err := json.MarshalIndent(ds, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "[build] marshal lỗi: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(*outPath, b, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "[build] ghi lỗi: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("\n[build] đã ghi %d place → %s (%.1f MB)\n", len(out), *outPath, float64(len(b))/1e6)
}

func pct(a, b int) float64 {
	if b == 0 {
		return 0
	}
	return float64(a) * 100 / float64(b)
}

type kv struct {
	k string
	v int
}

func topN(m map[string]int, n int) []kv {
	list := make([]kv, 0, len(m))
	for k, v := range m {
		list = append(list, kv{k, v})
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].v != list[j].v {
			return list[i].v > list[j].v
		}
		return list[i].k < list[j].k
	})
	if len(list) > n {
		list = list[:n]
	}
	return list
}

// đảm bảo unicode được dùng (tránh import thừa bị xoá nhầm khi refactor)
var _ = unicode.IsLetter
