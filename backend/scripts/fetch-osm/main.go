// fetch-osm: tải POI ăn uống Đà Nẵng từ OpenStreetMap qua Overpass API.
//
// Chạy: cd backend/scripts/fetch-osm && go build -o fetch-osm . && ./fetch-osm
//       ./fetch-osm -round L2   (nếu sau lọc chưa đủ 1500)
//
// Nguyên tắc: KHÔNG lọc gì ở bước này. Lưu raw để build-corpus xử lý và đếm
// funnel. Mỗi vòng (L1..L4) lưu file riêng, không ghi đè.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var endpoints = []string{
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
	"https://overpass.private.coffee/api/interpreter",
	"https://overpass.osm.jp/api/interpreter",
	"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
	"https://overpass.osm.ch/api/interpreter",
}

// BBox Đà Nẵng (S,W,N,E)
const bbox = "15.95,107.75,16.25,108.40"

// BBox mở rộng cho vòng L3/L4
const bboxWide = "15.90,107.60,16.30,108.45"

// Thang leo: mỗi vòng rộng hơn vòng trước.
var ladder = map[string]string{
	"L1": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten)$"](` + bbox + `);
  nwr["shop"="bakery"](` + bbox + `);
);
out center tags;`,

	"L2": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten)$"](` + bbox + `);
  nwr["shop"~"^(bakery|coffee|tea|beverages|confectionery|pastry)$"](` + bbox + `);
);
out center tags;`,

	"L3": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten)$"](` + bboxWide + `);
  nwr["shop"~"^(bakery|coffee|tea|beverages|confectionery|pastry)$"](` + bboxWide + `);
);
out center tags;`,

	"L4": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten)$"](` + bboxWide + `);
  nwr["shop"~"^(bakery|coffee|tea|beverages|confectionery|pastry)$"](` + bboxWide + `);
  nwr["cuisine"]["name"](` + bboxWide + `);
);
out center tags;`,

	// L5 — ĐA DẠNG: thêm quán nhậu, chợ, siêu thị lớn.
	// Đây là vòng bù các nhóm mà L1 bỏ sót, làm giảm tỉ lệ cafe.
	// Sau D-AI-42: KHÔNG lấy cửa hàng tiện lợi/tạp hóa/thực phẩm/rượu —
	// app không chứa tiện ích Google Maps, build-corpus sẽ loại.
	"L5": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten|nightclub|canteen|marketplace)$"](` + bboxWide + `);
  nwr["shop"~"^(bakery|coffee|tea|beverages|confectionery|pastry|supermarket|mall|department_store)$"](` + bboxWide + `);
  nwr["cuisine"]["name"](` + bboxWide + `);
  nwr["name"~"(^|[^a-zA-Z])(mart|sieu thi|siêu thị)([^a-zA-Z]|$)",i](` + bboxWide + `);
  nwr["name"~"(quan nhau|quán nhậu)",i](` + bboxWide + `);
);
out center tags;`,

	// L6 — TÊN TIẾNG VIỆT KHÔNG DẤU + đa dạng loại hình.
	// Người Việt đặt tên quán trên OSM thường không dấu: "Quan Nhau Ba Ba",
	// "Lau Nuong Ngon", "An Vat Da Nang". Regex bắt cả hai dạng.
	//
	// Chống nhiễu: các từ MỘT âm tiết (com, pho, oc, mart, farm...) phải khớp
	// TRỌN TỪ bằng biên `(^|[^a-zA-Z])…([^a-zA-Z]|$)` — nếu không, "Comfort"
	// khớp `com`, "Smart Coffee" khớp `mart`, "Phoenix" khớp `pho`.
	// Dùng dải ASCII thay `[[:alpha:]]` vì Overpass chỉ đảm bảo ERE cơ bản;
	// ký tự có dấu tiếng Việt rơi vào lớp "không phải a-zA-Z" nên biên vẫn đúng.
	// Từ ghép nhiều âm tiết (quan nhau, lau nuong, banh mi...) đủ đặc trưng,
	// không cần biên.
	"L6": `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|ice_cream|food_court|biergarten|nightclub|canteen|marketplace)$"](` + bboxWide + `);
  nwr["shop"~"^(bakery|coffee|tea|beverages|confectionery|pastry|supermarket|mall|department_store)$"](` + bboxWide + `);
  nwr["cuisine"]["name"](` + bboxWide + `);
  nwr["name"~"(quan nhau|quán nhậu|lau nuong|lẩu nướng|nuong bo|nướng bò|an vat|ăn vặt|quan an|quán ăn|hai san|hải sản|tra sua|trà sữa|banh mi|bánh mì)",i](` + bboxWide + `);
  nwr["name"~"(^|[^a-zA-Z])(com|cơm|bun|bún|pho|phở|oc|ốc|che|chè|kem|bia|chay)([^a-zA-Z]|$)",i](` + bboxWide + `);
  nwr["name"~"(^|[^a-zA-Z])(mart|sieu thi|siêu thị|mall)([^a-zA-Z]|$)",i](` + bboxWide + `);
  nwr["name"~"trung tam thuong mai|trung tâm thương mại|tttm|vincom|aeon|coopmart|winmart|big c|lotte mart",i](` + bboxWide + `);
  nwr["name"~"(karaoke|vegan)",i](` + bboxWide + `);
);
out meta center;`, // meta → có timestamp + version để chấm điểm "còn hoạt động"

	// L7 — GIẢI TRÍ (user chốt mở rộng rộng: cinema, bowling, bida, arcade, spa…).
	// Tag đã xác minh trên OSM wiki (2026-11-11):
	//   amenity=karaoke_box · karaoke=yes (feature trên bar/pub/restaurant)
	//   amenity=music_venue · amenity=cinema
	//   leisure=bowling_alley · leisure=amusement_arcade · leisure=escape_game
	//   leisure=water_park · leisure=adult_gaming_centre
	//   sport=billiards (bida/pool/snooker — không có tag riêng cho pool hall)
	//   shop=massage (spa/massage — `leisure=spa` KHÔNG phải tag chuẩn, không dùng)
	//
	// KHÔNG lấy `amenity=casino` / `amenity=gambling` — user yêu cầu bỏ (D-AI-38).
	"L7": `[out:json][timeout:180];
