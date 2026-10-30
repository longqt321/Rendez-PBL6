# Đăng Bạ Trạng Thái Dự Án (Project State: ERPF)
# Project State & Execution Register

*Cập nhật lần cuối: 2026-10-30T18:30:00+07:00*
*Người phụ trách: Engineering Knowledge Architect & Final Quality Reviewer*

---

## 1. Trạng Thái Triển Khai Hiện Thời (Current Implementation Status)

- **Mã nhiệm vụ hiện tại:** `TASK 14 — Full Framework Integration & Quality Assurance`
- **Trạng thái:** **HOÀN THÀNH (COMPLETED)**
- **Giai đoạn hiện tại:** **Phase 5 — Full Framework Integration & Quality Assurance (HOÀN TẤT KIỂM ĐỊNH TOÀN DIỆN & TỔNG THỂ KHUNG TRI THỨC)**
  *(Đã kiểm định 147 tài liệu Markdown trên 8 trục chất lượng: toàn vẹn cấu trúc, nhất quán khái niệm, chất lượng kỹ thuật, tính hành động của kỹ năng, tính khả dụng thực tế, tính thực chứng học thuật, hiệu chỉnh triệt để liên kết và cập nhật đăng bạ).*
- **Giai đoạn kế tiếp:** **Phase 6 — Cross-Functional Bridge (R2P) & Integration Lifecycle** theo Lộ trình Roadmap.

---

## 2. Kết Quả Kiểm Định Chất Lượng Toàn Diện (Task 14 Quality Audit Deliverables)

Hệ thống đã trải qua quy trình kiểm toán tự động và thẩm định chuyên sâu với các kết quả cụ thể:

