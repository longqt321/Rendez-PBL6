---
id: "ERPF-TOOL-TMP-014"
title: "Biểu Mẫu Kế Hoạch Chiến Lược Kiểm Thử (Test Strategy Plan Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "QA / Test Engineers"
  - "Technical Leads"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/software-engineering/implementation-quality/software-testing.md"
related_concepts:
  - "ERPF-SE-DOM-012"
  - "ERPF-SE-WORK-005"
  - "ERPF-SE-SKILL-004"
applicable_contexts:
  - "Quy hoạch chiến lược kiểm thử cho một phân hệ, dịch vụ hoặc tính năng mới"
  - "Tái cấu trúc bộ kiểm thử chậm, không tất định (flaky) thành kim tự tháp kiểm thử chuẩn"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "test-strategy"
  - "test-pyramid"
  - "trust-boundary"
  - "flakiness-prevention"
---

# Biểu Mẫu Kế Hoạch Chiến Lược Kiểm Thử
# Test Strategy Plan Template

---

## Metadata

- **Phân Hệ / Tính Năng (Subsystem / Feature):** [Tên module, ví dụ: Photo Asset Management]
- **Tác Giả Bản Kế Hoạch:** [Tên kỹ sư / Agent]
- **Mục Tiêu Thời Gian Chạy CI:** [Ví dụ: Toàn bộ suite chạy dưới 3 phút]
- **Ngưỡng Độ Tin Cậy:** [Zero Flakiness / 100% Deterministic]

---

## 1. Phân Bổ Kim Tự Tháp Kiểm Thử (Test Pyramid Allocation)

```
        /  E2E (5%)  \         <- Chỉ 3-5 luồng người dùng sống còn, headless
       / Integration  \        <- 15-20%: DB queries, serializers, API contracts
      /  Unit Tests    \       <- 75-80%: In-memory, sub-millisecond, zero IO
     --------------------
```

| Cấp Độ Kiểm Thử | Tỷ Lệ Mục Tiêu | Phạm Vi & Mục Tiêu Trọng Tâm | Ràng Buộc Thực Thi |
| :--- | :---: | :--- | :--- |
| **Unit Tests** | 75% | Domain models, logic tính toán, validators, state machines | In-memory, chạy trong $< 1\text{ms}$/test, không gọi DB/Network |
| **Integration Tests** | 20% | ORM queries, API endpoints, serialization, database transactions | Sử dụng test database cô lập, rollback transaction sau mỗi test |
| **End-to-End Tests** | 5% | Các luồng tương tác người dùng then chốt từ giao diện web | Tối đa 5 test cases, mock các dịch vụ thanh toán/email bên ngoài |

---

## 2. Ma Trận Kiểm Thử Ranh Giới Tin Cậy (Trust Boundary Test Matrix)

*Liệt kê các điểm đầu vào nhận dữ liệu từ bên ngoài và các ca kiểm thử biên tương ứng:*

| Ranh Giới Đầu Vào (Boundary) | Dữ Liệu Hợp Lệ (Happy Path) | Giá Trị Biên (Boundary Values) | Dữ Liệu Bất Hợp Pháp (Negative Tests) |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/photos/upload` | File JPEG hợp lệ $\le 5\text{MB}$ | File đúng $5.00\text{MB}$, kích thước ảnh $1\times 1$ pixel | File rỗng 0 bytes, file giả dạng `.exe`, dung lượng $5.01\text{MB}$ |
| `GET /api/v1/places/?radius=` | `radius=500` (mét) | `radius=1` (min), `radius=50000` (max) | `radius=-10`, `radius=abc`, `radius=999999999` |

---

## 3. Kiến Trúc Giả Lập & Khớp Nối Cô Lập (Mocking & Seam Architecture)

- **Các thành phần được phép Mock / Fake:**
  - [Dịch vụ bên thứ ba: Stripe, Cloudflare Images, Twilio SMS]
  - [Hệ thống gửi email SMTP]
- **Các thành phần CẤM Mock (Bắt buộc chạy thực tế trong Integration Test):**
  - [Cơ sở dữ liệu PostgreSQL (sử dụng transactional test db)]
  - [Hệ thống ORM Django / SQLAlchemy và các câu lệnh query/index]

---

## 4. Giao Thức Phòng Chống Flakiness (Flakiness Prevention Protocol)

- [ ] **Cấm tuyệt đối `time.sleep()`:** Bắt buộc sử dụng hàm chờ theo điều kiện (`wait_for_condition`).
- [ ] **Cố định thời gian (Frozen Time):** Sử dụng `freezegun` cho các logic so sánh ngày giờ.
- [ ] **Độc lập dữ liệu tuyệt đối:** Mỗi test case tự tạo dữ liệu tối thiểu qua factory; cấm phụ thuộc vào thứ tự chạy test.
- [ ] **Kiểm soát ngẫu nhiên:** Cố định seed cho các hàm sinh dữ liệu ngẫu nhiên (`random.seed(42)`).
