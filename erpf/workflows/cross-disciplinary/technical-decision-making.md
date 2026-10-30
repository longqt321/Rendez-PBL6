---
id: "ERPF-CORE-WORK-002"
title: "Quy Trình Ra Quyết Định Kỹ Thuật & Đánh Đổi Có Kiểm Soát (Technical Decision-Making & Trade-off Workflow)"
version: "1.0.0"
category: "GOV"
track: "CORE"
concept_type: "WORK"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "AI Coding and Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/foundation/competencies.md"
  - "ERPF/software-engineering/architecture-design/architecture-decisions-and-debt.md"
related_concepts:
  - "ERPF-CORE-COMP-001"
  - "ERPF-SE-DOM-005"
applicable_contexts:
  - "Lựa chọn giữa các giải pháp kiến trúc phần mềm hoặc phương pháp thuật toán cạnh tranh"
  - "Đánh giá quyết định Cửa Một Chiều vs Cửa Hai Chiều (One-Way vs Two-Way Doors)"
  - "Soạn thảo và ban hành Architecture Decision Record (ADR)"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "workflow"
  - "decision-making"
  - "adr"
  - "trade-off-analysis"
  - "pugh-matrix"
  - "one-way-door"
---

# Quy Trình Ra Quyết Định Kỹ Thuật & Đánh Đổi Có Kiểm Soát
# Technical Decision-Making & Trade-off Workflow

---

## 1. Mục Đích (Purpose)
Quy trình này hướng dẫn kỹ sư và nhà nghiên cứu đưa ra các quyết định kỹ thuật phức tạp một cách **khách quan, dựa trên bằng chứng thực nghiệm, minh bạch về các đánh đổi và được ghi chép bất biến** trong kho lưu trữ, tránh các quyết định cảm tính hoặc chạy theo xu hướng đám đông.

---

