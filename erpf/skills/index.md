---
id: "ERPF-CORE-SKILL-000"
title: "Kiến Trúc Kỹ Năng Tự Luận & Chỉ Mục Kỹ Năng Kỹ Thuật (Skill Architecture & Master Catalog)"
version: "1.0.0"
category: "GOV"
track: "CORE"
concept_type: "DOM"
intended_audience:
  - "Software Engineers"
  - "AI/ML Researchers"
  - "AI Coding & Research Agents"
  - "Tool & Platform Architects"
prerequisites:
  - "ERPF/PROJECT_CHARTER.md"
  - "ERPF/KNOWLEDGE_ARCHITECTURE.md"
  - "ERPF/foundation/philosophy.md"
  - "ERPF/foundation/competencies.md"
related_concepts:
  - "ERPF-CORE-COMP-001"
  - "ERPF-CORE-WORK-000"
  - "ERPF-CORE-PRIN-001"
applicable_contexts:
  - "Chuyển hóa tri thức trừu tượng thành các chỉ dẫn tự luận có thể thực thi bởi AI Agents (Agentic Skills)"
  - "Thiết lập cấu trúc gói kỹ năng chuẩn hóa (Skill Package Architecture)"
  - "Tra cứu và định vị toàn bộ kho kỹ năng dùng chung và kỹ thuật phần mềm của ERPF"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "skills-architecture"
  - "agentic-skills"
  - "master-catalog"
  - "standard-schema"
  - "evaluation-rubric"
---

# Kiến Trúc Kỹ Năng Tự Luận & Chỉ Mục Kỹ Năng Kỹ Thuật
# Skill Architecture & Master Skills Catalog

---

## 1. Triết Lý Kiến Trúc Kỹ Năng (Skill Architecture Philosophy)

Trong hệ thống **Engineering & Research Practice Framework (ERPF)**, một kỹ năng (*Skill*) không đơn thuần là một đoạn tài liệu mô tả khái niệm, mà là một **gói khả năng hành động độc lập, có thể thực thi được (Actionable, Executable Capability Package)** dành cho cả con người lẫn các tác nhân trí tuệ nhân tạo (AI Coding & Research Agents).

Kỹ năng giải quyết bài toán cốt tử: *"Khi đối mặt với nhiệm vụ X trong hoàn cảnh Y, agent/kỹ sư cần làm những bước tuần tự nào, dựa vào tiêu chí phán đoán nào, sử dụng công cụ gì, và kiểm chứng kết quả bằng cách nào để đạt chuẩn chuyên nghiệp cao nhất?"*.

---

## 2. Phân Định 5 Tầng Khái Niệm Trong Hệ Thống Kỹ Năng

Để tránh nhầm lẫn giữa lý thuyết và thực hành, ERPF phân định tuyệt đối giữa 5 tầng tạo tác:

```mermaid
flowchart TD
    subgraph Human_Tier [Tầng Tri Thức Con Người]
        Comp["1. Competency Documentation<br/>(foundation/competencies.md)<br/><i>Khả năng chuyên môn trừu tượng, tích hợp tư duy dài hạn</i>"]
    end

    subgraph Agentic_Execution_Tier [Tầng Thực Thi Tác Nhân (Skill Package)]
        Skill["2. Agent-Executable SKILL.md<br/><i>Chỉ dẫn hành động có cấu trúc, điều kiện kích hoạt & ranh giới an toàn</i>"]
        Ref["3. Technical References (REFERENCE.md)<br/><i>Liên kết trực tiếp tới nguyên lý, miền tri thức & workflows nền tảng</i>"]
        Ex["4. Practical Examples (EXAMPLES.md)<br/><i>Các ca đối chiếu thực tế (Before vs After) minh họa cách áp dụng</i>"]
        Eval["5. Evaluation Scenarios (EVALUATION.md)<br/><i>Bộ tiêu chí chấm điểm định lượng (Rubric) thẩm định chất lượng thực thi</i>"]
    end

    Comp -->|Chuyển hóa thành hành động| Skill
    Skill --> Ref
    Skill --> Ex
    Skill --> Eval
```

