---
id: "ERPF-TOOL-TMP-003"
title: "Biểu Mẫu Tiêu Chuẩn Phản Biện Đồng Cấp Bài Báo AI/ML (Peer Review Rubric & Evaluation Template)"
version: "1.0.0"
category: "RES"
track: "AI"
concept_type: "TMP"
intended_audience:
  - "AI/ML Researchers"
  - "Software Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/ai-research/evaluation-validation/scientific-writing-and-peer-review.md"
  - "ERPF/ai-research/evaluation-validation/reproducibility-and-provenance.md"
related_concepts:
  - "ERPF-AI-DOM-020"
  - "ERPF-AI-DOM-021"
  - "ERPF-AI-DOM-025"
applicable_contexts:
  - "Thực hiện thẩm định phản biện bài báo khoa học theo tiêu chuẩn NeurIPS / ICLR / ICML"
  - "Đánh giá nội bộ các đề xuất nghiên cứu trước khi nộp tới các hội nghị đỉnh cao"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "peer-review"
  - "rubric"
  - "scientific-evaluation"
  - "neurips-standard"
---

# Biểu Mẫu Tiêu Chuẩn Phản Biện Đồng Cấp Bài Báo AI/ML
# Peer Review Rubric & Evaluation Template

---

## 1. Thông Tin Nhận Diện Bài Báo (Paper Metadata)

- **Mã bài báo (Paper ID):** `PAPER-[ID]`
- **Tiêu đề bài báo:** [Tiêu đề đầy đủ của bản thảo]
- **Người phản biện (Reviewer ID / Agent):** [Mã định danh người đánh giá]
- **Ngày đánh giá:** YYYY-MM-DD
- **Độ tự tin chuyên môn của người đánh giá (Confidence Score: 1-5):**
  - `[5]` Rất cao (Tôi là chuyên gia trực tiếp trong nhánh hẹp này).
  - `[4]` Cao (Tôi hiểu rất sâu về phương pháp luận và các nghiên cứu liên quan).
  - `[3]` Trung bình (Tôi hiểu bài toán nhưng cần tra cứu thêm về một số chi tiết toán học).
  - `[2]` Thấp (Đề tài nằm ngoài lĩnh vực nghiên cứu chính của tôi).
  - `[1]` Rất thấp (Tôi chỉ đánh giá được dựa trên cảm nhận tổng quan).

---

## 2. Bảng Chấm Điểm 4 Trục Chất Lượng (4-Axis Evaluation Rubric)

*(Chấm điểm từng trục theo thang điểm từ 1 đến 5 và cung cấp lý do ngắn gọn)*

| Trục Đánh Giá | Thang Điểm (1 - 5) | Tiêu Chí Đánh Giá Cốt Lõi | Nhận Xét Tóm Tắt Của Reviewer |
|---|:---:|---|---|
| **1. Ý Nghĩa & Tính Mới Đóng Góp (Contribution & Novelty)** | `[1 - 5]` | Bài toán có ý nghĩa khoa học thực sự không? Đóng góp thuộc tầng nào (Lý thuyết, Thuật toán, Thực nghiệm, Benchmark)? Tính mới là bước ngoặt hay chỉ là tinh chỉnh chắp vá? | [Điền nhận xét] |
| **2. Tính Hợp Lệ Của Phương Pháp (Methodological Soundness)** | `[1 - 5]` | Cơ sở toán học có chính xác? Thiên kiến quy nạp có hợp lý? Có sự mâu thuẫn hay ngụy biện nào trong các giả định lý thuyết không? | [Điền nhận xét] |
| **3. Mức Độ Đầy Đủ Của Thực Nghiệm (Empirical Adequacy)** | `[1 - 5]` | Baseline có công bằng không (Param/Compute matched)? Dữ liệu có bị rò rỉ không? Có nghiên cứu bóc tách (Ablation) đầy đủ không? Có chạy đa hạt giống và kiểm định thống kê không? | [Điền nhận xét] |
| **4. Tính Minh Bạch & Khả Năng Tái Lập (Clarity & Reproducibility)** | `[1 - 5]` | Bài viết có mạch lạc, tuân thủ cấu trúc hùng biện không? Có link mã nguồn mở, checkpoint và script chạy lại 1 lệnh không? Có mục Limitations trung thực không? | [Điền nhận xét] |

