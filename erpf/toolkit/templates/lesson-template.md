---
id: "ERPF-TOOL-TMP-004"
title: "Biểu Mẫu Chuẩn Bài Học Kinh Nghiệm Kỹ Thuật & Nghiên Cứu (Standard Lesson Learned Template)"
version: "1.0.0"
category: "TOOL"
track: "CORE"
concept_type: "TEMP"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "AI Coding & Research Agents"
prerequisites:
  - "ERPF/foundation/philosophy.md"
  - "ERPF/foundation/core-principles.md"
  - "ERPF/DOCUMENT_STANDARDS.md"
related_concepts:
  - "ERPF-CORE-LESS-000"
  - "ERPF-CORE-PRIN-001"
  - "ERPF-CORE-PRIN-006"
applicable_contexts:
  - "Ghi lại bài học rút ra từ sự cố kỹ thuật (Incident Post-Mortem)"
  - "Đúc kết kinh nghiệm sau thất bại thực nghiệm hoặc phát hiện lỗi phương pháp luận AI/ML"
  - "Lưu trữ tri thức chuyển giao nhằm ngăn chặn sai lầm lặp lại trong tổ chức"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "lesson-learned"
  - "root-cause"
  - "reusable-knowledge"
---

# Biểu Mẫu Chuẩn Bài Học Kinh Nghiệm Kỹ Thuật & Nghiên Cứu
# Standard Lesson Learned Template

> **Hướng dẫn sử dụng:** Biểu mẫu này được thiết kế để đúc kết tri thức có khả năng chuyển giao cao từ sự kiện thực tế hoặc giả định kỹ thuật sâu sắc. Tuyệt đối không ghi nhận các quan sát nhất thời mang tính cá biệt. Mỗi bài học bắt buộc phải làm rõ cơ chế bản chất và nguyên lý khái quát hóa.

---

## Metadata Bắt Buộc

- **Mã Bài Học (Lesson ID):** `ERPF-[CORE/SE/AI]-LESS-[001..999]`
- **Tiêu Đề (Title):** [Tên bài học ngắn gọn, phản ánh sự đối lập hoặc nguyên lý cốt lõi]
- **Lĩnh Vực (Domain):** [Software Design / Debugging / Testing / Research Methodology / Experimental Validity / Model Evaluation / Scientific Reasoning]
- **Mức Độ Nghiêm Trọng / Tác Động (Severity / Impact):** [Critical / High / Medium / Low]
- **Trạng Thái Nguồn (Source Status):** [Verified Empirical / Simulated / Standard Pedagogical Case]

---

## 1. Bối Cảnh (Context)
*Mô tả môi trường kỹ thuật, hệ thống, kiến trúc hoặc khuôn khổ nghiên cứu nơi sự kiện diễn ra. Nêu rõ các công nghệ, quy mô dữ liệu và giả định ban đầu.*

- **Hệ thống / Dự án:** [Mô tả hệ thống hoặc bài toán nghiên cứu]
- **Kiến trúc / Môi trường:** [Công nghệ, frameworks, hạ tầng]
- **Điều kiện vận hành:** [Tải hệ thống, kích thước tập dữ liệu, hoặc tài nguyên tính toán]

---

## 2. Vấn Đề Hoặc Quan Sát Thực Tế (Problem or Observation)
*Mô tả chính xác hiện tượng dị thường, lỗi phát sinh hoặc kết quả bất ngờ quan sát được. Cung cấp dữ kiện khách quan, log, stack trace hoặc chỉ số định lượng cụ thể.*

- **Hiện tượng quan sát được:** [Mô tả cụ thể triệu chứng]
- **Dữ liệu thực chứng:** [Log, số liệu benchmark, bảng lỗi]
- **Tác động thực tế:** [Sự cố sập hệ thống, kết quả model bị lừa, mất dữ liệu, v.v.]

---