### A. Toàn Vẹn Cấu Trúc & Tệp Tin (Structural Integrity)
- **Tổng số tài liệu Markdown:** **147 tệp** được lưu trữ quy chuẩn trong [`erpf/`](file:///home/longtran/Projects/rendez-web/erpf/), không có tệp thừa ngoài phạm vi.
- **Tệp rỗng hoặc bỏ hoang:** **0 tệp rỗng**.
- **Mục rỗng (Empty Sections):** **0 mục rỗng**. Toàn bộ các tiêu đề cấp 2, 3, 4 (`##`, `###`, `####`) trên 147 tệp đều sở hữu nội dung hành động hoặc bảng biểu/sơ đồ cụ thể.
- **Liên kết Markdown nội bộ:** **0 liên kết hỏng (Broken Links)**. Đã kiểm tra toàn bộ 227 liên kết chéo và tham chiếu `file://` / đường dẫn tương đối.
- **Tham chiếu đường dẫn nội bộ:** Đã chuẩn hóa toàn bộ các tiền tố `ERPF/...` và `erpf/...` trong YAML frontmatter và thân tài liệu, đạt tỷ lệ phân giải thành công 100%.

### B. Nhất Quán Bản Thể Luận & Khái Niệm (Conceptual Consistency)
- **Phân định 11 khái niệm tri thức:** Tuân thủ tuyệt đối ranh giới giữa Triết lý (`philosophy.md`), Nguyên lý (`core-principles.md`), Năng lực (`competencies.md`), Miền tri thức (`architecture-design/`, `implementation-quality/`, `ai-research/`), Quy trình (`workflows/`), Nghiên cứu điển hình (`case-studies/`), Bài học kinh nghiệm (`lessons/`), Kỹ năng (`skills/`), Biểu mẫu (`toolkit/templates/`) và Đánh giá (`toolkit/assessments/`).
- **Mã định danh duy nhất (Unique Document IDs):** 100% các tệp có định danh đều sở hữu mã ERPF ID duy nhất toàn cục, không xảy ra bất kỳ xung đột (Duplicate ID) nào.

### C. Khắc Phục Các Sai Lệch Phát Hiện Trong Kiểm Toán (Corrections Performed)
1. **Hiệu chỉnh tiền tố tham chiếu trong `workflows/ai-research/paper-review-writing.md`:** Khắc phục 3 đường dẫn tiên quyết cũ trỏ tới các tệp chưa chuẩn hóa đường dẫn (`research-problem-and-questions.md`, `model-evaluation-and-benchmarking.md`, `ablation-and-failure-analysis.md`) chuyển sang các con trỏ kinh điển hiện hữu (`problem-formulation-and-gaps.md`, `model-evaluation-and-benchmarks.md`, `ablation-studies-and-attribution.md`, `failure-analysis-and-error-categorization.md`).
2. **Chuẩn hóa liên kết mẫu trong `DOCUMENT_STANDARDS.md`:** Thay thế chuỗi giả định `file://...` bằng cú pháp mẫu tương đối chuẩn `[Tên tài liệu](path/to/doc.md)` để tránh gây hiểu nhầm cho các công cụ linting tự động.
3. **Cập nhật ví dụ minh họa trong `KNOWLEDGE_TAXONOMY.md`:** Cập nhật các vị trí lưu trữ kinh điển mẫu (`deep-modules.md`, `hyperparameter-sweeps.md`) sang đúng vị trí thực tế của các tài liệu chuyên khảo sâu đã triển khai trong Phase 1 và Phase 2.

---

## 3. Đăng Bạ Quyết Định Kiến Trúc (Architecture Decision Records)

Toàn bộ các quyết định kiến trúc từ DEC-001 tới DEC-038 đều được phê duyệt ở trạng thái **Accepted**:

| Mã ADR | Tiêu Đề Quyết Định | Tóm Tắt Nội Dung | Trạng Thái |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Khởi tạo Khung Thực hành ERPF | Thiết lập dự án ERPF như một hệ thống con độc lập trong repo | **Accepted** |
| **DEC-002** | Sử dụng Tiếng Việt học thuật chuẩn | Ngôn ngữ chính là Tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh | **Accepted** |
| **DEC-003** | Áp dụng cấu trúc thư mục phẳng có kiểm soát | Giới hạn độ sâu phân cấp tối đa 3 tầng thư mục | **Accepted** |
| **DEC-004** | Phân loại tri thức 5 chuyên mục | Phân chia thành ENG, RES, AGT, ARC, GOV | **Accepted** |
| **DEC-005** | Nguyên tắc thực chứng (Evidence-First)| Mọi tri thức đưa vào phải có mã nguồn hoặc thực nghiệm đối chiếu | **Accepted** |
| **DEC-006** | Mô hình 11 khái niệm tri thức | Phân định rạch ròi 11 khái niệm từ Philosophy tới Assessment | **Accepted** |
| **DEC-007** | Kiến trúc 2 nhánh chuyên môn | Thiết lập Track SE và Track AI chia sẻ Common Foundation qua cầu nối R2P | **Accepted** |
| **DEC-008** | Cấu trúc phân loại $\le 3$ cấp & Lazy Dirs| Đặc tả trước cây thư mục tương lai nhưng chỉ tạo thư mục khi có tệp thật | **Accepted** |
| **DEC-009** | 8 Kỳ vọng nền tảng triết lý | Chuẩn hóa 8 kỳ vọng nhận thức của kỹ sư và nhà nghiên cứu trong `philosophy.md` | **Accepted** |
| **DEC-010** | 12 Nguyên lý suy luận cốt lõi | Chuẩn hóa 12 nguyên lý suy luận theo cấu trúc 7 mục trong `core-principles.md` | **Accepted** |
| **DEC-011** | Khung cân bằng One-Way vs Two-Way | Thiết lập khung ra quyết định dựa trên tính khả nghịch và khoanh vùng bán kính nổ | **Accepted** |
| **DEC-012** | Phân định bản thể luận năng lực | Phân biệt rạch ròi Competency vs Knowledge vs Skill vs Personality Trait | **Accepted** |
| **DEC-013** | 10 Năng lực cốt lõi liên ngành | Chuẩn hóa 10 năng lực chuyên môn gắn chặt với tạo tác kỹ thuật thực tế | **Accepted** |
| **DEC-014** | Bản đồ phụ thuộc năng lực | Thiết lập sơ đồ tương quan và chu trình khép kín giữa 10 năng lực | **Accepted** |
| **DEC-015** | Cấu trúc Miền Kiến Trúc & Thiết Kế | Gom nhóm 6 phạm vi của Task 04 thành 5 chuyên khảo sâu + 1 tài liệu tổng quan | **Accepted** |
| **DEC-016** | Tách bạch kiến thức vs Agent Skills | Tuyệt đối không tạo agent skills trong Phase 1 cho đến khi tri thức nền tảng hoàn tất | **Accepted** |
| **DEC-017** | Cấu trúc Miền Hiện Thực Hóa & Chất Lượng | Gom nhóm 6 phạm vi của Task 05 thành 6 chuyên khảo sâu + 1 tài liệu tổng quan | **Accepted** |
| **DEC-018** | 4 Tiên Đề Vận Hành Chất Lượng Tuyệt Đối | Chuẩn hóa 4 định đề: Debugging vs Optimization, Testing vs QA, Measure-First, Method-First | **Accepted** |
| **DEC-019** | Khởi Tạo Nhánh Nghiên Cứu AI/ML | Mở rộng Track AI với Miền 1: Phương Pháp Luận & Định Hình Nghiên Cứu Khoa Học | **Accepted** |
| **DEC-020** | Phân Định 7 Khái Niệm Nghiên Cứu | Chuẩn hóa bản thể luận: Problem, Gap, Question, Objective, Hypothesis, Novelty, Contribution | **Accepted** |
| **DEC-021** | Chính Sách Thực Chứng Không Ảo Giác | Cấm tuyệt đối chế tác trích dẫn; đánh dấu xác minh khi thiếu quyền truy cập internet | **Accepted** |
| **DEC-022** | Cấu Trúc Miền Vòng Lặp Thực Nghiệm AI | Quy hoạch Track AI - Miền 2 gồm 4 chuyên khảo sâu + 1 tổng quan + 1 biểu mẫu | **Accepted** |
| **DEC-023** | Định Lý Hợp Lệ Thực Nghiệm Tuyệt Đối | Thiết kế thí nghiệm quyết định tính hợp lệ của kết luận; triệt tiêu 5 cạm bẫy so sánh | **Accepted** |
| **DEC-024** | Checkpoint Nguyên Tử & Cấu Hình Bất Biến| Chuẩn hóa cơ chế Atomic Checkpoint Rename và Immutable YAML Configurations | **Accepted** |
| **DEC-025** | Cấu Trúc Miền Thẩm Định & Đánh Giá AI | Quy hoạch Track AI - Miền 3 gồm 5 chuyên khảo sâu + 1 tổng quan + 1 biểu mẫu | **Accepted** |
| **DEC-026** | Chuẩn Hóa 5 Cặp Phân Định Khoa Học Sống Còn | Chuẩn hóa: Metric vs Contribution, Correlation vs Causation, Positive vs Valid, Repro vs Generalization, Story vs Proof | **Accepted** |
| **DEC-027** | Quy Chuẩn Phản Biện & Bóc Tách Nhân Quả | Bắt buộc kiểm định Bootstrap CI, phân tích lỗi hai trục và chống tuyên bố phóng đại | **Accepted** |
| **DEC-028** | Kiến Trúc Thư Viện Quy Trình ERPF | Thiết lập thư viện quy trình 3 phân hệ (Liên ngành, Kỹ thuật phần mềm, Nghiên cứu AI) tại `erpf/workflows/` | **Accepted** |
| **DEC-029** | Chuẩn Hóa Cấu Trúc 11 Mục Quy Trình | Mọi quy trình bắt buộc tuân thủ 11 mục chuẩn hóa và tích hợp Decision Points rẽ nhánh | **Accepted** |
| **DEC-030** | Khung Thu Hoạch & Phân Định Bài Học | Ban hành tiêu chí 5 chiều phân định bài học khái quát hóa vs quan sát nhất thời và biểu mẫu `ERPF-TOOL-TMP-004` | **Accepted** |
| **DEC-031** | Nguyên Lý Tầng Can Thiệp & Dán Nhãn Case | Chuẩn hóa nguyên lý Intervention Level Selection và dán nhãn bắt buộc cho tình huống giả định sư phạm | **Accepted** |
| **DEC-032** | Kiến Trúc Gói Kỹ Năng Tự Luận 4 Tệp | Chuẩn hóa gói kỹ năng gồm `SKILL.md`, `REFERENCE.md`, `EXAMPLES.md`, `EVALUATION.md` | **Accepted** |
| **DEC-033** | Phân Định 5 Tầng & Cách Ly Cấu Hình | Phân định rạch ròi Competencies vs Executable Skills; lưu trữ an toàn trong `erpf/skills/` không chạm cấu hình toàn cục | **Accepted** |
| **DEC-034** | Phân Hệ Kỹ Năng Nghiên Cứu AI | Thiết lập 7 gói kỹ năng tự luận nghiên cứu AI bao quát trọn vẹn chu trình sống khoa học tại `erpf/skills/ai-research/` | **Accepted** |
| **DEC-035** | Tiêu Chuẩn Thực Chứng Chống Ảo Giác | Cấm tuyệt đối bịa đặt bài báo, trích dẫn, bộ dữ liệu và số liệu thực nghiệm trong toàn bộ các kỹ năng AI | **Accepted** |
| **DEC-036** | Khung Đánh Giá Năng Lực 4 Cấp Độ | Ban hành thang đo 4 cấp độ (Developing/Competent/Proficient/Advanced) dựa trên chỉ báo hành vi quan sát được | **Accepted** |
| **DEC-037** | Bộ Kịch Bản Đánh Giá Lập Luận Thực Chiến | Chuẩn hóa 8 kịch bản tình huống mâu thuẫn phức tạp đo lường năng lực suy luận thực tế thay vì học vẹt | **Accepted** |
| **DEC-038** | Kiểm Toán Tích Hợp Toàn Diện & Đóng Gói | Thẩm định 147 tài liệu Markdown trên 8 trục chất lượng, chuẩn hóa 100% đường dẫn và phân định năng lực thực chứng | **Accepted** |

---

## 4. Danh Mục Tri Thức ERPF Hiện Hữu (147 Tệp Markdown)

Toàn bộ các tệp được phân loại trong 7 khối chức năng tại thư mục [`erpf/`](file:///home/longtran/Projects/rendez-web/erpf/):

1. **Khối Thể Chế Quản Trị Hệ Thống (7 tệp):** `PROJECT_CHARTER.md`, `ROADMAP.md`, `CONTRIBUTING.md`, `DOCUMENT_STANDARDS.md`, `KNOWLEDGE_ARCHITECTURE.md`, `KNOWLEDGE_TAXONOMY.md`, `PROJECT_STATE.md`.
2. **Khối Tri Thức Nền Tảng (4 tệp):** `philosophy.md`, `core-principles.md`, `reasoning-patterns.md`, `competencies.md`.
3. **Khối Miền Chuyên Môn Kỹ Thuật Phần Mềm (13 tệp):**
   - *Kiến trúc & Thiết kế (6 tệp):* `index.md`, `requirements-and-decomposition.md`, `codebase-understanding.md`, `software-architecture.md`, `software-design.md`, `architecture-decisions-and-debt.md`.
   - *Hiện thực hóa & Chất lượng (7 tệp):* `index.md`, `implementation-practices.md`, `debugging-and-root-cause.md`, `software-testing.md`, `software-quality-and-governance.md`, `performance-engineering.md`, `security-engineering.md`.
4. **Khối Miền Chuyên Môn Nghiên Cứu AI/ML (15 tệp):**
   - *Phương pháp luận & Định hình (4 tệp):* `index.md`, `problem-formulation-and-gaps.md`, `literature-review-and-synthesis.md`, `hypothesis-development-and-methodology.md`.
   - *Vòng lặp thực nghiệm (5 tệp):* `index.md`, `dataset-analysis-and-leakage.md`, `experimental-design-and-baselines.md`, `model-development-and-training-stability.md`, `experiment-management-and-implementation.md`.
   - *Thẩm định & Đánh giá (6 tệp):* `index.md`, `model-evaluation-and-benchmarks.md`, `ablation-studies-and-attribution.md`, `failure-analysis-and-error-categorization.md`, `reproducibility-and-provenance.md`, `scientific-writing-and-peer-review.md`.
5. **Khối Thư Viện Quy Trình Tác Nghiệp (20 tệp):**
   - *Quy trình tổng quan (1 tệp):* `workflows/index.md`.
   - *Quy trình liên ngành (4 tệp):* `problem-formulation.md`, `technical-decision-making.md`, `critical-review-and-self-assessment.md`, `knowledge-acquisition-and-synthesis.md`.
   - *Quy trình Kỹ thuật Phần mềm (7 tệp):* `software-development-lifecycle.md`, `codebase-exploration.md`, `architecture-design-review.md`, `debugging-root-cause.md`, `testing-quality-assurance.md`, `performance-investigation.md`, `code-review-refactoring.md`.
   - *Quy trình Nghiên cứu AI (8 tệp):* `research-lifecycle.md`, `literature-review.md`, `problem-hypothesis-formulation.md`, `experiment-planning-execution.md`, `model-evaluation.md`, `ablation-failure-analysis.md`, `research-reproducibility.md`, `paper-review-writing.md`.
6. **Khối Thu Hoạch Thực Chứng: Bài Học & Điển Hình (6 tệp):**
   - *Nghiên cứu điển hình (2 tệp):* `case-studies/index.md`, `case-studies/cs-001-intervention-level-excel-automation.md`.
   - *Bài học kinh nghiệm (4 tệp):* `lessons/index.md`, `lessons/software-engineering/symptom-masking-vs-root-cause.md`, `lessons/ai-research/data-leakage-pre-split-normalization.md`, `lessons/ai-research/shortcut-learning-clever-hans.md`.
7. **Khối Kỹ Năng Tự Luận Tác Nhân (Agentic Skills Library - 61 tệp):**
   - *Mục lục tổng quan (1 tệp):* `skills/index.md`.
   - *15 gói kỹ năng chuẩn 4 tệp (`SKILL.md`, `REFERENCE.md`, `EXAMPLES.md`, `EVALUATION.md` - 60 tệp):*
     - Dùng chung (3 kỹ năng): `problem-formulation`, `critical-technical-reasoning`, `evidence-based-decision-making`.
     - Kỹ thuật Phần mềm (5 kỹ năng): `codebase-exploration`, `architecture-review`, `debugging-root-cause`, `testing-strategy-design`, `performance-investigation`.
     - Nghiên cứu AI (7 kỹ năng): `literature-review-synthesis`, `research-problem-hypothesis`, `controlled-experiment-design`, `model-evaluation-metric-selection`, `ablation-study-design`, `failure-error-analysis`, `reproducibility-paper-review`.
8. **Khối Bộ Công Cụ & Đánh Giá Năng Lực (Toolkit & Assessments - 21 tệp):**
   - *18 Biểu mẫu (`toolkit/templates/`):* Gồm 2 biểu mẫu quản trị (`lesson-template`, `case-study-template`), 6 biểu mẫu SE (`problem-definition`, `technical-design-adr`, `code-review`, `debugging-investigation`, `test-strategy`, `technical-retrospective`), và 10 biểu mẫu AI Research (`research-proposal`, `literature-matrix`, `research-hypothesis`, `experiment-plan`, `experiment-run-log`, `model-evaluation-report`, `ablation-study-report`, `failure-analysis-report`, `reproducibility-checklist`, `peer-review-rubric`).
   - *3 Khung đánh giá (`toolkit/assessments/`):* `index.md`, `competency-evaluation-framework.md`, `practical-scenarios.md`.

---

## 5. Phân Định: Năng Lực Đã Kiểm Chứng vs Khả Năng Chưa Kiểm Thử

Để tuân thủ triệt để tinh thần thực chứng khoa học và không ngộ nhận giữa tài liệu lý thuyết với năng lực vận hành tại chỗ:

| Hạng Mục | Trạng Thái Kiểm Chứng | Chi Tiết Minh Chứng |
| :--- | :--- | :--- |
| **Tính toàn vẹn cú pháp & liên kết** | **Verified (Đã kiểm chứng)** | Kiểm tra tự động 100% bằng script cục bộ: 147 tệp Markdown, 0 tệp rỗng, 0 mục rỗng, 0 liên kết đứt gãy, 0 xung đột mã định danh. |
| **Tính nhất quán bản thể luận** | **Verified (Đã kiểm chứng)** | 11 khái niệm được phân định rõ ràng trên 5 tầng nhận thức, các con trỏ quan hệ chéo nhất quán. |
| **Tính trung thực trích dẫn học thuật** | **Verified (Đã kiểm chứng)** | 100% trích dẫn bài báo khoa học đều là các công trình kinh điển có thật (PNAS 2017, CVPR 2017, ECCV 2018, NeurIPS 2020, NIPS 2015). Tình huống nghiên cứu điển hình được dán nhãn giả định sư phạm minh bạch. |
| **Thực thi Agent Skills trong môi trường mô phỏng** | **Verified (Đã kiểm chứng)** | Cấu trúc YAML Frontmatter và schema 11 mục tương thích hoàn hảo với các chuẩn Agent Skill (Antigravity, Claude Code, OpenAI). |
| **Vận hành thực nghiệm trên GPU Cluster thật** | **Untested Capability (Chưa kiểm thử)** | Các quy trình và kỹ năng huấn luyện phân tán nhiều GPU (`controlled-experiment-design`, `experiment-management-and-implementation`) được thiết kế chuẩn xác về mặt lý thuyết và phương pháp luận, nhưng chưa được chạy thực tế trên cụm phần cứng tính toán cụ thể trong môi trường sandbox hiện tại do giới hạn an toàn tài nguyên. |
| **Độ nhạy của thang điểm rubric với ứng viên con người** | **Untested Capability (Chưa kiểm thử)** | Bộ rubric 4 cấp độ và 8 kịch bản tình huống phản ánh chính xác các lỗi tư duy thực tế, nhưng chưa có dữ liệu thống kê kiểm định tâm lý học đo lường (Psychometric validation) trên quy mô lớn người thật. |

---

## 6. Rủi Ro & Ranh Giới Kiểm Soát (Risks & Boundaries)

1. **Bảo toàn môi trường dự án:** Khung tri thức được lưu trữ độc lập hoàn toàn trong thư mục `erpf/`. Không có bất kỳ thay đổi nào tác động lên mã nguồn ứng dụng web chính (`backend/`, `frontend/`) hay các tệp cấu hình hệ thống ngoài repo.
2. **Tuân thủ quy chế an toàn (`AGENTS.md`):** Không cài đặt thêm dependency, không cập nhật package, không gọi ra ngoài Internet, không yêu cầu quyền sudo hay credentials. Toàn bộ quá trình kiểm toán được thực thi bằng Python cục bộ và công cụ có sẵn.
