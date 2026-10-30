# Tiêu Chuẩn Tài Liệu & Khối Siêu Dữ Liệu (Document Standards)
# Document Standards & Metadata Schema Specification: ERPF

---

## 1. Chuẩn Khối Siêu Dữ Liệu Bắt Buộc (Standard Metadata Schema)

Mọi tài liệu tri thức trong ERPF (trừ các văn bản thể chế cấp cao tại gốc) bắt buộc phải mở đầu bằng một khối metadata YAML (Frontmatter) hợp lệ. Khối này bảo đảm khả năng lập chỉ mục tự động, tìm kiếm có cấu trúc và truy vấn có ngữ cảnh cho cả con người và các AI Agent:

```yaml
---
id: "ERPF-[TRACK]-[TYPE]-[NUMBER]"
title: "Tên tài liệu Tiếng Việt (Tên Tiếng Anh chuẩn mực)"
version: "1.0.0"
category: "ENG | RES | AGT | ARC | GOV"
track: "CORE | SE | AI | AGT | R2P"
concept_type: "PHIL | PRIN | COMP | DOM | PRAC | SKILL | WORK | LESS | CASE | TEMP | ASSESS"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "AI Coding and Research Agents"
prerequisites:
  - "ERPF-CORE-PRIN-001"
  - "Kinh nghiệm lập trình Python/TypeScript căn bản"
related_concepts:
  - "ERPF-SE-PRAC-002"
  - "ERPF-AGT-SKILL-005"
applicable_contexts:
  - "Thiết kế module mới có độ phức tạp cao"
  - "Tái cấu trúc hệ thống monolith sang phân tầng sạch"
source_status: "Verified | Accepted | Proposed | Decision Pending | Deprecated"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "architecture"
  - "modular-design"
  - "clean-code"
---
```

### Bảng Giải Thích Các Trường Metadata

| Trường (Field) | Kiểu Dữ Liệu | Bắt Buộc | Mô Tả Ý Nghĩa & Ràng Buộc |
|---|---|---|---|
| `id` | String | **Có** | Mã định danh duy nhất theo cú pháp chuẩn (VD: `ERPF-SE-PRAC-001`) |
| `title` | String | **Có** | Tiêu đề đầy đủ song ngữ (Tiêu đề Tiếng Việt + Thuật ngữ gốc Tiếng Anh) |
| `version` | SemVer String | **Có** | Phiên bản tài liệu theo Semantic Versioning (`MAJOR.MINOR.PATCH`) |
| `category` | Enum | **Có** | Một trong 5 mã chuyên mục: `ENG`, `RES`, `AGT`, `ARC`, `GOV` |
| `track` | Enum | **Có** | Nhánh chuyên môn: `CORE`, `SE`, `AI`, `AGT`, `R2P` |
| `concept_type` | Enum | **Có** | Một trong 11 loại khái niệm tri thức chuẩn mực |
| `intended_audience`| Array[String]| **Có** | Danh sách các đối tượng người đọc mục tiêu |
| `prerequisites` | Array[String]| Không | Danh sách các tài liệu hoặc kiến thức bắt buộc phải đọc trước |
| `related_concepts`| Array[String]| Không | Danh sách các liên kết chéo tới các khái niệm liên quan |
| `applicable_contexts`| Array[String]| **Có** | Các tình huống và bối cảnh thực tế mà tài liệu này được áp dụng |
| `source_status` | Enum | **Có** | Mức độ xác thực thực chứng: `Verified`, `Accepted`, `Proposed`, `Decision Pending`, `Deprecated` |
| `last_verified` | ISO Date | **Có** | Ngày đối chiếu thực tế gần nhất (`YYYY-MM-DD`) |
| `reviewers` | Array[String]| **Có** | Tên chuyên gia hoặc tác nhân AI đã thẩm định tài liệu |
| `tags` | Array[String]| **Có** | Danh sách từ khóa phân loại đa chiều hỗ trợ tìm kiếm |

---

## 2. Cấu Trúc Khung Cho Từng Loại Tài Liệu (Document Templates)

### 2.1. Khung Tài Liệu Nguyên Lý (Principle Template)
Áp dụng cho các tài liệu thuộc loại `PRIN`:
```markdown
# [Mã ID]: [Tên Nguyên Lý Tiếng Việt] ([Tên Tiếng Anh])

## 1. Tuyên Ngôn Nguyên Lý (Statement)
Định nghĩa ngắn gọn (1–2 câu) về quy tắc suy luận cốt lõi.

## 2. Lý Do & Động Lực (Rationale)
Tại sao nguyên lý này tồn tại? Nó giải quyết cái giá đắt đỏ nào trong quá khứ?

## 3. Quy Tắc Ứng Xử & Đánh Đổi (Rules of Engagement & Trade-offs)
- Khi nào BẮT BUỘC tuân thủ?
- Đánh đổi (Trade-off): Tuân thủ nguyên lý này phải hy sinh điều gì?
- Các trường hợp ngoại lệ hợp lệ (nếu có).

## 4. Bằng Chứng Thực Tế & Đối Chiếu (Verifiable Evidence)
Dẫn chứng cụ thể từ mã nguồn hoặc thực nghiệm chứng minh hiệu quả của nguyên lý.

## 5. Dấu Hiệu Vi Phạm (Smells & Anti-patterns)
Những biểu hiện thực tế cho thấy nguyên lý đang bị vi phạm.
```

