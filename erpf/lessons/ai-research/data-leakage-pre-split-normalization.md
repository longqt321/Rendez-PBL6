---
id: "ERPF-AI-LESS-001"
title: "Rò Rỉ Dữ Liệu Ngầm Qua Khâu Tiền Xử Lý Trước Khi Phân Tách Tập Dữ Liệu (Silent Data Leakage via Pre-Split Feature Transformation)"
version: "1.0.0"
category: "RES"
track: "AI"
concept_type: "LESS"
intended_audience:
  - "AI/ML Researchers"
  - "Machine Learning Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/philosophy.md"
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/empirical-loop/dataset-analysis-and-leakage.md"
related_concepts:
  - "ERPF-CORE-PRIN-005"
  - "ERPF-AI-DOM-011"
  - "ERPF-AI-WORK-004"
  - "ERPF-TOOL-TMP-004"
applicable_contexts:
  - "Xây dựng pipeline tiền xử lý dữ liệu học máy (Feature Preprocessing / Scaling)"
  - "Huấn luyện bộ phân tích từ vựng (Tokenizer / TF-IDF Vectorizer / Target Encoding)"
  - "Kiểm toán độ tin cậy thực nghiệm của các kết quả nghiên cứu mô hình đạt điểm số cao bất thường"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "lesson-learned"
  - "ai-research"
  - "data-leakage"
  - "experimental-validity"
  - "preprocessing-hygiene"
---

# Bài Học Kinh Nghiệm: Rò Rỉ Dữ Liệu Ngầm Qua Khâu Tiền Xử Lý Trước Khi Phân Tách Tập Dữ Liệu
# Silent Data Leakage via Pre-Split Feature Transformation

---

## 1. Bối Cảnh (Context)
Trong một dự án nghiên cứu dự đoán rủi ro tín dụng hoặc phân loại ảnh y tế, nhóm nghiên cứu chuẩn bị tập dữ liệu gồm 10.000 mẫu dữ liệu dạng bảng (Tabular data) với 50 thuộc tính số có phân phối lệch (skewed numerical features).

Quy trình tiền xử lý dữ liệu chuẩn thường bao gồm việc chuẩn hóa đặc trưng (Z-score Normalization: $z = \frac{x - \mu}{\sigma}$) hoặc chuẩn hóa Min-Max để đưa dữ liệu về khoảng $[0, 1]$ trước khi đưa vào mạng nơ-ron hoặc mô hình Gradient Boosting.

---

## 2. Vấn Đề Hoặc Quan Sát Thực Tế (Problem or Observation)
- **Hiện tượng trong phòng thí nghiệm (In-Lab Performance):**
  Mô hình đạt độ chính xác (Accuracy / ROC-AUC) vượt trội trên tập kiểm thử nội bộ: AUC đạt 0.965, vượt xa tất cả các baselines hiện hành từ 4-6%. Nhóm nghiên cứu chuẩn bị viết bài báo khoa học công bố phương pháp mới.
- **Hiện tượng khi triển khai thực tế (Production / Out-of-Sample Failure):**
  Khi mô hình được đưa vào thử nghiệm trên một tập dữ liệu bệnh nhân mới thu thập vào tháng kế tiếp (thực sự là out-of-distribution / unseen data), hiệu năng sụp đổ thảm hại: AUC tụt dốc xuống chỉ còn 0.712 (không tốt hơn baseline đơn giản, thậm chí tệ hơn).

---

## 3. Giả Định Ban Đầu (Initial Assumptions)
1. Nhóm nghiên cứu ngây thơ giả định rằng: *"Hàm tiền xử lý `StandardScaler()` chỉ là một phép biến đổi toán học trung tính, không chứa nhãn (labels), nên việc gọi `scaler.fit_transform(X_all)` trên toàn bộ dữ liệu trước khi chia `train_test_split()` là hoàn toàn vô hại"*.
2. Nhóm tin rằng rò rỉ dữ liệu (Data Leakage) chỉ xảy ra khi làm lộ nhãn mục tiêu ($y$), chứ không xảy ra với các thuộc tính đầu vào ($X$).

---

## 4. Phân Tích Kỹ Thuật (Analysis)
Khi tiến hành thanh tra mã nguồn pipeline tiền xử lý dữ liệu:
```python
# ĐOẠN MÃ GÂY THẢM HỌA RÒ RỈ DỮ LIỆU
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

scaler = StandardScaler()
# LỖI CHÍ MẠNG: Tính toán mean (μ) và std (σ) trên TOÀN BỘ 10.000 mẫu
X_normalized = scaler.fit_transform(X_all)

# Sau khi dữ liệu kiểm thử đã bị "nhúng" vào μ và σ, mới tiến hành chia tách!
X_train, X_test, y_train, y_test = train_test_split(X_normalized, y_all, test_size=0.2, random_state=42)
```

**Cơ chế rò rỉ ngầm (The Silent Leakage Mechanism):**
1. Giá trị trung bình $\mu_{\text{global}}$ và độ lệch chuẩn $\sigma_{\text{global}}$ được tính toán có chứa thông tin phân phối của chính 2.000 mẫu nằm trong tập kiểm định tương lai (`X_test`).
2. Từng mẫu trong `X_train` sau khi biến đổi đã mang một lượng thông tin nhỏ về phân phối của `X_test`. Mô hình học được "dấu vết ngầm" của tập kiểm định trong quá trình tối ưu hàm mất mát.
3. Khi gặp dữ liệu thực tế ngoài đời (nơi $\mu$ và $\sigma$ thực sự chưa được biết), giả định toán học bị phá vỡ, mô hình mất hoàn toàn khả năng khái quát hóa.
4. Hiện tượng này đặc biệt nghiêm trọng gấp bội khi áp dụng cho các phép biến đổi như:
   - **Target Encoding:** Tính giá trị trung bình của nhãn $y$ theo từng nhóm danh mục.
   - **TF-IDF Vectorizer / Tokenizer:** Xây dựng bảng từ vựng (Vocabulary) từ toàn bộ tập dữ liệu (bao gồm cả từ ngữ hiếm chỉ có trong tập test).
   - **Imputation:** Điền giá trị thiếu (missing values) bằng giá trị trung vị của toàn bộ cột.

