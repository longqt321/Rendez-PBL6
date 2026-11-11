# Cấu hình SMTP gửi mail (quên mật khẩu)

> Dùng để bật tính năng **Quên mật khẩu** — khi chưa có SMTP, link reset chỉ được
> ghi vào log (dev). Hướng dẫn dưới theo **Resend** và giao diện tài liệu chính
> thức của Resend tại thời điểm **11/2026**. Nếu tên mục khác đi, tìm theo từ
> khoá trong ngoặc.

## Vì sao chọn Resend

| Nhà cung cấp | Miễn phí | Ghi chú |
| --- | --- | --- |
| **Resend** (khuyến nghị) | 3.000 email/tháng (100/ngày) | Dashboard hiện đại, docs tốt, SMTP + API, dùng chung cho cả tương lai |
| Brevo | 300 email/ngày | UI cũ hơn, quy trình xác minh người gửi dài hơn |
| Gmail SMTP | 500 email/ngày | Cần App Password, dễ rơi vào spam, không chuyên nghiệp (from là gmail) |
| Amazon SES | $0.10/1000 email | Rẻ nhất nhưng phải xin thoát sandbox, cấu hình phức tạp |

Resend phù hợp nhất với quy mô của dự án (mật khẩu reset — tần suất thấp) và
không bắt buộc domain ngay từ đầu (test được bằng địa chỉ dùng chung của Resend).

Backend dùng **SMTP chuẩn qua nodemailer** nên sau này đổi nhà cung cấp chỉ cần
đổi biến môi trường, không sửa code.

## 1. Tạo tài khoản Resend

1. Vào [resend.com](https://resend.com) → **Sign up** (đăng ký bằng Google/GitHub
   nhanh nhất). Không cần thẻ tín dụng cho gói Free.

## 2. Tạo API key

1. Vào dashboard → menu trái **API Keys**.
2. Bấm **Create API Key** → đặt tên (ví dụ `rendez-prod`) → Permission chọn
   **Sending access** → (tuỳ chọn) giới hạn Domain → **Create**.
3. Copy key hiện ra một lần duy nhất (dạng `re_...`) — lưu ngay, sau đó dashboard
   **không xem lại được** key này.

## 3. Chọn địa chỉ From

Có hai đường:

- **Chưa có domain (test ngay):** dùng địa chỉ dùng chung
  `onboarding@resend.dev` — Resend **chỉ cho gửi tới đúng email tài khoản của
  bạn**, đủ để tự thử tính năng.
- **Có domain thật (production):** làm tiếp bước 4 để gửi tới bất kỳ ai.

## 4. Thêm và xác minh domain (bắt buộc cho production)

1. Dashboard → menu trái **Domains** → **Add Domain**.
2. Nhập domain — Resend khuyến nghị dùng **subdomain** (ví dụ
   `mail.tenmien.vn` thay vì `tenmien.vn`) để tách uy tín gửi mail khỏi các
   dịch vụ khác trên domain gốc. Chọn Region gần người nhận (ví dụ `sin1` —
   Singapore nếu có) → **Add**.
3. Resend sinh danh sách bản ghi DNS (tab **Records**): DKIM, SPF… — **copy
   đúng từng bản ghi như dashboard hiển thị** (từ 08/2026 Resend có thể sinh
   CNAME thay cho TXT/MX cho phần SPF, cứ theo bảng của bạn).
4. Vào nhà quản lý DNS của domain (Cloudflare, Namecheap…) thêm các bản ghi đó.
   Lưu ý một số nhà quản lý tự nối domain vào trường Name — nếu xác minh fail,
   kiểm tra không bị thành `resend._domainkey.tenmien.vn.tenmien.vn`.
5. Quay lại **Domains** → chọn domain → bấm **Verify DNS Records**. DNS lan
   truyền từ vài phút đến vài giờ (tối đa 24h). Trạng thái cần đạt là
   **Verified**.

## 5. Điền vào `backend/.env` (dev) / `.env` máy chủ (production)

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxxxxxx        # API key ở bước 2
MAIL_FROM=Rendez <no-reply@mail.tenmien.vn>
```

Tham khảo SMTP chính thức của Resend (docs/send-with-smtp):

| Tham số | Giá trị |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` (SMTPS) hoặc `587` (STARTTLS) |
| Username | `resend` |
| Password | API key (`re_...`) |
| From | Địa chỉ thuộc domain đã xác minh |

> Production: các biến này được khai sẵn trong `deploy/compose.prod.yml` — chỉ
> cần điền vào `.env` cạnh compose rồi `docker compose ... up -d` lại.

## 6. Kiểm tra

1. Khởi động lại API (`docker compose up -d api` hoặc `bun run dev`).
2. Mở app → **Đăng nhập** → **Quên mật khẩu** → nhập email của bạn.
3. Hộp thư nhận được mail "Đặt lại mật khẩu Rendez" với nút **Đặt mật khẩu mới**.
4. Vào dashboard Resend → **Emails** (hoặc **Logs**) thấy email vừa gửi với
   trạng thái Delivered.

Nếu chưa cấu hình SMTP, API vẫn chạy bình thường — dev/test sẽ thấy link reset
trong log backend (`DEV ONLY — link đặt lại mật khẩu`).

## 7. Ghi chú vận hành

- **Giới hạn Free:** 100 email/ngày, 3.000/tháng — đủ cho mật khẩu reset. Nếu
  vượt, Resend trả lỗi SMTP và backend log `Gửi email đặt lại mật khẩu thất bại`.
- **Không log token ở production:** khi `NODE_ENV=production`, token reset không
  bao giờ được ghi log kể cả khi gửi mail thất bại (chống đọc log lấy token).
- **Bảo mật key:** API key chỉ nằm trong `.env` (đã gitignore). Nếu nghi lộ key,
  vào **API Keys** → **More options** → **Remove API key** và tạo key mới.
- **Rate limit:** endpoint `POST /auth/forgot-password` đã có rate limit riêng —
  SMTP free tier không bị spam cạn quota từ một người dùng.
