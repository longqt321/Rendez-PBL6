# Báo cáo kiểm tra EXIF / GPS Metadata trong xử lý ảnh tải lên

## 1. Tóm tắt kết luận

| Đối tượng dữ liệu | Route phục vụ / File | Giữ metadata GPS? | Mức độ xác minh | Căn cứ chính |
| :--- | :--- | :---: | :---: | :--- |
| **Ảnh Derivative công khai** (`asset.derivative`) | `GET /public-photo-media/<uuid:pk>/`<br>`GET /public-post-media/<uuid:pk>/` | **KHÔNG** (Đã tước bỏ hoàn toàn) | **Đã xác minh** | [backend/apps/photos/images.py:75](file:///home/longtran/Projects/rendez-web/backend/apps/photos/images.py#L75) |
| **Ảnh gốc lưu trữ** (`asset.original`) | `PhotoAsset.original`<br>`GET /private-photo-original/<uuid:pk>/` | **CÓ** (Giữ nguyên vẹn byte tải lên) | **Đã xác minh** | [backend/apps/photos/services.py:78](file:///home/longtran/Projects/rendez-web/backend/apps/photos/services.py#L78), [L151](file:///home/longtran/Projects/rendez-web/backend/apps/photos/services.py#L151) |
| **Quyền truy cập OwnPhoto** | `PATCH / DELETE /api/v1/photos/<uuid:pk>/manage/` | **Không phục vụ ảnh gốc** | **Đã xác minh** | [backend/apps/photos/views.py:308-322](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L308-L322) |

---

## 2. Chi tiết luồng xử lý và bằng chứng mã nguồn

### 2.1. Quá trình xử lý ảnh tải lên (`services.py` & `images.py`)

1. **Đọc tệp tin gốc (Raw Bytes)**:
   - Tại [backend/apps/photos/services.py:77-78](file:///home/longtran/Projects/rendez-web/backend/apps/photos/services.py#L77-L78):
     ```python
     file.seek(0)
     raw = file.read()
     ```
   - Tại [backend/apps/photos/services.py:151-154](file:///home/longtran/Projects/rendez-web/backend/apps/photos/services.py#L151-L154):
     ```python
     for field, content in [
         (asset.original, ContentFile(raw)),
         (asset.derivative, normalized),
     ]:
         field.save(f"{asset.id}.jpg", content, save=False)
     ```
   - **Đánh giá**: `asset.original` lưu trữ chính xác chuỗi byte thô `raw` nhận từ multipart form của người dùng, không qua bất kỳ bộ lọc hay hàm xử lý nào. Nếu file ảnh người dùng tải lên có chứa EXIF GPS (Tag `0x8825` / `GPSInfo`), toàn bộ tọa độ GPS và thông tin thiết bị sẽ được lưu nguyên vẹn vào `asset.original` trong thư mục lưu trữ private (`MEDIA_ROOT/visual/originals/`).

2. **Quá trình tạo ảnh phái sinh (Derivative Normalization)**:
   - Tại [backend/apps/photos/images.py:59-75](file:///home/longtran/Projects/rendez-web/backend/apps/photos/images.py#L59-L75):
     ```python
     with Image.open(file) as source:
         try:
             transposed = ImageOps.exif_transpose(source)
         except Exception:
             transposed = source
         if transposed.mode in ("RGBA", "LA") or (
             transposed.mode == "P" and "transparency" in transposed.info
         ):
             background = Image.new("RGB", transposed.size, (255, 255, 255))
             alpha = transposed.convert("RGBA")
             background.paste(alpha, mask=alpha.split()[3])
             normalized = background
         else:
             normalized = transposed.convert("RGB")
         normalized.thumbnail((2000, 2400))
         output = io.BytesIO()
         normalized.save(output, format="JPEG", quality=90)
     ```
   - **Đánh giá**:
     - `ImageOps.exif_transpose(source)` đọc EXIF Orientation để xoay đúng chiều ảnh và trả về một đối tượng Image mới đã strip orientation metadata.
     - `normalized.save(output, format="JPEG", quality=90)`: Trong thư viện Pillow (PIL), hàm `save()` khi không được truyền tham số `exif=...` sẽ **mặc định không ghi bất kỳ EXIF hay GPS metadata nào** vào luồng byte đầu ra.
     - Đã kiểm chứng: File derivative hoàn toàn sạch metadata, không còn thẻ GPS hay thông tin định danh máy ảnh.

---

### 2.2. Kiểm soát truy cập phân phối ảnh (`views.py`)

1. **Ảnh công khai phục vụ người dùng (`public-photo-media` & `public-post-media`)**:
   - Vị trí: [backend/apps/photos/views.py:228-232](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L228-L232) và [L235-248](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L235-L248).
   - Tham số: `original=False`.
   - Tại [backend/apps/photos/views.py:258](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L258):
     ```python
     file_field = asset.original if original else asset.derivative
     ```
   - **Đánh giá**: Tất cả client thông thường và khách công khai khi xem feed, chi tiết ảnh, chi tiết quán đều nhận `asset.derivative` (ảnh đã bị tước bỏ 100% EXIF/GPS).

2. **Ảnh gốc (`private-photo-original`)**:
   - Vị trí: [backend/apps/photos/views.py:215-227](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L215-L227).
   - Kiểm tra điều kiện:
     ```python
     if original and not (
         request.user.is_staff and request.user.has_perm("photos.review_photosubmission")
     ):
         raise Http404
     ```
   - **Đánh giá**: Người dùng thông thường (kể cả tác giả đã đăng ảnh đó) **không có quyền** tải về tệp tin `original` qua route này. Chỉ có tài khoản Staff có quyền duyệt ảnh (`photos.review_photosubmission`) mới có thể truy cập `original` nhằm mục đích kiểm duyệt tính xác thực nếu cần.

3. **Giao diện quản lý ảnh của tác giả (`OwnPhoto`)**:
   - Vị trí: [backend/apps/photos/views.py:308-322](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py#L308-L322).
   - `OwnPhoto` chỉ hỗ trợ phương thức `PATCH` (sửa caption) và `DELETE` (gỡ ảnh/withdrawn). Route này không trả về byte ảnh và không cho phép tải lại tệp tin nhị phân gốc.

---

## 3. Kết luận an toàn thông tin vị trí (Privacy Assessment)

- **Nguy cơ rò rỉ tọa độ GPS người dùng ra công chúng**: **KHÔNG CÓ**. Tất cả ảnh hiển thị ra frontend/cộng đồng đều sử dụng bản phái sinh `derivative`, nơi Pillow đã tái tạo pixel RGB và loại bỏ toàn bộ EXIF.
- **Lưu trữ dữ liệu gốc nội bộ**: `PhotoAsset.original` có lưu giữ GPS nếu tệp tải lên ban đầu chứa nó. Tệp này được bảo vệ trong thư mục private (`.private-media`), chỉ tài khoản quản trị viên kiểm duyệt cấp cao (`is_staff` + quyền `review_photosubmission`) mới có khả năng tải về.