1. **Human-oriented Competency Documentation (`erpf/foundation/competencies.md`):** Tài liệu bản thể luận dành cho con người, mô tả năng lực là gì, tại sao quan trọng, các hành vi quan sát được và phương pháp rèn luyện dài hạn.
2. **Agent-executable `SKILL.md` Instructions:** Bản đặc tả hành động cốt lõi dành cho AI Agent, sử dụng ngôn ngữ chỉ dẫn mệnh lệnh trực tiếp, quy định điều kiện kích hoạt, ngữ cảnh đầu vào, các bước thao tác, tiêu chí ra quyết định, ranh giới an toàn và định dạng đầu ra.
3. **Supporting Technical References (`REFERENCE.md`):** Các con trỏ liên kết trực tiếp tới các tài liệu miền kỹ thuật (`architecture-design/`, `implementation-quality/`), nguyên lý suy luận (`core-principles.md`) và biểu mẫu (`toolkit/templates/`), tránh trùng lặp nội dung.
4. **Practical Examples (`EXAMPLES.md`):** Kịch bản thực tế minh họa cách áp dụng kỹ năng từ đầu vào đến đầu ra, bao gồm cả ví dụ thất bại cần tránh và ví dụ mẫu mực.
5. **Evaluation Scenarios (`EVALUATION.md`):** Thước đo kiểm định chất lượng gồm 3 cấp độ (Novice / Competent / Exemplary) và các ca kiểm thử giả lập giúp đo lường mức độ tuân thủ của agent.

---

## 3. Cấu Trúc Quy Chuẩn Của Một Gói Kỹ Năng (Standard Skill Package Layout)

Mỗi kỹ năng trong ERPF được tổ chức thành một thư mục riêng biệt với cấu trúc 4 tệp thống nhất:

```text
erpf/skills/[shared|software-engineering|ai-research]/[skill-name]/
├── SKILL.md          # [Bắt buộc] Bản đặc tả chỉ dẫn thực thi của Agent (YAML metadata + 11 mục chuẩn)
├── REFERENCE.md      # [Bắt buộc] Căn cứ lý thuyết, ánh xạ nguyên lý & tài liệu miền liên quan
├── EXAMPLES.md       # [Bắt buộc] Ví dụ thực tế minh họa cách thực thi trên mã nguồn / bài toán
└── EVALUATION.md     # [Bắt buộc] Kịch bản kiểm thử, tiêu chí đánh giá & rubric chấm điểm
```

### Cấu Trúc Bắt Buộc Của Tệp `SKILL.md` (Agent-Executable Schema)
Mỗi tệp `SKILL.md` bắt buộc phải có:
1. **YAML Frontmatter:** `name` (tên định danh kebab-case) và `description` (tóm tắt kích hoạt ngắn gọn 1-2 câu).
2. **Name & Metadata:** Mã ERPF ID, phiên bản, phân loại.
3. **Purpose (Mục đích cốt lõi):** Giải thích chính xác giá trị kỹ thuật mà kỹ năng mang lại.
4. **Activation Conditions (Điều kiện kích hoạt):** Khi nào agent phải chủ động kích hoạt kỹ năng này (từ khóa, triệu chứng, lệnh người dùng).
5. **Required Context (Ngữ cảnh đầu vào):** Các tệp mã nguồn, tài liệu, logs hoặc thông tin bắt buộc phải đọc trước khi hành động.
6. **Step-by-step Instructions (Quy trình hành động từng bước):** Chuỗi thao tác cụ thể, rõ ràng, chia theo từng pha logic.
7. **Decision Criteria (Tiêu chí phán đoán chuyên môn):** Bảng luật ra quyết định rẽ nhánh dựa trên dữ kiện quan sát được.
8. **Expected Outputs (Đầu ra kỳ vọng):** Các tạo tác kỹ thuật cụ thể (Diff, Report, Plan, Tests).
9. **Verification Requirements (Yêu cầu xác minh):** Cách thức kiểm chứng tính đúng đắn của kết quả trước khi bàn giao.
10. **Failure Modes & Anti-Patterns (Cảnh báo sai lầm):** Các hành vi cẩu thả hoặc bẫy tâm lý cần ngăn chặn.
11. **Safety & Scope Boundaries (Ranh giới an toàn):** Rào chắn bảo vệ hệ thống (chế độ Read-Only, không phá hủy, không vượt ranh giới).
12. **References to Supporting Knowledge:** Liên kết tới các tài liệu nền tảng tương ứng.

