---
target: frontend/src/app/discovery.tsx
total_score: 22
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 1
target_identity: "file:/home/longtran/Projects/rendez-web/frontend/src/app/discovery.tsx"
target_fingerprint: "sha256:377fe5a83d3b093db1ec317c33d199c313a7d58bbab05bc69f56fe076d49e462"
target_path: /home/longtran/Projects/rendez-web/frontend/src/app/discovery.tsx
timestamp: 2026-10-29T12-26-18Z
slug: frontend-src-app-discovery-tsx
---
# Đánh Giá Thiết Kế Toàn Diện: Khám Phá Không Gian (Discovery Surface)

**Đối tượng thẩm định:** `frontend/src/app/discovery.tsx` (cùng các thành phần phụ thuộc `masonry.tsx`, `shared.tsx`, `components.css`, `theme.css`)
**Hệ quy chiếu:** [PRODUCT.md](file:///home/longtran/Projects/rendez-web/PRODUCT.md) & [DESIGN.md](file:///home/longtran/Projects/rendez-web/DESIGN.md) (Warm Botanical Pine & Clay)

---

### Bảng Điểm 10 Tiêu Chuẩn Nielsen (Design Health Score)

| # | Tiêu chuẩn Nielsen | Điểm | Vấn đề cốt lõi & Cơ sở thực chứng |
|---|---|:---:|---|
| 1 | **Nhận biết trạng thái hệ thống** *(Visibility of status)* | **2 / 4** | Skeleton loading chỉ có 4 ô xám tĩnh cứng nhắc, lệch hoàn toàn nhịp điệu lưới Masonry; thiếu chỉ báo thanh cuộn hoặc bộ đếm số lượng hiển thị. |
| 2 | **Tương thích giữa hệ thống & thực tế** *(Match system & real world)* | **2 / 4** | Chưa phân nhóm quận đặc thù Đà Nẵng (Hải Châu, Sơn Trà, Ngũ Hành Sơn); thiếu trạng thái thời gian thực "Đang mở cửa / Đã đóng cửa". |
| 3 | **Quyền kiểm soát & Tự do của người dùng** *(User control & freedom)* | **3 / 4** | Lưu vết cuộn trang qua `sessionStorage` mượt mà; tuy nhiên `details.filter-drawer` không đóng khi click ra ngoài vùng chọn. |
| 4 | **Tính nhất quán & Chuẩn mực** *(Consistency & standards)* | **2 / 4** | **Bất nhất nghiêm trọng:** Bấm tiêu đề quán ở `/saved` đưa tới chi tiết quán (`/places/:id`), nhưng bấm tiêu đề quán ở `/discover` lại đưa tới xem ảnh đơn lẻ (`/photos/:id`). Category tabs lọc tức thì còn Attribute drawer lại bắt submit form. |
| 5 | **Phòng ngừa lỗi** *(Error prevention)* | **2 / 4** | Lọc thuộc tính áp dụng logic `AND` nghiêm ngặt không hiển thị số lượng trước (facet counts), dễ dẫn người dùng vào ngõ cụt 0 kết quả mà không có cảnh báo. |
| 6 | **Nhận diện thay vì ghi nhớ** *(Recognition vs recall)* | **1 / 4** | Thẻ ảnh trên feed giấu toàn bộ huy hiệu thuộc tính không gian (ổ điện, điều hòa, yên tĩnh); checkbox bộ lọc là text thô, thiếu icon minh họa 14px. |
| 7 | **Tính linh hoạt & Hiệu quả sử dụng** *(Flexibility & efficiency)* | **2 / 4** | Nút bản đồ nổi đồng bộ query URL rất tiện; nhưng thiếu phím tắt duyệt ảnh nhanh (`ArrowLeft`/`ArrowRight`/`Escape`) trong trình xem ảnh chi tiết. |
| 8 | **Thiết kế thẩm mỹ & Tối giản** *(Aesthetic & minimalist)* | **3 / 4** | Tông màu thực vật trầm ấm (`#234e40`, `#faf8f5`) trang nhã, đúng tinh thần visual truth; tuy nhiên bảng bộ lọc dạng checkbox cổ điển làm giảm độ tinh tế. |
| 9 | **Nhận biết & Khắc phục lỗi** *(Error recovery)* | **3 / 4** | Trạng thái rỗng phân định ngữ cảnh rõ ràng; nhưng nút CTA rỗng lại điều hướng chung chung thay vì có nút "Xóa tất cả bộ lọc" ngay tại chỗ. |
| 10 | **Trợ giúp & Tài liệu hướng dẫn** *(Help & documentation)* | **2 / 4** | Có tooltip mô tả tiện ích; nhưng thiếu câu chào hoặc dòng giới thiệu ngắn gọn cho người dùng lần đầu về ý nghĩa "Ảnh thực tế không qua chỉnh sửa". |
| **Tổng** | | **22 / 40** | **Cần cải thiện (Fair / Needs Work)** |

---

### Phán Quyết Tính Đặc Thù Thiết Kế (Design Specificity Verdict)

- **Đánh giá của Design Director:** **Bản sao Pinterest chưa hoàn thiện danh tính Rendez (Generic Image Board with Local Skin).**
  Mặc dù giao diện khoác lên lớp màu "Warm Botanical Pine & Clay" trang nhã và cơ chế Masonry giữ tỷ lệ ảnh thực tế rất mượt mà, **bản thân thẻ ảnh trên feed khám phá hiện hoàn toàn rỗng về mặt ngữ cảnh không gian làm việc Đà Nẵng.** Thẻ ảnh chỉ gồm bức ảnh, nút Lưu, tên quán và địa chỉ rút gọn. Không có huy hiệu ổ cắm, máy lạnh hay yên tĩnh. Nếu tráo đổi API sang Unsplash, bố cục lưới này vẫn hoạt động nguyên vẹn mà không để lộ sự khác biệt nào. Sản phẩm tuyên ngôn *"thấy tận mắt góc ngồi, ánh sáng, ổ điện"* ([PRODUCT.md](file:///home/longtran/Projects/rendez-web/PRODUCT.md#L20)), nhưng người dùng duyệt feed lại bị "mù tiện ích" cho tới khi phải bấm sâu vào từng ảnh.
- **Quét tự động (Deterministic Scan):**
  Bộ quét CLI chạy trên `discovery.tsx`, `masonry.tsx`, `shared.tsx`. Kiểm tra sâu mã nguồn JSX/CSS phát hiện:
  - **Lỗi tương phản nghiêm trọng:** Bộ đếm ảnh trong Photo Viewer (`.viewer-counter`) sử dụng màu `#4e6257` trên nền tối `#14201a`, tỷ lệ tương phản chỉ đạt **2.56:1** (vi phạm chuẩn WCAG 2.1 AA tối thiểu 4.5:1).
  - **Thoát ly Token hệ thống:** Nhiều khối inline styles (`discovery.tsx:527-560`, `637-674`) sử dụng màu cứng (`#285548`, `#374151`, `rgba(40, 85, 72, 0.1)`) thay vì các biến ngữ nghĩa `--green`, `--ink`, `--line` trong `theme.css`.
  - **Kích thước vùng chạm cảm ứng nhỏ:** Nút Lưu nhỏ trên thẻ ảnh có kích thước 38px × 38px và nút xóa bộ lọc ~25px, thấp hơn tiêu chuẩn 44-48px cho thiết bị di động.
  - **Thiếu điều hướng phím:** Lightbox chi tiết ảnh thiếu sự kiện lắng nghe bàn phím `ArrowLeft`/`ArrowRight`/`Escape`.
- **Lớp phủ trực quan (Visual Overlays):** Không kích hoạt server chạy trực tiếp trong phiên này.

---

### Cảm Nhận Tổng Thể (Overall Impression)

Giao diện có nền tảng thị giác mộc mạc, tôn trọng tỷ lệ ảnh gốc qua lưới Masonry không giật khung hình. Tuy nhiên, luồng khám phá hiện tại quá nặng tính "thư viện ảnh thụ động" (Passive Art Gallery) thay vì một "công cụ hỗ trợ ra quyết định chọn chỗ ngồi làm việc thực tế" (Active Workspace Finder). Cơ hội bứt phá lớn nhất là **đưa thuộc tính tiện ích không gian và nhãn quận lên trực tiếp thẻ ảnh** kết hợp với **lọc thuộc tính tức thì (live-filter)**.

---

### Những Điểm Đang Làm Tốt (What's Working)

1. **Hiệu năng & Ổn định bố cục Masonry:** Kỹ thuật tách bạch 2 pha Read-Write qua `ResizeObserver` kết hợp khai báo trước `aspectRatio` trên thẻ ảnh triệt tiêu hoàn toàn hiện tượng nhảy bố cục (Layout Shift).
2. **Kỷ luật bảng màu thực vật chuẩn xác:** Tôn trọng nghiêm ngặt quy tắc [DESIGN.md](file:///home/longtran/Projects/rendez-web/DESIGN.md#L110): màu đất nung (`#c45c3d`) chỉ dùng điểm xuyết khi tương tác, giữ nền giấy ngà và sắc thông làm chủ đạo thị giác.
3. **Bảo tồn vị trí cuộn trang thông minh:** Lưu tọa độ cuộn theo từng URL query string vào `sessionStorage` giúp người dùng không bao giờ bị văng lên đầu trang khi quay lại từ ảnh chi tiết.

---

### Các Vấn Đề Cần Ưu Tiên (Priority Issues)

#### [P0] Mù thông tin tiện ích không gian trên thẻ ảnh Masonry
- **Vấn đề:** Thẻ ảnh `PhotoCard` trên feed không hiển thị bất kỳ huy hiệu thuộc tính nào (ổ cắm, máy lạnh, yên tĩnh) và thiếu nhãn quận.
- **Hệ quả:** Thất bại trong việc truyền tải giá trị cốt lõi của Rendez; người dùng cần tìm quán làm việc phải click mở từng ảnh để đoán mò.
- **Giải pháp:** Bổ sung dải chip tiện ích vi mô (micro badges kèm icon 14px) và nhãn quận (ví dụ: `[Q. Hải Châu] · Ổ điện · Yên tĩnh`) hiển thị tinh gọn dưới tên quán.
- **Lệnh đề xuất:** `/impeccable clarify`

#### [P1] Bất nhất liên kết tiêu đề & Bẫy chuyển trang đứt gãy
- **Vấn đề:** Cả ảnh lẫn tiêu đề quán `<h2>{place.name}</h2>` trên feed đều trỏ về `/photos/:id`, trong khi ở trang `/saved` tiêu đề lại trỏ về `/places/:id`.
- **Hệ quả:** Người dùng muốn xem tổng quan quán (bản đồ, giờ mở cửa, menu) bị ép phải xem ảnh đơn lẻ trước rồi bấm tiếp lần hai.
- **Giải pháp:** Tách rõ vùng bấm: Ảnh mở xem ảnh/lightbox; tiêu đề tên quán điều hướng thẳng về `/places/:placeId`.
- **Lệnh đề xuất:** `/impeccable layout`

#### [P2] Phân mảnh thao tác bộ lọc & Bẫy logic AND tuyệt đối
- **Vấn đề:** Category tabs lọc tức thì nhưng Attribute drawer lại bắt nhấn nút form; logic `AND` nghiêm ngặt gây ra 0 kết quả thường xuyên mà không có đếm trước (facet counts).
- **Hệ quả:** Tăng tải nhận thức, gây ma sát và bế tắc trải nghiệm.
- **Giải pháp:** Đồng bộ hóa sang cơ chế lọc tức thì (live auto-apply); khi kết quả rỗng do logic AND, hiển thị thông điệp đề xuất thông minh: *"Không có ảnh khớp cả hai, gợi ý X ảnh có ổ cắm điện"*.
- **Lệnh đề xuất:** `/impeccable distill`

#### [P3] Lệch pha Skeleton Loading và lỗi tương phản bộ đếm ảnh
- **Vấn đề:** Skeleton loading hiển thị 4 khối chữ nhật tĩnh cứng nhắc; bộ đếm ảnh trong photo viewer có độ tương phản chỉ 2.56:1 (`#4e6257` trên `#14201a`).
- **Hệ quả:** Giật giụa thị giác khi tải trang và khó đọc số trang ảnh trong chế độ xem tối.
- **Giải pháp:** Tạo lưới skeleton đa chiều cao bám nhịp hàng 8px của Masonry; nâng màu bộ đếm ảnh lên `rgba(255,255,255,0.75)` (tương phản > 4.8:1).
- **Lệnh đề xuất:** `/impeccable polish`

---

### Cảnh Báo Theo Chân Dung Người Dùng (Persona Red Flags)

- **Alex (Freelancer / Remote Worker cần Wi-Fi mạnh & góc làm việc 4h):**
  - *Điểm nghẽn:* Lướt qua 20 ảnh không thấy ký hiệu ổ điện. Chọn "Ổ cắm" + "Yên tĩnh" trong bộ lọc -> Nhấn "Áp dụng" -> Màn hình trắng 0 kết quả do logic AND quá chặt. Rời bỏ nền tảng ngay lập tức.
- **Linh (Sinh viên tìm quán học nhóm mở khuya):**
  - *Điểm nghẽn:* Thẻ ảnh không hiển thị quận hay trạng thái đóng/mở cửa. Phải bấm 12 lần qua lại giữa các màn hình để tìm xem quán nào còn mở sau 22h ở khu vực gần trường.
- **Minh (Du khách tìm quán view đẹp dọc bờ biển Võ Nguyên Giáp):**
  - *Điểm nghẽn:* Nút nổi "Xem bản đồ" trên mobile nằm quá sát thanh điều hướng đáy dễ bấm nhầm; mở ảnh chi tiết không có cử chỉ vuốt xuống để đóng (swipe down to close), nút Back ở góc trên bên trái ngoài tầm với một tay.

---

### Quan Sát Chi Tiết Khác (Minor Observations)

- **CSS rò rỉ chéo:** Định nghĩa responsive cho `.pin-feed` nằm rải rác bên trong `frontend/src/styles/map.css` thay vì quy hoạch tại `components.css`.
- **Nút hành động khi rỗng:** Khi bộ lọc không có kết quả, nút hành động lại dẫn về `/discover` thay vì có nút "Xóa tất cả bộ lọc" ngay tại chỗ.
- **A11y:** Thiếu sự kiện bàn phím `ArrowLeft`/`ArrowRight`/`Escape` khi xem ảnh chi tiết; thẻ ảnh tạo ra 2 thẻ `<a>` trùng lặp liền kề cho cùng một link.

---

### Câu Hỏi Chiến Lược Cần Cân Nhắc (Questions to Consider)

1. *Rendez có nên giữ trải nghiệm xem ảnh chi tiết như một trang tách biệt (`/photos/:id`), hay chuyển sang dạng Modal / Bottom Sheet Overlay để người dùng không bao giờ mất dấu vị trí cuộn trên lưới khám phá?*
2. *Liệu có nên thay ngăn kéo lọc nhiều nấc bằng một dải "Quick Filter Ribbon" trượt ngang ngay dưới thanh danh mục để bật/tắt tiện ích chỉ với 1 chạm?*