(
  nwr["amenity"~"^(karaoke_box|music_venue|cinema|nightclub|events_venue)$"](` + bboxWide + `);
  nwr["karaoke"="yes"](` + bboxWide + `);
  nwr["leisure"~"^(bowling_alley|amusement_arcade|escape_game|water_park|adult_gaming_centre)$"](` + bboxWide + `);
  nwr["sport"="billiards"](` + bboxWide + `);
  nwr["shop"="massage"](` + bboxWide + `);
  nwr["name"~"(^|[^a-zA-Z])(bida|bi a|billiard|karaoke|cinema|spa|bowling|arcade|game)([^a-zA-Z]|$)",i](` + bboxWide + `);
  nwr["name"~"rap phim|rạp phim|nhac song|nhạc sống|music box|live music|acoustic",i](` + bboxWide + `);
);
out meta center;`,
}

type overpassResp struct {
	Elements []json.RawMessage `json:"elements"`
}

func fetch(round string) ([]byte, error) {
	query := ladder[round]
	if query == "" {
		return nil, fmt.Errorf("vòng không hợp lệ: %s (chọn L1..L7)", round)
	}

	form := url.Values{"data": {query}}

	client := &http.Client{Timeout: 200 * time.Second}
	var lastErr error

	for _, ep := range endpoints {
		for attempt := 1; attempt <= 3; attempt++ {
			// Tạo body MỖI lần thử: strings.NewReader bị đọc hết sau lần đầu,
			// tái dùng sẽ gửi body rỗng.
			body := strings.NewReader(form.Encode())
			req, err := http.NewRequest("POST", ep, body)
			if err != nil {
				lastErr = err
				continue
			}
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			req.Header.Set("User-Agent", "rendez-corpus-builder/1.0 (do-an-mon-hoc)")

			fmt.Printf("[fetch] %s → %s (lần %d)\n", round, ep, attempt)
			resp, err := client.Do(req)
			if err != nil {
				lastErr = err
				fmt.Printf("[fetch]   lỗi: %v\n", err)
				time.Sleep(3 * time.Second)
				continue
			}
			raw, readErr := io.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr != nil {
				lastErr = readErr
				continue
			}
			if resp.StatusCode != 200 {
				lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, truncate(string(raw), 200))
				fmt.Printf("[fetch]   %v\n", lastErr)
				// 429/502/504 = quá tải → chờ lâu hơn trước khi thử lại
				if resp.StatusCode == 429 || resp.StatusCode >= 500 {
					wait := time.Duration(attempt*attempt) * 5 * time.Second
					fmt.Printf("[fetch]   chờ %v rồi thử lại...\n", wait)
					time.Sleep(wait)
				} else {
					time.Sleep(2 * time.Second)
				}
				continue
			}
			var probe overpassResp
			if err := json.Unmarshal(raw, &probe); err != nil {
				lastErr = fmt.Errorf("JSON không hợp lệ: %w", err)
				fmt.Printf("[fetch]   %v\n", lastErr)
				continue
			}
			fmt.Printf("[fetch]   OK: %d element, %d bytes\n", len(probe.Elements), len(raw))
			return raw, nil
		}
	}
	return nil, fmt.Errorf("tất cả endpoint thất bại: %w", lastErr)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func main() {
	round := flag.String("round", "L6", "vòng leo thang: L1..L7 (L6 = đa dạng + tên không dấu, L7 = giải trí)")
	outDir := flag.String("out", "../../data/raw", "thư mục lưu raw (tính từ backend/scripts/fetch-osm)")
	flag.Parse()

	if err := os.MkdirAll(*outDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "[fetch] không tạo được thư mục %s: %v\n", *outDir, err)
		os.Exit(1)
	}

	raw, err := fetch(*round)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[fetch] THẤT BẠI: %v\n", err)
		os.Exit(1)
	}

	name := fmt.Sprintf("osm-%s-%s.json", *round, time.Now().Format("20060102-150405"))
	path := filepath.Join(*outDir, name)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "[fetch] không ghi được %s: %v\n", path, err)
		os.Exit(1)
	}
	fmt.Printf("[fetch] đã lưu: %s\n", path)
}
