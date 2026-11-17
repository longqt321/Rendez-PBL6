// crosscheck: kiểm tra chéo POI với nguồn dữ liệu ĐỘC LẬP (Wikidata).
//
// Chạy: cd backend/scripts/crosscheck && go build -o crosscheck . && ./crosscheck
//
// Vì sao Wikidata: OSM và Wikidata là hai cộng đồng biên tập khác nhau. Một quán
// xuất hiện ở cả hai là bằng chứng độc lập rằng quán có thật và đủ đáng chú ý để
// có người tạo mục từ điển. Cross-check với chính OSM (Nominatim) là vòng tròn,
// không có giá trị.
//
// Giới hạn phải ghi vào báo cáo: Wikidata phủ RẤT THẤP với quán ăn bình dân VN.
// Kỳ vọng chỉ 1–5% POI khớp. Vì vậy tín hiệu này chỉ là ĐIỂM CỘNG, không phải
// điều kiện loại. Không khớp KHÔNG có nghĩa quán không tồn tại.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

const sparqlEndpoint = "https://query.wikidata.org/sparql"

// BBox Đà Nẵng — khớp với fetch-osm.
const (
	west  = 107.60
	south = 15.90
	east  = 108.45
	north = 16.30
)

// Truy vấn: mọi item Wikidata có toạ độ trong bbox, kèm nhãn và loại.
// Dùng wikibase:box (dịch vụ chính thức của Wikidata Query Service) thay vì
// lọc toạ độ thủ công — nhanh hơn nhiều.
//
// Không hardcode Q-id của "restaurant" vì dễ sai; thay vào đó lấy nhãn loại
// rồi lọc bằng từ khoá ở phía client (xem isFoodType).
//
// Chia bbox thành lưới 2×2 (4 truy vấn nhỏ): một truy vấn phủ toàn Đà Nẵng
// hay bị WDQS trả 504 timeout. LIMIT 15000 mỗi mảnh (đủ dư — bbox 1/4 thành
// phố hiếm khi quá 1000 item có toạ độ).
func quadrantQuery(west, south, east, north float64) string {
	return fmt.Sprintf(`
SELECT ?item ?itemLabel ?coord ?typeLabel WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerWest "Point(%.4f %.4f)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerEast "Point(%.4f %.4f)"^^geo:wktLiteral .
  }
  ?item wdt:P31 ?type .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
}
LIMIT 15000
`, west, south, east, north)
}

// Từ khoá nhận diện loại hình ăn uống trong nhãn P31 (tiếng Anh hoặc Việt).
var foodTypeKeywords = []string{
	"restaurant", "cafe", "café", "coffeehouse", "coffee house", "eatery",
	"fast food", "bakery", "bar", "pub", "bistro", "diner", "food",
	"noodle", "ice cream", "dessert", "brewery", "beer hall",
	"nhà hàng", "quán", "quán ăn", "quán cà phê", "tiệm bánh", "quán rượu",
}

func isFoodType(label string) bool {
	l := strings.ToLower(label)
	for _, k := range foodTypeKeywords {
		if strings.Contains(l, k) {
			return true
		}
	}
	return false
}

// ---------- Kiểu dữ liệu ----------

const (
	tagCrosscheck = "crosscheck"
	valWikidata   = "wikidata"
	fieldQuality  = "quality"
)

type sparqlBinding struct {
	Item struct {
		Value string `json:"value"`
	} `json:"item"`
	ItemLabel struct {
		Value string `json:"value"`
	} `json:"itemLabel"`
	Coord struct {
		Value string `json:"value"`
	} `json:"coord"`
	TypeLabel struct {
		Value string `json:"value"`
	} `json:"typeLabel"`
}

type sparqlResp struct {
	Results struct {
		Bindings []sparqlBinding `json:"bindings"`
	} `json:"results"`
}

type wdPlace struct {
	QID   string
	Name  string
	Lat   float64
	Lng   float64
	Type  string
}

// Dùng map[string]any để GIỮ NGUYÊN mọi trường của corpus khi ghi lại.
// Struct cố định sẽ âm thầm làm mất address/phone/hours/images/... (L-015).
type dataset struct {
	Meta   map[string]any   `json:"meta"`
	Places []map[string]any `json:"places"`
}

