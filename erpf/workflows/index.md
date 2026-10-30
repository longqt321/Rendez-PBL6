---
id: "ERPF-CORE-WORK-000"
title: "Thư Viện Quy Trình Chuyên Môn ERPF (Professional Workflow Library Overview)"
version: "1.0.0"
category: "GOV"
track: "CORE"
concept_type: "WORK"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "AI Coding and Research Agents"
prerequisites:
  - "ERPF/foundation/philosophy.md"
  - "ERPF/foundation/core-principles.md"
  - "ERPF/foundation/competencies.md"
related_concepts:
  - "ERPF-CORE-COMP-001"
applicable_contexts:
  - "Điều phối các hoạt động kỹ thuật và nghiên cứu phức tạp theo quy trình chuẩn"
  - "Cung cấp rào chắn an toàn và các cổng kiểm soát chất lượng (Quality Gates)"
  - "Hướng dẫn ra quyết định chuyên môn cho kỹ sư và tác nhân AI tự chủ"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "workflows"
  - "process-architecture"
  - "quality-gates"
  - "decision-points"
  - "standard-operating-procedures"
---

# Thư Viện Quy Trình Chuyên Môn ERPF
# Professional Workflow Library Overview

---

## 1. Triết Lý Thiết Kế Quy Trình (Workflow Philosophy)

Một quy trình chuyên môn (Professional Workflow) trong ERPF **không phải là một kịch bản mệnh lệnh bất di bất dịch (Rigid Checklist)** biến con người hoặc tác nhân AI thành những cỗ máy thừa hành mù quáng.

Quy trình là **bản đồ chỉ đường (Navigational Guide)**:
1. **Tôn trọng phán đoán chuyên môn (Professional Judgment):** Quy trình chỉ rõ những nơi đòi hỏi sự cân nhắc, đánh giá đánh đổi và trực giác kỹ thuật.
2. **Không nhân bản tri thức chi tiết:** Quy trình chỉ đóng vai trò điều phối dòng chảy hoạt động; các nguyên lý và kỹ thuật chuyên sâu được liên kết trực tiếp tới các tài liệu miền tri thức (`DOM`) đã được phê duyệt.
3. **Cổng kiểm soát chất lượng bắt buộc (Quality Gates):** Giữa các giai đoạn luôn có các điều kiện kiểm tra (Entry/Exit Criteria) nhằm đảm bảo không chuyển giao rủi ro sang giai đoạn tiếp theo.

---

## 2. Bản Đồ Thư Viện Quy Trình (Workflow Library Taxonomy)

Thư viện bao gồm 19 quy trình chuyên sâu được phân bổ thành 3 phân hệ kỷ luật:

```mermaid
graph TD
    subgraph Cross_Disciplinary [Phân Hệ 1: Quy Trình Liên Ngành (Cross-Disciplinary)]
        W_CD1["1. Định Hình & Thấu Hiểu Bài Toán<br/>(problem-formulation.md)"]
        W_CD2["2. Ra Quyết Định Kỹ Thuật<br/>(technical-decision-making.md)"]
        W_CD3["3. Phản Biện & Tự Đánh Giá<br/>(critical-review-and-self-assessment.md)"]
        W_CD4["4. Tiếp Thu & Tổng Hợp Tri Thức<br/>(knowledge-acquisition-and-synthesis.md)"]
    end

    subgraph Software_Engineering [Phân Hệ 2: Kỹ Thuật Phần Mềm (Software Engineering)]
        W_SE1["1. Chu Trình Phát Triển Phần Mềm (SDLC)<br/>(software-development-lifecycle.md)"]
        W_SE2["2. Khám Phá & Định Hướng Codebase<br/>(codebase-exploration.md)"]
        W_SE3["3. Thẩm Định Kiến Trúc & Thiết Kế<br/>(architecture-design-review.md)"]
        W_SE4["4. Chẩn Đoán Lỗi & Nguyên Nhân Gốc<br/>(debugging-root-cause.md)"]
        W_SE5["5. Kiểm Thử & Đảm Bảo Chất Lượng<br/>(testing-quality-assurance.md)"]
        W_SE6["6. Điều Tra & Tối Ưu Hiệu Năng<br/>(performance-investigation.md)"]
        W_SE7["7. Review Mã Nguồn & Tái Cấu Trúc<br/>(code-review-refactoring.md)"]
    end

    subgraph AI_Research [Phân Hệ 3: Nghiên Cứu Trí Tuệ Nhân Tạo (AI Research)]
        W_AI1["1. Chu Trình Nghiên Cứu AI Tổng Thể<br/>(research-lifecycle.md)"]
        W_AI2["2. Khảo Sát Y Văn Học Thuật<br/>(literature-review.md)"]
        W_AI3["3. Định Hình Giả Thuyết Khoa Học<br/>(problem-hypothesis-formulation.md)"]
        W_AI4["4. Lập Kế Hoạch & Chạy Thực Nghiệm<br/>(experiment-planning-execution.md)"]
        W_AI5["5. Thẩm Định Mô Hình & Benchmark<br/>(model-evaluation.md)"]
        W_AI6["6. Nghiên Cứu Bóc Tách & Phân Tích Lỗi<br/>(ablation-failure-analysis.md)"]
        W_AI7["7. Kiểm Chứng Khả Năng Tái Lập<br/>(research-reproducibility.md)"]
        W_AI8["8. Soạn Thảo & Phản Biện Bài Báo<br/>(paper-review-writing.md)"]
    end

    Cross_Disciplinary --> Software_Engineering
    Cross_Disciplinary --> AI_Research
```

---

## 3. Cấu Trúc Quy Chuẩn Của Từng Văn Bản Quy Trình (Standard Schema)

Mỗi quy trình trong thư viện bắt buộc phải tuân thủ cấu trúc 11 mục:
1. **Mục Đích (Purpose):** Xác định lý do tồn tại và kết quả kỳ vọng.
2. **Điều Kiện Tiên Quyết (Preconditions):** Các yêu cầu bắt buộc phải thỏa mãn trước khi bắt đầu.
3. **Dữ Liệu Đầu Vào (Inputs):** Tài nguyên, dữ liệu và văn bản cần thiết.
4. **Kết Quả Đầu Ra Kỳ Vọng (Expected Outputs):** Các tạo tác kỹ thuật hoặc tri thức được sinh ra.
5. **Các Giai Đoạn Chính (Main Stages):** Chuỗi các bước hành động cụ thể.
6. **Điểm Ra Quyết Định Rẽ Nhánh (Decision Points):** Nơi phán đoán chuyên môn quyết định hướng đi.
7. **Phương Pháp & Kỹ Thuật Áp Dụng (Methods & Techniques):** Liên kết tới các tài liệu kỹ thuật chuyên sâu.
8. **Các Dạng Thất Bại & Sai Lầm Thường Gặp (Common Failure Modes):** Cảnh báo bẫy tâm lý và sai sót kỹ thuật.
9. **Cổng Kiểm Soát Chất Lượng (Quality Checkpoints):** Tiêu chuẩn nghiệm thu từng chặng.
10. **Lộ Trình Thay Thế / Thoát Hiểm (Alternative Paths):** Lối đi an toàn khi gặp bế tắc.
11. **Nguyên Lý & Năng Lực Liên Quan (Relevant Principles & Competencies):** Ánh xạ tới `ERPF-CORE-PRIN-001` và `ERPF-CORE-COMP-001`.
