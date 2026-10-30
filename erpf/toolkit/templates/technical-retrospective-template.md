---
id: "ERPF-TOOL-TMP-015"
title: "Biểu Mẫu Cải Tiến Kỹ Thuật Định Kỳ (Technical Retrospective Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Engineering Teams"
  - "Technical Leads"
  - "Scrum Masters / Engineering Managers"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/philosophy.md"
  - "ERPF/workflows/software-engineering/software-development-lifecycle.md"
related_concepts:
  - "ERPF-CORE-COMP-010"
  - "ERPF-SE-WORK-001"
  - "ERPF-TOOL-TMP-004"
applicable_contexts:
  - "Đánh giá cải tiến quy trình kỹ thuật sau mỗi chu kỳ phát hành (Sprint / Milestone Retrospective)"
  - "Đo lường nợ kỹ thuật, chất lượng mã nguồn và độ ổn định của hạ tầng CI/CD"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "retrospective"
  - "continuous-learning"
  - "technical-debt"
  - "engineering-health"
---

# Biểu Mẫu Cải Tiến Kỹ Thuật Định Kỳ
# Technical Retrospective Template

---

## 1. Thông Tin Chu Kỳ (Milestone Metadata)
- **Chu Kỳ / Dự Án:** [Sprint X / Milestone Release Y]
- **Khoảng Thời Gian:** [YYYY-MM-DD đến YYYY-MM-DD]
- **Điều Phối Viên (Facilitator):** [Tên kỹ sư / Lead]
- **Thành Viên Tham Gia:** [Danh sách kỹ sư]

---

## 2. Đo Lường Chỉ Số Vận Hành Kỹ Thuật (Objective Engineering Metrics)

| Chỉ Số Đo Lường | Kỳ Trước | Kỳ Này | Xu Hướng | Nhận Xét Của Nhóm |
| :--- | :---: | :---: | :---: | :--- |
| **Tần suất triển khai (Deployment Frequency)** | [X lần/tuần] | [Y lần/tuần] | [↑ / ↓ / →] | |
| **Thời gian chạy CI/CD (Pipeline Duration)** | [X phút] | [Y phút] | [↑ / ↓ / →] | |
| **Tỷ lệ bài kiểm thử thất bại ngắt quãng (Flaky Rate)**| [X%] | [Y%] | [↑ / ↓ / →] | |
| **Số lượng sự cố production (P0/P1 Incidents)** | [X vụ] | [Y vụ] | [↑ / ↓ / →] | |
| **Tỷ lệ nợ kỹ thuật được giải quyết (Debt Paid)** | [X tickets] | [Y tickets]| [↑ / ↓ / →] | |

---

## 3. Ba Trục Đánh Giá Cốt Lõi (The 3 Core Retrospective Pillars)

### A. Những Gì Hoạt Động Rất Tốt (What Worked Well)
- [Điểm sáng 1: Tách biệt rõ ràng PR refactoring và PR tính năng giúp review nhanh hơn 40%]
- [Điểm sáng 2: ...]

### B. Những Điểm Nghẽn & Ma Sát Kỹ Thuật (What Caused Friction & Debt)
- [Điểm nghẽn 1: Thiết lập môi trường local cho các bài kiểm thử không gian PostGIS còn phức tạp]
- [Điểm nghẽn 2: ...]

### C. Những Giả Định Sai Lầm Bị Phát Hiện (False Assumptions Uncovered)
- [Giả định 1: Nhóm từng nghĩ thư viện X hỗ trợ async hoàn toàn, nhưng thực tế bị block luồng IO]
- [Giả định 2: ...]

---

## 4. Kế Hoạch Hành Động Kỹ Thuật Tiếp Theo (Concrete Action Items)

*Mỗi hành động phải có một chủ sở hữu duy nhất, gắn liền với một pull request hoặc ticket cụ thể:*

| Hành Động Kỹ Thuật Cụ Thể | Người Phụ Trách | Hạn Chót | Tiêu Chí Hoàn Thành (Definition of Done) |
| :--- | :--- | :--- | :--- |
| Tối ưu hóa bộ kiểm thử E2E | [Kỹ sư A] | [Ngày] | Giảm thời gian chạy từ 8 phút xuống $< 3$ phút |
| Viết tài liệu ADR cho module mới | [Kỹ sư B] | [Ngày] | Được phê duyệt và lưu trữ tại `erpf/` |
| Xóa bỏ các deprecated endpoints | [Kỹ sư C] | [Ngày] | Mã nguồn sạch, không còn warning trong logs |