## 3. Giả Định Ban Đầu (Initial Assumptions)
*Ghi lại những gì nhóm kỹ sư hoặc nhà nghiên cứu đã tin là đúng trước khi sự cố/hiện tượng xảy ra. Đây là nơi nhận diện các điểm mù nhận thức.*

- [Giả định 1: Nhóm tin rằng dữ liệu đã sạch / API luôn phản hồi nhanh / ...]
- [Giả định 2: ...]

---

## 4. Phân Tích Kỹ Thuật (Analysis)
*Trình bày quá trình điều tra, cô lập biến, kiểm định giả thuyết và phân tích cơ chế nội tại đã dẫn đến hiện tượng.*

- **Quá trình cô lập biến:** [Các bước kiểm tra từng thành phần]
- **Cơ chế kỹ thuật thực tế:** [Giải thích vì sao hệ thống/mô hình lại hành xử như vậy]

---

## 5. Nguyên Nhân Gốc Rễ Hoặc Chuỗi Lập Luận (Root Causes or Reasoning)
*Xác định nguyên nhân bản chất sâu xa nhất (sử dụng kỹ thuật 5 Whys, Ishikawa Diagram hoặc Phân tích Giới hạn Biên), không dừng lại ở triệu chứng bề mặt.*

1. *Tại sao 1:* [...]
2. *Tại sao 2:* [...]
3. *Tại sao 3:* [...]
4. *Tại sao 4:* [...]
5. *Nguyên nhân gốc (Root Cause):* [...]

---

## 6. Bài Học Then Chốt (Key Lesson)
*Khẳng định bài học cốt lõi bằng 1 đến 2 câu súc tích, mang tính đúc kết hành động.*

> **Bài học cốt lõi:** [Nêu rõ điều cần làm hoặc điều bắt buộc phải tránh]

---

## 7. Nguyên Lý Khái Quát Hóa (Generalizable Principle)
*Nâng cấp bài học thành nguyên lý kỹ thuật hoặc khoa học áp dụng được cho nhiều bài toán khác nhau.*

- **Tên nguyên lý:** [Ví dụ: Nguyên lý Kiểm Thử Ranh Giới Tin Cậy, Nguyên lý Phân Tách Dữ Liệu Bất Biến]
- **Mô tả nguyên lý:** [Quy tắc suy luận áp dụng cho tương lai]

---

## 8. Phạm Vi Áp Dụng & Điều Kiện Kích Hoạt (Applicability)
*Khi nào và ở đâu bài học này cần được kích hoạt?*

- **Bối cảnh áp dụng:** [Các kiến trúc, quy mô hệ thống, hoặc loại bài toán tương tự]
- **Dấu hiệu nhận biết sớm (Warning Signals):** [Các triệu chứng báo hiệu sự cố tương tự sắp xảy ra]

---

## 9. Giới Hạn Của Bài Học (Limitations & Counter-Contexts)
*Khi nào bài học này KHÔNG đúng hoặc việc áp dụng máy móc sẽ gây hại?*

- [Trường hợp ngoại lệ 1: Trong môi trường prototype dùng một lần...]
- [Trường hợp ngoại lệ 2: ...]

---

## 10. Tri Thức & Tài Liệu Liên Quan (Related Knowledge)
*Liên kết tới các nguyên lý, năng lực và quy trình đã có trong ERPF.*

- **Nguyên lý nền tảng:** `ERPF-CORE-PRIN-xxx`
- **Năng lực cốt lõi:** `ERPF-CORE-COMP-xxx`
- **Miền tri thức liên quan:** `ERPF-SE-DOM-xxx` hoặc `ERPF-AI-DOM-xxx`
- **Quy trình áp dụng:** `ERPF-CORE-WORK-xxx`

---

## 11. Căn Cứ Thực Chứng & Tài Liệu Tham Chiếu (References or Evidence)
*Mã nguồn đối chiếu, pull request, RFC, bài báo khoa học hoặc nhật ký sự cố có thật.*

- [Đường dẫn mã nguồn / File link / Citation chuẩn mực]
