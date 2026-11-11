# Cấu hình Cloudflare R2 cho upload ảnh

> Dùng khi cần bật tính năng ảnh (avatar, ảnh bìa, ảnh bài đăng). Giao diện
> Cloudflare đổi khá thường xuyên — các bước dưới đây theo giao diện tháng 11/2026.
> Nếu tên mục khác đi, tìm theo từ khoá trong ngoặc.

## 1. Tạo bucket

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com) → menu trái **R2 Object Storage**
   (lần đầu sẽ hỏi đăng ký gói — chọn **Free**).
2. **Create bucket** → tên `rendez` → chọn location **APAC** (gần Việt Nam) → Create.

## 2. Bật URL công khai (đọc ảnh)

Vào bucket → tab **Settings** → mục **Public Development URL** → bấm **Enable**.

- Hộp thoại cảnh báo về giới hạn băng thông của `r2.dev` (chỉ dùng cho dev/thử nghiệm) →
  xác nhận.
- Sau khi bật, Cloudflare hiện địa chỉ dạng `https://pub-<chuỗi>.r2.dev` — đây là
  `R2_PUBLIC_BASE_URL`.
- Production nên dùng **Custom Domains** (thêm domain riêng) thay vì `r2.dev`, vì `r2.dev`
  bị giới hạn tốc độ.

## 3. Thêm CORS Policy (bắt buộc)

Trình duyệt PUT file trực tiếp lên presigned URL, nên bucket **phải** cho phép CORS, nếu
không trình duyệt chặn request và ảnh không lên được (lỗi CORS trong console).

Vẫn ở tab **Settings** → mục **CORS Policy** → **Add** → dán:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5199"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- `5173` là app dev / container `web`, `5199` là cổng Playwright e2e. Khi deploy thật, thêm
  domain thật vào `AllowedOrigins` (ví dụ `https://rendez.example.com`).
- Chỉ cần `PUT` (upload) và `GET` (đọc); `AllowedHeaders` phải có `Content-Type` vì chữ ký
  SigV4 của server ký kèm header này.

## 4. Tạo API token (quyền ghi)

1. Ở trang **R2 Object Storage** (danh sách bucket), nhìn khung bên phải hoặc menu
   **API** → **Manage API Tokens** (từ khoá: *Manage R2 API Tokens*).
2. **Create API Token** → đặt tên `rendez-upload`.
3. Quyền: **Object Read & Write**; phạm vi: **Specify bucket** → chỉ `rendez`.
4. TTL: **No expiry** (dev) hoặc 1 năm (production, nhớ lịch xoay token).
5. Bấm tạo → trang kết quả hiện:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (chỉ hiện **một lần**, copy ngay)
   - **Account ID** (32 ký tự hex, cũng thấy ở góc phải trang R2) → `R2_ACCOUNT_ID`

## 5. Điền vào `backend/.env`

```env
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET=rendez
R2_PUBLIC_BASE_URL=https://pub-<chuỗi>.r2.dev
```

`.env` đã nằm trong `.gitignore` — không commit credentials.

## 6. Khởi động lại và kiểm tra

```bash
docker compose up -d --build api
```

Kiểm nhanh (cần cookie phiên đăng nhập):

```bash
# 1. Đăng nhập lấy cookie
xh POST :8000/api/v1/session email=you@example.com password='...' --session=rendez

# 2. Xin URL upload — kỳ vọng 201, không còn 503
xh POST :8000/api/v1/media folder=avatars contentType=image/png --session=rendez
```

Kỳ vọng: `201 {uploadUrl, publicUrl, key, expiresAt, headers}`. Sau đó upload thử một ảnh
trong trang **Cài đặt → Ảnh hồ sơ**; nếu vẫn lỗi, mở DevTools → Network xem request `PUT`
tới `*.r2.cloudflarestorage.com`:

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `503 Tính năng upload ảnh chưa được cấu hình` | thiếu 1 trong 4 biến `R2_*` | điền đủ, khởi động lại API |
| `PUT` báo lỗi CORS trong console | chưa có CORS Policy | làm mục 3 |
| `PUT` trả `403 SignatureDoesNotMatch` | sai secret hoặc token không có quyền ghi bucket | tạo lại token, kiểm `R2_BUCKET` |
| Upload xong nhưng ảnh không hiện | chưa bật Public Development URL, hoặc `R2_PUBLIC_BASE_URL` sai | làm mục 2, kiểm URL mở được bằng trình duyệt |
| Ảnh hiện rồi mất sau vài phút | đang dùng `r2.dev` bị giới hạn/ tắt | dùng Custom Domain |

## 7. Ghi chú vận hành

- Object do server sinh khoá: `<folder>/<userId>/<uuid>.<ext>` — không dùng tên client gửi.
- Presigned PUT sống 600 giây; hết hạn thì client xin URL mới.
- Ảnh đã PUT nhưng bài đăng bị từ chối sẽ thành object mồ côi — dọn định kỳ bằng
  Object Lifecycle Rules (tab Settings) hoặc script riêng (xem `docs/BACKLOG.md`).