## 2. Điều Kiện Tiên Quyết (Preconditions)
- Bài toán kỹ thuật đã được định hình rõ ràng theo quy trình [`problem-formulation.md`](file:///home/longtran/Projects/rendez-web/erpf/workflows/cross-disciplinary/problem-formulation.md).
- Đã xác định rõ các ràng buộc bất biến (Ngân sách, thời hạn, hạ tầng).

---

## 3. Dữ Liệu Đầu Vào (Inputs)
- Đặc tả bài toán kỹ thuật kèm các yêu cầu phi chức năng (NFRs / SLOs).
- Danh sách các phương án khả thi cạnh tranh (ít nhất 2–3 phương án).

---

## 4. Kết Quả Đầu Ra Kỳ Vọng (Expected Outputs)
- **Hồ sơ Quyết định Kiến trúc (Architecture Decision Record - ADR)** được lưu tại kho mã nguồn (`docs/adr/` hoặc `erpf/`).
- Bảng ma trận quyết định Pugh (Pugh Decision Matrix) hoặc kết quả PoC thực nghiệm.

---

## 5. Các Giai Đoạn Chính (Main Stages)

```mermaid
graph TD
    S1["Giai Đoạn 1: Phân Loại Quyết Định<br/><i>Cửa Một Chiều (One-Way) vs Cửa Hai Chiều (Two-Way)</i>"] --> Gate1{"Là Cửa Hai Chiều<br/>(Dễ hoàn tác, cục bộ)?"}

    Gate1 -->|Đúng| FastPath["Lộ Trình Nhanh (Fast Path):<br/>Thử nghiệm ngay, không cần ADR dài"]
    Gate1 -->|Sai (Cửa 1 Chiều)| S2["Giai Đoạn 2: Liệt Kê Các Phương Án Cạnh Tranh<br/><i>Ít nhất 2 - 3 phương án khả dĩ</i>"]

    S2 --> S3["Giai Đoạn 3: Đánh Giá Đa Tiêu Chí & PoC<br/><i>Lập ma trận Pugh, viết scratch prototype đo đạc</i>"]
    S3 --> S4["Giai Đoạn 4: Soạn Thảo Bản Thảo ADR<br/><i>Context, Options, Decision, Consequences</i>"]
    S4 --> S5["Giai Đoạn 5: Thẩm Định Đồng Cấp & Phê Duyệt<br/><i>Peer review, phản biện giả định</i>"]
    S5 --> S6["Giai Đoạn 6: Ban Hành & Theo Dõi Hệ Quả<br/><i>Merge ADR vào Git, theo dõi rủi ro chấp nhận</i>"]
```

### Chi Tiết Từng Giai Đoạn:
- **GĐ 1: Phân loại tính khả nghịch:** Xác định chi phí đảo ngược (Cost of Reversal) và bán kính ảnh hưởng (Blast Radius).
- **GĐ 2: Thu thập phương án:** Không bao giờ quyết định chỉ với một phương án duy nhất. Luôn đặt lên bàn phương án hiện trạng, phương án tối thiểu (Simplest), và phương án toàn diện.
- **GĐ 3: Đánh giá thực chứng:** Dùng Ma trận Pugh có trọng số và chạy PoC thực tế (xem chi tiết tại [`architecture-decisions-and-debt.md`](file:///home/longtran/Projects/rendez-web/erpf/software-engineering/architecture-design/architecture-decisions-and-debt.md)).
- **GĐ 4: Soạn ADR:** Tuân thủ cấu trúc chuẩn mực: Context $\rightarrow$ Decision Drivers $\rightarrow$ Considered Options $\rightarrow$ Decision $\rightarrow$ Consequences (Positive & Negative).
- **GĐ 5: Review phản biện:** Lấy ý kiến từ ít nhất 1 kỹ sư độc lập; kiểm tra các điểm mù và rủi ro bị bỏ sót.
- **GĐ 6: Ban hành:** Lưu vào Git dưới dạng tệp Markdown bất biến.

---

## 6. Điểm Ra Quyết Định Rẽ Nhánh (Decision Points & Professional Judgment)

- **Điểm rẽ 1: Khi nào cần làm Spike / PoC thay vì tranh luận lý thuyết?**
  - Nếu hai phương án có sự bất định cao về hiệu năng (ví dụ: PostGIS query vs Elasticsearch), dừng cuộc họp và dành **tối đa 1 ngày viết mã thực nghiệm bỏ đi (Throwaway Spike)** để lấy số liệu thực tế trước khi quyết định.
- **Điểm rẽ 2: Quyết định Tự Xây (Build) hay Sử Dụng Có Sẵn (Buy/Adopt)?**
  - *Nguyên tắc:* Nếu thành phần đó thuộc **Năng lực cốt lõi (Core Domain)** mang lại lợi thế cạnh tranh của sản phẩm $\rightarrow$ Tự xây. Nếu là thành phần hạ tầng chung (Authentication, Email sending, Database) $\rightarrow$ Sử dụng giải pháp mã nguồn mở tự vận hành hoặc có sẵn.

---

## 7. Phương Pháp & Kỹ Thuật Áp Dụng (Methods & Techniques)
- Khung phân loại One-Way vs Two-Way Door Decision-Making.
- Ma trận quyết định có trọng số (Pugh Decision Matrix).
- Kỹ thuật Throwaway Prototyping (Spikes).
- Cấu trúc chuẩn Architecture Decision Record (ADR).

---

## 8. Các Dạng Thất Bại & Sai Lầm Thường Gặp (Common Failure Modes)
- **Tê liệt phân tích (Analysis Paralysis):** Biến một quyết định Cửa Hai Chiều tầm thường thành một cuộc tranh luận kéo dài hàng tháng.
- **Quyết định theo trào lưu (Resume-Driven Development):** Chọn công nghệ phức tạp chỉ để làm đẹp CV.
- **Bỏ qua hệ quả tiêu cực (Consequences Blindness):** Chỉ liệt kê ưu điểm trong ADR mà giấu nhẹm gánh nặng bảo trì và nợ kỹ thuật phát sinh.

---

## 9. Cổng Kiểm Soát Chất Lượng (Quality Checkpoints)
- [ ] Có ít nhất 2 phương án khả dĩ được so sánh trên cùng một tập tiêu chí khách quan.
- [ ] Phần Consequences nêu rõ ít nhất một gánh nặng kỹ thuật hoặc rủi ro chấp nhận.
- [ ] Đã chỉ rõ điều kiện tái đánh giá quyết định (Triggers).
- [ ] Bản ghi ADR được lưu dưới sự kiểm soát phiên bản của Git.

---

## 10. Lộ Trình Thay Thế / Thoát Hiểm (Alternative Paths)
- Nếu sau khi phân tích vẫn chưa đủ thông tin để quyết định: **Chọn Phương Án Có Tính Khả Nghịch Cao Nhất (Choose the most reversible path)** và đặt một mốc thời gian xem xét lại (Re-evaluation date sau 2 tuần).

---

## 11. Nguyên Lý & Năng Lực Liên Quan
- **Nguyên lý cốt lõi:** Trade-off Analysis, Evidence-Based Reasoning, First Principles Thinking (`ERPF-CORE-PRIN-001`).
- **Năng lực áp dụng:** C5 (Technical Decision-Making), C2 (Analytical Reasoning), C6 (Systems Thinking).
