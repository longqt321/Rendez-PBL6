---
id: "ERPF-TOOL-TMP-026"
title: "Biểu Mẫu Danh Mục Thẩm Định Khả Năng Tái Lập AI/ML (Reproducibility Checklist Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "Peer Reviewers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/evaluation-validation/reproducibility-and-provenance.md"
related_concepts:
  - "ERPF-AI-DOM-024"
  - "ERPF-AI-WORK-007"
  - "ERPF-AI-SKILL-007"
applicable_contexts:
  - "Tự kiểm toán mã nguồn và dữ liệu trước khi nộp bài vào các hội nghị hàng đầu (NeurIPS, ICML, ICLR)"
  - "Đánh giá mức độ tái lập độc lập của một bài báo khoa học đã xuất bản"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "reproducibility"
  - "neurips-checklist"
  - "provenance"
  - "artifact-audit"
---

# Biểu Mẫu Danh Mục Thẩm Định Khả Năng Tái Lập AI/ML
# ML Reproducibility Checklist & Audit Template

> **Tiêu chuẩn:** Biểu mẫu này được thiết kế tương thích hoàn toàn với NeurIPS / ICLR Machine Learning Reproducibility Checklist. Mọi câu trả lời "CÓ" bắt buộc phải đi kèm con trỏ trực tiếp đến số dòng trong mã nguồn hoặc vị trí trang/phần phụ lục trong bài báo.

---

## 1. Tính Toàn Vẹn Của Mô Hình & Thuật Toán (Model & Algorithmic Integrity)

- [ ] **M1.1: Đặc tả toán học hoàn chỉnh**
  - Mọi công thức toán học, hàm mất mát và hàm kích hoạt đều được định nghĩa rõ ràng không mơ hồ.
  - *Vị trí trong bài báo:* [Phần 3, Trang X, Phương trình (1)-(4)]
- [ ] **M1.2: Mã giả thuật toán (Pseudocode)**
  - Cung cấp mã giả chi tiết các bước huấn luyện và suy luận trong bài báo chính hoặc phụ lục.
  - *Vị trí trong bài báo:* [Phụ lục A, Thuật toán 1]
- [ ] **M1.3: Số lượng tham số và độ phức tạp tính toán**
  - Khai báo chính xác tổng số tham số (Trainable parameters) và số lượng phép tính FLOPs cho một lượt suy luận.
  - *Vị trí trong bài báo:* [Bảng 1, Cột Params / FLOPs]

---

## 2. Dữ Liệu & Ranh Giới Phân Tách (Datasets & Partitioning)

- [ ] **D2.1: Nguồn gốc và Giấy phép dữ liệu (Provenance & License)**
  - Nêu rõ nguồn thu thập dữ liệu, giấy phép bản quyền (MIT, CC-BY, v.v.), và xác nhận không vi phạm quyền riêng tư.
  - *Vị trí:* [Phần 4.1 hoặc file `DATA_LICENSE.md`]
- [ ] **D2.2: Tỷ lệ phân tách và Quy chuẩn bảo vệ ranh giới (Train-Test Firewall)**
  - Tỷ lệ Train/Validation/Test được công bố rõ ràng; xác nhận các bước tiền xử lý đặc trưng chỉ fit trên tập Train (`ERPF-AI-LESS-001`).
  - *Vị trí trong code:* [`src/data/split.py#L45-L60`]
- [ ] **D2.3: Bộ dữ liệu công khai hoặc Dữ liệu mẫu (Sample Dataset)**
  - Cung cấp liên kết tải bộ dữ liệu công khai hoặc cung cấp tệp dữ liệu mẫu giả lập (toy dataset) nếu dữ liệu gốc bị giới hạn.
  - *Liên kết:* [`https://huggingface.co/datasets/...` hoặc `data/sample/`]

---

## 3. Mã Nguồn & Môi Trường Thực Thi (Code & Environment)

- [ ] **E3.1: Đóng gói môi trường thực thi (Environment Manifest)**
  - Cung cấp tệp `requirements.txt`, `environment.yml` cố định phiên bản thư viện chính xác (pinned versions) hoặc `Dockerfile`.
  - *Vị trí tệp:* [`environment.yml` hoặc `Dockerfile`]
- [ ] **E3.2: Kiểm soát ngẫu nhiên & Tất định (Random Seeds & Determinism)**
  - Toàn bộ các hạt giống ngẫu nhiên (Python, NumPy, PyTorch, CUDA) đều được ghi nhận; cờ tất định được bật.
  - *Vị trí trong code:* [`src/utils/seed.py#L12`]
- [ ] **E3.3: Lệnh chạy tái lập bằng một câu lệnh duy nhất (One-Command Reproducibility)**
  - Có sẵn script chạy tự động tải dữ liệu mẫu, tải checkpoint và tái tạo chính xác Bảng 1 trong bài báo.
  - *Câu lệnh kiểm chứng:* `bash reproduce_table1.sh`

---

## 4. Báo Cáo Thực Nghiệm & Đo Lường Thống Kê (Empirical Results & Statistics)

- [ ] **R4.1: Đa hạt giống ngẫu nhiên (Multi-Seed Reporting)**
  - Mọi kết quả bảng biểu đều được báo cáo dưới dạng $\text{mean} \pm \text{std}$ của ít nhất 3 đến 5 random seeds độc lập.
  - *Vị trí trong bài báo:* [Bảng 1 & 2, ghi chú chân trang]
- [ ] **R4.2: Công bố siêu tham số đầy đủ (Hyperparameters Table)**
  - Bảng tra cứu toàn bộ siêu tham số (Learning rate, batch size, weight decay, warmup epochs, optimizer) cho mọi baseline và mô hình đề xuất.
  - *Vị trí:* [Phụ lục B, Bảng B.1]
- [ ] **R4.3: Công bố tài nguyên phần cứng & Điện năng (Compute Footprint)**
  - Báo cáo rõ loại GPU, số lượng GPU, tổng số giờ GPU tiêu tốn, và ước tính phát thải CO2.
  - *Vị trí:* [Phụ lục C: Compute Footprint]
