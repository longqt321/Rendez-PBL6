# PITFALLS

Các kiểu lỗi lặp lại có thể nhận biết. Được thêm khi phát hiện một mẫu lặp lại (không phải lỗi đơn lẻ).
Nguồn chính: danh sách 36 nhóm vấn đề thường gặp khi dùng AI coding agent (xem mục cuối file).

Mẫu:
```
## P-### Tên
- Triệu chứng:
- Cách nhận biết:
- Cách tránh:
- Kiểm bằng gì:
```

## Danh sách nhận diện nhanh (từ tài liệu gốc)

Nhóm A (hiểu yêu cầu): hiểu sai yêu cầu; tự mở rộng phạm vi; quên quyết định cũ; lặp việc đã xong; thử lại hướng đã thất bại.
Nhóm B (kỹ thuật): bịa API hoặc schema; nhầm API giữa phiên bản; tự viết lại thứ thư viện có; overengineering; lệch kiến trúc; hồi quy; báo xong khi chưa chạy.
Nhóm C (giao diện): UI đại trà; landing page bias; thiếu trạng thái rỗng/lỗi/tải; lệch thiết kế; thiếu responsive và truy cập.
Nhóm D (backend): N+1; thiếu index; thiếu transaction và idempotency; thiếu phân quyền cấp tài nguyên; thiếu rate limit; log lộ dữ liệu.
Nhóm E (vận hành): thiếu health check; dev chạy được, production lỗi; lockfile lệch; commit lẫn lộn; commit message mơ hồ.
Nhóm F (tự động hóa): trôi mục tiêu; vòng lặp vô ích; dừng sớm; tự chấm bài mình; xóa hoặc ghi đè dữ liệu.
