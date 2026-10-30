---
id: "ERPF-TOOL-TMP-002"
title: "Biểu Mẫu Kế Hoạch Đăng Ký Trước Thực Nghiệm AI/ML (Pre-Registration AI/ML Experiment Plan Template)"
version: "1.0.0"
category: "RES"
track: "AI"
concept_type: "TMP"
intended_audience:
  - "AI/ML Researchers"
  - "Software Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/ai-research/empirical-loop/experimental-design-and-baselines.md"
  - "ERPF/ai-research/empirical-loop/dataset-analysis-and-leakage.md"
related_concepts:
  - "ERPF-AI-DOM-010"
  - "ERPF-AI-DOM-012"
  - "ERPF-AI-DOM-014"
applicable_contexts:
  - "Lập kế hoạch và đăng ký trước (Pre-registration) các thực nghiệm Machine Learning lớn"
  - "Bảo vệ tính khách quan khoa học, chống hiện tượng p-hacking và HARKing"
  - "Ước lượng và phê duyệt ngân sách tính toán (GPU compute budget) trước khi chạy"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "experiment-plan"
  - "pre-registration"
  - "empirical-loop"
  - "scientific-method"
---

# Biểu Mẫu Kế Hoạch Đăng Ký Trước Thực Nghiệm AI/ML
# Pre-Registration AI/ML Experiment Plan Template

---

## 1. Thông Tin Định Danh Thực Nghiệm (Experiment Metadata)

- **Mã thực nghiệm (Experiment ID):** `EXP-[YYYYMMDD]-[TÊN_RÚT_GỌN]`
- **Nhà nghiên cứu / Agent:** [Tên người thực hiện hoặc Agent Conversation ID]
- **Ngày lập kế hoạch:** YYYY-MM-DD
- **Trạng thái:** `[Draft | Approved | Running | Completed | Abandoned]`
- **Git Commit SHA (Bắt đầu):** `[Mã băm commit của mã nguồn đã được commit sạch]`
- **Đường dẫn tệp cấu hình (Config File):** `configs/[tên_tệp].yaml`

---

## 2. Mục Tiêu Khoa Học & Giả Thuyết Khả Bác (Hypothesis & Objective)

### 2.1. Câu Hỏi Nghiên Cứu Cốt Lõi (Research Question)
[Nêu rõ câu hỏi học thuật mà thực nghiệm này nhằm mục đích trả lời. Ví dụ: *Liệu việc bổ sung embedding thời gian vào Cross-Attention có cải thiện độ chính xác truy xuất ảnh theo bầu không khí hay không?*]

### 2.2. Giả Thuyết Khả Bác (Falsifiable Hypothesis)
- **Giả thuyết đối ($H_1$):** [Nếu can thiệp biến độc lập $X$, thì chỉ số $Y$ sẽ tăng ít nhất $Z\%$ trên tập kiểm thử.]
- **Giả thuyết không ($H_0$):** [Can thiệp biến $X$ không tạo ra sự khác biệt có ý nghĩa thống kê so với Baseline ($p \ge 0.05$).]
- **Tiêu chí bác bỏ dứt khoát (Falsification Criteria):** [Kết quả nào sẽ chứng minh giả thuyết $H_1$ là SAI? Ví dụ: *Nếu điểm nDCG@10 tăng dưới 2% hoặc độ trễ suy luận tăng quá 50ms, giả thuyết coi như bị bác bỏ.*]

---

## 3. Bản Đồ Biến Số Thực Nghiệm (Variables Mapping)

| Loại Biến Số | Tên Biến | Giá Trị Thử Nghiệm / Quy Chuẩn | Cơ Chế Kiểm Soát |
|---|---|---|---|
| **Biến Độc Lập (IV)** | [Tên yếu tố chủ động thay đổi] | `[Phương án A vs Phương án B]` | Cấu hình qua tệp config YAML |
| **Biến Phụ Thuộc (DV)** | [Chỉ số đo lường kết quả] | `[nDCG@10, MRR, VRAM, Latency]` | Đo lường tự động trên tập Test |
| **Biến Được Kiểm Soát (CV)** | Dataset, Backbone, Optimizer, Epochs | Cố định hoàn toàn giữa các lần chạy | Dùng chung một DataLoader và Trainer |
| **Biến Gây Nhiễu (Confounder)**| Random Seed, Hardware Throttling | Chạy trên 5 hạt giống: `[42, 1337, 2026, 8888, 9999]` | Báo cáo Mean $\pm$ Std và kiểm định Paired t-test |

---

## 4. Danh Mục Kiểm Tra An Toàn Dữ Liệu (Data Integrity & Leakage Checklist)

