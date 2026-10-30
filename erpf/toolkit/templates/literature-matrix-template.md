---
id: "ERPF-TOOL-TMP-001"
title: "Biểu Mẫu Ma Trận Tổng Hợp Y Văn Học Thuật (Academic Literature Synthesis Matrix Template)"
version: "1.0.0"
category: "RES"
track: "AI"
concept_type: "TMP"
intended_audience:
  - "AI/ML Researchers"
  - "Software Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/ai-research/methodology/literature-review-and-synthesis.md"
related_concepts:
  - "ERPF-AI-DOM-000"
  - "ERPF-AI-DOM-002"
applicable_contexts:
  - "Khảo sát và lập bảng so sánh y văn học thuật cho các đề tài nghiên cứu AI/ML"
  - "Tổng hợp các nghiên cứu đi trước khi viết phần Related Work của bài báo khoa học"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "literature-matrix"
  - "systematic-review"
  - "research-methodology"
---

# Biểu Mẫu Ma Trận Tổng Hợp Y Văn Học Thuật
# Academic Literature Synthesis Matrix Template

---

## 1. Hướng Dẫn Sử Dụng Biểu Mẫu (Usage Instructions)

Biểu mẫu này được thiết kế để nhà nghiên cứu hoặc AI Research Agents sử dụng trong quá trình thực hiện tổng quan y văn có hệ thống (Systematic Literature Review).

### Quy Trình Điền Biểu Mẫu 4 Bước:
1. **Thu thập tài liệu:** Thu thập từ 15 đến 30 bài báo có liên quan mật thiết đến câu hỏi nghiên cứu thông qua tìm kiếm từ khóa và kỹ thuật Snowballing.
2. **Trích xuất thông tin:** Đọc bài báo theo kỹ thuật Three-Pass (Keshav) và điền đầy đủ thông tin vào từng cột tương ứng. Không để trống các cột phân tích phương pháp luận.
3. **Phân tích đối chiếu:** Nhóm các bài báo có cùng trường phái giải pháp lại với nhau (Clustering). Tìm kiếm các mẫu hình đồng thuận (Consensus), các mâu thuẫn học thuật (Controversy) và những điểm chưa được nghiên cứu (Gaps).
4. **Chuyển hóa thành văn bản:** Sử dụng ma trận đã hoàn thiện để viết phần "Related Work" hoặc "Literature Review" trong đề xuất nghiên cứu hoặc bài báo khoa học chính thức.

---

## 2. Bảng Ma Trận Tổng Hợp Y Văn (Synthesis Matrix Table)

*(Sao chép bảng dưới đây vào tài liệu nghiên cứu của dự án và điền thông tin)*

| Mã Trích Dẫn (Citation ID) | Tác Giả & Năm (Authors, Year) | Nguồn Xuất Bản (Venue: ArXiv/Conf/Journal) | Vấn Đề Cốt Lõi (Core Problem Addressed) | Phương Pháp Đề Xuất (Proposed Method / Architecture) | Dữ Liệu & Baselines (Datasets & Compared Baselines) | Kết Quả Định Lượng Then Chốt (Key Quantitative Findings) | Giả Định Ngầm Định (Implicit Assumptions) | Giới Hạn Cốt Tử & Điểm Mù (Limitations & Research Gap) | Trạng Thái Mã Nguồn & Tái Lập (Code / Reproducibility) |
|---|---|---|---|---|---|---|---|---|---|
| **[REF-01]** | [Tên tác giả chính et al., Năm] | [Tên hội nghị / Tạp chí] | [Mô tả vấn đề trong 1-2 câu] | [Tên phương pháp và cơ chế tính toán chính] | [Tên tập dữ liệu và các baselines đối chiếu] | [Chỉ số đo lường: Accuracy, F1, Latency...] | [Giả định về phân phối dữ liệu, phần cứng...] | [Điểm mà phương pháp thất bại hoặc chưa kiểm chứng] | [Link repo GitHub / Đã có checkpoint công khai?] |
| **[REF-02]** | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **[REF-03]** | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **[REF-04]** | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **[REF-05]** | ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

## 3. Khung Tổng Hợp Đối Chiếu (Cross-Cutting Synthesis Framework)

Sau khi điền ít nhất 10 bài báo vào ma trận trên, hãy trả lời 4 câu hỏi tổng hợp sau để hoàn tất quá trình định hình nghiên cứu:

### 3.1. Các Dòng Tư Tưởng Chính (Main Lineages of Thought)
- *Trường phái A (vd: Tối ưu hóa kiến trúc mạng):* [Tóm tắt 1 đoạn về cách tiếp cận, ưu điểm và nhược điểm]
- *Trường phái B (vd: Tăng cường dữ liệu và tiền xử lý):* [Tóm tắt 1 đoạn về cách tiếp cận, ưu điểm và nhược điểm]
- *Trường phái C (vd: Tối ưu hóa hàm mục tiêu / Regularization):* [Tóm tắt 1 đoạn về cách tiếp cận, ưu điểm và nhược điểm]

### 3.2. Những Điểm Đồng Thuận Của Cộng Đồng (Established Consensus)
- Cộng đồng nghiên cứu đã thống nhất và thừa nhận những sự thật hiển nhiên nào? (vd: *"Tất cả các nghiên cứu đều đồng ý rằng việc mở rộng kích thước mô hình chỉ mang lại hiệu quả khi dữ liệu huấn luyện có độ sạch cao."*)

### 3.3. Các Tranh Cãi Học Thuật Chưa Ngã Ngũ (Unresolved Controversies)
- Có những kết quả thực nghiệm nào mâu thuẫn trực tiếp giữa các nhóm nghiên cứu? (vd: *"Nhóm tác giả [REF-02] khẳng định phương pháp X vượt trội hơn Y trên tập dữ liệu Z, nhưng nhóm tác giả [REF-05] chỉ ra rằng khi điều chỉnh lại learning rate của Y thì Y lại vượt trội hơn X."*)

### 3.4. Định Vị Khoảng Trống Nghiên Cứu Của Dự Án Này (Our Research Gap Positioning)
- Dự án nghiên cứu hiện tại đứng ở giao lộ nào? Nó giải quyết chính xác giới hạn nào mà toàn bộ các bài báo từ `[REF-01]` đến `[REF-10]` đều chưa giải quyết được?
