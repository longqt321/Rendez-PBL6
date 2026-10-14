# Dữ liệu Đà Nẵng

`danang.json` là manifest của 14 địa điểm và 39 ảnh. Mỗi địa điểm có địa chỉ, tọa độ nếu có nguồn đủ rõ, URL nguồn và ngày đối chiếu 13/10/2026. Mỗi ảnh có tác giả, giấy phép, trang mô tả gốc, ngày chụp và thao tác xử lý. Không có ảnh AI hoặc ảnh stock gán vào quán khác.

Địa chỉ Trúc Lâm Viên được đối chiếu với [website của quán](https://truclamvien.vn/); Highlands với [trang cửa hàng](https://www.highlandscoffee.com.vn/vn/he-thong-cua-hang/10/duong-dai-hoa-tranh-dong-ho-.html); Oxy Garden với [ShopeeFood](https://shopeefood.vn/da-nang/oxy-garden-coffee-tran-quoc-vuong) và mô tả ảnh của tác giả; Bảo tàng Chăm với [Hộ chiếu di sản của cổng du lịch Đà Nẵng](https://danangfantasticity.com/wp-content/uploads/2026/01/Ho-Chieu-Di-san-Da-Nang.pdf); Ngũ Hành Sơn với [Ban quản lý danh thắng](https://nguhanhson.org/). Các điểm tự nhiên/cầu được đối chiếu vị trí với metadata ảnh và dữ liệu bản đồ. Tọa độ là điểm đại diện địa điểm, không phải dẫn đường tới một cửa vào cụ thể.

Oxy Garden chưa có tọa độ xác minh đủ chắc chắn; import để trống, không tự bịa tọa độ. Một số địa chỉ của điểm tự nhiên là tuyến đường/khu vực tiếp cận, không gán số nhà. Chưa đưa giờ mở cửa, giá, đánh giá sao hoặc số khách vào dữ liệu.

## Ảnh

Ảnh từ Wikimedia Commons, chỉ lấy CC BY, CC BY-SA, CC0 hoặc public domain. Mỗi trang nguồn nằm trong `credit.source_url`; giấy phép trong `credit.license_url`. Ảnh đã được thu nhỏ/nén JPEG, không thêm/xóa nội dung. Cần giữ attribution và giấy phép khi sử dụng lại ảnh; CC BY-SA tiếp tục áp dụng cho ảnh theo giấy phép gốc. Ảnh có ngày chụp từ các năm khác nhau và được ghi là ảnh tư liệu trên UI.

`photos/` chứa JPEG đủ dùng cho bản local. `frontend/public/photos` chứa ba ảnh chủ đề đã có attribution trong `credits.json`. Trang đăng nhập ghi credit của ảnh Mỹ Khê; các ảnh chủ đề tương ứng địa điểm có trang ảnh ghi đầy đủ credit.

Chỉ gắn nhãn thủ công khi đặc điểm xuất hiện rõ trong ảnh. Các nhãn hiện tại: cây xanh, mặt nước, kiến trúc, trong nhà, ban đêm, đồ ăn/thức uống. Không suy ra chất lượng dịch vụ, độ yên tĩnh hoặc công dụng từ ảnh.

## Bản đồ

Dữ liệu đường phố, bờ biển, mặt nước và công viên lấy từ OpenStreetMap trong vùng Đà Nẵng, lưu trong `frontend/public/map/region.geojson`. Bản đồ giới hạn ở vùng dữ liệu đã tải. Attribution: © OpenStreetMap contributors; dữ liệu theo [ODbL](https://www.openstreetmap.org/copyright). Đây là snapshot, không tự cập nhật đường mới.

Glyph Noto Sans Regular được tải từ OpenFreeMap và phục vụ local. Font Noto Sans theo SIL Open Font License; xem `frontend/public/map/FONT-LICENSE.txt`. Không tải tiles/glyph từ internet lúc sử dụng app.

Các script `research_data.py`, `prepare_content.py`, `download_map.py`, `download_glyphs.py` phục vụ cập nhật nguồn khi có mạng; không chạy trong luồng setup bình thường. Sau cập nhật dữ liệu, kiểm tra ảnh, địa chỉ, nhãn và giấy phép trước khi import. Import dùng UUID/idempotency key cố định; chạy lại không tạo ảnh trùng.
