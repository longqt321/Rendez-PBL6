# Dữ liệu Địa điểm & Cà phê Khu vực Đại học Bách Khoa Đà Nẵng

`danang.json` là manifest dữ liệu thực địa gồm **12 quán cà phê** và **36 ảnh** xung quanh khu vực **Trường Đại học Bách Khoa — Đại học Đà Nẵng (DUT)** thuộc quận Liên Chiểu, Đà Nẵng.

## 1. Nguồn Gốc và Tiêu Chí Tuyển Chọn Dữ Liệu
* **Nguồn thực tế từ cộng đồng sinh viên:** Dữ liệu được tổng hợp và đối chiếu từ các bài đăng chia sẻ, check-in và review gần đây của giới trẻ trên các nền tảng mạng xã hội: **Threads, TikTok, Facebook và Lemon8**, loại bỏ các bài viết quảng cáo thương mại hoặc website du lịch PR thổi phồng.
* **Tọa độ chính xác thực tế:** Toàn bộ 12 quán đều nằm trong bán kính đi bộ/xe máy ngắn (dưới 1km) quanh khuôn viên trường Bách Khoa, tập trung trên các trục đường sinh viên trọng điểm: *Phạm Như Xương, Ngô Thì Nhậm, Ngô Sỹ Liên, Lạc Long Quân, Hồ Bá Ôn, Ngô Văn Sở*.
* **Phân loại theo nhu cầu sinh viên:**
  * `study`: Học bài & Chạy deadline (yên tĩnh, máy lạnh, nhiều ổ cắm, bàn ghế công thái học)
  * `night`: Mở 24/7 & Cày đêm (cứu cánh mùa đồ án tốt nghiệp và ôn thi)
  * `vintage`: Mộc & Hoài niệm (nhà cấp 4 cũ, sân vườn, tone gỗ mộc, cà phê bơ/cà phê muối)
  * `garden`: Sân vườn & Chill (cây xanh thoáng đãng, hồ cá, thư giãn sau giờ lên lớp)
  * `checkin`: Sống ảo & Trẻ trung (decor gấu khổng lồ, tone màu hot trend TikTok)
  * `classic`: Cà phê Cóc & Vỉa hè (cà phê phin truyền thống, bàn cờ tướng, giá sinh viên)

## 2. Ảnh và Siêu Dữ Liệu
* Mỗi ảnh trong `data/photos/` được nén tối ưu hiển thị, giữ tỷ lệ khung hình thật và tự động loại bỏ siêu dữ liệu EXIF nhạy cảm (như GPS nhà riêng hay thông số thiết bị).
* Gán nhãn trực quan (Visual Attributes): Cây xanh & Vườn (`plants`), Bàn học & Ổ cắm (`study`), Trong nhà & Máy lạnh (`interior`), Ban đêm & 24/7 (`night`), Gỗ mộc & Hoài niệm (`wood`), Cà phê & Đồ uống (`food`), Kiến trúc (`architecture`).

## 3. Bản Đồ Số Cục Bộ
* Tích hợp bản đồ MapLibre GL với dữ liệu OpenStreetMap và glyph font Noto Sans phục vụ nội bộ, định vị chính xác vị trí từng quán xung quanh khuôn viên Đại học Bách Khoa.