---

## 4. Chỉ Mục Toàn Bộ Kỹ Năng Đã Hiện Thực Hóa (Master Skills Catalog)

### A. Phân Hệ Kỹ Năng Dùng Chung (Shared Cross-Disciplinary Skills - 3 Kỹ Năng)
Phục vụ cả Kỹ sư Phần mềm và Nhà nghiên cứu AI:

| Mã Kỹ Năng | Tên Kỹ Năng | Thư Mục Triển Khai | Mục Tiêu Cốt Lõi |
| :--- | :--- | :--- | :--- |
| `ERPF-CORE-SKILL-001` | **Problem Formulation** | [`erpf/skills/shared/problem-formulation/`](file:///home/longtran/Projects/rendez-web/erpf/skills/shared/problem-formulation/SKILL.md) | Phân rã bài toán mơ hồ thành đặc tả kỹ thuật 5W2H có ranh giới rõ ràng |
| `ERPF-CORE-SKILL-002` | **Critical Technical Reasoning** | [`erpf/skills/shared/critical-technical-reasoning/`](file:///home/longtran/Projects/rendez-web/erpf/skills/shared/critical-technical-reasoning/SKILL.md) | Phản biện giả định ngầm, mổ xẻ rủi ro Pre-Mortem và kiểm định tính khả bác |
| `ERPF-CORE-SKILL-003` | **Evidence-Based Decision-Making** | [`erpf/skills/shared/evidence-based-decision-making/`](file:///home/longtran/Projects/rendez-web/erpf/skills/shared/evidence-based-decision-making/SKILL.md) | Phân loại cửa One-Way/Two-Way, lập ma trận đánh đổi có trọng số và ban hành ADR |

### B. Phân Hệ Kỹ Năng Kỹ Thuật Phần Mềm (Software Engineering Skills - 5 Kỹ Năng)
Chuyên biệt hóa cho các chu trình kỹ thuật phần mềm hướng sản phẩm:

| Mã Kỹ Năng | Tên Kỹ Năng | Thư Mục Triển Khai | Mục Tiêu Cốt Lõi |
| :--- | :--- | :--- | :--- |
| `ERPF-SE-SKILL-001` | **Codebase Exploration** | [`erpf/skills/software-engineering/codebase-exploration/`](file:///home/longtran/Projects/rendez-web/erpf/skills/software-engineering/codebase-exploration/SKILL.md) | Khảo sát hệ thống Read-Only, lần vết luồng dữ liệu & nhận diện khả năng sẵn có |
| `ERPF-SE-SKILL-002` | **Architecture Review** | [`erpf/skills/software-engineering/architecture-review/`](file:///home/longtran/Projects/rendez-web/erpf/skills/software-engineering/architecture-review/SKILL.md) | Đánh giá độ sâu module, khớp nối/kết dính, ranh giới DDD và ước lượng bán kính nổ |
| `ERPF-SE-SKILL-003` | **Debugging & Root Cause Analysis** | [`erpf/skills/software-engineering/debugging-root-cause/`](file:///home/longtran/Projects/rendez-web/erpf/skills/software-engineering/debugging-root-cause/SKILL.md) | Tái lập MRE tối thiểu, cô lập biến nhị phân và khóa lỗi bằng regression test |
| `ERPF-SE-SKILL-004` | **Testing Strategy Design** | [`erpf/skills/software-engineering/testing-strategy-design/`](file:///home/longtran/Projects/rendez-web/erpf/skills/software-engineering/testing-strategy-design/SKILL.md) | Thiết kế kim tự tháp kiểm thử, kiểm thử ranh giới tin cậy và chống flakiness |
| `ERPF-SE-SKILL-005` | **Performance Investigation** | [`erpf/skills/software-engineering/performance-investigation/`](file:///home/longtran/Projects/rendez-web/erpf/skills/software-engineering/performance-investigation/SKILL.md) | Đo lường thực chứng Measure-First, đọc flamegraph/trace và tối ưu hóa Pareto |

### C. Phân Hệ Kỹ Năng Nghiên Cứu Trí Tuệ Nhân Tạo (AI Research Skills - 7 Kỹ Năng)
Chuyên biệt hóa cho chu trình nghiên cứu thực nghiệm thực chứng và công bố học thuật:

| Mã Kỹ Năng | Tên Kỹ Năng | Thư Mục Triển Khai | Mục Tiêu Cốt Lõi |
| :--- | :--- | :--- | :--- |
| `ERPF-AI-SKILL-001` | **Literature Review & Synthesis** | [`erpf/skills/ai-research/literature-review-synthesis/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/literature-review-synthesis/SKILL.md) | Tìm kiếm y văn đa tầng, đọc 3 lượt, lập ma trận 10 cột và phát hiện research gaps |
| `ERPF-AI-SKILL-002` | **Research Problem & Hypothesis** | [`erpf/skills/ai-research/research-problem-hypothesis/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/research-problem-hypothesis/SKILL.md) | Định hình bài toán, thiết lập định nghĩa thao tác và giả thuyết khả bác Popper |
| `ERPF-AI-SKILL-003` | **Controlled Experiment Design** | [`erpf/skills/ai-research/controlled-experiment-design/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/controlled-experiment-design/SKILL.md) | Thiết kế đối chứng công bằng, cô lập biến gây nhiễu, tường lửa rò rỉ dữ liệu và đa seed |
| `ERPF-AI-SKILL-004` | **Model Evaluation & Metrics** | [`erpf/skills/ai-research/model-evaluation-metric-selection/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/model-evaluation-metric-selection/SKILL.md) | Đánh giá ngoài phân phối (OOD), tính Bootstrap 95% CI và phát hiện Clever Hans |
| `ERPF-AI-SKILL-005` | **Ablation Study Design** | [`erpf/skills/ai-research/ablation-study-design/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/ablation-study-design/SKILL.md) | Bóc tách độc lập Leave-One-Out / Add-One-In, kiểm soát capacity và đo lường tương tác phi tuyến |
| `ERPF-AI-SKILL-006` | **Failure & Error Analysis** | [`erpf/skills/ai-research/failure-error-analysis/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/failure-error-analysis/SKILL.md) | Phân tầng lỗi theo lát cắt, mổ xẻ theo bản thể 3 chiều (Data/Model/Eval) và tạo giả thuyết mới |
| `ERPF-AI-SKILL-007` | **Reproducibility & Paper Review** | [`erpf/skills/ai-research/reproducibility-paper-review/`](file:///home/longtran/Projects/rendez-web/erpf/skills/ai-research/reproducibility-paper-review/SKILL.md) | Kiểm toán NeurIPS checklist, rà soát ma trận Claims-to-Evidence, phản biện 4 trục và rebuttal |

---

## 5. Quy Chuẩn Vận Hành & Bảo Vệ An Toàn Workspace

- **Không can thiệp cấu hình toàn cục (Global Configuration):** Mọi kỹ năng trong thư mục này được lưu trữ độc lập trong kho tri thức `erpf/skills/`, không ghi đè cấu hình agent toàn cục tại máy người dùng.
- **Tuân thủ ranh giới an toàn tuyệt đối:** Mọi `SKILL.md` đều có mục `Safety & Scope Boundaries`, nghiêm cấm hành vi tự ý phá hủy mã nguồn, xóa dữ liệu hoặc chạy lệnh có nguy cơ vượt quyền.