---

## 5. Nguyên Nhân Gốc Rễ (Root Cause Analysis - 5 Whys)
1. *Tại sao mô hình sụp đổ khi gặp dữ liệu thực tế?* Vì mô hình phụ thuộc vào phân phối dữ liệu đã bị rò rỉ từ trước.
2. *Dữ liệu kiểm thử bị lộ ở khâu nào?* Ở bước chuẩn hóa đặc trưng trước khi huấn luyện.
3. *Vì sao phép chuẩn hóa lại làm lộ dữ liệu?* Vì `fit()` được thực hiện trên toàn bộ tập dữ liệu trước khi phân tách tập Train/Test.
4. *Tại sao kỹ sư lại viết như vậy?* Vì muốn tiện lợi, viết một dòng mã nhanh chóng và nghĩ rằng đặc trưng không có nhãn thì không sợ rò rỉ.
5. *Nguyên nhân gốc (Root Cause):* **Vi phạm nguyên tắc phân tách ranh giới tập dữ liệu bất biến (Dataset Partitioning Invariant)** và thiếu vắng pipeline cách ly trạng thái huấn luyện.

---

## 6. Bài Học Then Chốt (Key Lesson)

> **BÀI HỌC CỐT LÕI:**
> Tập kiểm thử (`Test Split`) phải được đối xử như dữ liệu trong tương lai hoàn toàn chưa từng tồn tại trên Trái Đất.
> Tuyệt đối không bao giờ gọi phương thức `.fit()` (hoặc bất kỳ hàm nào trích xuất thống kê từ dữ liệu) trên tập dữ liệu chưa được phân tách. Mọi phép biến đổi phải được học DUY NHẤT trên `X_train`, sau đó áp dụng thụ động (`.transform()`) lên `X_val` và `X_test`.

---

## 7. Nguyên Lý Khái Quát Hóa (Generalizable Principle)

- **Nguyên Lý Tường Lửa Phân Tách Dữ Liệu (The Train-Test Firewall Principle):**
  - Bất kỳ tham số tiền xử lý nào (Mean, Variance, Min, Max, Quantiles, Vocabulary, Imputation Medians, Outlier Thresholds) đều là **trọng số được học (Learned Parameters)**.
  - Đã là tham số được học, chúng chỉ được phép trích xuất từ dữ liệu huấn luyện (`Train Split`). Việc để dữ liệu kiểm thử chạm vào bước `.fit()` tương đương với hành vi "gian lận đề thi" trong khoa học.
  - Mọi quy trình tiền xử lý phải được đóng gói bên trong một đối tượng `Pipeline` duy nhất (ví dụ: `sklearn.pipeline.Pipeline`), nơi việc phân tách dữ liệu diễn ra ở tầng ngoài cùng.

```python
# GIẢI PHÁP ĐÚNG ĐẮN VỀ MẶT KHOA HỌC
X_train, X_test, y_train, y_test = train_test_split(X_all, y_all, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)  # CHỈ HỌC TRÊN TRAIN!
X_test_scaled = scaler.transform(X_test)        # ÁP DỤNG THỤ ĐỘNG LÊN TEST
```

---

## 8. Phạm Vi Áp Dụng & Điều Kiện Kích Hoạt (Applicability)
- Áp dụng trong 100% các bài toán học máy (Bảng, Văn bản NLP, Thị giác máy tính CV, Xử lý chuỗi thời gian Time-Series).
- Đặc biệt nhạy cảm đối với Time-Series: Phân tách dữ liệu phải tôn trọng trục thời gian (Temporal Split), cấm tuyệt đối xáo trộn ngẫu nhiên (Random Shuffle).

---

## 9. Giới Hạn Của Bài Học (Limitations & Counter-Contexts)
- **Ngoại lệ:** Đối với các mô hình Foundation Models tự giám sát (Self-Supervised Pre-training), việc huấn luyện trên kho ngữ liệu khổng lồ không có nhãn là một giai đoạn riêng biệt; tuy nhiên, khi đánh giá downstream tasks trên một benchmark cụ thể, nguyên lý Firewall giữa train/test của benchmark đó vẫn bắt buộc phải được duy trì tuyệt đối.

---

## 10. Tri Thức & Tài Liệu Liên Quan
- `ERPF-CORE-PRIN-005` (Evidence-Based Reasoning)
- `ERPF-AI-DOM-011` (Dataset Analysis and Leakage Prevention)
- `ERPF-AI-WORK-004` (Quy trình lập kế hoạch và chạy thực nghiệm AI)
- `ERPF-TOOL-TMP-002` (Biểu mẫu kế hoạch đăng ký trước thực nghiệm)

---

## 11. Căn Cứ Thực Chứng
- Đối chiếu các lỗi thực nghiệm kinh điển được tổng kết trong tài liệu phương pháp luận AI tại [`erpf/ai-research/empirical-loop/dataset-analysis-and-leakage.md`](file:///home/longtran/Projects/rendez-web/erpf/ai-research/empirical-loop/dataset-analysis-and-leakage.md).
