# Hệ Thống Phân Loại & Cấu Trúc Tri Thức (Knowledge Taxonomy)
# Knowledge Taxonomy & Directory Specification: ERPF

---

## 1. Nguyên Tắc Thiết Kế Cấu Trúc (Taxonomy Design Tenets)

1. **Độ Sâu Tối Ưu (Optimal Depth $\le 3$ Cấp):** Hạn chế tối đa việc lồng ghép thư mục quá sâu (tối đa 3 cấp), giúp cả con người và AI Agent điều hướng trực diện và định vị tệp tức thì.
2. **Loại Trừ Lẫn Nhau & Không Chồng Lấn (Mutual Exclusivity):** Mỗi tài liệu chỉ thuộc về một vị trí lưu trữ kinh điển (Canonical Location) duy nhất. Các khía cạnh giao thoa đa ngành được liên kết thông qua hệ thống Thẻ phân loại đa chiều (Facet Tags).
3. **Mô-đun Sâu Thay Vì Phân Mảnh (Cohesive Deep Docs):** Tuyệt đối không tạo tài liệu rời rạc cho từng khái niệm vụn vặt; gom nhóm các nguyên lý và kỹ thuật liên quan chặt chẽ vào các cẩm nang thực hành toàn diện.
4. **Không Tạo Thư Mục Rỗng Hình Thức:** Cấu trúc thư mục được đặc tả chi tiết trong tài liệu này; các thư mục chỉ được tạo lập trên đĩa vật lý khi có tài liệu thực chất tương ứng trong các pha triển khai tiếp theo (Phase 1 đến Phase 5).

---

## 2. Hệ Thống Định Danh & Mã Phân Loại (Classification Codes)

Mỗi đơn vị tri thức trong ERPF được định danh duy nhất theo cú pháp:
`ERPF-[TRACK]-[TYPE]-[ID]`

### 2.1. Mã Nhánh Chuyên Môn (Track Codes)
- **`CORE`**: Nền tảng chung, triết lý, nguyên lý tư duy và chuẩn mực quản trị.
- **`SE`**: Nhánh Kỹ thuật Phần mềm (Software Engineering Track).
- **`AI`**: Nhánh Nghiên cứu AI/ML và Học sâu (AI Research Track).
- **`AGT`**: Nhánh Tác nhân AI, kỹ năng và quy trình tự luận (Agentic Practice).
- **`R2P`**: Nhánh Cầu nối Nghiên cứu vào Sản phẩm (Research-to-Production).

### 2.2. Mã Loại Khái Niệm Tri Thức (Concept Type Codes)
- **`PHIL`**: Philosophy (Triết lý)
- **`PRIN`**: Principles (Nguyên lý)
- **`COMP`**: Competencies (Năng lực)
- **`DOM`**: Knowledge Domains (Miền tri thức)
- **`PRAC`**: Practices & Methods (Thực hành & Phương pháp)
- **`SKILL`**: Skills (Kỹ năng)
- **`WORK`**: Workflows (Quy trình công việc)
- **`LESS`**: Lessons (Bài học kinh nghiệm)
- **`CASE`**: Case Studies (Nghiên cứu điển hình)
- **`TEMP`**: Templates (Biểu mẫu)
- **`ASSESS`**: Assessments (Đánh giá)

*Ví dụ:* `ERPF-CORE-PRIN-001` (Nguyên lý Thực chứng), `ERPF-SE-COMP-002` (Năng lực Thiết kế Module Sâu), `ERPF-AI-SKILL-004` (Kỹ năng Quét Siêu Tham Số).

---

## 3. Bản Đặc Tả Cấu Trúc Thư Mục Cho Các Pha Tiếp Theo (Future Directory Layout)

Dưới đây là cấu trúc thư mục quy chuẩn sẽ được hiện thực hóa tuần tự từ Phase 1 đến Phase 5:

