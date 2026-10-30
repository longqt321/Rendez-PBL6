---
id: "ERPF-TOOL-ASSESS-000"
title: "Khung Đánh Giá Năng Lực & Kiểm Định Chuyên Môn ERPF (Competency Assessment Master Framework)"
version: "1.0.0"
category: "GOV"
track: "CORE"
concept_type: "DOM"
intended_audience:
  - "Engineering Leads"
  - "Principal Researchers"
  - "Technical Mentors"
  - "AI Coding & Research Agents"
prerequisites:
  - "ERPF/PROJECT_CHARTER.md"
  - "ERPF/foundation/competencies.md"
related_concepts:
  - "ERPF-CORE-COMP-001"
  - "ERPF-TOOL-ASSESS-001"
  - "ERPF-TOOL-ASSESS-002"
applicable_contexts:
  - "Đánh giá mức độ thuần thục năng lực chuyên môn của kỹ sư, nhà nghiên cứu và AI agents"
  - "Thiết lập chuẩn mực đo lường năng lực hành vi quan sát được (Observable Behavioral Indicators)"
  - "Tổ chức kiểm định thực chiến thông qua các kịch bản đánh giá năng lực suy luận sâu"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "assessment"
  - "competency-evaluation"
  - "rubric"
  - "performance-levels"
  - "behavioral-indicators"
---

# Khung Đánh Giá Năng Lực & Kiểm Định Chuyên Môn ERPF
# Competency Assessment Master Framework

---

## 1. Triết Lý Đánh Giá Năng Lực Trong ERPF (Assessment Philosophy)

Trong hệ thống ERPF, việc đánh giá năng lực kỹ thuật và nghiên cứu **tuyệt đối không dựa trên khả năng học vẹt định nghĩa (Definition Recall)** hay việc trả lời các câu hỏi trắc nghiệm lý thuyết suông. Năng lực chuyên môn thực sự chỉ có thể được quan sát và thẩm định thông qua:
1. **Các chỉ báo hành vi chuyên môn quan sát được (Observable Behavioral Indicators)** trong quá trình làm việc thực tế trên mã nguồn, dữ liệu và văn bản kỹ thuật.
2. **Khả năng lập luận phản biện, cô lập biến và xử lý đánh đổi (Trade-off & Reasoning)** khi đối mặt với các tình huống phức tạp, dữ liệu mâu thuẫn hoặc sự cố kỹ thuật.
3. **Chất lượng của các tạo tác kỹ thuật đầu ra (Artifact Quality):** Đạt chuẩn về tính bất biến, độ sâu kiến trúc, tính toàn vẹn thực chứng và khả năng tái lập độc lập.

---

## 2. Thang Đo 4 Cấp Độ Năng Lực Chuẩn Hóa (The 4 Performance Levels)

Mọi đánh giá trong ERPF được chuẩn hóa trên thang đo 4 cấp độ tiệm tiến, không áp đặt các trọng số điểm số tùy tiện mà căn cứ vào hành vi chuyên môn thực tế:

```
[LEVEL 1: DEVELOPING]  -> Cần hướng dẫn, hay mắc bẫy triệu chứng, suy nghĩ cục bộ
       │
[LEVEL 2: COMPETENT]   -> Đạt chuẩn độc lập, tuân thủ quy trình, bảo toàn bất biến
       │
[LEVEL 3: PROFICIENT]  -> Thuần thục, tối ưu đánh đổi, phát hiện sớm rủi ro ngầm
       │
[LEVEL 4: ADVANCED]    -> Định hình chuẩn mực, dẫn dắt kiến trúc, mở rộng ranh giới
```

1. **Cấp độ 1: Đang Phát Triển (Developing):**
   - *Đặc điểm:* Hiểu khái niệm cơ bản nhưng thường xuyên bị đánh lừa bởi triệu chứng bề mặt. Cần sự giám sát và hướng dẫn của senior/lead. Thường áp dụng giải pháp máy móc, hay bỏ qua giá trị biên hoặc rò rỉ dữ liệu ngầm.
2. **Cấp độ 2: Đạt Chuẩn Năng Lực (Competent):**
   - *Đặc điểm:* Hoạt động độc lập trong các bài toán đã có tiền lệ. Tuân thủ nghiêm túc các quy trình kiểm thử, ranh giới tin cậy và giao thức đối chứng công bằng. Không phạm phải các lỗi sơ đẳng (không nuốt lỗi, không rò rỉ dữ liệu train/test).
3. **Cấp độ 3: Thuần Thục Chuyên Sâu (Proficient):**
   - *Đặc điểm:* Tự chủ xử lý các bài toán mơ hồ và phức tạp. Phân tích thành thạo các sự đánh đổi đa biến; phát hiện ra các điểm mù kiến trúc và hiện tượng học đường tắt (Clever Hans). Thiết kế được các mô-đun sâu và nghiên cứu bóc tách sắc sảo.
4. **Cấp độ 4: Xuất Sắc & Định Hình Chuẩn Mực (Advanced):**
   - *Đặc điểm:* Nhìn thấy các mẫu hình hệ thống rộng lớn, định hình chuẩn mực kiến trúc và phương pháp luận cho toàn tổ chức. Đào tạo và phản biện sắc bén; biến các thất bại phức tạp thành nguyên lý khái quát hóa dài hạn.

---

## 3. Bản Đồ Tài Liệu Đánh Giá Trong Thư Mục `erpf/toolkit/assessments/`

- [`erpf/toolkit/assessments/index.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/index.md) (`ERPF-TOOL-ASSESS-000`): Tài liệu chỉ mục và triết lý đánh giá toàn cục.
- [`erpf/toolkit/assessments/competency-evaluation-framework.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/competency-evaluation-framework.md) (`ERPF-TOOL-ASSESS-001`): Khung ma trận đánh giá chi tiết 4 cấp độ cho toàn bộ các năng lực dùng chung, kỹ thuật phần mềm và nghiên cứu AI.
- [`erpf/toolkit/assessments/practical-scenarios.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/practical-scenarios.md) (`ERPF-TOOL-ASSESS-002`): Bộ 8 kịch bản kiểm định thực chiến đo lường khả năng suy luận chuyên môn thực tế.
