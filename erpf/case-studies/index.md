---
id: "ERPF-CORE-CASE-000"
title: "Chỉ Mục Thư Viện Nghiên Cứu Điển Hình Kỹ Thuật & Nghiên Cứu (Case Studies Master Index)"
version: "1.0.0"
category: "GOV"
track: "CORE"
concept_type: "DOM"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "System Architects"
  - "AI Agents"
prerequisites:
  - "ERPF/PROJECT_CHARTER.md"
  - "ERPF/KNOWLEDGE_ARCHITECTURE.md"
  - "ERPF/foundation/philosophy.md"
  - "ERPF/foundation/core-principles.md"
related_concepts:
  - "ERPF-TOOL-TMP-005"
  - "ERPF-CORE-PRIN-007"
  - "ERPF-CORE-WORK-002"
applicable_contexts:
  - "Tra cứu các nghiên cứu điển hình thực chứng và tình huống sư phạm giả định trong ERPF"
  - "Học hỏi phương pháp phân tích đánh đổi đa chiều khi đưa ra quyết định kiến trúc lớn"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "index"
  - "case-studies"
  - "architecture"
  - "trade-offs"
---

# Thư Viện Nghiên Cứu Điển Hình Kỹ Thuật & Nghiên Cứu
# Case Studies Master Index

---

## 1. Mục Đích & Tiêu Chuẩn Minh Bạch (Purpose & Transparency)

Thư viện Nghiên cứu Điển hình (*Case Studies Library*) trong ERPF cung cấp các phân tích mổ xẻ toàn diện về các bài toán kỹ thuật phức tạp, các ngã rẽ kiến trúc quan trọng, và các quyết định đánh đổi đa biến trong thế giới thực cũng như trong các tình huống đào tạo chuyên sâu.

Nhằm bảo đảm tính liêm chính trí tuệ (*Intellectual Honesty*) theo `ERPF-CORE-PRIN-001`:
- **Tình huống thực chứng (Verified Empirical Cases):** Bắt buộc phải có mã nguồn, nhật ký vận hành hoặc số liệu thực nghiệm đối chiếu trong hệ thống.
- **Tình huống giả định sư phạm (Pedagogical Hypothetical Scenarios):** Bắt buộc phải được dán nhãn minh bạch ngay tại tiêu đề và phần metadata: `[Tình Huống Giả Định Điển Hình / Standard Pedagogical Hypothetical Case]`. Tuyệt đối không ngụy tạo kết quả thực tế như một sự kiện có thật.

---

## 2. Cấu Trúc Quy Chuẩn Của Nghiên Cứu Điển Hình

Mọi case study trong thư viện đều tuân thủ biểu mẫu [`erpf/toolkit/templates/case-study-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/case-study-template.md) (`ERPF-TOOL-TMP-005`), gồm 10 phần:
1. **Bối Cảnh (Background)**
2. **Mục Tiêu (Objectives)**
3. **Các Ràng Buộc Hệ Thống (Constraints)**
4. **Hiện Trạng Kỹ Thuật (Technical Context)**
5. **Các Phương Án Cạnh Tranh (Competing Approaches)**
6. **Phân Tích & Đánh Đổi Kỹ Thuật (Analysis and Trade-offs)**
7. **Cơ Sở Ra Quyết Định (Decision Rationale)**
8. **Kết Quả Thực Tế / Kết Quả Kỳ Vọng (Outcome or Expected Outcome)**
9. **Các Giới Hạn Còn Tồn Đọng (Limitations)**
10. **Bài Học Chuyển Giao (Transferable Lessons)**

---

## 3. Danh Mục Các Nghiên Cứu Điển Hình Hiện Có

| Mã Case Study | Tiêu Đề | Phân Loại | Lĩnh Vực / Chủ Đề |
| :--- | :--- | :--- | :--- |
| [`ERPF-SE-CASE-001`](file:///home/longtran/Projects/rendez-web/erpf/case-studies/cs-001-intervention-level-excel-automation.md) | **Phân Tích Đánh Đổi Tự Động Hóa Dữ Liệu: Bài Toán 20 Tệp Bảng Tính & Nguyên Lý Lựa Chọn Tầng Can Thiệp Kỹ Thuật** | *Tình Huống Giả Định Điển Hình* | Software Architecture, Integration Levels, Automation Boundaries |

---

## 4. Hướng Dẫn Đóng Góp Case Study Mới

1. Sử dụng biểu mẫu chuẩn [`ERPF-TOOL-TMP-005`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/case-study-template.md).
2. Xác định rõ ràng loại hình tình huống (Empirical vs Hypothetical).
3. Không biến tự động hóa thành chủ đề trung tâm của mọi bài toán; tự động hóa chỉ là một trong nhiều giải pháp kỹ thuật cần được cân nhắc đánh đổi.
4. Đăng ký case study mới vào bảng danh mục tại tệp này và cập nhật [`erpf/PROJECT_STATE.md`](file:///home/longtran/Projects/rendez-web/erpf/PROJECT_STATE.md).
