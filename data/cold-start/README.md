# Cold-start data — quán ăn & cafe Đà Nẵng

Bộ data **thật** (không mock) dùng để seed khi nối backend. Độc lập với frontend/backend.

## Quy mô (thu thập 2026-11-09)

- **1.701 địa điểm**: 40 mục tuyển chọn từ báo chí ẩm thực (`tier: "curated"`) + 1.661 POI có tên thật trên OpenStreetMap trong địa giới TP Đà Nẵng (`tier: "osm"`).
- **Phủ 15 phường/xã** (đơn vị hành chính theo OSM 2025): Hải Châu 447, Ngũ Hành Sơn 317, An Hải 291, Thanh Khê 202, Hòa Cường 150, Sơn Trà 66, Hòa Khánh 65, Liên Chiểu 42, Cẩm Lệ 31, An Khê 30, Hải Vân 29, Bà Nà 16, Hòa Xuân 10, Hòa Vang 3, Vĩnh Lộc 2.
- **1.698/1.701 có ảnh** — ảnh món đại diện theo nhóm (imageKind: `dish`) hoặc **ảnh thật của quán** (imageKind: `venue`, 12 quán nổi tiếng).
- Toạ độ 100% từ OSM (chính xác theo POI), 0 mục `unknown`.

## File

- `places.json` — nguồn chính.
- `places.csv` — bản phẳng để review.
- `images/` — ảnh món đại diện (Commons/Openverse).
- `images/venues/` — **ảnh thật của 12 quán nổi tiếng** (nguồn Foody.vn).
- `CREDITS.md` / `CREDITS.json` / `venue-images.json` — nguồn + giấy phép.

## Cách hiểu các trường

- `tier`: `curated` (có nguồn báo chí từng quán) / `osm` (POI OSM).
- `imageKind`: `venue` (ảnh thật quán) / `dish` (ảnh món đại diện).
- `category`: phân loại theo tên quán + tag cuisine OSM.
- `verified`: luôn `false` — phải xác minh trước khi dùng production.
- `sources` (curated): trang báo chí nơi lấy thông tin.

## Việc còn lại

1. Ảnh thật cho 28 quán curated còn lại — cần Google Places API key (xem chat) hoặc chụp/xin từ fanpage.
2. Xác minh giờ mở cửa/SĐT (chỉ 5 quán OSM có tag).
3. Xác minh tên/quán còn tồn tại (OSM có thể cũ).
