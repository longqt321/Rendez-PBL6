---
id: "ERPF-TOOL-TMP-013"
title: "Biểu Mẫu Điều Tra Gỡ Lỗi & Sự Cố Kỹ Thuật (Debugging Investigation & Post-Mortem Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "SRE / DevOps Engineers"
  - "Incident Responders"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/workflows/software-engineering/debugging-root-cause.md"
related_concepts:
  - "ERPF-CORE-PRIN-006"
  - "ERPF-SE-WORK-004"
  - "ERPF-SE-SKILL-003"
  - "ERPF-SE-LESS-001"
applicable_contexts:
  - "Ghi chép quá trình điều tra gỡ lỗi phức tạp (Complex Bug Diagnosis)"
  - "Lập biên bản mổ xẻ sự cố sản xuất (Production Incident Post-Mortem / RCA)"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "debugging"
  - "root-cause-analysis"
  - "post-mortem"
  - "incident-report"
---

# Biểu Mẫu Điều Tra Gỡ Lỗi & Sự Cố Kỹ Thuật
# Debugging Investigation & Incident Post-Mortem Template

---

## 1. Thông Tin Chung Sự Cố (Incident Metadata)
- **Mã Sự Cố (Incident ID):** `INC-[YYYYMMDD-ID]`
- **Mức Độ Nghiêm Trọng:** [P0 - Hệ thống sập / P1 - Hỏng luồng cốt lõi / P2 - Lỗi cục bộ]
- **Thời Gian Bắt Đầu:** [YYYY-MM-DD HH:MM UTC]
- **Thời Gian Khắc Phục:** [YYYY-MM-DD HH:MM UTC]
- **Thời Gian Gián Đoạn (Downtime / Degradation):** [X phút / giờ]
- **Người Điều Tra Chính:** [Tên kỹ sư / Agent]

---

## 2. Mô Tả Triệu Chứng & Đo Lường Tác Động (Symptom & Impact)
- **Triệu chứng bề mặt quan sát được:** [Mô tả chính xác thông báo lỗi, mã HTTP status, hoặc hành vi giao diện dị thường]
- **Phạm vi tác động thực tế:**
  - Số lượng người dùng / tỷ lệ request bị lỗi: [Ví dụ: 2.4% tổng số lượt xem ảnh]
  - Dữ liệu bị ảnh hưởng: [Có mất dữ liệu hoặc tha hóa trạng thái không?]
- **Dẫn chứng thực chứng (Evidence):** [Trích dẫn log lỗi quan trọng nhất, stack trace, hoặc biểu đồ Grafana]

---

## 3. Tái Lập Lỗi Tối Thiểu (Minimal Reproducible Example - MRE)
*Đoạn mã, lệnh curl, hoặc test case tối thiểu kích hoạt lỗi một cách tất định:*

```python
# Minimal reproduction test case
def test_reproduce_bug():
    # Setup minimal invalid state
    ...
    # Trigger operation
    ...
```

---

## 4. Quá Trình Cô Lập Biến & Phân Tích Nguyên Nhân Gốc (5 Whys Analysis)

1. *Tại sao 1 (Triệu chứng):* [Hiện tượng xảy ra do đâu?]
2. *Tại sao 2:* [Vì sao thành phần đó lại xử lý sai?]
3. *Tại sao 3:* [Vì sao dữ liệu/trạng thái lại bị hư hỏng ở khâu trước?]
4. *Tại sao 4:* [Vì sao cơ chế bảo vệ ranh giới hoặc kiểm thử không bắt được?]
5. *Nguyên nhân gốc (Root Cause):* [Lỗ hổng bản chất trong thiết kế, bất biến kiến trúc hoặc quy trình]

---

## 5. Giải Pháp Khắc Phục Thực Tế (Resolution & Fix)
- **Bản vá phẫu thuật (Surgical Patch):** [Mô tả sự thay đổi mã nguồn, file path, và logic sửa đổi]
- **Regression Test đi kèm:** [Tên file test và hàm test chứng minh lỗi đã được khóa vĩnh viễn]
- **Xác nhận không vá triệu chứng:** [Cam kết không sử dụng try-catch im lặng hoặc null-checks bừa bãi]

---

## 6. Các Hành Động Phòng Ngừa Dài Hạn (Corrective Actions & Action Items)

| Hành Động Phòng Ngừa | Loại Hành Động | Người Phụ Trách | Hạn Chót | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| Bổ sung kiểm thử biên tại Trust Boundary | Testing | [Tên] | [Ngày] | [Pending] |
| Đưa kiểm tra transaction atomic vào linter | Tooling | [Tên] | [Ngày] | [Pending] |
| Cập nhật tài liệu kiến trúc miền | Documentation | [Tên] | [Ngày] | [Pending] |
