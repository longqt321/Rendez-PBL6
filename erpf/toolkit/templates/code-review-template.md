---
id: "ERPF-TOOL-TMP-012"
title: "Biểu Mẫu Tiêu Chuẩn Phản Biện Mã Nguồn (Code Review Rubric Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "Peer Reviewers"
  - "Technical Leads"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/workflows/software-engineering/code-review-refactoring.md"
related_concepts:
  - "ERPF-CORE-COMP-009"
  - "ERPF-SE-WORK-007"
  - "ERPF-SE-SKILL-002"
applicable_contexts:
  - "Phản biện Pull Request (PR) kỹ thuật phần mềm theo chuẩn Conventional Comments"
  - "Thẩm định tính toàn vẹn kiến trúc, độ sâu module, an toàn bảo mật và kiểm thử trước khi merge"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "code-review"
  - "quality-gate"
  - "conventional-comments"
---

# Biểu Mẫu Tiêu Chuẩn Phản Biện Mã Nguồn
# Code Review Rubric & Feedback Template

---

## Metadata PR

- **Mã Pull Request:** PR #[Number] - [Tiêu đề PR]
- **Tác Giả:** [Tên người tạo PR]
- **Người Phản Biện (Reviewer):** [Tên reviewer]
- **Loại PR:** [Feature / Bugfix / Refactoring / Performance / Security]
- **Khuyến Nghị Quyết Định:** [Approve / Request Changes / Comment / Reject]

---

## 1. Tóm Tắt Đánh Giá Tổng Thể (Review Summary)
*Tóm tắt ngắn gọn mục đích của PR và nhận xét tổng quan về chất lượng thay đổi (2-3 câu).*

[Nhận xét tổng thể: PR giải quyết tốt vấn đề N+1 query tại endpoint places, tuy nhiên cần bổ sung xử lý lỗi tại ranh giới xác thực token trước khi merge.]

---

## 2. Bảng Kiểm Tra Chất Lượng Kỹ Thuật (Quality Checkpoints Matrix)

| Hạng Mục Kiểm Tra | Trạng Thái | Nhận Xét Cụ Thể Của Reviewer |
| :--- | :---: | :--- |
| **1. Tính Đúng Đắn & Bất Biến (Correctness & Invariants)** | [PASS / FAIL / NA] | Các bất biến miền nghiệp vụ có được bảo toàn trong transaction? |
| **2. Độ Sâu Module (Module Depth & Seams)** | [PASS / FAIL / NA] | Giao diện có nhỏ gọn, che giấu độ phức tạp triển khai bên dưới? |
| **3. Kiểm Thử & Giá Trị Biên (Testing & Coverage)** | [PASS / FAIL / NA] | Có regression test chứng minh lỗi đã sửa? Có kiểm thử giá trị biên? |
| **4. Hiệu Năng & N+1 Queries (Performance)** | [PASS / FAIL / NA] | Có phát sinh câu truy vấn lặp trong vòng for? Có dùng eager loading? |
| **5. Bảo Mật & Ranh Giới Tin Cậy (Security Boundary)** | [PASS / FAIL / NA] | Input từ người dùng có được validate? Có nguy cơ SQLi, XSS, IDOR? |
| **6. Quy Chuẩn Đặt Tên & Dọn Rác (Hygiene & Clarity)** | [PASS / FAIL / NA] | Không còn mã nguồn thừa, print statements, hoặc debug comments? |

---

## 3. Phản Hồi Chi Tiết Theo Chuẩn Conventional Comments

> Sử dụng các nhãn quy chuẩn: `blocking`, `issue`, `suggestion`, `nitpick`, `praise`, `question`.

### Các Vấn Đề Bắt Buộc Phải Sửa (Blocking Issues)
- **`blocking: [file_path#L12-L18]`** [Mô tả chi tiết: Thao tác xóa `PlacePhoto` chưa bọc trong `transaction.atomic()`, dẫn đến nguy cơ bất nhất trạng thái DB nếu xảy ra lỗi giữa chừng. Đề xuất: Bổ sung decorator `@transaction.atomic`.]

### Các Điểm Đề Xuất Cải Tiến (Suggestions & Non-blocking)
- **`suggestion: [file_path#L45]`** [Mô tả: Có thể thay thế vòng lặp nối chuỗi bằng list comprehension để tăng tính biểu đạt và hiệu năng.]

### Các Chi Tiết Nhỏ (Nitpicks)
- **`nitpick: [file_path#L88]`** [Mô tả: Thiếu dấu cách sau dấu phẩy trong tuple.]

### Ghi Nhận Tích Cực (Praise)
- **`praise: [file_path#L30-L35]`** [Mô tả: Cách thiết kế hàm selector rất trong sáng, tái sử dụng tốt prefetch related có sẵn.]

---

## 4. Quyết Định Nghiệm Thu (Final Gate Verdict)
- [ ] **Approved:** Mã nguồn đáp ứng hoàn hảo các tiêu chuẩn kỹ thuật; sẵn sàng merge.
- [ ] **Changes Requested:** Bắt buộc phải giải quyết các mục `blocking` trước khi đánh giá lại.
