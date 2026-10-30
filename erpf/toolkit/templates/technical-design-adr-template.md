---
id: "ERPF-TOOL-TMP-011"
title: "Biểu Mẫu Thiết Kế Kỹ Thuật & Đăng Bạ Quyết Định Kiến Trúc (Technical Design & Architecture Decision Record Template)"
version: "1.0.0"
category: "TOOL"
track: "SE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "System Architects"
  - "Technical Leads"
  - "AI Coding Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/workflows/cross-disciplinary/technical-decision-making.md"
related_concepts:
  - "ERPF-CORE-PRIN-007"
  - "ERPF-CORE-WORK-002"
  - "ERPF-CORE-SKILL-003"
applicable_contexts:
  - "Ghi lại các quyết định kiến trúc quan trọng (ADR) có tính chất bước ngoặt"
  - "Đặc tả thiết kế kỹ thuật (RFC / Technical Design Doc) trước khi triển khai tính năng phức tạp"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "adr"
  - "technical-design"
  - "trade-off"
  - "architecture-decisions"
---

# Biểu Mẫu Thiết Kế Kỹ Thuật & Đăng Bạ Quyết Định Kiến Trúc
# Technical Design & Architecture Decision Record (ADR) Template

---

## Metadata

- **Mã Tài Liệu (Doc ID):** `ADR-[ID]` hoặc `RFC-[ID]`
- **Tiêu Đề (Title):** [Tên quyết định ngắn gọn, phản ánh sự lựa chọn kiến trúc]
- **Trạng Thái (Status):** [Proposed / Accepted / Deprecated / Superseded by ADR-xxx]
- **Tác Giả / Người Đề Xuất:** [Tên kỹ sư / Agent]
- **Ngày Phê Duyệt:** [YYYY-MM-DD]
- **Phân Loại Cửa (Reversibility):** [One-Way Door (Khó đảo nghịch) / Two-Way Door (Dễ đảo nghịch)]

---

## 1. Bối Cảnh & Động Lực (Context & Forces)
*Mô tả bài toán kỹ thuật cần giải quyết và các áp lực (forces) cạnh tranh tác động lên quyết định.*

- **Bối cảnh hiện tại:** [Mô tả hiện trạng hệ thống và vấn đề phát sinh]
- **Các áp lực cạnh tranh (Competing Forces):**
  - *Áp lực hiệu năng:* [Yêu cầu độ trễ, thông lượng]
  - *Áp lực vận hành:* [Chi phí bảo trì, khả năng mở rộng của đội ngũ]
  - *Áp lực thời gian:* [Thời hạn bàn giao, tính khả nghịch]

---

## 2. Các Phương Án Cạnh Tranh & Ma Trận Đánh Đổi (Competing Options & Trade-offs)

### Phương Án A: [Tên phương án, ví dụ: Sử dụng PostgreSQL GiST Spatial Indexing]
- *Ưu điểm:* [Tận dụng hạ tầng hiện có, bảo đảm toàn vẹn giao dịch ACID]
- *Nhược điểm:* [Khả năng tìm kiếm mờ (fuzzy text) giới hạn hơn chuyên dụng]

### Phương Án B: [Tên phương án, ví dụ: Triển khai Cụm Elasticsearch Độc Lập]
- *Ưu điểm:* [Tìm kiếm toàn văn cực mạnh, tối ưu cho văn bản phức tạp]
- *Nhược điểm:* [Thêm dịch vụ mới cần vận hành, chi phí RAM cao, rủi ro đồng bộ dữ liệu CDC]

### Ma Trận Đánh Đổi Có Trọng Số (Weighted Decision Matrix)

| Tiêu Chí Kỹ Thuật | Trọng Số ($w_i$) | Phương Án A (PostgreSQL GiST) | Phương Án B (Elasticsearch) |
| :--- | :---: | :---: | :---: |
| **Độ phức tạp vận hành** | 0.30 | **5** (Tận dụng DB sẵn có) | **2** (Cụm mới, pipeline đồng bộ) |
| **Độ trễ truy vấn (P95 $< 50\text{ms}$)** | 0.25 | **4** (4.2ms với 50k địa điểm) | **5** (2.8ms) |
| **Tính toàn vẹn dữ liệu (ACID)** | 0.20 | **5** (Giao dịch nhất quán tức thì)| **2** (Nhất quán sau cùng) |
| **Chi phí hạ tầng & tài nguyên** | 0.15 | **5** (0 đồng phát sinh) | **1** (Tối thiểu 4GB RAM JVM) |
| **Tính năng tìm kiếm mờ ngữ nghĩa** | 0.10 | **3** (`pg_trgm` đáp ứng cơ bản) | **5** (BM25 vượt trội) |
| **Tổng Điểm Có Trọng Số** | **1.00** | **4.55 / 5.00** | **2.80 / 5.00** |

---

## 3. Quyết Định Đã Chọn (Decision)
*Khẳng định rõ ràng phương án được lựa chọn và phạm vi áp dụng.*

> **Quyết định:** Chúng tôi chọn **Phương Án A: Sử dụng PostgreSQL GiST Spatial Indexing** cho bài toán tìm kiếm địa điểm theo bán kính, và bác bỏ việc đưa Elasticsearch vào hệ thống ở giai đoạn này.

---

## 4. Hệ Quả Kỹ Thuật (Consequences)

### Các Điểm Đạt Được (Positive Gains)
- Không phát sinh dependency hạ tầng mới; duy trì kiến trúc Clean Monolith đơn giản.
- Bảo đảm tính toàn vẹn dữ liệu tức thì cho các cập nhật địa điểm và trạng thái yêu thích.

### Nợ Kỹ Thuật / Nhược Điểm Chấp Nhận Đánh Đổi (Accepted Trade-offs)
- Tính năng sửa lỗi chính tả khi gõ phím tìm kiếm (typo-tolerance) sẽ bị giới hạn ở năng lực của module `pg_trgm`.

---

## 5. Ranh Giới Kiểm Soát & Kế Hoạch Rút Lui (Escape Hatch & Rollback)
- **Cơ chế khoanh vùng:** Mọi thao tác truy vấn không gian được bọc kín bên trong `PlaceSelector` (`backend/apps/places/selectors.py`); mã nguồn tầng View không được gọi trực tiếp các toán tử SQL PostGIS.
- **Kế hoạch rút lui (Escape Hatch):** Nếu quy mô danh mục vượt quá 1.000.000 địa điểm và độ trễ P95 vượt quá 80ms, tiến hành đánh giá lại cụm tìm kiếm chuyên dụng mà không làm ảnh hưởng đến tầng gọi phía trên.
