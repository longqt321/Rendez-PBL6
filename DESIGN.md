---
name: Rendez
description: Khám phá không gian cà phê và làm việc tại Đà Nẵng qua hình ảnh thực tế và bản đồ địa phương
colors:
  primary: "#234e40"
  primary-hover: "#1b3d32"
  primary-subtle: "#edf4f0"
  accent: "#c45c3d"
  accent-hover: "#ab4b2e"
  accent-subtle: "#fbf0ec"
  neutral-ink: "#1a2e26"
  neutral-ink-secondary: "#3b5047"
  neutral-muted: "#62746c"
  neutral-line: "#e6e8e1"
  neutral-line-strong: "#cfd4c8"
  neutral-canvas: "#faf8f5"
  neutral-surface: "#ffffff"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.2vw, 42px)"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.5px"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.2px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0px"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.full}"
    padding: "10px 18px"
  card-surface:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Rendez

## Overview

Rendez sở hữu phong cách thiết kế **Warm Botanical Pine & Clay** — sự giao thoa hài hòa giữa sắc xanh thẫm của thông rừng đại ngàn miền Trung, chất giấy thô mộc ấm áp và sắc đỏ đất nung đặc trưng của kiến trúc Đà Nẵng. Hệ thống thiết kế được xây dựng với triết lý **Visual-First** và **Content-First**: giao diện đóng vai trò là một khung nền tĩnh lặng, thanh lịch để tôn vinh trọn vẹn vẻ đẹp chân thực của ảnh chụp không gian và bản đồ địa phương.

## Colors

Bảng màu mang hơi thở tự nhiên mộc mạc, tạo cảm giác thư thái, tin cậy và không gây mỏi mắt trong các phiên duyệt tìm không gian kéo dài.

### Primary
- **Pine Green (`#234e40`):** Sắc xanh thông rừng đại ngàn, đại diện cho tính ổn định, tự nhiên và tĩnh tại. Được dùng làm màu nhận diện chủ đạo cho nút chính (Primary CTA), biểu tượng thương hiệu, trạng thái kích hoạt trên bản đồ và đường viền focus.
- **Pine Hover (`#1b3d32`):** Sắc xanh đậm đà hơn khi rê chuột hoặc tương tác nhấn nút.
- **Pine Subtle (`#edf4f0`):** Nền xanh lá non nhạt dùng cho chip thuộc tính đã chọn hoặc badge trạng thái tích cực.

### Secondary / Accent
- **Clay Terracotta (`#c45c3d`):** Sắc đỏ ngói đất nung ấm áp của miền Trung. Đóng vai trò màu điểm nhấn chiến lược (Accent), xuất hiện ở dấu chấm nhận diện thương hiệu `r.rendez`, nút lưu yêu thích (Bookmark active), cảnh báo vi mô và vòng tròn focus trợ năng.
- **Clay Hover (`#ab4b2e`):** Trạng thái hover cho các thành phần điểm nhấn.
- **Clay Subtle (`#fbf0ec`):** Nền ngói nhạt dùng cho badge cảnh báo nhẹ hoặc thông báo nổi bật.

### Neutral
- **Canvas Paper (`#faf8f5`):** Màu nền toàn trang lấy cảm hứng từ trang giấy ngà thô mộc, tạo chiều sâu thị giác ấm áp hơn hẳn nền trắng thuần khiết `#ffffff`.
- **Surface White (`#ffffff`):** Nền của các thẻ ảnh (Cards), thanh điều hướng nổi và cửa sổ modal.
- **Ink Primary (`#1a2e26`):** Màu mực chính pha ánh xanh thông sẫm, độ tương phản tuyệt hảo (> 12:1) trên nền canvas, thay thế hoàn toàn màu đen chết `#000000`.
- **Ink Secondary (`#3b5047`):** Màu mực thứ cấp dùng cho tiêu đề phụ và nhãn thông tin.
- **Muted Greenery (`#62746c`):** Màu xám cỏ cây dùng cho thông tin phụ trợ, địa chỉ, ngày giờ và văn bản ghi chú.
- **Line Divider (`#e6e8e1`):** Đường kẻ phân cách siêu mảnh, tiệp màu với nền giấy.
- **Line Strong (`#cfd4c8`):** Viền thẻ ảnh và khung nhập liệu ở trạng thái nghỉ.

### Named Rules
**The Botanical Restraint Rule:** Màu điểm nhấn đỏ ngói (`#c45c3d`) không được chiếm quá 5% diện tích giao diện trên bất kỳ màn hình nào. Sự tinh tế và đắt giá của nó đến từ tính hiếm hoi và chính xác.

## Typography

