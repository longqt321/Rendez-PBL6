---
id: "ERPF-TOOL-TMP-024"
title: "Biểu Mẫu Báo Cáo Nghiên Cứu Bóc Tách Thực Nghiệm AI/ML (Ablation Study Report Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "Research Scientists"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/evaluation-validation/ablation-studies-and-attribution.md"
related_concepts:
  - "ERPF-AI-DOM-022"
  - "ERPF-AI-WORK-006"
  - "ERPF-AI-SKILL-005"
applicable_contexts:
  - "Báo cáo bóc tách các thành phần kiến trúc và hàm mất mát trong bài báo khoa học"
  - "Cô lập quan hệ nhân quả và chứng minh tính cần thiết / đầy đủ của từng đề xuất mới"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "ablation-study"
  - "causal-attribution"
  - "leave-one-out"
  - "synergy"
---

# Biểu Mẫu Báo Cáo Nghiên Cứu Bóc Tách Thực Nghiệm AI/ML
# Ablation Study & Attribution Report Template

---

## 1. Thông Tin Bóc Tách (Ablation Metadata)
- **Tên Mô Hình Nghiên Cứu:** [Tên mô hình hoàn chỉnh]
- **Tập Dữ Liệu Thực Nghiệm:** [Tên benchmark, số seed kiểm thử $\ge 3$]
- **Giao Thức Bóc Tách Chính:** [Leave-One-Out (Kiểm tra tính cần thiết) / Add-One-In (Kiểm tra tính đầy đủ)]

---

## 2. Bảng Phân Tách Thành Phần Đạt Chuẩn IEEE/ACM (Standard Ablation Matrix)

| Biến Thể (Variant) | Thành Phần $C_1$ [Tên] | Thành Phần $C_2$ [Tên] | Thành Phần $C_3$ [Tên] | Hàm Loss $\mathcal{L}_{\text{aux}}$ | Dung Lượng (Params) | Thước Đo Chính ($\text{mean} \pm \text{std}$) | Mức Đóng Góp ($\Delta$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Baseline Gốc** | $-$ | $-$ | $-$ | $-$ | 22.0M | $70.2 \pm 0.4\%$ | (Gốc) |
| **2. Thêm $C_1$** | $\checkmark$ | $-$ | $-$ | $-$ | 24.5M | $73.1 \pm 0.5\%$ | $+2.9\%$ |
| **3. Thêm $C_2$** | $-$ | $\checkmark$ | $-$ | $-$ | 23.0M | $72.4 \pm 0.3\%$ | $+2.2\%$ |
| **4. Mô Hình Đầy Đủ**| $\mathbf{\checkmark}$ | $\mathbf{\checkmark}$ | $\mathbf{\checkmark}$ | $\mathbf{\checkmark}$ | **28.2M** | $\mathbf{78.5 \pm 0.4\%}$ | **$\mathbf{+8.3\%}$** |
| **5. Đối Chứng Capacity**| $-$ (Mở rộng) | $-$ (Mở rộng) | $-$ | $-$ | 28.5M | $71.8 \pm 0.6\%$ | $+1.6\%$ |
| **6. Bỏ $C_1$ (Leave-1-Out)**| $-$ | $\checkmark$ | $\checkmark$ | $\checkmark$ | 25.7M | $74.2 \pm 0.5\%$ | $-4.3\%$ |

---

## 3. Phân Tích Quy Kết Nhân Quả & Loại Trừ Confounding (Causal Attribution Analysis)
- **Chứng minh giá trị của Inductive Bias vs Dung lượng (Capacity Control):**
  [So sánh Biến thể 4 với Biến thể 5 cho thấy khi mở rộng baseline cùng đạt 28.5M params, điểm số chỉ tăng +1.6%, trong khi mô hình đề xuất tăng +8.3%. Chứng minh đóng góp thực sự đến từ cơ chế kiến trúc chứ không phải do tăng tham số.]
- **Phân tích tương tác phi tuyến (Synergy / Cancellation):**
  [Tính toán hệ số tương tác giữa $C_1$ và $C_2$: $\Delta_{\text{synergy}} = \text{Gain}(C_1 \cup C_2) - [\text{Gain}(C_1) + \text{Gain}(C_2)] = 5.8\% - 5.1\% = +0.7\%$. Xác nhận hiệu ứng cộng hưởng dương.]

---

## 4. Nhận Diện Thành Phần Thừa & Khuyến Nghị Cắt Tỉa (Dead-Weight Pruning)
- **Thành phần không đóng góp:** [Chỉ rõ nếu có thành phần nào trong quá trình bóc tách cho thấy mức đóng góp $< 0.1\%$ hoặc nằm trong phạm vi sai số ngẫu nhiên]
- **Quyết định cắt tỉa:** [Khuyến nghị loại bỏ thành phần đó khỏi kiến trúc chính theo nguyên lý `ERPF-CORE-PRIN-008`]
