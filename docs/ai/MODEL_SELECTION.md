# Nghiên Cứu và Lựa Chọn Mô Hình AI (MODEL_SELECTION)

## 1. Định nghĩa bài toán nghiệp vụ Rendez
Rendez là nền tảng khám phá địa điểm và trải nghiệm địa phương dựa trên hình ảnh thực tế, dữ liệu địa lý và bản đồ tương tác.
- **Ngôn ngữ người dùng mục tiêu**: Tiếng Việt tự nhiên.
- **Yêu cầu cốt lõi**: Khám phá địa điểm qua câu truy vấn ngữ nghĩa tiếng Việt (Vietnamese Text-to-Image / Text-to-Place Semantic Retrieval) như:
  - *"Quán cà phê có nhiều cây xanh thoáng đãng"*
  - *"Không gian yên tĩnh để học bài và làm việc có nhiều ổ cắm"*
  - *"Quán phong cách vintage, ánh sáng tự nhiên"*
  - *"Quán có hồ nước sân vườn rộng"*
- **Mục tiêu kỹ thuật**: Ánh xạ câu truy vấn tiếng Việt và ảnh thực địa vào cùng một không gian nhúng đa phương thức (multimodal embedding space) để tính độ tương đồng cosine và xếp hạng địa điểm.

---

## 2. Các ứng viên mô hình được nghiên cứu

| Tiêu chí | Tiếp cận 1: Baseline truyền thống | Tiếp cận 2: Multilingual CLIP (DistilBERT + ViT-B/32) | Tiếp cận 3: Google SigLIP Multilingual (`siglip-base-patch16-256-multilingual`) | Tiếp cận 4: SigLIP Fine-tuned (Vietnamese Domain Adaptation) |
|---|---|---|---|---|
| **Kiến trúc** | PostgreSQL Trigram GIN + Unaccent (`f_unaccent`) | Vision Transformer (ViT-B/32) + DistilBERT 50+ ngôn ngữ | Vision Transformer (ViT-B/16-256) + Multilingual Transformer (Sigmoid Loss) | Google SigLIP với Adapter / Fine-tuned Text Projection |
| **Kích thước mô hình** | 0 MB (Tích hợp trong RDBMS) | ~539 MB (Text) + ~340 MB (Vision) ≈ 880 MB | ~1.48 GB (Toàn bộ mô hình đơn nhất) | ~1.48 GB + checkpoint adapter (<20 MB) |
| **Hỗ trợ tiếng Việt** | Chỉ khớp từ khóa dạng chuỗi con (lexical matching) | Chưng cất đa ngôn ngữ (mDistilBERT), hỗ trợ tiếng Việt cơ bản | Huấn luyện trực tiếp trên WebLI đa ngữ với Sigmoid loss; hỗ trợ tiếng Việt bản xứ xuất sắc | Tối ưu hóa trên tập ngữ nghĩa không gian địa điểm Rendez |
| **Độ phức tạp suy luận** | Rất thấp (CPU/Database index) | Trung bình (2 encoders riêng biệt) | Trung bình (1 pipeline `AutoModel` / `AutoProcessor` chuẩn HuggingFace) | Tương đương SigLIP Zero-shot |
| **Giấy phép** | Mã nguồn mở (PostgreSQL) | Apache 2.0 | Apache 2.0 | Apache 2.0 |
| **Yêu cầu GPU (Modal)** | Không cần | NVIDIA L4 (~0.5s/batch) | NVIDIA L4 (~0.4s/batch) | NVIDIA L4 |

---

## 3. Phân tích kỹ thuật chi tiết

### 3.1 Nhược điểm của Tiếp cận 1 (Baseline RDBMS)
- Cơ chế tìm kiếm hiện tại của Rendez dựa vào `visual_places` trong `backend/apps/places/selectors.py`, sử dụng `f_unaccent(lower(name || address || description)) LIKE %s`.
- Khi người dùng gõ *"không gian yên tĩnh có nhiều cây xanh"*, nếu mô tả quán không chứa chính xác từ *"yên tĩnh"* hay *"cây xanh"*, kết quả trả về là 0, dù ảnh chụp quán ngập tràn bóng cây.
- Không thể tìm kiếm trực quan dựa trên nội dung ảnh (Content-Based Visual Retrieval).

### 3.2 Nhược điểm của Tiếp cận 2 (`clip-ViT-B-32-multilingual-v1`)
- Mô hình này phân tách giữa `clip-ViT-B-32` (cho ảnh) và `clip-ViT-B-32-multilingual-v1` (cho văn bản).
- Khâu chưng cất tri thức (Knowledge Distillation) từ tiếng Anh sang tiếng Việt của DistilBERT gặp hiện tượng suy hao thông tin (modality gap) đối với các từ ghép ngữ cảnh tiếng Việt phức tạp.

### 3.3 Ưu thế vượt trội của Tiếp cận 3 & 4 (Google SigLIP Multilingual)
- **Kiến trúc SigLIP (Sigmoid Loss for Language Image Pre-Training)**: Thay thế hàm mất mát Contrastive Softmax truyền thống bằng hàm Sigmoid độc lập theo cặp. Điều này giúp độ ổn định cao hơn ở batch size nhỏ và loại bỏ bias giữa các ngôn ngữ.
- **Hỗ trợ tiếng Việt tự nhiên**: Được Google tiền huấn luyện trên tập dữ liệu WebLI đa ngữ khổng lồ, hiểu sâu sắc cấu trúc câu tiếng Việt, dấu thanh điệu và từ vựng địa phương.
- **Tích hợp tiêu chuẩn trong hệ sinh thái Hugging Face**: Hỗ trợ trực tiếp thông qua `transformers.AutoModel` và `transformers.AutoProcessor`, dễ dàng đóng gói phục vụ suy luận cả trên GPU (Modal) và CPU (Local fallback).

---

## 4. Quyết định lựa chọn (Selection Decision)
- **Mô hình nền tảng chính**: `google/siglip-base-patch16-256-multilingual` (Giấy phép Apache-2.0).
- **Chiến lược thực nghiệm**:
  1. Xây dựng tập dữ liệu kiểm chuẩn tiếng Việt thực địa (Vietnamese Venue Benchmark) với phân chia Train/Val/Test độc lập, chống rò rỉ cơ sở (Venue leakage prevention).
  2. Đo đạc định lượng Baseline (Postgres Trigram) vs Pretrained Zero-shot SigLIP vs Multilingual CLIP.
  3. Tiến hành tinh chỉnh bảo thủ (Conservative Fine-tuning / Adapter) trên Modal NVIDIA L4.
  4. Lựa chọn checkpoint có hiệu quả tìm kiếm cao nhất để tích hợp vào Rendez backend & frontend.
