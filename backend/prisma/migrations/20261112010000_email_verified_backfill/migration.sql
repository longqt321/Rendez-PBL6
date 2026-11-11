-- Xác thực email bắt buộc khi đăng nhập (quyết định 2026-11-12).
-- Cột `email_verified` đã có từ migration init (mặc định false). Các user tạo
-- TRƯỚC khi bật verification không hề được gửi mail xác thực — nếu để false thì
-- toàn bộ bị khoá ngoài. Đánh dấu verified cho user hiện có; user mới đăng ký
-- vẫn bắt đầu với `email_verified = false` (default của cột).
UPDATE "users" SET "email_verified" = true;