**Display & Body Font:** Hệ thống phông chữ giao diện gốc của hệ điều hành (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif`).
**Bản đồ địa phương:** Phông chữ `Noto Sans Regular` được nhúng trực tiếp nội bộ phục vụ nhãn tiếng Việt trên bản đồ vector.

### Hierarchy
- **Display** (`700`, `clamp(28px, 3.2vw, 42px)`, `line-height: 1.18`, `letter-spacing: -1.2px`): Sử dụng cho tiêu đề trang chính, trang hồ sơ và khẩu hiệu thương hiệu. Áp dụng kỹ thuật `text-wrap: balance` để chống ngắt từ lẻ dòng.
- **Headline (H2)** (`650`, `22px`, `line-height: 1.3`, `letter-spacing: -0.5px`): Tiêu đề khối danh sách quán, tiêu đề nhóm bộ lọc.
- **Title (H3)** (`650`, `16px`, `line-height: 1.4`, `letter-spacing: -0.2px`): Tên quán cà phê trên thẻ ảnh Masonry, tiêu đề trong cửa sổ xem nhanh bản đồ.
- **Body** (`400`, `15px`, `line-height: 1.55`): Văn bản mô tả địa điểm, nội dung bình luận, thông báo hệ thống.
- **Label / Small** (`600`, `13px`, `line-height: 1.4`): Nhãn thuộc tính, nhãn form, văn bản hỗ trợ và thông số khoảng cách.

## Layout

- **Mô hình lưới ảnh thích ứng (Dynamic Masonry Grid):**
  Lưới ảnh chính là trái tim của giao diện Rendez. Bố cục sử dụng CSS Grid với các hàng tự động (`grid-auto-rows: 8px`) kết hợp `ResizeObserver` đọc chiều cao khối nội dung để tính toán chỉ số `grid-row-end: span N`.
  - Giữ trọn 100% tỷ lệ khung hình thật (`aspect-ratio`) của ảnh chụp.
  - Phân luồng đọc (Read) và ghi (Write) tách biệt để triệt tiêu hiện tượng Layout Thrashing.
  - Trải rộng từ 1 cột (di động nhỏ), 2 cột (di động lớn), 3 cột (máy tính bảng) đến 4–5 cột (màn hình rộng).
- **Thanh điều hướng Desktop Left Rail:**
  Thanh điều hướng cố định bên trái rộng 80px (tương tự Linear / Pinterest), giải phóng tối đa không gian chiều ngang cho ảnh và bản đồ.
- **Thanh điều hướng Mobile Bottom Tab Bar:**
  Thanh điều hướng nổi 64px ở đáy màn hình với nền kính mờ (`backdrop-filter: blur(16px)`), đặt các hành động cốt lõi vào đúng vùng ngón tay cái dễ chạm (Thumb Zone).

## Elevation & Depth

Hệ thống sử dụng triết lý **Tonal Layering & Soft Botanical Shadows** — phân tách các tầng không gian bằng màu sắc bề mặt tự nhiên kết hợp đổ bóng mềm đa tầng pha sắc xanh thông rừng (`rgba(20, 38, 30, ...)`), thay vì bóng đen đục thô cứng.

### Shadow Vocabulary
- **Shadow XS** (`0 1px 2px rgba(20, 38, 30, 0.04)`): Viền phân cách nhẹ của các nút phụ.
- **Shadow SM** (`0 2px 6px -1px rgba(20, 38, 30, 0.06), 0 1px 4px -1px rgba(20, 38, 30, 0.03)`): Đổ bóng nghỉ của thẻ ảnh và các chip lựa chọn.
- **Shadow MD** (`0 6px 16px -2px rgba(20, 38, 30, 0.08), 0 2px 6px -1px rgba(20, 38, 30, 0.04)`): Đổ bóng khi rê chuột (Hover) lên thẻ ảnh hoặc các nút điều khiển nổi trên bản đồ.
- **Shadow LG** (`0 12px 28px -4px rgba(20, 38, 30, 0.12), 0 4px 10px -2px rgba(20, 38, 30, 0.06)`): Cửa sổ xem ảnh nhanh (Photo Viewer Drawer / Modal).
- **Shadow Floating** (`0 16px 36px -6px rgba(20, 38, 30, 0.16), 0 6px 14px -2px rgba(20, 38, 30, 0.08)`): Hộp thoại xác nhận quan trọng (Confirm Dialog) và menu dropdown.

### Named Rules
**The Grounded Rest Rule:** Ở trạng thái nghỉ, thẻ ảnh phẳng và tiệp nhẹ với nền canvas. Đổ bóng chỉ xuất hiện và nâng cao lên như một phản hồi xúc giác khi người dùng tương tác rê chuột hoặc chạm tay.

## Shapes

- **Bán kính bo cong (Radii Scale):**
  - Nhỏ (`--radius-sm: 8px`): Hộp checkbox, radio, các thẻ badge nhỏ.
  - Vừa (`--radius-md: 12px`): Khung nhập liệu (inputs, select, textarea), hộp thoại popup.
  - Lớn (`--radius-lg: 16px`): Thẻ ảnh Masonry, panel bản đồ, khối chi tiết địa điểm.
  - Rất lớn (`--radius-xl: 20px`): Khối nổi bao quanh modal và ngăn kéo trượt.
  - Viên thuốc (`--radius-full: 9999px`): Tất cả nút bấm chính (`.button`), chip danh mục và nhãn thuộc tính.

## Components

### Buttons
- **Shape:** Dạng con nhộng hoàn hảo (`border-radius: 9999px`), chiều cao chạm chuẩn tối thiểu 44px (`min-height: 44px`).
- **Primary:** Nền xanh thông rừng (`#234e40`), chữ trắng, padding `10px 18px`, font chữ bán đậm (`font-weight: 600`).
- **Secondary:** Nền trắng (`#ffffff`), chữ mực xanh (`#1a2e26`), viền mỏng `#ced7ce`. Hover chuyển sang nền giấy nhạt `#f0f3ed`.
- **Micro-interaction:** Khi bấm kích hoạt hiệu ứng thu nhỏ nhẹ (`transform: scale(0.97)`), đem lại cảm giác nảy chân thực.

### Chips & Filters
- **Category Pills:** Hàng viên thuốc cuộn ngang không lộ thanh cuộn, trạng thái active chuyển màu xanh đậm hoặc có đường viền chỉ thị tinh xảo.
- **Attribute Chips:** Nhãn thuộc tính không gian (ổ điện, yên tĩnh, máy lạnh) hiển thị kèm icon nhỏ 14px, nền xanh dịu `#edf4f0` khi kích hoạt.

### Cards / Photo Pins
- **Thẻ ảnh Masonry:** Bo góc 16px, ẩn góc tràn (`overflow: hidden`), có lớp phủ dải màu chuyển nhẹ (Gradient Scrim) để bảo đảm chữ đọc rõ trên mọi nền ảnh.
- **Nút Lưu nhanh (Bookmark):** Đĩa tròn nổi ở góc trên bên phải ảnh, áp dụng hiệu ứng kính mờ (`backdrop-filter: blur(8px)`) tinh tế.

### Inputs & Forms
- Khung nhập liệu có chiều cao tối thiểu 46px, bo góc 12px, nền trắng.
- Khi focus: Không dùng viền đen mặc định của trình duyệt; chuyển sang viền xanh thông rừng (`#234e40`) kèm quầng sáng dịu `box-shadow: 0 0 0 3px rgba(35, 78, 64, 0.12)`.

### Bản đồ Số MapLibre
- Các điểm ghim quán (Markers) hình giọt nước có viền trắng tương phản cao, chuyển màu đỏ ngói khi được chọn kèm hiệu ứng lan tỏa (pulse animation).
- Cửa sổ xem nhanh nổi bật trên nền bản đồ với bán kính bo tròn 14px và bóng đổ đa tầng.

## Do's and Don'ts

### Do:
- **Do** luôn giữ nguyên tỷ lệ khung hình thật của ảnh chụp không gian quán cà phê; tuyệt đối không dùng thuộc tính ép buộc tỷ lệ cố định làm cắt xén mất góc ngồi thực tế.
- **Do** đảm bảo mọi nút bấm, thẻ chọn và vùng tương tác đạt diện tích chạm tối thiểu 44x44px trên giao diện cảm ứng di động.
- **Do** sử dụng hiệu ứng skeleton shimmer với dải màu ấm `#f0f2eb` khi dữ liệu đang tải, duy trì sự ổn định bố cục và tránh hiện tượng giật màn hình (Cumulative Layout Shift).
- **Do** tuân thủ độ tương phản tối thiểu 4.5:1 giữa màu chữ và nền theo chuẩn WCAG 2.1 AA.

### Don't:
- **Don't** không bao giờ sử dụng màu đen thuần túy `#000000` hoặc màu xám tro công nghiệp `#888888` cho văn bản; luôn sử dụng sắc mực xanh thông rừng (`#1a2e26`) và xám cỏ cây (`#62746c`).
- **Don't** không lạm dụng màu đỏ ngói đất nung (`#c45c3d`) làm màu nền cho các khối lớn; chỉ sử dụng làm điểm nhấn vi mô có chủ đích.
- **Don't** không chèn banner quảng cáo chớp nháy hoặc các huy hiệu thương mại giả tạo làm phá vỡ trải nghiệm khám phá không gian tĩnh tại của người dùng.
