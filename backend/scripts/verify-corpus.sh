#!/usr/bin/env bash
# verify-corpus.sh — kiểm tra corpus sau build-corpus / crosscheck / seed.
# Chạy: bash backend/scripts/verify-corpus.sh
#
# Mục đích: mọi con số báo cáo phải sinh từ script, không đọc bằng mắt (H6).
# Không sửa dữ liệu, chỉ đọc.
set -euo pipefail

FILE="${1:-backend/data/places-expanded.json}"

if [ ! -f "$FILE" ]; then
  echo "Không tìm thấy $FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Cần jq. Cài: sudo apt install jq  (hoặc sudo pacman -S jq)" >&2
  exit 1
fi

jq -r '
  def pct(n; t): if t == 0 then 0 else ((n * 1000 / t) | round) / 10 end;
  def cnt(cond): ([.places[] | select(cond)] | length);
  def isent: .category | test("^(karaoke|music-box|cinema|bida|bowling|arcade|water-park|spa|massage)$");
  def hasdia: .name | test("[^ -~]");

  (.places | length) as $n |
  (cnt(.category == "cafe")) as $cafe |
  (cnt(.category == "sieu-thi")) as $mart |
  (cnt(.category == "cua-hang-tien-loi")) as $ch |
  (cnt(.category == "cho")) as $cho |
  (cnt(.category == "tap-hoa")) as $th |
  (cnt(.category == "mall")) as $mall |
  (cnt(.category == "farm")) as $farm |
  (cnt(.category == "cua-hang-thuc-pham")) as $tp |
  (cnt(.category == "cua-hang-ruou")) as $ruou |
  (cnt(isent)) as $ent |
  (cnt(.category == "khac")) as $khac |
  (cnt(.openingHours != null)) as $hours |
  (cnt(.phone != null)) as $phone |
  (cnt(.venuePageUrl != null)) as $web |
  (cnt(.description != null)) as $desc |
  (cnt((.images | length) > 0)) as $img |
  (cnt(hasdia)) as $dia |
  (cnt(.lat == null)) as $nolat |
  (cnt(.name | test("[[:alpha:]]"))) as $alpha |
  ($ch + $th + $farm + $tp + $ruou) as $tienich |

  "=== TỔNG QUAN ===",
  "Tổng POI:            \($n)",
  "curated (meta):      \(.meta.curated // "?")",
  "districtApprox:      \(.meta.district_approx // "?") (\(pct(.meta.district_approx // 0; $n))%)",
  "cafe bị cap cắt:     \(.meta.cafe_dropped_by_cap // 0)",
  "min-signals:         \(.meta.min_signals // "?")",
  "max-branch:          \(.meta.max_branch // "?")  (chi nhánh tối đa/thương hiệu)",
  "chuỗi bị cắt:        \(.meta.chain_dropped // 0)",
  "",

  "=== FUNNEL ===",
  (.meta.funnel // {} | to_entries | map("\(.key): \(.value)") | .[]),
  "",
  "=== LÝ DO LOẠI ===",
  (.meta.drop_reasons // {} | to_entries | sort_by(-.value) | map("\(.key): \(.value)") | .[]),
  "",

  "=== NHÓM NỘI DUNG ===",
  "cafe:                \($cafe) (\(pct($cafe; $n))%)  [ngưỡng 35%]",
  "sieu-thi (siêu thị lớn): \($mart) (\(pct($mart; $n))%)",
  "cho (chợ nổi tiếng): \($cho) (\(pct($cho; $n))%)",
  "mall (TTTM):         \($mall) (\(pct($mall; $n))%)",
  "giải trí:            \($ent) (\(pct($ent; $n))%)  [ngưỡng ≤30%]",
  "khac (nhiễu):        \($khac) (\(pct($khac; $n))%)  [ngưỡng ≤20%]",
  "tiện ích (phải = 0): \($tienich)  [cua-hang-tien-loi=\($ch), tap-hoa=\($th), thuc-pham=\($tp), ruou=\($ruou), farm=\($farm)]",
  "",

  "=== PHÂN BỐ CATEGORY (top 25) ===",
  (.places | group_by(.category) | map({c: .[0].category, n: length})
    | sort_by(-.n) | .[0:25] | .[] | "\(.c)\t\(.n)\t\(pct(.n; $n))%"),
  "",

  "=== PHÂN BỐ QUẬN ===",
  (.places | group_by(.district) | map({d: (.[0].district // "(null)"), n: length})
    | sort_by(-.n) | .[] | "\(.d)\t\(.n)\t\(pct(.n; $n))%"),
  "",

  "=== METADATA ===",
  "openingHours:        \($hours) (\(pct($hours; $n))%)  [ngưỡng ≥25%]",
  "phone:               \($phone) (\(pct($phone; $n))%)  [ngưỡng ≥20%]",
  "website:             \($web) (\(pct($web; $n))%)",
  "description:         \($desc) (\(pct($desc; $n))%)",
  "có ảnh:              \($img)",
  "",

  "=== CHẤT LƯỢNG ===",
  "quality trung bình:  \((.places | map(.quality) | add / $n * 10 | round) / 10)",
  "quality min/max:     \((.places | map(.quality) | min)) / \((.places | map(.quality) | max))",
  "quality < 10:        \(cnt(.quality < 10))  (ứng viên nên loại)",
  "tên có dấu:          \($dia) (\(pct($dia; $n))%)",
  "",

  "=== CROSS-CHECK WIKIDATA ===",
  (.meta.crosscheck // {} | to_entries | map("\(.key): \(.value)") | .[]),
  "",

  "=== KIỂM TRA CHỈ TIÊU ===",
  (if $n >= 600 then "✅ A1 quy mô (\($n) ≥ 600 — mục tiêu mới D-AI-42)" else "⚠️  A1 quy mô: \($n) < 600 — giảm -min-signals xuống 1 hoặc fetch thêm" end),
  (if $alpha == $n then "✅ A2 tên có chữ cái (100%)" else "❌ A2: \($n - $alpha) tên không có chữ cái" end),
  (if $nolat == 0 then "✅ A3 toạ độ (100%)" else "❌ A3: \($nolat) POI thiếu toạ độ" end),
  (if pct($cafe; $n) <= 35.5 then "✅ A17 cafe \(pct($cafe; $n))% ≤ 35%" else "❌ A17 cafe \(pct($cafe; $n))% > 35%" end),
  (if pct($khac; $n) <= 20 then "✅ A7 khac \(pct($khac; $n))% ≤ 20%" else "❌ A7 khac \(pct($khac; $n))% > 20%" end),
  (if $mart > 0 then "✅ có siêu thị lớn (sieu-thi = \($mart))" else "❌ KHÔNG có sieu-thi" end),
  (if $mall > 0 then "✅ có TTTM (mall = \($mall))" else "⚠️  KHÔNG có mall — kiểm tra query L6" end),
  (if $cho > 0 then "✅ có chợ nổi tiếng (\($cho))" else "⚠️  KHÔNG có chợ nổi tiếng" end),
  (if $ent > 0 then "✅ có giải trí (\($ent))" else "❌ KHÔNG có giải trí — L7 chưa chạy?" end),
  (if $tienich == 0 then "✅ D-AI-42 không còn tiện ích nhỏ lẻ (0)" else "❌ D-AI-42 còn \($tienich) POI tiện ích — bộ lọc T4b hỏng" end),
  (if pct(.meta.district_approx // 0; $n) <= 60 then "✅ district phỏng đoán \(pct(.meta.district_approx // 0; $n))% ≤ 60%" else "⚠️  district phỏng đoán \(pct(.meta.district_approx // 0; $n))% > 60%" end),
  (if $hours * 100 / $n >= 25 then "✅ A9 openingHours \(pct($hours; $n))% ≥ 25%" else "❌ A9 openingHours \(pct($hours; $n))% < 25%" end),
  (if $phone * 100 / $n >= 20 then "✅ A10 phone \(pct($phone; $n))% ≥ 20%" else "❌ A10 phone \(pct($phone; $n))% < 20%" end)
' "$FILE"