func getStr(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getFloat(m map[string]any, key string) (float64, bool) {
	if v, ok := m[key].(float64); ok {
		return v, true
	}
	return 0, false
}

func getInt(m map[string]any, key string) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return 0
}

// ---------- Hàm phụ ----------

// parseWKT: "Point(108.22 16.06)" → lat, lng
func parseWKT(s string) (lat, lng float64, ok bool) {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "Point(")
	s = strings.TrimSuffix(s, ")")
	parts := strings.Fields(s)
	if len(parts) != 2 {
		return 0, 0, false
	}
	var lon, la float64
	if _, err := fmt.Sscanf(parts[0], "%f", &lon); err != nil {
		return 0, 0, false
	}
	if _, err := fmt.Sscanf(parts[1], "%f", &la); err != nil {
		return 0, 0, false
	}
	return la, lon, true
}

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
	for _, p := range []string{"quán ", "quan ", "cà phê ", "ca phe ", "cafe ", "tiệm ", "tiem ", "nhà hàng ", "nha hang "} {
		if strings.HasPrefix(s, p) {
			s = strings.TrimPrefix(s, p)
			break
		}
	}
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func removeDiacritics(s string) string {
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

// ---------- main ----------

type matchResult struct {
	matched      int
	matchedExact int
	matchedFuzzy int
}

func filterFoodPlaces(wd []wdPlace) []wdPlace {
	var food []wdPlace
	for _, p := range wd {
		if isFoodType(p.Type) {
			food = append(food, p)
		}
	}
	return food
}

func buildPlacesByName(food []wdPlace) map[string][]wdPlace {
	byName := map[string][]wdPlace{}
	for _, p := range food {
		k := normalizeName(p.Name)
		if k == "" {
			continue
		}
		byName[k] = append(byName[k], p)
	}
	return byName
}

func findCandidates(key string, byName map[string][]wdPlace) []wdPlace {
	cands := byName[key]
	if len(cands) == 0 && len(key) >= 4 {
		for k, v := range byName {
			if strings.Contains(k, key) || strings.Contains(key, k) {
				cands = append(cands, v...)
			}
		}
	}
	return cands
}

func findBestCandidate(lat, lng float64, cands []wdPlace) (wdPlace, float64, bool) {
	best := -1
	bestD := math.MaxFloat64
	for j, c := range cands {
		d := haversine(lat, lng, c.Lat, c.Lng)
		if d < bestD {
			bestD, best = d, j
		}
	}
	if best >= 0 && bestD < 300 {
		return cands[best], bestD, true
	}
	return wdPlace{}, 0, false
}

func applyWikidataMatch(p map[string]any, c wdPlace, dist float64, key string, res *matchResult) {
	p[tagCrosscheck] = valWikidata
	p["crosscheckQid"] = c.QID
	p["crosscheckName"] = c.Name
	p["crosscheckDistM"] = int(dist)

	q := getInt(p, fieldQuality)
	if normalizeName(c.Name) == key {
		q += 10
		res.matchedExact++
	} else {
		q += 6
		res.matchedFuzzy++
	}
	if q > 100 {
		q = 100
	}
	p[fieldQuality] = q
	res.matched++
}

func matchPlaces(places []map[string]any, byName map[string][]wdPlace) matchResult {
	var res matchResult
	for _, p := range places {
		lat, okLat := getFloat(p, "lat")
		lng, okLng := getFloat(p, "lng")
		if !okLat || !okLng {
			continue
		}
		name := getStr(p, "name")
		key := normalizeName(name)
		if key == "" {
			continue
		}
		cands := findCandidates(key, byName)
		if c, dist, ok := findBestCandidate(lat, lng, cands); ok {
			applyWikidataMatch(p, c, dist, key, &res)
		}
	}
	return res
}

func printCrosscheckReport(total int, res matchResult, wdCount, foodCount int) {
	fmt.Println()
	fmt.Println("## Kết quả cross-check (Wikidata)")
	fmt.Printf("- POI trong corpus:        %d\n", total)
	fmt.Printf("- Khớp Wikidata:           %d (%.1f%%)\n", res.matched, pct(res.matched, total))
	fmt.Printf("  · khớp chính xác tên:    %d\n", res.matchedExact)
	fmt.Printf("  · khớp lỏng (chứa tên):  %d\n", res.matchedFuzzy)
	fmt.Printf("- Wikidata có trong bbox:  %d item, %d là ăn uống\n", wdCount, foodCount)
	fmt.Println()
	fmt.Println("⚠️  Độ phủ Wikidata với quán ăn bình dân VN RẤT THẤP.")
	fmt.Println("    Không khớp KHÔNG có nghĩa quán không tồn tại — chỉ là chưa có")
	fmt.Println("    ai tạo mục từ điển. Vì vậy đây là ĐIỂM CỘNG (+10/+6), không phải")
	fmt.Println("    điều kiện loại. Phải ghi rõ trong báo cáo.")
}

func saveCrosscheckDataset(outPath string, ds dataset, res matchResult, total, wdCount, foodCount int) error {
	if ds.Meta == nil {
		ds.Meta = map[string]any{}
	}
	ds.Meta[tagCrosscheck] = map[string]any{
		"source":                 valWikidata,
		"matched":                res.matched,
		"matched_exact":          res.matchedExact,
		"matched_fuzzy":          res.matchedFuzzy,
		"total":                  total,
		"wikidata_items_in_bbox": wdCount,
		"wikidata_food_items":    foodCount,
		"note":                   "Cross-check độc lập với OSM. Độ phủ thấp; chỉ là điểm cộng.",
	}
	out, err := json.MarshalIndent(ds, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal lỗi: %w", err)
	}
	if err := os.WriteFile(outPath, out, 0o644); err != nil {
		return fmt.Errorf("ghi lỗi: %w", err)
	}
	fmt.Printf("\n[crosscheck] đã ghi %s (%.1f MB)\n", outPath, float64(len(out))/1e6)
	return nil
}

func main() {
	inPath := flag.String("in", "../../data/places-expanded.json", "corpus đã lọc")
	outPath := flag.String("out", "../../data/places-expanded.json", "ghi đè cùng file")
	timeout := flag.Duration("timeout", 180*time.Second, "timeout truy vấn Wikidata")
	flag.Parse()

	// 1. Đọc corpus
	b, err := os.ReadFile(*inPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[crosscheck] không đọc được %s: %v\n", *inPath, err)
		os.Exit(1)
	}
	var ds dataset
	if err := json.Unmarshal(b, &ds); err != nil {
		fmt.Fprintf(os.Stderr, "[crosscheck] JSON lỗi: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("[crosscheck] đọc %d place từ %s\n", len(ds.Places), *inPath)

	// 2. Truy vấn Wikidata
	fmt.Println("[crosscheck] truy vấn Wikidata SPARQL...")
	wd, err := queryWikidata(*timeout)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[crosscheck] THẤT BẠI: %v\n", err)
		fmt.Fprintln(os.Stderr, "[crosscheck] Corpus KHÔNG bị sửa. Chạy lại sau, hoặc bỏ qua bước này.")
		os.Exit(1)
	}
	fmt.Printf("[crosscheck] Wikidata trả %d item trong bbox\n", len(wd))

	// 3. Lọc loại hình ăn uống
	food := filterFoodPlaces(wd)
	fmt.Printf("[crosscheck] trong đó %d item là loại hình ăn uống\n", len(food))

	// 4. Gom theo tên chuẩn hoá để tra nhanh
	byName := buildPlacesByName(food)

	// 5. Khớp: cùng tên chuẩn hoá + cách < 300m
	res := matchPlaces(ds.Places, byName)

	// 6. Báo cáo
	printCrosscheckReport(len(ds.Places), res, len(wd), len(food))

	// 7. Ghi lại
	if err := saveCrosscheckDataset(*outPath, ds, res, len(ds.Places), len(wd), len(food)); err != nil {
		fmt.Fprintf(os.Stderr, "[crosscheck] %v\n", err)
		os.Exit(1)
	}
}

func pct(a, b int) float64 {
	if b == 0 {
		return 0
	}
	return float64(a) * 100 / float64(b)
}

// queryWikidata: chạy 4 truy vấn con (lưới 2×2), gộp + dedup theo QID.
// Một mảnh lỗi không làm hỏng cả bước — chỉ cảnh báo và đi tiếp.
func queryWikidata(timeout time.Duration) ([]wdPlace, error) {
	midLon := (west + east) / 2
	midLat := (south + north) / 2
	quads := [][4]float64{
		{west, south, midLon, midLat},
		{midLon, south, east, midLat},
		{west, midLat, midLon, north},
		{midLon, midLat, east, north},
	}

	seen := map[string]bool{}
	var all []wdPlace
	var lastErr error
	for i, q := range quads {
		fmt.Printf("[crosscheck]   mảnh %d/4 (%.2f,%.2f)-(%.2f,%.2f)...\n", i+1, q[0], q[1], q[2], q[3])
		got, err := runSparql(quadrantQuery(q[0], q[1], q[2], q[3]), timeout)
		if err != nil {
			lastErr = err
			fmt.Printf("[crosscheck]   mảnh %d LỖI (bỏ qua): %v\n", i+1, err)
			continue
		}
		added := 0
		for _, p := range got {
			if seen[p.QID] {
				continue
			}
			seen[p.QID] = true
			all = append(all, p)
			added++
		}
		fmt.Printf("[crosscheck]   mảnh %d: %d item (+%d mới, tổng %d)\n", i+1, len(got), added, len(all))
		time.Sleep(2 * time.Second) // lịch sự với WDQS
	}
	if len(all) == 0 {
		if lastErr != nil {
			return nil, lastErr
		}
		return nil, fmt.Errorf("Wikidata không trả item nào trong bbox")
	}
	sort.Slice(all, func(i, j int) bool { return all[i].QID < all[j].QID })
	return all, nil
}

func handleSparqlHttpError(attempt int, statusCode int, body []byte) error {
	err := fmt.Errorf("HTTP %d: %s", statusCode, truncate(string(body), 200))
	if statusCode == 429 || statusCode >= 500 {
		wait := time.Duration(attempt*attempt) * 10 * time.Second
		fmt.Printf("[crosscheck]     %v — chờ %v rồi thử lại\n", err, wait)
		time.Sleep(wait)
	}
	return err
}

func parseSparqlBinding(b sparqlBinding) (wdPlace, bool) {
	lat, lng, ok := parseWKT(b.Coord.Value)
	if !ok {
		return wdPlace{}, false
	}
	name := b.ItemLabel.Value
	// Wikidata trả về Q-id khi không có nhãn ngôn ngữ — bỏ qua
	if strings.HasPrefix(name, "Q") && len(name) > 1 && isAllDigits(name[1:]) {
		return wdPlace{}, false
	}
	return wdPlace{
		QID:  strings.TrimPrefix(b.Item.Value, "http://www.wikidata.org/entity/"),
		Name: name,
		Lat:  lat,
		Lng:  lng,
		Type: b.TypeLabel.Value,
	}, true
}

func parseSparqlResponse(body []byte) ([]wdPlace, error) {
	var sr sparqlResp
	if err := json.Unmarshal(body, &sr); err != nil {
		return nil, fmt.Errorf("JSON lỗi: %w (body: %s)", err, truncate(string(body), 200))
	}
	out := make([]wdPlace, 0, len(sr.Results.Bindings))
	for _, b := range sr.Results.Bindings {
		if p, ok := parseSparqlBinding(b); ok {
			out = append(out, p)
		}
	}
	return out, nil
}

// runSparql: 1 truy vấn, 3 lần thử, backoff 10s → 40s → 90s khi 429/5xx.
func runSparql(query string, timeout time.Duration) ([]wdPlace, error) {
	form := url.Values{}
	form.Set("query", query)
	form.Set("format", "json")

	client := &http.Client{Timeout: timeout}
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequest("POST", sparqlEndpoint, strings.NewReader(form.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Accept", "application/sparql-results+json")
		// Wikidata yêu cầu User-Agent mô tả rõ — thiếu sẽ bị 403.
		req.Header.Set("User-Agent", "rendez-corpus-crosscheck/1.0 (do-an-mon-hoc; contact: student)")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			fmt.Printf("[crosscheck]     lỗi mạng: %v\n", err)
			time.Sleep(time.Duration(attempt*attempt) * 5 * time.Second)
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if resp.StatusCode != 200 {
			lastErr = handleSparqlHttpError(attempt, resp.StatusCode, body)
			continue
		}

		out, parseErr := parseSparqlResponse(body)
		if parseErr != nil {
			lastErr = parseErr
			continue
		}
		return out, nil
	}
	return nil, lastErr
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

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