### 2.2. Khung Tài Liệu Thực Hành / Kỹ Thuật (Practice & Method Template)
Áp dụng cho các tài liệu thuộc loại `PRAC`:
```markdown
# [Mã ID]: [Tên Kỹ Thuật Thực Hành]

## 1. Tổng Quan Kỹ Thuật (Overview)
Mục tiêu, đầu vào, đầu ra và bối cảnh áp dụng.

## 2. Các Bước Thực Hiện Tuần Tự (Step-by-Step Procedure)
Hướng dẫn chi tiết từng bước, kèm mã nguồn mẫu hoặc lệnh thực thi.

## 3. Tiêu Chuẩn Hoàn Thành (Definition of Done)
Checklist cụ thể để xác nhận kỹ thuật đã được áp dụng thành công.

## 4. Xử Lý Tình Huống Biên & Ngoại Lệ (Edge Cases & Failure Modes)
Các điểm nghẽn thường gặp và cách khắc phục.

## 5. Ví Dụ Minh Họa Thực Tế (Concrete Code / Experiment Example)
Đoạn code trước/sau (before/after) hoặc kịch bản thực tế.
```

### 2.3. Khung Đặc Tả Kỹ Năng Cho Agent (Skill Specification Template — `SKILL.md`)
Áp dụng cho các tài liệu thuộc loại `SKILL` nằm trong kho kỹ năng:
```markdown
---
name: kebab-case-skill-name
description: Giải thích rõ ràng kỹ năng làm gì và KHI NÀO tác nhân AI nên kích hoạt nó.
---

# Tên Kỹ Năng (Skill Name)

## 1. Mục Đích & Điều Kiện Kích Hoạt (Trigger Conditions)
- Kích hoạt khi nào (từ khóa, tình huống trong prompt)?
- Không kích hoạt khi nào?

## 2. Công Cụ Yêu Cầu (Required Tools)
Danh sách các công cụ IDE/CLI mà agent cần truy cập (run_command, read_file, edit_file...).

## 3. Quy Trình Thao Tác Của Agent (Agent Execution Protocol)
1. Bước 1: Khảo sát & Đọc file...
2. Bước 2: Thực hiện kiểm tra an toàn...
3. Bước 3: Áp dụng thay đổi vi mô...
4. Bước 4: Chạy bài test xác thực...

## 4. Định Dạng Phản Hồi Bắt Buộc (Expected Output Format)
Cấu trúc báo cáo mà agent phải trả về cho người dùng hoặc agent cha.
```

### 2.4. Khung Nghiên Cứu Điển Hình (Case Study Template)
Áp dụng cho các tài liệu thuộc loại `CASE`:
```markdown
# [Mã ID]: Nghiên Cứu Điển Hình: [Tiêu Đề Tình Huống]

## 1. Bối Cảnh Tình Huống (Context & Problem Statement)
Mô tả hiện trạng hệ thống/thực nghiệm, ràng buộc kỹ thuật và vấn đề nan giải phát sinh.

## 2. Các Phương Án Cân Nhắc (Options Evaluated)
Phân tích so sánh ít nhất 2–3 phương án kỹ thuật kèm ma trận ưu/nhược điểm.

## 3. Giải Pháp Đã Thực Thi (Implemented Solution)
Chi tiết kiến trúc hoặc mô hình đã triển khai thực tế.

## 4. Kết Quả Đo Lường Khách Quan (Measured Outcomes)
Số liệu định lượng trước và sau (thời gian chạy test, độ trễ, accuracy, throughput).

## 5. Bài Học Đúc Kết (Key Takeaways)
Những điều nên làm và không nên làm rút ra từ tình huống này.
```

---

## 3. Tiêu Chuẩn Chất Lượng & Ranh Giới Kiểm Duyệt (Quality Gates)

Trước khi một tài liệu được chấp thuận chuyển sang trạng thái `Active`, tài liệu phải vượt qua 5 cổng kiểm tra:

1. **Cổng Cú Pháp & Metadata (Schema Gate):**
   - Đầy đủ các trường metadata bắt buộc trong khối YAML.
   - Mã định danh `id` không trùng lặp trong toàn bộ repository.
   - Thẻ phân loại `tags` có nghĩa và đúng chuẩn `kebab-case`.
2. **Cổng Tính Thực Chứng (Evidence Gate):**
   - Có ít nhất một liên kết mã nguồn cụ thể hoặc dữ liệu benchmark kiểm chứng.
   - Không chứa các phỏng đoán chưa được chứng minh.
3. **Cổng Tính Khả Thi Hành Động (Actionability Gate):**
   - Có các bước hướng dẫn cụ thể hoặc checklist nghiệm thu rõ ràng.
4. **Cổng Chuẩn Mực Ngôn Ngữ (Language Gate):**
   - Tiếng Việt chuẩn mực, đúng ngữ pháp; bảo lưu nguyên vẹn thuật ngữ kỹ thuật tiếng Anh.
   - Sử dụng định dạng GitHub-Flavored Markdown chuẩn (alert blocks, tables, Mermaid diagrams).
5. **Cổng Độc Lập & Nhất Quán (Orthogonality Gate):**
   - Không lặp lại nội dung đã được định nghĩa tại một tài liệu kinh điển khác; sử dụng liên kết chéo (`[Tên tài liệu](path/to/doc.md)`) thay vì copy-paste.
