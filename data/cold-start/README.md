# Cold-start data — quán ăn & cafe Đà Nẵng

Bộ data **thật** (không mock) dùng để seed khi nối backend. Độc lập với frontend/backend.

## Quy mô (tái sinh 2026-11-09, quyết định D-046)

- **491 địa điểm** — mỗi địa điểm đều có **địa chỉ số nhà + tên đường** và **toạ độ**.
- Theo nguồn: curated 34 · osm 405 · curated-v2 52.
- **20/491 có ảnh**, 20 ảnh khác nhau; 20 địa điểm có **ảnh thật của quán**.

### Phân bố theo quận/phường (đơn vị hành chính 2025)

| Quận/phường  | Số địa điểm |
| ------------ | ----------- |
| Hải Châu     | 126         |
| Ngũ Hành Sơn | 95          |
| An Hải       | 95          |
| Thanh Khê    | 49          |
| Hòa Cường    | 40          |
| Sơn Trà      | 33          |
| Cẩm Lệ       | 18          |
| Liên Chiểu   | 10          |
| Hòa Khánh    | 10          |
| Hòa Xuân     | 7           |
| An Khê       | 7           |
| Hải Vân      | 1           |

### Phân bố theo phân loại

| Phân loại           | Số địa điểm |
| ------------------- | ----------- |
| cafe                | 192         |
| khac                | 56          |
| viet-nam            | 50          |
| quan-an             | 26          |
| chay                | 21          |
| hai-san             | 16          |
| com                 | 12          |
| bun                 | 12          |
| banh-mi             | 9           |
| banh-ngot           | 7           |
| lau                 | 7           |
| kem-bo              | 7           |
| bun-cha-ca          | 6           |
| an-vat              | 6           |
| pho                 | 6           |
| y                   | 6           |
| han                 | 6           |
| mi-quang            | 5           |
| com-ga              | 5           |
| banh-trang-thit-heo | 4           |
| nhat                | 4           |
| thai                | 4           |
| goi-ca              | 3           |
| banh-canh           | 3           |
| an                  | 3           |
| che                 | 3           |
| banh-xeo            | 2           |
| bun-mam-nem         | 2           |
| banh-beo            | 2           |
| nem-lui             | 2           |
| sinh-to             | 1           |
| bun-mam             | 1           |
| banh-khoai          | 1           |
| banh                | 1           |

## Tiêu chuẩn dữ liệu (bắt buộc)

1. **Địa chỉ**: phải có **số nhà + tên đường** (ví dụ `214 Lương Nhữ Hộc`). Địa điểm chỉ có
   quận/phường hoặc mô tả tương đối ("đối diện 16 Hoàng Sa", "Lô 02-03…") **bị loại** —
   giữ lại chỉ gây loãng.
2. **Toạ độ**: mọi mục có `lat`/`lng` nằm trong địa giới TP Đà Nẵng, nguồn ghi ở `geoSource`
   (`osm` / `nominatim` / `google-maps`).
3. **Không trùng lặp**: cùng tên chuẩn hoá **và** cách nhau < 120m (cùng tên nhưng xa nhau là
   chi nhánh khác — giữ lại).
4. **Không bịa**: mỗi mục nguồn `curated-v2` có `sources` là URL nơi thông tin xuất hiện.

## Cách hiểu các trường

- `tier`: `curated` (báo chí ẩm thực) / `curated-v2` (nghiên cứu mạng xã hội 2026-11-09) /
  `osm` (POI OpenStreetMap).
- `status`: `open` / `closed` / `unknown` — hiện chưa xác minh quán còn hoạt động.
- `imageKind`: `venue` (ảnh thật quán) / `dish` (ảnh món đại diện theo nhóm, **không phải** ảnh quán).
- `verified`: luôn `false` — phải xác minh trước khi dùng production.

## Quy trình tái sinh (`scripts/cold-start/`)

| Script                  | Việc                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `enrich-osm.mjs`        | Lấy tag `addr:*`/`phone`/`opening_hours` từ OSM API (Overpass bị chặn)                                                                |
| `geocode-nominatim.mjs` | Geocode ứng viên nghiên cứu, cache trong `.cache/`                                                                                    |
| `fix-districts.mjs`     | Sửa nhãn quận theo `display_name` Nominatim                                                                                           |
| `rebuild.mjs`           | Lọc mục đạt chuẩn, gộp ứng viên, loại trùng, sinh `places.csv`                                                                        |
| `diversify-images.mjs`  | Tải ảnh món từ Wikimedia Commons (lọc tiêu đề rác + kiểm chất lượng), gán vòng tròn (tối đa 6 lần/ảnh); `--rebalance` gán lại toàn bộ |
| `clean-images.mjs`      | Xoá ảnh rác do audit thị giác phát hiện, gỡ khỏi dataset                                                                              |
| `validate.mjs`          | Kiểm schema/địa chỉ/toạ độ/ảnh/trùng lặp — exit 1 nếu sai                                                                             |
| `review-server.mjs`     | Công cụ duyệt tay (D-048): `bun run review:data` → http://localhost:5198                                                              |
| `apply-review.mjs`      | Áp kết quả duyệt tay: blocklist ảnh rác, đóng quán không tồn tại                                                                      |
| `update-docs.mjs`       | Sinh lại README + CREDITS                                                                                                             |

## Việc còn lại

1. Xác minh `status` từng quán (frontend có nút "Báo cáo", backend duyệt rồi mới đổi).
2. Xác minh giờ mở cửa/SĐT (chỉ một phần POI có tag).
3. Bổ sung ảnh thật cho quán `curated-v2` (hiện dùng ảnh món đại diện).
4. Giấy phép ảnh quán (Foody/Google Maps) — cần xin phép trước khi phát hành công khai.
