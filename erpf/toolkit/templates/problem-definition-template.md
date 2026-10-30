---
id: "ERPF-TOOL-TMP-010"
title: "Biểu Mẫu Định Nghĩa Bài Toán Kỹ Thuật (Problem Definition Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "Product Engineers"
  - "Technical Leads"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/workflows/cross-disciplinary/problem-formulation.md"
related_concepts:
  - "ERPF-CORE-PRIN-001"
  - "ERPF-CORE-WORK-001"
  - "ERPF-CORE-SKILL-001"
applicable_contexts:
  - "Khởi tạo yêu cầu kỹ thuật (RFC / Ticket Specification) cho tính năng mới hoặc tái cấu trúc"
  - "Phân rã các yêu cầu người dùng mơ hồ thành đặc tả kỹ thuật 5W2H có ranh giới rõ ràng"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "problem-definition"
  - "requirements-engineering"
  - "5w2h"
  - "acceptance-criteria"
---

# Biểu Mẫu Định Nghĩa Bài Toán Kỹ Thuật
# Engineering Problem Definition Template

> **Hướng dẫn:** Biểu mẫu này dùng để chuẩn hóa bài toán trước khi viết mã hoặc thiết kế giải pháp. Mọi mục đều phục vụ mục đích kỹ thuật cụ thể. Tuyệt đối không mô tả giải pháp kỹ thuật bên trong phần định nghĩa bài toán.

---

## 1. Tóm Tắt Bài Toán Cốt Lõi (Core Problem Statement)
*Mô tả bài toán trong một đoạn văn ngắn gọn (2-3 câu), phân tách rõ triệu chứng bề mặt khỏi cơ chế kỹ thuật bên dưới.*

- **Phát biểu bài toán:** [Ví dụ: Endpoint lấy chi tiết địa điểm có độ trễ P95 đạt 1.250ms do các truy vấn N+1 chưa được eager load, làm nghẽn kết nối cơ sở dữ liệu khi lượng truy cập tăng cao.]
- **Mức độ khẩn cấp & Tác động (Severity & Impact):** [P0 - Chặn luồng / P1 - Nghiêm trọng / P2 - Trung bình]

---

## 2. Bảng Phân Rã Tham Số 5W2H (5W2H Scoping Matrix)

| Tham Số | Câu Hỏi Dẫn Đường | Đặc Tả Chi Tiết |
| :--- | :--- | :--- |
| **Who (Ai)** | Ai là đối tượng chịu tác động hoặc gọi hệ thống? | [Ví dụ: Người dùng thiết bị di động mạng 3G, hệ thống crawler định kỳ] |
| **What (Cái gì)** | Hành vi sai lệch hoặc khiếm khuyết kỹ thuật là gì? | [Ví dụ: Trang bị đơ 3s, HTTP 504 Gateway Timeout xuất hiện ngắt quãng] |
| **Where (Ở đâu)** | Lỗi xảy ra tại module, endpoint, hoặc ranh giới nào? | [Ví dụ: `backend/apps/places/selectors.py`, endpoint `/api/v1/places/{id}/`] |
| **When (Khi nào)** | Xuất hiện trong điều kiện tải, thời điểm, hoặc chu kỳ nào?| [Ví dụ: Khi số lượng truy vấn đồng thời $> 50$ req/s hoặc vào giờ cao điểm 19h-21h] |
| **Why (Tại sao)** | Vì sao vấn đề này gây thiệt hại nếu không giải quyết? | [Ví dụ: Tăng chi phí server, tụt tỷ lệ giữ chân người dùng 15%] |
| **How (Như thế nào)** | Biểu hiện lỗi quan sát được trên log/metrics ra sao? | [Ví dụ: Django worker bị block, connection pool của PostgreSQL báo tràn] |
| **How Much (Mức độ)** | Chỉ số định lượng đo đạc hiện thời vs mục tiêu? | [Hiện tại: P95 = 1.250ms $\rightarrow$ Mục tiêu: P95 $\le 100$ms] |

---

## 3. Ranh Giới & Các Mục Nằm Ngoài Phạm Vi (Non-Goals & Perimeter Defense)

*Xác định rõ ràng những gì KHÔNG làm trong đợt triển khai này để chống phình to phạm vi (Scope Creep).*

- **Trong phạm vi (In-Scope):**
  - [Mục 1: Tối ưu hóa câu lệnh ORM query trong selector]
  - [Mục 2: Bổ sung chỉ mục cơ sở dữ liệu nếu cần]
- **Nằm ngoài phạm vi (Non-Goals - Out of Scope):**
  - [Non-Goal 1: Không thêm hệ thống cache phân tán mới như Redis/Memcached]
  - [Non-Goal 2: Không thay đổi cấu trúc JSON schema trả về của API]
  - [Non-Goal 3: Không thiết kế lại giao diện Place Card trên frontend]

---

## 4. Ràng Buộc Kỹ Thuật & Giả Định (Technical Constraints & Assumptions)

- **Ràng buộc hệ thống:** [Ngôn ngữ, framework, phiên bản DB, không phát sinh chi phí billing mới]
- **Bán kính nổ tối đa (Blast Radius Limit):** [Chỉ được chạm vào thư mục `backend/apps/places/selectors.py`]
- **Giả định cần kiểm chứng:** [Giả định rằng PostgreSQL hiện tại có đủ RAM để chứa chỉ mục mới]

---

## 5. Tiêu Chí Nghiệm Thu Khả Kiểm (Verifiable Acceptance Criteria)

*Mô tả các tiêu chí nhị phân (Đạt / Không đạt) theo định dạng Given-When-Then kèm chỉ số định lượng cụ thể:*

- [ ] **AC-1:** Given [Một địa điểm có 10 ảnh và 5 tiện ích], When [Gọi endpoint lấy chi tiết], Then [Số lượng câu truy vấn SQL thực thi $\le 3$].
- [ ] **AC-2:** Given [Tải kiểm thử 50 req/s trên môi trường staging], When [Đo lường độ trễ qua 1.000 requests], Then [P95 latency $\le 120\text{ms}$].
- [ ] **AC-3:** Given [Toàn bộ test suite hiện có của module Places], When [Chạy `pytest backend/apps/places/`], Then [100% test cases đều PASS mà không sửa đổi fixtures].
