---
id: "ERPF-AI-WORK-004"
title: "Quy Trình Lập Kế Hoạch & Thực Thi Thí Nghiệm AI (AI Experiment Planning & Disciplined Execution Workflow)"
version: "1.0.0"
category: "RES"
track: "AI"
concept_type: "WORK"
intended_audience:
  - "AI/ML Researchers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/foundation/competencies.md"
  - "ERPF/ai-research/empirical-loop/experimental-design-and-baselines.md"
  - "ERPF/ai-research/empirical-loop/experiment-management-and-implementation.md"
related_concepts:
  - "ERPF-AI-DOM-012"
  - "ERPF-AI-DOM-014"
  - "ERPF-TOOL-TMP-002"
applicable_contexts:
  - "Lập kế hoạch đăng ký trước (Pre-registration) các chiến dịch thực nghiệm ML/DL"
  - "Kiểm soát tính kỷ luật khi chạy huấn luyện mô hình đa hạt giống ngẫu nhiên"
  - "Quản lý tài nguyên GPU, ghi log số liệu bất biến và lưu trữ Checkpoint nguyên tử"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "workflow"
  - "experiment-planning"
  - "pre-registration"
  - "training-execution"
  - "multi-seed"
  - "checkpoint-management"
---

# Quy Trình Lập Kế Hoạch & Thực Thi Thí Nghiệm AI
# AI Experiment Planning & Disciplined Execution Workflow

---

## 1. Mục Đích (Purpose)
Quy trình này hướng dẫn nhà nghiên cứu và AI Research Agent thực hiện các chiến dịch huấn luyện mô hình học máy theo **quy trình đăng ký trước có kỷ luật (Pre-registration)**: Lập kế hoạch chi tiết trước khi tiêu tốn tài nguyên GPU, khóa chặt rò rỉ dữ liệu, cố định cấu hình bất biến, chạy đa hạt giống ngẫu nhiên và lưu trữ tạo tác có khả năng tái lập 100%.

---