Trước khi chạy, tích chọn xác nhận các biện pháp phòng ngừa rò rỉ:
- [ ] **Data Provenance:** Dữ liệu có nguồn gốc rõ ràng, đã loại bỏ trùng lặp bằng Perceptual Hash (`pHash`).
- [ ] **Leakage-Free Splitting:** Phân tách tập Train/Val/Test theo nhóm thực thể độc lập (Group-aware Split), không có rò rỉ giữa các thực thể.
- [ ] **Preprocessing Isolation:** Mọi phép tính toán thống kê (Mean, Std, Scaler, Vocabulary) chỉ được `fit` trên tập Train; tuyệt đối không `fit` trên tập Val/Test.
- [ ] **Test Set Sealing:** Tập Test đã được niêm phong trong thư mục chỉ đọc, không được mở ra cho đến khi mô hình hoàn tất huấn luyện trên Val set.

---

## 5. Quy Chuẩn Baseline & Tính Công Bằng (Fair Baseline Specification)

- **Mô hình Baseline được chọn:** [Tên mô hình và trích dẫn bài báo gốc]
- **Kiểm chứng khớp tham số (Parameter-matched):** Mô hình đề xuất có `[X]` triệu tham số; Baseline có `[Y]` triệu tham số (Chênh lệch $\le 10\%$).
- **Kiểm chứng khớp tính toán (Compute-matched):** Cả hai mô hình đều được huấn luyện trong `[Z]` epochs trên cùng một số lượng samples.
- **Ngân sách tinh chỉnh siêu tham số:** Cả hai mô hình đều được cấp `[N]` lần chạy thử nghiệm tìm kiếm siêu tham số tương đương nhau.

---

## 6. Ma Trận Các Lần Chạy Thí Nghiệm & Bóc Tách (Experimental Run Matrix)

| Run ID | Tên Cấu Hình / Biến Thể | Mô Tả Thành Phần Độc Lập | Hạt Giống (Seeds) | Mục Đích So Sánh |
|---|---|---|---|---|
| `RUN-01` | `baseline_standard` | Mô hình cơ sở nguyên bản | 42, 1337, 2026 | Xác lập mốc so sánh (Baseline) |
| `RUN-02` | `ablation_component_A` | Baseline + Chỉ thêm Thành phần A | 42, 1337, 2026 | Đo lường tác động độc lập của A |
| `RUN-03` | `ablation_component_B` | Baseline + Chỉ thêm Thành phần B | 42, 1337, 2026 | Đo lường tác động độc lập của B |
| `RUN-04` | `full_proposed_model` | Baseline + Cả Thành phần A và B | 42, 1337, 2026 | Đo lường sự cộng hưởng của toàn bộ hệ thống |

---

## 7. Ước Tính Ngân Sách Tài Nguyên (Resource & Compute Budget)

- **Phần cứng sử dụng:** `[Số lượng GPU] x [Model GPU, vd: 1x NVIDIA RTX 4090 24GB]`
- **Thời gian chạy ước tính mỗi run:** `[Số giờ]`
- **Tổng số runs dự kiến:** `[Số runs] x [Số seeds] = [Tổng lần chạy]`
- **Tổng ngân sách GPU-giờ (Compute Budget):** `[Tổng số giờ GPU cần dùng]`
- **Dung lượng lưu trữ Checkpoint & Logs:** `[Số GB đĩa cứng cần thiết]`

---

## 8. Kết Quả & Phân Tích Hậu Thực Nghiệm (Post-Experiment Analysis)

*(Phần này được điền sau khi thực nghiệm đã hoàn tất)*

### 8.1. Bảng Kết Quả Thực Nghiệm Chính Thức
| Cấu Hình | Điểm Trung Bình $\pm$ Độ Lệch Chuẩn | Khoảng Tin Cậy 95% (Bootstrap CI) | Giá Trị $p$ (So với Baseline) | Ý Nghĩa Thống Kê? |
|---|:---:|:---:|:---:|:---:|
| `RUN-01 (Baseline)` | ... | [...] | — | — |
| `RUN-04 (Proposed)` | ... | [...] | $p = ...$ | [Có / Không] |

### 8.2. Kết Luận Khoa Học
- [ ] **Giả thuyết $H_1$ ĐƯỢC CHẤP NHẬN:** Kết quả vượt ngưỡng ý nghĩa thống kê và đạt tiêu chí định lượng.
- [ ] **Giả thuyết $H_1$ BỊ BÁC BỎ:** Dữ liệu thực nghiệm bác bỏ giả thuyết (Ghi nhận trung thực kết quả Negative Result).
- **Bài học rút ra & Hướng đi tiếp theo:** [Tóm tắt 1-2 đoạn phân tích nguyên nhân vật lý/toán học của kết quả].
