---
id: "ERPF-TOOL-TMP-020"
title: "Biểu Mẫu Đề Cương Nghiên Cứu Khoa Học AI/ML (AI/ML Research Proposal Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "Research Scientists"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/methodology/problem-formulation-and-gaps.md"
related_concepts:
  - "ERPF-AI-DOM-001"
  - "ERPF-AI-WORK-001"
  - "ERPF-AI-SKILL-002"
applicable_contexts:
  - "Khởi tạo đề xuất dự án nghiên cứu khoa học học máy / học sâu mới"
  - "Đệ trình kế hoạch nghiên cứu xin phê duyệt tài nguyên tính toán (GPU compute budget)"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "research-proposal"
  - "research-questions"
  - "scientific-methodology"
  - "compute-budget"
---

# Biểu Mẫu Đề Cương Nghiên Cứu Khoa Học AI/ML
# AI/ML Research Proposal Template

---

## 1. Thông Tin Chung Đề Tài (Proposal Metadata)
- **Tên Đề Tài (Project Title):** [Tên đề tài khoa học súc tích, phản ánh rõ bài toán và cơ chế nghiên cứu]
- **Nhà Nghiên Cứu Chính (Principal Investigator / Lead):** [Tên tác giả / Agent]
- **Lĩnh Vực Chuyên Sâu:** [Computer Vision / NLP / Multimodal / Graph ML / Continual Learning]
- **Ngân Sách Tài Nguyên Ước Tính:** [Ví dụ: 250 GPU hours NVIDIA A100]
- **Thời Gian Dự Kiến:** [X tuần / tháng]

---

## 2. Bối Cảnh & Khoảng Trống Y Văn (Background & Literature Gap)
*Trình bày ngắn gọn bối cảnh khoa học và chỉ ra lỗ hổng phương pháp luận bản chất mà các công trình trước chưa giải quyết được:*

- **Bối cảnh khoa học:** [Mô tả trạng thái hiện tại của lĩnh vực]
- **Lỗ hổng y văn đã xác minh (Verified Research Gap):** [Chỉ rõ vì sao các giải pháp hiện hành thất bại về mặt cơ chế, trích dẫn đối chiếu từ Literature Matrix `ERPF-TOOL-TMP-001`]

---

## 3. Câu Hỏi Nghiên Cứu & Giả Thuyết Khoa Học (Research Questions & Hypotheses)
- **Câu hỏi nghiên cứu chính (Primary RQ):** [Phát biểu câu hỏi khoa học rõ ràng, không trùng với câu hỏi kỹ thuật triển khai]
- **Giả thuyết khoa học cốt lõi (Core Hypothesis):**
  > *Nếu [Áp dụng cơ chế can thiệp X], thì [Quan sát thấy hiệu ứng định lượng Y], bởi vì [Cơ sở lý thuyết / Bất biến bản chất Z].*
- **Tiêu chuẩn bác bỏ (Falsification Threshold):** [Chỉ số định lượng cụ thể mà nếu không đạt được, giả thuyết bị coi là sai và bác bỏ]

---

## 4. Phương Pháp Luận Dự Kiến (Proposed Methodology)
- **Kiến trúc / Mô hình toán học:** [Sơ đồ khối khái niệm và mô tả công thức hàm mục tiêu]
- **Bộ dữ liệu đánh giá:** [Tên các benchmark công khai tiêu chuẩn]
- **Các baseline đối chứng bắt buộc:** [Tối thiểu 3 baseline mạnh nhất hiện nay trong cùng bài toán]

---

## 5. Kế Hoạch Phân Bổ Tài Nguyên & Rủi Ro (Resource Allocation & Risks)

| Hạng Mục | Yêu Cầu Tài Nguyên | Biện Pháp Kiểm Soát Rủi Ro |
| :--- | :--- | :--- |
| **Dữ liệu & Tiền xử lý** | [Kích thước lưu trữ GB] | [Kiểm tra rò rỉ dữ liệu, license công khai] |
| **Huấn luyện mô hình** | [Số lượng GPU, VRAM tối thiểu] | [Lưu checkpoint nguyên tử, early stopping] |
| **Đánh giá & Bóc tách** | [Số seed chạy thực nghiệm $\ge 3$] | [Tự động hóa qua script reproducible] |