```text
erpf/
├── PROJECT_CHARTER.md              # [Phase 0 - Đã tạo] Tôn chỉ, phạm vi & nguyên tắc cốt lõi
├── ROADMAP.md                      # [Phase 0 - Đã tạo] Lộ trình 6 giai đoạn triển khai
├── PROJECT_STATE.md                # [Phase 0 - Đã tạo] Đăng bạ trạng thái & nhật ký quyết định
├── CONTRIBUTING.md                 # [Phase 0 - Đã tạo] Quy chế đóng góp & chuẩn chất lượng
├── KNOWLEDGE_ARCHITECTURE.md       # [Phase 0 - Đã tạo] Mô hình 11 khái niệm & 2 nhánh chuyên môn
├── KNOWLEDGE_TAXONOMY.md           # [Phase 0 - Đã tạo] Bản đặc tả phân loại & cấu trúc thư mục
├── DOCUMENT_STANDARDS.md           # [Phase 0 - Đã tạo] Metadata schema & mẫu tài liệu chuẩn
│
├── foundation/                     # [Phase 1] Tầng tri thức nền tảng dùng chung
│   ├── philosophy.md               # Triết lý thực chứng, tự chủ và cộng sinh người - máy
│   ├── core-principles.md          # Các nguyên lý suy luận và ra quyết định kỹ thuật cốt lõi
│   └── reasoning-patterns.md       # Các mẫu hình lập luận, phản bác và giải quyết nghịch lý
│
├── software-engineering/          # [Phase 1] Nhánh chuyên môn Kỹ thuật Phần mềm
│   ├── architecture-design/        # Mô-đun sâu, ranh giới DDD, Clean Monolith, interface design
│   ├── verification-testing/       # TDD cycles, invariant assertions, concurrency, testing boundaries
│   ├── refactoring-maintenance/    # Refactoring via seams, debt containment, code review protocols
│   └── operational-engineering/    # Idempotent services, zero-downtime migrations, storage patterns
│
├── ai-research/                    # [Phase 2] Nhánh chuyên môn Nghiên Cứu AI/ML
│   ├── methodology/                # Structured literature review, hypothesis formulation, research ethics
│   ├── empirical-loop/             # Data split integrity, feature hygiene, training tracking, sweeps
│   ├── evaluation-harness/         # Test harness design, leakage prevention, benchmark suites
│   └── analysis-reproducibility/   # Ablation studies, failure mode taxonomy, reproducibility audits
│
├── agentic-practice/               # [Phase 3] Nhánh Tác Nhân AI & Kỹ Năng Tự Luận
│   ├── operating-contracts/        # Ranh giới vận hành an toàn, guardrails chống phá hủy
│   ├── skills-catalog/             # Kho kỹ năng chuẩn hóa (symlinks/docs tới SKILL.md)
│   └── cold-start-protocols/       # Quy trình định hướng agent mới không cần bộ nhớ hội thoại
│
├── cross-functional/               # [Phase 4] Cầu nối đa ngành Nghiên cứu - Sản phẩm (R2P)
│   ├── model-to-code/              # Đóng gói mô hình, serving contracts, quantization, latency budget
│   └── multi-agent-workflows/      # Quy trình phối hợp đa tác nhân (Swarm coordination)
│
└── toolkit/                        # [Phases 1-5] Biểu mẫu tái sử dụng & Bộ công cụ đánh giá
    ├── templates/                  # Biểu mẫu ADR, Experiment Plan, Diagnosis Report, Post-mortem
    └── assessments/                # Bộ câu hỏi kiểm tra Cold-Start, checklist nghiệm thu chất lượng
```

### Tiêu Chí Bao Hàm & Mục Đích Từng Thư Mục (Inclusion Criteria & Purpose)

| Thư Mục Cấp 1 & 2 | Mục Đích Kỹ Thuật | Tiêu Chí Bao Hàm (Inclusion Criteria) |
|---|---|---|
| `foundation/` | Định hình tư duy nền tảng cho cả 2 nhánh chuyên môn và AI agents | Chứa các triết lý, nguyên lý suy luận logic chung, không phụ thuộc vào công nghệ cụ thể |
| `software-engineering/` | Chuẩn hóa toàn bộ chu trình phát triển phần mềm chất lượng cao | Chỉ chứa các thực hành, phương pháp luận và kỹ thuật kỹ thuật phần mềm hướng sản phẩm |
| `ai-research/` | Chuẩn hóa chu trình nghiên cứu thực nghiệm thực chứng AI/ML | Chỉ chứa các phương pháp nghiên cứu, thiết kế thực nghiệm, harness đánh giá và phân tích mô hình |
| `agentic-practice/` | Tối ưu hóa hiệu năng và độ tin cậy của AI Coding/Research Agents | Chứa hợp đồng vận hành, chỉ dẫn kỹ năng chuẩn (`SKILL.md`) và giao thức khởi động lạnh |
| `cross-functional/` | Cầu nối kỹ thuật giữa nhóm nghiên cứu và nhóm kỹ sư phần mềm (R2P) | Chỉ chứa các quy trình tích hợp mô hình vào hệ thống, tối ưu độ trễ và phối hợp đa tác nhân |
| `toolkit/` | Cung cấp tài nguyên hỗ trợ công việc và công cụ thẩm định khách quan | Chứa các biểu mẫu điền sẵn (templates) và bộ tiêu chí/công cụ đánh giá (assessments) |

---

## 4. Kiểm Chứng Hệ Thống Phân Loại (Taxonomy Validation)

