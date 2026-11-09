# Cold-start data — quán ăn & cafe Đà Nẵng

Bộ data **thật** (không mock) dùng để seed khi nối backend. Độc lập với frontend/backend — chỉ là dữ liệu.

## File

- `places.json` — nguồn chính (40 địa điểm + meta + provenance).
- `places.csv` — bản phẳng để mở Excel/Sheets review.
- `images/` — 12 ảnh món đại diện (Commons, giấy phép mở) — **không phải ảnh quán**.
- `CREDITS.md` / `CREDITS.json` — nguồn và giấy phép ảnh.

## Cách hiểu các trường quan trọng

- `geoPrecision`: `poi` (khớp POI OSM có tên đúng — tin cậy nhất) > `address` (khớp số nhà) > `street` (tâm đường, xấp xỉ) > `unknown` (chưa có toạ độ).
- `verified`: luôn `false` — **phải xác minh lại** (gọi quán/kiểm Google Maps) trước khi dùng production.
- `sources`: trang báo chí/nơi lấy thông tin tên + địa chỉ.
- `notes`: khác biệt giữa nguồn báo chí và OSM, cần phân xử.
- Giờ mở cửa/SĐT chỉ có khi OSM có tag — không bịa.

## Nguồn dữ liệu

- Danh sách quán: tổng hợp từ các bài tổng hợp ẩm thực Đà Nẵng (tourism.danang.vn, hellodanang.vn, ghiendanang.com, cattour.vn, mia.vn, pasgo.vn…).
- Toạ độ: OpenStreetMap qua Overpass API + Nominatim (ODbL 1.0).
- Ảnh: Wikimedia Commons (chi tiết trong CREDITS.md).

## Việc còn lại (xác minh)

1. Xác minh 17 mục `geoPrecision: street` bằng Google Maps/FOODY, sửa toạ độ.
2. Bổ sung toạ độ cho 3 mục `unknown` (Bà Hằng, Kem bơ Cô Vân, Ibasho).
3. Xác minh giờ mở cửa + SĐT thực tế (gọi hoặc kiểm fanpage).
4. Chụp/lấy ảnh thật của từng quán (ảnh hiện tại chỉ là món đại diện).
