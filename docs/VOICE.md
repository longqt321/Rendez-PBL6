# VOICE: quy tắc chữ trong giao diện Rendez

Rendez là công cụ dùng hằng ngày để tìm, lưu và đăng ảnh địa điểm ở Đà Nẵng. Đây không phải landing page.
Chữ trong UI phục vụ thao tác, không phục vụ thương hiệu.

## 1. Mỗi chuỗi chữ phải thuộc đúng một loại

| Loại | Quy tắc | Ví dụ đúng |
|---|---|---|
| Nhãn điều hướng | 1–2 từ | Đã lưu, Bản đồ |
| Tiêu đề trang | Tên chức năng, danh từ, không ẩn dụ | Đã lưu |
| Nút | Động từ + đối tượng, tối đa 3 từ, luôn có chữ | Đăng ảnh, Lưu thay đổi |
| Nhãn ô nhập | Danh từ | Email, Mật khẩu |
| Gợi ý ô nhập | Chỉ khi chứa quy tắc hoặc giới hạn thật | Ít nhất 8 ký tự |
| Trạng thái rỗng | Nói rõ đang trống + 1 hành động tiếp theo | Chưa có ảnh nào. [Đăng ảnh đầu tiên] |
| Lỗi | Chuyện gì sai + cách sửa, 1 dòng | Mật khẩu hiện tại không đúng. |
| Thành công | 1 mệnh đề ngắn, ưu tiên toast | Đã lưu tên. |
| Dữ liệu | Thuộc tính kiểm chứng được | Mở đến 23:00 · 0,8 km |

**Chuỗi không thuộc loại nào thì xóa. Không viết lại cho hay hơn.**

## 2. Luật cứng

1. Không tagline, slogan, câu truyền cảm hứng, câu hỏi tu từ.
2. Không "Không phải X mà là Y", không câu đối nhịp, không ẩn dụ (sổ tay, hành trình, bộ sưu tập, chạm đến...).
3. Không subtitle dưới tiêu đề trang, trừ khi nó mang thông tin mà tiêu đề không có (số lượng, phạm vi, giới hạn).
4. Không eyebrow in hoa phía trên tiêu đề. Nhãn in hoa nhỏ chỉ dùng để phân loại dữ liệu thật (ví dụ danh mục trên thẻ).
5. Không viết hai dòng nói cùng một ý (lỗi chung + lỗi cụ thể; banner "đã chọn" + radio "đã chọn").
6. Thay cảm xúc bằng thuộc tính kiểm chứng được: "Cho buổi tối dài" → "Mở sau 21h".
7. Không lẫn tiếng Anh trong UI tiếng Việt, kể cả chữ mặc định của trình duyệt ("Choose Files", "No file chosen").
8. Câu mệnh lệnh ngắn thay "Bạn có thể...". Bỏ "bạn" thừa.
9. Giọng: người bản địa nhắn tin cho bạn bè. Ngắn, cụ thể, được phép hơi khô.
10. Không lặp một khẩu hiệu ở nhiều màn hình.
11. Không đưa chuỗi dữ liệu test vào UI (E2E, DEMO, Fixture, "giả để test").

## 3. Thuật ngữ cố định

Thêm hoặc đổi thuật ngữ thì sửa bảng này trước, rồi mới sửa code.

| Dùng | Không dùng |
|---|---|
| Đăng ảnh | Đăng trải nghiệm, Đóng góp, Chia sẻ trải nghiệm |
| Địa điểm | Không gian, Nơi (trừ tên riêng) |
| Đã lưu | Bộ sưu tập, Nơi bạn muốn ghé |
| Hồ sơ | Hồ sơ của tôi, Trang cá nhân |
| Ảnh của tôi | Lịch sử đăng ảnh, Ảnh bạn đã đăng |
| Đăng xuất | Thoát, Đăng xuất tài khoản |
| Vào với tư cách khách | Đăng nhập trải nghiệm nhanh |

## 4. Trước / Sau (tham chiếu khi viết chuỗi mới)

| Trước | Sau |
|---|---|
| Đăng nhập + "Tiếp tục nơi bạn đã dừng lại." | Đăng nhập (bỏ dòng phụ) |
| Đăng nhập trải nghiệm nhanh | Vào với tư cách khách |
| Một tài khoản để lưu địa điểm và đăng trải nghiệm của bạn. | (bỏ) |
| Tìm nơi đáng để dành một buổi chiều. + đoạn mô tả | Địa điểm ở Đà Nẵng (hoặc bỏ hero) |
| Đáng một chuyến đi | Mới được lưu nhiều (theo logic thật) |
| Yên tĩnh để làm việc / Bàn học, ổ cắm | Làm việc / Có ổ cắm, wifi |
| Mở muộn / Cho buổi tối dài | Mở sau 21h |
| Không gian đẹp / Đáng chụp lại | Có góc chụp ảnh |
| Xem cộng đồng / Trải nghiệm mới nhất | Ảnh mới nhất |
| Bộ sưu tập của bạn / Đã lưu / mô tả | Đã lưu |
| Nơi bạn muốn ghé | Địa điểm (kèm số lượng) |
| Xem chi tiết không gian | Xem chi tiết |
| Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Rendez không? | Đăng xuất? [Ở lại] [Đăng xuất] |
| Bạn chưa đăng ảnh nào. Thử chọn các đặc điểm khác... | Chưa có ảnh nào. [Đăng ảnh đầu tiên] |
| Kiểm tra lại thông tin đã nhập. + Email hoặc mật khẩu không đúng. | Email hoặc mật khẩu không đúng. |

## 5. Kiểm tra tự động

Cụm cấm nằm ở `docs/banned-phrases.json`. Chạy `node scripts/check-copy.mjs`.
Muốn thêm cụm cấm mới thì sửa file JSON, không viết thêm vào script.
Dòng nào cần ngoại lệ thật sự thì thêm comment `copy-lint-ignore` kèm lý do.

## 6. Tự kiểm trước khi báo xong

- Bỏ dòng chữ này đi mà người dùng vẫn dùng được y hệt? Nếu có, bỏ.
- Chuỗi này đang nói về cảm xúc hay về thao tác và dữ liệu? Nếu là cảm xúc, bỏ.
- Có hai chỗ cùng nói một điều không?
- Thuật ngữ có đúng bảng mục 3 không?
