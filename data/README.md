# Dữ liệu Địa điểm & Cà phê Khu vực Đại học Bách Khoa Đà Nẵng

`danang.json` là manifest dữ liệu mẫu gồm **12 quán cà phê** và **36 ảnh minh hoạ** xung quanh khu vực **Trường Đại học Bách Khoa — Đại học Đà Nẵng (DUT)** thuộc quận Liên Chiểu, Đà Nẵng.

> [!IMPORTANT]
> **Ảnh trong `data/photos/` là ảnh minh hoạ sinh tự động, không phải ảnh chụp thực địa.**
> Toàn bộ 36 tệp được tạo bằng [`scripts/generate_coffee_photos.py`](../scripts/generate_coffee_photos.py) ở kích thước `1600×1067`, có watermark `RENDEZ · KHÁM PHÁ CÀ PHÊ QUANH ĐH BÁCH KHOA ĐÀ NẴNG (DUT)`.
> Chúng dùng làm placeholder cho lưới ảnh và hero của giao diện trong khi chưa có bộ ảnh thực địa. Xem mục 5 để biết giới hạn này.

## 1. Nguồn Gốc và Tiêu Chí Tuyển Chọn Dữ Liệu
* **Thông tin địa điểm:** 12 quán được chọn lọc theo nhu cầu sinh viên quanh khuôn viên trường Bách Khoa. Trường `source_url` của mỗi địa điểm trỏ tới trang công khai của quán (Facebook, Instagram, TikTok) để tham chiếu thông tin, không phải nguồn của tệp ảnh.
* **Tọa độ:** Toàn bộ 12 quán đều nằm trong bán kính đi bộ/xe máy ngắn (dưới 1km) quanh khuôn viên trường Bách Khoa, tập trung trên các trục đường sinh viên trọng điểm: *Phạm Như Xương, Ngô Thì Nhậm, Ngô Sỹ Liên, Lạc Long Quân, Hồ Bá Ôn, Ngô Văn Sở*.
* **Phân loại theo nhu cầu sinh viên:**
  * `study`: Học bài & Chạy deadline (yên tĩnh, máy lạnh, nhiều ổ cắm, bàn ghế công thái học)
  * `night`: Mở 24/7 & Cày đêm (cứu cánh mùa đồ án tốt nghiệp và ôn thi)
  * `vintage`: Mộc & Hoài niệm (nhà cấp 4 cũ, sân vườn, tone gỗ mộc, cà phê bơ/cà phê muối)
  * `garden`: Sân vườn & Chill (cây xanh thoáng đãng, hồ cá, thư giãn sau giờ lên lớp)
  * `checkin`: Sống ảo & Trẻ trung (decor gấu khổng lồ, tone màu hot trend TikTok)
  * `classic`: Cà phê Cóc & Vỉa hè (cà phê phin truyền thống, bàn cờ tướng, giá sinh viên)

## 2. Ảnh và Siêu Dữ Liệu
* Mỗi ảnh trong `data/photos/` là **ảnh minh hoạ sinh tự động** (gradient, khung, chip nhãn và watermark do script vẽ), không chứa dữ liệu EXIF/GPS.
* Thông tin định danh từng ảnh: `file`, `caption`, `tags`.
* Gán nhãn trực quan (Visual Attributes): Cây xanh & Vườn (`plants`), Bàn học & Ổ cắm (`study`), Trong nhà & Máy lạnh (`interior`), Ban đêm & 24/7 (`night`), Gỗ mộc & Hoài niệm (`wood`), Cà phê & Đồ uống (`food`), Kiến trúc (`architecture`).

## 3. Bản Đồ Số Cục Bộ
* Tích hợp bản đồ MapLibre GL với dữ liệu OpenStreetMap và glyph font Noto Sans phục vụ nội bộ, định vị chính xác vị trí từng quán xung quanh khuôn viên Đại học Bách Khoa.

## 4. Tái Tạo Dữ Liệu
* `scripts/generate_coffee_photos.py` — sinh lại 36 ảnh minh hoạ từ `danang.json` (ghi đè `data/photos/`).
* `backend/apps/photos/management/commands/import_danang.py` — nạp manifest vào cơ sở dữ liệu (idempotent theo `idempotency_key`).

## 5. Giới Hạn Đã Biết (Known Limitations)
* **Không có ảnh thực địa:** bộ dữ liệu chưa có ảnh chụp thật. Ảnh hiện tại chỉ là placeholder.
* **Watermark trong tệp JPEG:** các tệp JPEG hiện có vẫn chứa dòng chữ `Đã xác thực thực tế & Giới trẻ Đà Nẵng` được vẽ trực tiếp vào bitmap. Script `scripts/generate_coffee_photos.py` đã được sửa để sinh watermark trung tính (`Ảnh minh hoạ · không phải ảnh thực địa`), nhưng **ảnh hiện tại chưa được sinh lại** vì thao tác đó ghi đè 36 tệp đang được git theo dõi. Muốn xoá dòng chữ cũ phải chạy lại script (có chủ đích).
* **`source_url` là nguồn thông tin địa điểm**, không phải nguồn của tệp ảnh.
* **Ảnh hero của trang đăng nhập** (`frontend/public/photos/danang-beach.jpg`) là bản sao byte-identical của một ảnh minh hoạ trong `data/photos/`.
