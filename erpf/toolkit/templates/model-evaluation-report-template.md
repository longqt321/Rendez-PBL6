---
id: "ERPF-TOOL-TMP-023"
title: "Biểu Mẫu Báo Cáo Thẩm Định & Đánh Giá Mô Hình AI/ML (Model Evaluation Report Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "Validation Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/evaluation-validation/model-evaluation-and-benchmarks.md"
related_concepts:
  - "ERPF-AI-DOM-021"
  - "ERPF-AI-WORK-005"
  - "ERPF-AI-SKILL-004"
applicable_contexts:
  - "Báo cáo tổng hợp thẩm định mô hình trước khi triển khai hoặc công bố bài báo"
  - "Đánh giá chi tiết đa chiều: Bootstrap CI, lát cắt dữ liệu, và kiểm toán kháng học đường tắt"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "evaluation-report"
  - "bootstrap-ci"
  - "slice-analysis"
  - "clever-hans-audit"
---

# Biểu Mẫu Báo Cáo Thẩm Định & Đánh Giá Mô Hình AI/ML
# Model Evaluation & Validation Report Template

---

## 1. Thông Tin Đánh Giá (Evaluation Metadata)
- **Tên Mô Hình & Phiên Bản Checkpoint:** [Tên mô hình + Checkpoint SHA-256]
- **Tập Dữ Liệu Kiểm Thử (Benchmark Test Set):** [Tên dataset, kích thước N mẫu, tỷ lệ phân phối nhãn]
- **Người / Agent Thực Hiện Đánh Giá:** [Tên]
- **Ngày Thẩm Định:** [YYYY-MM-DD]

---

## 2. Bảng So Sánh Chỉ Số Tổng Hợp Với Baselines (Benchmark Summary Table)

*Bắt buộc báo cáo trung bình và khoảng tin cậy 95% Bootstrap Confidence Intervals (1.000 folds):*

| Mô Hình | Số Tham Số (Params) | FLOPs (G) | Thước Đo Chính (Primary) [95% CI] | Thước Đo Phụ (Secondary) | Calibration Error (ECE) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline 1 (Standard)** | 25.5M | 4.1G | 78.2% [77.5%, 78.9%] | 72.1% | 0.12 |
| **Baseline 2 (SOTA)** | 26.0M | 4.3G | 81.4% [80.6%, 82.2%] | 76.5% | 0.08 |
| **Mô Hình Đề Xuất (Ours)**| **25.8M** | **4.2G** | **84.6% [83.9%, 85.3%]** | **80.2%** | **0.03** |

---

## 3. Phân Tích Hiệu Năng Theo Lát Cắt Dữ Liệu (Slice-Based Performance Breakdown)

*Kiểm tra hiện tượng nghịch lý Simpson và các điểm mù trên tập dữ liệu con:*

| Lát Cắt Dữ Liệu (Data Slice) | Số Lượng Mẫu | Hiệu Năng Baseline SOTA | Hiệu Năng Mô Hình Đề Xuất | Nhận Xét Đánh Giá |
| :--- | :---: | :---: | :---: | :--- |
| **Lớp phổ biến (Head Classes)** | 8.000 | 88.5% | 89.1% (+0.6%) | Cân bằng |
| **Lớp hiếm (Tail Classes)** | 2.000 | 52.4% | **66.8% (+14.4%)** | **Cải thiện vượt bậc** |
| **Độ dài chuỗi dài ($L > 512$)** | 1.500 | 71.0% | 76.2% (+5.2%) | Ổn định |

---

## 4. Kiểm Toán Kháng Học Đường Tắt & Hiện Tượng Clever Hans (Robustness & OOD Audit)
- **Đánh giá trên tập dữ liệu ngoài phân phối (OOD Benchmark):** [Số liệu thực nghiệm trên tập dữ liệu từ nguồn độc lập]
- **Thanh tra bản đồ quy kết (Attribution / Saliency Inspection):** [Mô tả vùng trọng tâm chú ý của mô hình qua Grad-CAM/SHAP, xác nhận không phụ thuộc vào watermark hay viền ảnh]
- **Thực nghiệm nhiễu loạn phản nghiệm (Counterfactual Perturbation):** [Kết quả khi bôi đen vùng quan tâm hoặc xóa bối cảnh nền]

---

## 5. Kết Luận Khoa Học & Khuyến Nghị Sử Dụng (Scientific Verdict)
- **Kết luận:** [Khẳng định mô hình có đạt tiêu chuẩn chất lượng và bảo toàn tính khái quát hóa không]
- **Khuyến nghị vận hành & Giới hạn:** [Các điều kiện mà mô hình chưa sẵn sàng hoạt động an toàn]
