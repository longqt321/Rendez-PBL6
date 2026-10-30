---
id: "ERPF-TOOL-TMP-025"
title: "Biểu Mẫu Báo Cáo Phân Tích Lỗi Thực Nghiệm AI/ML (Failure & Error Analysis Report Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "Diagnostic Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/evaluation-validation/failure-analysis-and-error-categorization.md"
related_concepts:
  - "ERPF-AI-DOM-023"
  - "ERPF-AI-WORK-006"
  - "ERPF-AI-SKILL-006"
applicable_contexts:
  - "Mổ xẻ nguyên nhân các ca dự đoán sai của mô hình học máy trên tập kiểm thử"
  - "Chuyển hóa phân loại lỗi 3 chiều (Data, Model, Evaluation) thành giả thuyết nghiên cứu tiếp theo"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "failure-analysis"
  - "error-categorization"
  - "tripartite-ontology"
  - "hypothesis-generation"
---

# Biểu Mẫu Báo Cáo Phân Tích Lỗi Thực Nghiệm AI/ML
# Failure & Error Analysis Report Template

---

## 1. Thông Tin Phân Tích (Analysis Metadata)
- **Mã Đợt Phân Tích:** `ERR-[MODEL_ID]-[DATASET]-[DATE]`
- **Tập Dữ Liệu & Quy Mô Mẫu Lỗi:** [Tổng số mẫu lỗi: X mẫu / Tỷ lệ lỗi tổng thể: Y%]
- **Quy Mô Kiểm Toán Mẫu Độc Lập:** [Tối thiểu 50 mẫu lỗi đại diện]
- **Người Thực Hiện:** [Tên tác giả / Agent]

---

## 2. Phân Tầng Lỗi Theo Khoảng Tin Cậy (Confidence-Based Error Stratification)

| Nhóm Lỗi (Error Tier) | Định Nghĩa Thao Tác | Số Lượng Mẫu | Tỷ Lệ / Tổng Lỗi | Mức Độ Nguy Hiểm |
| :--- | :--- | :---: | :---: | :--- |
| **High-Confidence False Positives** | Model tự tin $> 90\%$ nhưng nhãn thực tế là Âm tính | [X mẫu] | [A%] | **Cực cao (Ảo tưởng mô hình)** |
| **High-Confidence False Negatives** | Nhãn thực tế là Dương tính nhưng model gán xác suất $< 10\%$ | [Y mẫu] | [B%] | **Cao (Điểm mù nghiêm trọng)** |
| **Boundary Ambiguity Errors** | Xác suất dự đoán nằm trong khoảng tranh chấp $[0.45, 0.55]$ | [Z mẫu] | [C%] | **Trung bình (Thiếu biên độ phân tách)** |

---

## 3. Bản Thể Học Phân Loại Lỗi 3 Chiều (The Tripartite Error Breakdown - 50 Sample Audit)

```
[Tổng 50 Mẫu Lỗi Được Kiểm Tra]
├── Nhóm 1: Lỗi Xuất Phát Từ Dữ Liệu (Data-Related Errors): [A%]
│   ├── Nhãn bị gán sai trong benchmark (Label Noise): [X mẫu]
│   └── Mẫu nằm ngoài phân phối huấn luyện (Out-of-Distribution): [Y mẫu]
├── Nhóm 2: Khuyết Tật Bản Chất Của Mô Hình (Model-Related Defects): [B%]
│   ├── Thiếu hụt Inductive Bias (ví dụ: không nắm bắt được quan hệ xa): [Z mẫu]
│   └── Học đường tắt ngẫu nhiên (Shortcut Learning): [W mẫu]
└── Nhóm 3: Sai Lệch Từ Giao Thức Đánh Giá (Evaluation-Related Flaws): [C%]
    └── Ngưỡng quyết định threshold $\tau$ bị lệch so với tỷ lệ phân phối: [K mẫu]
```

---

## 4. Nghiên Cứu Điển Hình Định Tính (Qualitative Case Studies)
*Trình bày ít nhất 2 ca lỗi điển hình có kèm hình ảnh/văn bản và phân tích bản đồ quy kết (Attribution map):*

### Ca Lỗi Điển Hình 1: [Tiêu đề ca lỗi, ví dụ: Nhầm lẫn giữa Cafe và Bakery]
- **Dữ liệu đầu vào:** [Mô tả mẫu]
- **Ground Truth:** [`bakery`] | **Model Dự Đoán:** [`cafe` (Confidence: 94.2%)]
- **Phân tích bản đồ chú ý (Grad-CAM):** [Mô hình tập trung 100% vào máy pha cà phê ở tiền cảnh, bỏ qua tủ bánh ngọt ở hậu cảnh]
- **Kết luận cơ chế:** [Lỗi thuộc Nhóm 2 (Model Defect): Thiếu cơ chế Multi-Scale Feature Pyramid để thu thập đặc trưng hậu cảnh phân tán]

---

## 5. Chuyển Hóa Lỗi Thành Giả Thuyết Nghiên Cứu Tiếp Theo (Next-Cycle Hypothesis Generation)
*Từ nhóm lỗi hệ thống lớn nhất được phát hiện ở trên, xây dựng giả thuyết khoa học mới cho vòng nghiên cứu kế tiếp (`ERPF-AI-SKILL-002`):*

> **Giả thuyết khoa học mới:**
> *NẾU [Đưa cơ chế X vào kiến trúc], THÌ [Sẽ giảm thiểu Y% số lượng lỗi trong lát cắt Z], BỞI VÌ [Cơ sở lý thuyết giải quyết đúng cơ chế thất bại đã quan sát].*
