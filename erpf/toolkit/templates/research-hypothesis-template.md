---
id: "ERPF-TOOL-TMP-021"
title: "Biểu Mẫu Đặc Tả Giả Thuyết Khoa Học AI/ML (Research Hypothesis Specification Template)"
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
  - "ERPF/ai-research/methodology/hypothesis-development-and-methodology.md"
related_concepts:
  - "ERPF-CORE-PRIN-002"
  - "ERPF-AI-DOM-003"
  - "ERPF-AI-SKILL-002"
applicable_contexts:
  - "Đặc tả chi tiết giả thuyết khoa học trước khi triển khai mã nguồn thực nghiệm"
  - "Xác lập các biến thao tác hóa (Operational Variables) và điều kiện biên khả bác"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "hypothesis"
  - "operational-definitions"
  - "falsifiability"
  - "boundary-conditions"
---

# Biểu Mẫu Đặc Tả Giả Thuyết Khoa Học AI/ML
# Research Hypothesis Specification Template

---

## 1. Phát Biểu Giả Thuyết Chuẩn 3 Thành Phần (Hypothesis Statement)

> **Cấu trúc mệnh đề nhân quả:**
> **NẾU** [Can thiệp / Cơ chế đề xuất $X$],
> **THÌ** [Hiện tượng định lượng quan sát được $Y$],
> **BỞI VÌ** [Cơ sở lý thuyết / Động lực học biểu diễn $Z$].

- **Phát biểu cụ thể:** [Điền mệnh đề hoàn chỉnh]

---

## 2. Bảng Định Nghĩa Biến Thao Tác Hóa (Operational Definitions Table)

| Loại Biến | Tên Biến | Phương Pháp Định Lượng / Thao Tác Đo Lường |
| :--- | :--- | :--- |
| **Biến Độc Lập ($X$ - Can thiệp)** | [Tên cơ chế / module] | [Cách thức thay đổi: Bật/Tắt module, thay đổi hệ số $\lambda$, cấu hình lớp] |
| **Biến Phụ Thuộc ($Y$ - Kết quả)** | [Thước đo chính] | [Thước đo định lượng: mAP@0.5, PR-AUC, BLEU, hoặc độ dốc phổ Fourier] |
| **Biến Kiểm Soát ($Z$ - Cố định)** | [Dung lượng mô hình] | [Số lượng tham số $\pm 5\%$, cùng số epoch, cùng optimizer, cùng seed] |

---

## 3. Tiêu Chuẩn Bác Bỏ Theo Karl Popper (Falsification Criteria)
*Chỉ rõ các kết quả định lượng cụ thể mà nếu xảy ra, nhóm nghiên cứu bắt buộc phải thừa nhận giả thuyết bị SAI và BÁC BỎ:*

- [ ] **Tiêu chí bác bỏ 1:** Nếu mức cải thiện của biến phụ thuộc $Y$ so với baseline $< [\Delta_{\text{threshold}}]$ trên ít nhất 3 random seeds.
- [ ] **Tiêu chí bác bỏ 2:** Nếu khoảng tin cậy 95% Bootstrap của mô hình đề xuất chồng lấn $> 30\%$ với baseline.
- [ ] **Tiêu chí bác bỏ 3 (Kiểm tra cơ chế):** Nếu việc bóc tách thành phần $X$ không làm thay đổi chỉ số chẩn đoán nội bộ, chứng minh kết quả là do ngẫu nhiên.

---

## 4. Điều Kiện Biên & Dự Báo Vùng Thất Bại (Boundary Regime & Predicted Breakdown)
- **Vùng áp dụng dự kiến:** [Khoảng phân phối dữ liệu, tỷ lệ nhiễu, kích thước tập dữ liệu mà giả thuyết được dự đoán sẽ đúng]
- **Vùng thất bại dự báo trước:** [Các điều kiện cực đoan mà cơ chế đề xuất chắc chắn sẽ bị sụp đổ hoặc vô hiệu hóa]