Để chứng minh tính chặt chẽ, không chồng lấn và tính thực tế của hệ thống phân loại, dưới đây là kiểm chứng cụ thể trên 3 trường hợp đại diện:

### Trường Hợp 1: Nguyên Lý Suy Luận Chung (General Reasoning Principle)
- **Tên đơn vị tri thức:** *Thực Chứng Thay Vì Giả Định (Evidence Over Assumptions)*
- **Mã định danh:** `ERPF-CORE-PRIN-001`
- **Vị trí lưu trữ kinh điển:** `erpf/foundation/core-principles.md` (khối `### Principle: Evidence Over Assumptions`)
- **Phân loại 11 khái niệm:** **Principles (Nguyên lý)**
- **Nhánh chuyên môn:** **Common Foundation (`CORE`)**
- **Độ sâu phân cấp:** Cấp 2 (`erpf/foundation/`)
- **Đối tượng thụ hưởng:** Cả 3 nhóm (Software Engineers, AI Researchers, AI Agents).
- **Thẻ liên kết đa chiều (Facet Tags):** `[reasoning, epistemology, verification, evidence-first]`
- **Quan hệ tương tác:** Chỉ đạo phương pháp phát triển kiểm thử trong `software-engineering/` và phương pháp kiểm định giả thuyết trong `ai-research/`.
- **Đánh giá kiểm chứng:** Hoàn toàn hợp lý, là điểm tựa triết học cho toàn bộ hệ thống mà không bị trói buộc vào một công cụ cụ thể.

### Trường Hợp 2: Năng Lực Kỹ Thuật Phần Mềm (Software Engineering Competency)
- **Tên đơn vị tri thức:** *Thiết Kế Mô-Đun Sâu & Giảm Thiểu Phụ Thuộc (Deep Module Design & Decoupling)*
- **Mã định danh:** `ERPF-SE-COMP-001`
- **Vị trí lưu trữ kinh điển:** `erpf/software-engineering/architecture-design/software-design.md`
- **Phân loại 11 khái niệm:** **Competencies (Năng lực)** & **Practices (Thực hành)**
- **Nhánh chuyên môn:** **Software Engineering Track (`SE`)**
- **Độ sâu phân cấp:** Cấp 3 (`erpf/software-engineering/architecture-design/`)
- **Đối tượng thụ hưởng:** Software Engineers & AI Coding Agents.
- **Thẻ liên kết đa chiều (Facet Tags):** `[se, architecture, deep-modules, interface-design, ddd]`
- **Quan hệ tương tác:** Kế thừa nguyên lý `ERPF-CORE-PRIN-002` (Mô-đun sâu & Giao diện hẹp); kích hoạt kỹ năng `codebase-design/SKILL.md`; đánh giá qua bài test chất lượng module trong `toolkit/assessments/`.
- **Đánh giá kiểm chứng:** Tách biệt rõ ràng với nghiên cứu AI, tập trung vào tính bảo trì và giảm tải nhận thức (cognitive load) của mã nguồn.

### Trường Hợp 3: Kỹ Năng Nghiên Cứu AI/ML (AI Research Skill)
- **Tên đơn vị tri thức:** *Quét Siêu Tham Số Có Khả Năng Tái Lập (Reproducible Hyperparameter Sweep & Tracking)*
- **Mã định danh:** `ERPF-AI-SKILL-001`
- **Vị trí lưu trữ kinh điển:** `erpf/ai-research/empirical-loop/experiment-management-and-implementation.md` (đồng thời đóng gói chỉ dẫn agent tại `erpf/skills/ai-research/controlled-experiment-design/SKILL.md`)
- **Phân loại 11 khái niệm:** **Skills (Kỹ năng)** & **Methods (Phương pháp)**
- **Nhánh chuyên môn:** **AI Research Track (`AI`)**
- **Độ sâu phân cấp:** Cấp 3 (`erpf/ai-research/empirical-loop/`)
- **Đối tượng thụ hưởng:** AI/ML Researchers & AI Research Agents.
- **Thẻ liên kết đa chiều (Facet Tags):** `[ai, ml, reproducibility, hyperparameter-tuning, experiments]`
- **Quan hệ tương tác:** Thực thi quy trình `ERPF-AI-WORK-001` (Chu trình thực nghiệm thực chứng); sử dụng biểu mẫu `ERPF-TEMP-002` (Kế hoạch thực nghiệm); kiểm tra rò rỉ dữ liệu qua `ERPF-AI-PRAC-003`.
- **Đánh giá kiểm chứng:** Rất cụ thể, có thể thực thi tự động bởi agent, độc lập với kỹ thuật phần mềm web thông thường.