---

## 3. Khuyến Nghị Quyết Định Tổng Thể (Overall Recommendation)

Chọn một trong 5 mức quyết định chính thức:
- [ ] **Strong Accept (10/10):** Đột phá xuất sắc, phương pháp luận hoàn hảo, đóng góp mang tính bước ngoặt, nhất định phải công bố tại hội nghị.
- [ ] **Accept (8/10):** Bài báo chất lượng cao, thực nghiệm vững chắc, đóng góp rõ ràng, xứng đáng được chấp thuận.
- [ ] **Weak Accept / Borderline (6/10):** Đề tài thú vị nhưng còn một số điểm băn khoăn về thực nghiệm hoặc bóc tách, có thể chấp thuận nếu tác giả giải trình tốt trong Rebuttal.
- [ ] **Weak Reject / Borderline (4/10):** Thiếu sót đáng kể về mặt phương pháp luận hoặc so sánh baseline chưa công bằng; cần thêm thực nghiệm lớn.
- [ ] **Reject (2/10):** Khiếm khuyết chí mạng (Fatal Flaw): Dữ liệu bị rò rỉ, ngụy biện so sánh, hoặc tuyên bố vượt quá bằng chứng một cách cố ý.

---

## 4. Báo Cáo Phản Biện Chi Tiết (Detailed Technical Review)

### 4.1. Tóm Tắt Bài Báo (Summary of the Paper)
[Tóm tắt lại 1-2 đoạn văn về bài toán, phương pháp đề xuất và các kết quả định lượng then chốt theo cách hiểu khách quan của reviewer.]

### 4.2. Điểm Mạnh (Key Strengths)
- **Điểm mạnh 1:** [Mô tả chi tiết kèm dẫn chứng trang/bảng cụ thể].
- **Điểm mạnh 2:** [Mô tả chi tiết kèm dẫn chứng].
- **Điểm mạnh 3:** [Mô tả chi tiết kèm dẫn chứng].

### 4.3. Điểm Yếu Cốt Tử (Key Weaknesses & Concerns)
- **Điểm yếu 1 (Lỗi phương pháp luận / Baseline):** [Chỉ rõ tại sao thí nghiệm chưa công bằng hoặc phân tích còn thiếu sót].
- **Điểm yếu 2 (Tính hợp lệ của số liệu / Rò rỉ):** [Chỉ rõ các nguy cơ rò rỉ dữ liệu hoặc thiếu kiểm định thống kê].
- **Điểm yếu 3 (Tuyên bố phóng đại):** [Chỉ ra các câu khẳng định trong bài báo không được hậu thuẫn bởi số liệu thực tế].

### 4.4. Câu Hỏi & Đề Xuất Cụ Thể Cho Tác Giả (Questions for Rebuttal & Actionable Feedback)
1. **Câu hỏi 1:** [Câu hỏi kỹ thuật đòi hỏi tác giả làm rõ cơ chế hoặc cung cấp thêm số liệu].
2. **Câu hỏi 2:** [Yêu cầu bổ sung thí nghiệm bóc tách hoặc chạy thêm hạt giống ngẫu nhiên].
3. **Đề xuất cải thiện:** [Góp ý cụ thể để tác giả hoàn thiện bài báo ở các phiên bản tiếp theo].

### 4.5. Đánh Giá Rủi Ro Đạo Đức & Tác Động Xã Hội (Ethical Concerns)
- Có vấn đề về vi phạm bản quyền dữ liệu, thiên vị định kiến xã hội, hoặc rủi ro sử dụng sai mục đích (Dual-use / Misuse) không?
- `[Không phát hiện vi phạm | Có điểm cần lưu ý: ...]`