## 2. Điều Kiện Tiên Quyết (Preconditions)
- Giả thuyết khoa học đã được phê duyệt theo [`problem-hypothesis-formulation.md`](file:///home/longtran/Projects/rendez-web/erpf/workflows/ai-research/problem-hypothesis-formulation.md).
- Tập dữ liệu đã được làm sạch, kiểm tra nhãn và phân tách an toàn (Group-aware split).
- Mã nguồn đã được commit sạch sẽ trong Git (Clean Git tree).

---

## 3. Dữ Liệu Đầu Vào (Inputs)
- Tệp cấu hình thực nghiệm hoàn chỉnh (`config.yaml`).
- Tập dữ liệu đã niêm phong và script huấn luyện mô-đun hóa.

---

## 4. Kết Quả Đầu Ra Kỳ Vọng (Expected Outputs)
- **Kế hoạch Thực nghiệm Đã Đăng Ký (Approved Experiment Plan):** Theo mẫu chuẩn [`experiment-plan-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-plan-template.md).
- Thư mục kết quả chứa: Tệp config bất biến, tệp log sự kiện (TensorBoard/JSON), tệp checkpoint tốt nhất (`checkpoint_best.pt`), và bảng kết quả chạy trên ít nhất 3–5 seeds ngẫu nhiên.

---

## 5. Các Giai Đoạn Chính (Main Stages)

```mermaid
graph TD
    S1["1. Đăng Ký Trước Kế Hoạch Thực Nghiệm<br/><i>Điền biểu mẫu experiment-plan-template.md</i>"] --> S2["2. Đóng Băng Cấu Hình & Chụp Git Commit<br/><i>Lưu config.yaml bất biến kèm Git Commit SHA</i>"]
    S2 --> S3["3. Chạy Sanity Check (Overfit 1 Batch)<br/><i>Ép overfit 8 mẫu trong 100 steps; Loss phải về 0</i>"]
    S3 --> GateSanity{"Sanity Check Pass?"}

    GateSanity -->|Fail (Có Bug)| DebugCode["Sửa Code Logic / Tensor Shapes"]
    GateSanity -->|Pass| S4["4. Thực Thi Huấn Luyện Đa Hạt Giống (Multi-Seed)<br/><i>Chạy lần lượt trên Seed 42, 1337, 2026, ...</i>"]

    S4 --> S5["5. Giám Sát Tài Nguyên & Lưu Checkpoint Nguyên Tử<br/><i>Theo dõi VRAM, Gradient norm, Early stopping</i>"]
    S5 --> S6["6. Đóng Gói Tạo Tác & Báo Cáo Mean ± Std<br/><i>Lưu tệp kết quả, không mở hòm Test Set</i>"]
```

### Chi Tiết Từng Giai Đoạn:
- **GĐ 1: Đăng ký trước:** Điền đầy đủ các biến số và tiêu chí bác bỏ; không chạy thử nghiệm khi chưa có kế hoạch (xem [`experiment-plan-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-plan-template.md)).
- **GĐ 2: Đóng băng cấu hình:** Copy tệp YAML cấu hình vào thư mục kết quả; ghi nhận mã băm Git.
- **GĐ 3: Sanity Check:** Chạy thử nghiệm trên 1 batch nhỏ; kiểm tra gradient có lan truyền đúng không (xem [`experiment-management-and-implementation.md`](file:///home/longtran/Projects/rendez-web/erpf/ai-research/empirical-loop/experiment-management-and-implementation.md)).
- **GĐ 4: Huấn luyện đa hạt giống:** Chạy tối thiểu 3 đến 5 seeds; cấm dừng lại ở 1 seed duy nhất.
- **GĐ 5: Lưu Checkpoint nguyên tử:** Sử dụng cơ chế ghi tệp tạm rồi đổi tên nguyên tử (`save_checkpoint_atomic`) để chống hỏng file checkpoint khi mất điện hoặc preempt.
- **GĐ 6: Đóng gói:** Đánh giá trên tập Validation; ghi nhận điểm trung bình và độ lệch chuẩn.

---

## 6. Điểm Ra Quyết Định Rẽ Nhánh (Decision Points & Professional Judgment)

- **Điểm rẽ 1: Khi nào kích hoạt Dừng Sớm (Early Stopping)?**
  - Nếu điểm số trên tập Validation không cải thiện sau `patience = 10` epochs liên tiếp: Dừng huấn luyện ngay lập tức để tiết kiệm điện năng và tài nguyên GPU.
- **Điểm rẽ 2: Mô hình bị ném lỗi `Loss: NaN` ở epoch thứ 15:**
  - Không khởi động lại mù quáng! Kiểm tra ngay: (1) Gradient clipping có hoạt động không? (2) Learning rate có quá lớn? (3) Dữ liệu có chứa giá trị ngoại lai cực đoan (Zero/Inf) không?

---

## 7. Phương Pháp & Kỹ Thuật Áp Dụng (Methods & Techniques)
- Kỹ thuật Đăng ký trước thực nghiệm (Pre-Registration Protocol).
- Cố định hạt giống ngẫu nhiên đa thư viện (`seed_everything`).
- Quản lý Checkpoint nguyên tử (Atomic Checkpoint Saving).
- Kiểm tra quá khớp trên 1 batch (Overfit Single Batch Sanity Check).

---

## 8. Các Dạng Thất Bại & Sai Lầm Thường Gặp (Common Failure Modes)
- **Mở tập Test để chọn siêu tham số:** Đánh giá trên tập test sau mỗi epoch rồi chọn checkpoint có điểm test cao nhất (Rò rỉ tập test nghiêm trọng!).
- **Báo cáo kết quả của 1 hạt giống duy nhất:** Chỉ báo cáo seed may mắn nhất và giấu đi các seed thất bại.
- **Sửa file code trong lúc tiến trình nền đang chạy:** Làm cho nửa sau của quá trình huấn luyện nạp code mới, phá hỏng tính toàn vẹn của thực nghiệm.

---

## 9. Cổng Kiểm Soát Chất Lượng (Quality Checkpoints)
- [ ] Tệp kế hoạch thực nghiệm được ký duyệt trước khi khởi chạy.
- [ ] Đã vượt qua bài Sanity Check trên 1 batch dữ liệu nhỏ.
- [ ] Toàn bộ các lần chạy đều sử dụng cấu hình YAML bất biến được lưu vết.
- [ ] Checkpoint tốt nhất được lựa chọn thuần túy dựa trên chỉ số của tập Validation.

---

## 10. Lộ Trình Thay Thế / Thoát Hiểm (Alternative Paths)
- Nếu quá trình huấn luyện gặp lỗi tràn bộ nhớ (CUDA Out of Memory): **Giảm batch size xuống một nửa và kích hoạt Gradient Accumulation** để giữ nguyên kích thước batch hiệu dụng mà không làm thay đổi động lực học toán học của mô hình.

---

## 11. Nguyên Lý & Năng Lực Liên Quan
- **Nguyên lý cốt lõi:** Evidence-Based Reasoning, Reproducibility, Systems Thinking (`ERPF-CORE-PRIN-001`).
- **Năng lực áp dụng:** C7 (Planning & Prioritization), C6 (Systems Thinking), C2 (Analytical Reasoning).
