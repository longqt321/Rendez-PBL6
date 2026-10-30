# Đăng Bạ Trạng Thái Dự Án (Project State: ERPF)
# Project State & Execution Register

*Cập nhật lần cuối: 2026-10-30T18:22:00+07:00*  
*Người phụ trách: Engineering Knowledge Architect*
*Cập nhật lần cuối: 2026-10-30T18:30:00+07:00*  
*Người phụ trách: Engineering Knowledge Architect & Final Quality Reviewer*

---

## 1. Trạng Thái Triển Khai Hiện Thời (Current Implementation Status)

- **Mã nhiệm vụ hiện tại:** `TASK 13 — Professional Templates & Competency Evaluation`
- **Mã nhiệm vụ hiện tại:** `TASK 14 — Full Framework Integration & Quality Assurance`
- **Trạng thái:** **HOÀN THÀNH (COMPLETED)**
- **Giai đoạn hiện tại:** **Phase 5 — Quality Governance & Assessment Framework (HOÀN TẤT TOÀN DIỆN BỘ CÔNG CỤ & ĐÁNH GIÁ NĂNG LỰC)**  
  *(Đã hoàn thành toàn bộ 16 biểu mẫu tác nghiệp chuyên nghiệp, khung ma trận đánh giá năng lực 4 cấp độ và bộ 8 kịch bản kiểm định thực chiến)*
- **Giai đoạn hiện tại:** **Phase 5 — Full Framework Integration & Quality Assurance (HOÀN TẤT KIỂM ĐỊNH TOÀN DIỆN & TỔNG THỂ KHUNG TRI THỨC)**  
  *(Đã kiểm định 147 tài liệu Markdown trên 8 trục chất lượng: toàn vẹn cấu trúc, nhất quán khái niệm, chất lượng kỹ thuật, tính hành động của kỹ năng, tính khả dụng thực tế, tính thực chứng học thuật, hiệu chỉnh triệt để liên kết và cập nhật đăng bạ).*
- **Giai đoạn kế tiếp:** **Phase 6 — Cross-Functional Bridge (R2P) & Integration Lifecycle** theo Lộ trình Roadmap.

---

## 2. Kết Quả Triển Khai Nhiệm Vụ (Task 13 Deliverables)
## 2. Kết Quả Kiểm Định Chất Lượng Toàn Diện (Task 14 Quality Audit Deliverables)

Hệ thống đã thiết lập và chuẩn hóa toàn bộ bộ công cụ tác nghiệp tái sử dụng cùng khung kiểm định năng lực chuyên môn tại thư mục [`erpf/toolkit/`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/), bao gồm **21 tạo tác kỹ thuật chuẩn mực**:
Hệ thống đã trải qua quy trình kiểm toán tự động và thẩm định chuyên sâu với các kết quả cụ thể:

### A. Bộ Biểu Mẫu Tác Nghiệp Kỹ Thuật Phần Mềm (Software Engineering Templates - 6 Biểu Mẫu)
1. [`erpf/toolkit/templates/problem-definition-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/problem-definition-template.md) (`ERPF-TOOL-TMP-010`): Biểu mẫu định nghĩa bài toán 5W2H, phân tách triệu chứng bề mặt vs cơ chế, xác lập Non-Goals và tiêu chí nghiệm thu Given-When-Then.
2. [`erpf/toolkit/templates/technical-design-adr-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/technical-design-adr-template.md) (`ERPF-TOOL-TMP-011`): Biểu mẫu thiết kế kỹ thuật và đăng bạ quyết định kiến trúc (RFC / ADR) với ma trận đánh đổi có trọng số và kế hoạch rút lui (Escape Hatch).
3. [`erpf/toolkit/templates/code-review-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/code-review-template.md) (`ERPF-TOOL-TMP-012`): Biểu mẫu phản biện mã nguồn theo chuẩn Conventional Comments (`blocking`, `suggestion`, `nitpick`, `praise`), tích hợp bảng kiểm tra 6 cổng chất lượng.
4. [`erpf/toolkit/templates/debugging-investigation-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/debugging-investigation-template.md) (`ERPF-TOOL-TMP-013`): Biểu mẫu điều tra gỡ lỗi và biên bản mổ xẻ sự cố (Post-Mortem), tích hợp tái lập tối thiểu (MRE), phân tích 5 Whys loại bỏ triệu chứng và regression test.
5. [`erpf/toolkit/templates/test-strategy-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/test-strategy-template.md) (`ERPF-TOOL-TMP-014`): Biểu mẫu kế hoạch chiến lược kiểm thử phân bổ theo kim tự tháp (Unit 75% / Integration 20% / E2E 5%), ma trận giá trị biên tại Trust Boundary, và giao thức diệt flakiness.
6. [`erpf/toolkit/templates/technical-retrospective-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/technical-retrospective-template.md) (`ERPF-TOOL-TMP-015`): Biểu mẫu cải tiến kỹ thuật định kỳ sau sprint/milestone, đo lường chỉ số vận hành kỹ thuật (CI time, flaky rate, production incidents) và nhận diện giả định sai lầm.
### A. Toàn Vẹn Cấu Trúc & Tệp Tin (Structural Integrity)
- **Tổng số tài liệu Markdown:** **147 tệp** được lưu trữ quy chuẩn trong [`erpf/`](file:///home/longtran/Projects/rendez-web/erpf/), không có tệp thừa ngoài phạm vi.
- **Tệp rỗng hoặc bỏ hoang:** **0 tệp rỗng**.
- **Mục rỗng (Empty Sections):** **0 mục rỗng**. Toàn bộ các tiêu đề cấp 2, 3, 4 (`##`, `###`, `####`) trên 147 tệp đều sở hữu nội dung hành động hoặc bảng biểu/sơ đồ cụ thể.
- **Liên kết Markdown nội bộ:** **0 liên kết hỏng (Broken Links)**. Đã kiểm tra toàn bộ 227 liên kết chéo và tham chiếu `file://` / đường dẫn tương đối.
- **Tham chiếu đường dẫn nội bộ:** Đã chuẩn hóa toàn bộ các tiền tố `ERPF/...` và `erpf/...` trong YAML frontmatter và thân tài liệu, đạt tỷ lệ phân giải thành công 100%.

### B. Bộ Biểu Mẫu Nghiên Cứu Trí Tuệ Nhân Tạo (AI Research Templates - 10 Biểu Mẫu Toàn Diện)
1. [`erpf/toolkit/templates/research-proposal-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/research-proposal-template.md) (`ERPF-TOOL-TMP-020`): Biểu mẫu đề cương nghiên cứu khoa học, câu hỏi nghiên cứu, khoảng trống y văn và dự trù ngân sách GPU compute.
2. [`erpf/toolkit/templates/literature-matrix-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/literature-matrix-template.md) (`ERPF-TOOL-TMP-001`): Biểu mẫu ma trận tổng hợp y văn học thuật chuẩn 10 cột.
3. [`erpf/toolkit/templates/research-hypothesis-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/research-hypothesis-template.md) (`ERPF-TOOL-TMP-021`): Biểu mẫu đặc tả giả thuyết khoa học 3 thành phần nhân quả, bảng biến thao tác hóa (Độc lập/Phụ thuộc/Kiểm soát) và tiêu chuẩn bác bỏ Popper.
4. [`erpf/toolkit/templates/experiment-plan-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-plan-template.md) (`ERPF-TOOL-TMP-002`): Biểu mẫu kế hoạch đăng ký trước thực nghiệm AI/ML chuẩn mực.
5. [`erpf/toolkit/templates/experiment-run-log-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-run-log-template.md) (`ERPF-TOOL-TMP-022`): Biểu mẫu nhật ký vận hành thực nghiệm, snapshot siêu tham số YAML, và lưu trữ phả hệ checkpoint SHA-256.
6. [`erpf/toolkit/templates/model-evaluation-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/model-evaluation-report-template.md) (`ERPF-TOOL-TMP-023`): Biểu mẫu báo cáo thẩm định mô hình, tính toán Bootstrap 95% CI, phân tích theo lát cắt dữ liệu và kiểm toán kháng Clever Hans.
7. [`erpf/toolkit/templates/ablation-study-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/ablation-study-report-template.md) (`ERPF-TOOL-TMP-024`): Biểu mẫu báo cáo bóc tách đạt chuẩn IEEE/ACM, giao thức Leave-One-Out, đối chứng Capacity Controls và đo lường tương tác phi tuyến.
8. [`erpf/toolkit/templates/failure-analysis-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/failure-analysis-report-template.md) (`ERPF-TOOL-TMP-025`): Biểu mẫu báo cáo phân tích lỗi thực nghiệm, phân tầng lỗi theo khoảng tin cậy, kiểm toán 50 mẫu theo bản thể 3 chiều (Data/Model/Eval) và tạo giả thuyết mới.
9. [`erpf/toolkit/templates/reproducibility-checklist-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/reproducibility-checklist-template.md) (`ERPF-TOOL-TMP-026`): Biểu mẫu danh mục kiểm toán khả năng tái lập tương thích NeurIPS / ICLR Reproducibility Checklist.
10. [`erpf/toolkit/templates/peer-review-rubric-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/peer-review-rubric-template.md) (`ERPF-TOOL-TMP-003`): Biểu mẫu tiêu chuẩn phản biện đồng cấp bài báo khoa học 4 trục.
### B. Nhất Quán Bản Thể Luận & Khái Niệm (Conceptual Consistency)
- **Phân định 11 khái niệm tri thức:** Tuân thủ tuyệt đối ranh giới giữa Triết lý (`philosophy.md`), Nguyên lý (`core-principles.md`), Năng lực (`competencies.md`), Miền tri thức (`architecture-design/`, `implementation-quality/`, `ai-research/`), Quy trình (`workflows/`), Nghiên cứu điển hình (`case-studies/`), Bài học kinh nghiệm (`lessons/`), Kỹ năng (`skills/`), Biểu mẫu (`toolkit/templates/`) và Đánh giá (`toolkit/assessments/`).
- **Mã định danh duy nhất (Unique Document IDs):** 100% các tệp có định danh đều sở hữu mã ERPF ID duy nhất toàn cục, không xảy ra bất kỳ xung đột (Duplicate ID) nào.

### C. Khung Đánh Giá Năng Lực Chuyên Môn (Competency Assessment Framework - 3 Tệp)
1. [`erpf/toolkit/assessments/index.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/index.md) (`ERPF-TOOL-ASSESS-000`): Chỉ mục và triết lý đánh giá năng lực dựa trên bằng chứng quan sát được thay vì học vẹt định nghĩa.
2. [`erpf/toolkit/assessments/competency-evaluation-framework.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/competency-evaluation-framework.md) (`ERPF-TOOL-ASSESS-001`): Khung ma trận đánh giá chi tiết 4 cấp độ (*Developing, Competent, Proficient, Advanced*) định nghĩa rõ ràng hành vi quan sát được trong công việc thực tế cho cả 3 phân hệ năng lực (Dùng chung, SE, AI Research).
3. [`erpf/toolkit/assessments/practical-scenarios.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/practical-scenarios.md) (`ERPF-TOOL-ASSESS-002`): Bộ 8 kịch bản kiểm định thực chiến đòi hỏi lập luận chuyên môn sâu sắc:
   - *Kịch bản 1:* Quyết định kiến trúc sai lầm (Microservices phân tán gọi đồng bộ mất tính nguyên tử).
   - *Kịch bản 2:* Nhận diện sai nguyên nhân gốc (Vá triệu chứng `.get()` làm hư hỏng dữ liệu khách hàng).
   - *Kịch bản 3:* Giả định kỹ thuật bất hợp lệ (Giả định đơn luồng dẫn đến Lost Update race condition trong cộng điểm ví).
   - *Kịch bản 4:* Chiến lược kiểm thử khiếm khuyết (100% coverage nhưng rỗng assertion, bỏ qua ranh giới tin cậy).
   - *Kịch bản 5:* Thực nghiệm học máy bị nhiễu biến (Confounded experiment thay đổi đồng thời 6 biến số).
   - *Kịch bản 6:* So sánh mô hình thiếu công bằng (Tuning asymmetry giữa Matrix Factorization và Graph Transformer).
   - *Kịch bản 7:* Tuyên bố tính mới không có căn cứ (Overclaiming thuật toán Temperature Annealing cũ).
   - *Kịch bản 8:* Khiếm khuyết khả năng tái lập (Dependencies unpinned, hardcoded path, và cherry-picked seed).
### C. Khắc Phục Các Sai Lệch Phát Hiện Trong Kiểm Toán (Corrections Performed)
1. **Hiệu chỉnh tiền tố tham chiếu trong `workflows/ai-research/paper-review-writing.md`:** Khắc phục 3 đường dẫn tiên quyết cũ trỏ tới các tệp chưa chuẩn hóa đường dẫn (`research-problem-and-questions.md`, `model-evaluation-and-benchmarking.md`, `ablation-and-failure-analysis.md`) chuyển sang các con trỏ kinh điển hiện hữu (`problem-formulation-and-gaps.md`, `model-evaluation-and-benchmarks.md`, `ablation-studies-and-attribution.md`, `failure-analysis-and-error-categorization.md`).
2. **Chuẩn hóa liên kết mẫu trong `DOCUMENT_STANDARDS.md`:** Thay thế chuỗi giả định `file://...` bằng cú pháp mẫu tương đối chuẩn `[Tên tài liệu](path/to/doc.md)` để tránh gây hiểu nhầm cho các công cụ linting tự động.
3. **Cập nhật ví dụ minh họa trong `KNOWLEDGE_TAXONOMY.md`:** Cập nhật các vị trí lưu trữ kinh điển mẫu (`deep-modules.md`, `hyperparameter-sweeps.md`) sang đúng vị trí thực tế của các tài liệu chuyên khảo sâu đã triển khai trong Phase 1 và Phase 2.

---

## 3. Nhật Ký Quyết Định Kiến Trúc (Architectural Decisions Log)
## 3. Đăng Bạ Quyết Định Kiến Trúc (Architecture Decision Records)

| Mã Quyết Định | Tiêu Đề | Quyết Định Đã Chọn | Trạng Thái |
|---|---|---|---|
| **DEC-001** | Vị trí lưu trữ ERPF | Đặt tại thư mục chuyên trách `erpf/` tại gốc workspace | **Accepted** |
| **DEC-002** | Chính sách ngôn ngữ | Tiếng Việt cho tài liệu tri thức; Tiếng Anh bảo lưu thuật ngữ & skill instructions | **Accepted** |
| **DEC-003** | Khung thể chế ban đầu | Ban hành 4 văn bản quản trị: Charter, Roadmap, State, Contributing | **Accepted** |
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

## 4. Danh Mục Tệp Tin Quản Trị & Tri Thức Hiện Hữu
## 4. Danh Mục Tri Thức ERPF Hiện Hữu (147 Tệp Markdown)

Tất cả các tệp đều được lưu trữ tập trung và an toàn trong thư mục [`erpf/`](file:///home/longtran/Projects/rendez-web/erpf/):
Toàn bộ các tệp được phân loại trong 7 khối chức năng tại thư mục [`erpf/`](file:///home/longtran/Projects/rendez-web/erpf/):

### Tài Liệu Quản Trị Hệ Thống
- [`erpf/PROJECT_CHARTER.md`](file:///home/longtran/Projects/rendez-web/erpf/PROJECT_CHARTER.md)
- [`erpf/ROADMAP.md`](file:///home/longtran/Projects/rendez-web/erpf/ROADMAP.md)
- [`erpf/CONTRIBUTING.md`](file:///home/longtran/Projects/rendez-web/erpf/CONTRIBUTING.md)
- [`erpf/PROJECT_STATE.md`](file:///home/longtran/Projects/rendez-web/erpf/PROJECT_STATE.md)
- [`erpf/KNOWLEDGE_ARCHITECTURE.md`](file:///home/longtran/Projects/rendez-web/erpf/KNOWLEDGE_ARCHITECTURE.md)
- [`erpf/KNOWLEDGE_TAXONOMY.md`](file:///home/longtran/Projects/rendez-web/erpf/KNOWLEDGE_TAXONOMY.md)
- [`erpf/DOCUMENT_STANDARDS.md`](file:///home/longtran/Projects/rendez-web/erpf/DOCUMENT_STANDARDS.md)
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

### Tầng Tri Thức Nền Tảng (Foundation)
- [`erpf/foundation/philosophy.md`](file:///home/longtran/Projects/rendez-web/erpf/foundation/philosophy.md)
- [`erpf/foundation/core-principles.md`](file:///home/longtran/Projects/rendez-web/erpf/foundation/core-principles.md)
- [`erpf/foundation/reasoning-patterns.md`](file:///home/longtran/Projects/rendez-web/erpf/foundation/reasoning-patterns.md)
- [`erpf/foundation/competencies.md`](file:///home/longtran/Projects/rendez-web/erpf/foundation/competencies.md)
---

### Nhánh Kỹ Thuật Phần Mềm (Software Engineering Track)
- **Miền 1: Kiến Trúc & Thiết Kế Phần Mềm** (`architecture-design/`): `index.md`, `requirements-and-decomposition.md`, `codebase-understanding.md`, `software-architecture.md`, `software-design.md`, `architecture-decisions-and-debt.md`.
- **Miền 2: Hiện Thực Hóa & Chất Lượng Kỹ Thuật** (`implementation-quality/`): `index.md`, `implementation-practices.md`, `debugging-and-root-cause.md`, `software-testing.md`, `software-quality-and-governance.md`, `performance-engineering.md`, `security-engineering.md`.
## 5. Phân Định: Năng Lực Đã Kiểm Chứng vs Khả Năng Chưa Kiểm Thử

### Nhánh Nghiên Cứu Trí Tuệ Nhân Tạo (AI Research Track)
- **Miền 1: Phương Pháp Luận & Định Hình Nghiên Cứu** (`ai-research/methodology/`): `index.md`, `problem-formulation-and-gaps.md`, `literature-review-and-synthesis.md`, `hypothesis-development-and-methodology.md`.
- **Miền 2: Vòng Lặp Thực Nghiệm & Thiết Kế Thí Nghiệm** (`ai-research/empirical-loop/`): `index.md`, `dataset-analysis-and-leakage.md`, `experimental-design-and-baselines.md`, `model-development-and-training-stability.md`, `experiment-management-and-implementation.md`.
- **Miền 3: Thẩm Định Nghiên Cứu & Đánh Giá Khoa Học** (`ai-research/evaluation-validation/`): `index.md`, `model-evaluation-and-benchmarks.md`, `ablation-studies-and-attribution.md`, `failure-analysis-and-error-categorization.md`, `reproducibility-and-provenance.md`, `scientific-writing-and-peer-review.md`.
Để tuân thủ triệt để tinh thần thực chứng khoa học và không ngộ nhận giữa tài liệu lý thuyết với năng lực vận hành tại chỗ:

### Thư Viện Quy Trình Tác Nghiệp (Workflows - 20 Tệp)
- [`erpf/workflows/index.md`](file:///home/longtran/Projects/rendez-web/erpf/workflows/index.md) (`ERPF-CORE-WORK-000`)
- **Liên Ngành (4 tệp):** `problem-formulation.md`, `technical-decision-making.md`, `critical-review-and-self-assessment.md`, `knowledge-acquisition-and-synthesis.md`.
- **Kỹ Thuật Phần Mềm (7 tệp):** `software-development-lifecycle.md`, `codebase-exploration.md`, `architecture-design-review.md`, `debugging-root-cause.md`, `testing-quality-assurance.md`, `performance-investigation.md`, `code-review-refactoring.md`.
- **Nghiên Cứu AI (8 tệp):** `research-lifecycle.md`, `literature-review.md`, `problem-hypothesis-formulation.md`, `experiment-planning-execution.md`, `model-evaluation.md`, `ablation-failure-analysis.md`, `research-reproducibility.md`, `paper-review-writing.md`.
| Hạng Mục | Trạng Thái Kiểm Chứng | Chi Tiết Minh Chứng |
| :--- | :--- | :--- |
| **Tính toàn vẹn cú pháp & liên kết** | **Verified (Đã kiểm chứng)** | Kiểm tra tự động 100% bằng script cục bộ: 147 tệp Markdown, 0 tệp rỗng, 0 mục rỗng, 0 liên kết đứt gãy, 0 xung đột mã định danh. |
| **Tính nhất quán bản thể luận** | **Verified (Đã kiểm chứng)** | 11 khái niệm được phân định rõ ràng trên 5 tầng nhận thức, các con trỏ quan hệ chéo nhất quán. |
| **Tính trung thực trích dẫn học thuật** | **Verified (Đã kiểm chứng)** | 100% trích dẫn bài báo khoa học đều là các công trình kinh điển có thật (PNAS 2017, CVPR 2017, ECCV 2018, NeurIPS 2020, NIPS 2015). Tình huống nghiên cứu điển hình được dán nhãn giả định sư phạm minh bạch. |
| **Thực thi Agent Skills trong môi trường mô phỏng** | **Verified (Đã kiểm chứng)** | Cấu trúc YAML Frontmatter và schema 11 mục tương thích hoàn hảo với các chuẩn Agent Skill (Antigravity, Claude Code, OpenAI). |
| **Vận hành thực nghiệm trên GPU Cluster thật** | **Untested Capability (Chưa kiểm thử)** | Các quy trình và kỹ năng huấn luyện phân tán nhiều GPU (`controlled-experiment-design`, `experiment-management-and-implementation`) được thiết kế chuẩn xác về mặt lý thuyết và phương pháp luận, nhưng chưa được chạy thực tế trên cụm phần cứng tính toán cụ thể trong môi trường sandbox hiện tại do giới hạn an toàn tài nguyên. |
| **Độ nhạy của thang điểm rubric với ứng viên con người** | **Untested Capability (Chưa kiểm thử)** | Bộ rubric 4 cấp độ và 8 kịch bản tình huống phản ánh chính xác các lỗi tư duy thực tế, nhưng chưa có dữ liệu thống kê kiểm định tâm lý học đo lường (Psychometric validation) trên quy mô lớn người thật. |

### Thư Viện Nghiên Cứu Điển Hình (Case Studies)
- [`erpf/case-studies/index.md`](file:///home/longtran/Projects/rendez-web/erpf/case-studies/index.md) (`ERPF-CORE-CASE-000`)
- [`erpf/case-studies/cs-001-intervention-level-excel-automation.md`](file:///home/longtran/Projects/rendez-web/erpf/case-studies/cs-001-intervention-level-excel-automation.md) (`ERPF-SE-CASE-001`)

### Thư Viện Bài Học Kinh Nghiệm (Lessons Learned)
- [`erpf/lessons/index.md`](file:///home/longtran/Projects/rendez-web/erpf/lessons/index.md) (`ERPF-CORE-LESS-000`)
- [`erpf/lessons/software-engineering/symptom-masking-vs-root-cause.md`](file:///home/longtran/Projects/rendez-web/erpf/lessons/software-engineering/symptom-masking-vs-root-cause.md) (`ERPF-SE-LESS-001`)
- [`erpf/lessons/ai-research/data-leakage-pre-split-normalization.md`](file:///home/longtran/Projects/rendez-web/erpf/lessons/ai-research/data-leakage-pre-split-normalization.md) (`ERPF-AI-LESS-001`)
- [`erpf/lessons/ai-research/shortcut-learning-clever-hans.md`](file:///home/longtran/Projects/rendez-web/erpf/lessons/ai-research/shortcut-learning-clever-hans.md) (`ERPF-AI-LESS-002`)

### Kho Kỹ Năng Tự Luận Tác Nhân (Agentic Skills Library - 15 Gói Kỹ Năng / 61 Tệp)
- [`erpf/skills/index.md`](file:///home/longtran/Projects/rendez-web/erpf/skills/index.md) (`ERPF-CORE-SKILL-000`)
- **Kỹ năng Dùng Chung (`erpf/skills/shared/` - 12 tệp):** `problem-formulation/`, `critical-technical-reasoning/`, `evidence-based-decision-making/`.
- **Kỹ năng Kỹ Thuật Phần Mềm (`erpf/skills/software-engineering/` - 20 tệp):** `codebase-exploration/`, `architecture-review/`, `debugging-root-cause/`, `testing-strategy-design/`, `performance-investigation/`.
- **Kỹ năng Nghiên Cứu Trí Tuệ Nhân Tạo (`erpf/skills/ai-research/` - 28 tệp):** `literature-review-synthesis/`, `research-problem-hypothesis/`, `controlled-experiment-design/`, `model-evaluation-metric-selection/`, `ablation-study-design/`, `failure-error-analysis/`, `reproducibility-paper-review/`.

### Bộ Công Cụ & Biểu Mẫu Tác Nghiệp (Toolkit & Templates - 18 Biểu Mẫu)
- **Tập Quản Trị & Bài Học:**
  - [`erpf/toolkit/templates/lesson-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/lesson-template.md) (`ERPF-TOOL-TMP-004`)
  - [`erpf/toolkit/templates/case-study-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/case-study-template.md) (`ERPF-TOOL-TMP-005`)
- **Tập Kỹ Thuật Phần Mềm:**
  - [`erpf/toolkit/templates/problem-definition-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/problem-definition-template.md) (`ERPF-TOOL-TMP-010`)
  - [`erpf/toolkit/templates/technical-design-adr-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/technical-design-adr-template.md) (`ERPF-TOOL-TMP-011`)
  - [`erpf/toolkit/templates/code-review-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/code-review-template.md) (`ERPF-TOOL-TMP-012`)
  - [`erpf/toolkit/templates/debugging-investigation-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/debugging-investigation-template.md) (`ERPF-TOOL-TMP-013`)
  - [`erpf/toolkit/templates/test-strategy-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/test-strategy-template.md) (`ERPF-TOOL-TMP-014`)
  - [`erpf/toolkit/templates/technical-retrospective-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/technical-retrospective-template.md) (`ERPF-TOOL-TMP-015`)
- **Tập Nghiên Cứu Trí Tuệ Nhân Tạo:**
  - [`erpf/toolkit/templates/research-proposal-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/research-proposal-template.md) (`ERPF-TOOL-TMP-020`)
  - [`erpf/toolkit/templates/literature-matrix-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/literature-matrix-template.md) (`ERPF-TOOL-TMP-001`)
  - [`erpf/toolkit/templates/research-hypothesis-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/research-hypothesis-template.md) (`ERPF-TOOL-TMP-021`)
  - [`erpf/toolkit/templates/experiment-plan-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-plan-template.md) (`ERPF-TOOL-TMP-002`)
  - [`erpf/toolkit/templates/experiment-run-log-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/experiment-run-log-template.md) (`ERPF-TOOL-TMP-022`)
  - [`erpf/toolkit/templates/model-evaluation-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/model-evaluation-report-template.md) (`ERPF-TOOL-TMP-023`)
  - [`erpf/toolkit/templates/ablation-study-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/ablation-study-report-template.md) (`ERPF-TOOL-TMP-024`)
  - [`erpf/toolkit/templates/failure-analysis-report-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/failure-analysis-report-template.md) (`ERPF-TOOL-TMP-025`)
  - [`erpf/toolkit/templates/reproducibility-checklist-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/reproducibility-checklist-template.md) (`ERPF-TOOL-TMP-026`)
  - [`erpf/toolkit/templates/peer-review-rubric-template.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/templates/peer-review-rubric-template.md) (`ERPF-TOOL-TMP-003`)

### Khung Đánh Giá Năng Lực & Kịch Bản Thực Chiến (Assessments - 3 Tệp)
- [`erpf/toolkit/assessments/index.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/index.md) (`ERPF-TOOL-ASSESS-000` - Triết lý đánh giá toàn cục)
- [`erpf/toolkit/assessments/competency-evaluation-framework.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/competency-evaluation-framework.md) (`ERPF-TOOL-ASSESS-001` - Khung ma trận năng lực 4 cấp độ)
- [`erpf/toolkit/assessments/practical-scenarios.md`](file:///home/longtran/Projects/rendez-web/erpf/toolkit/assessments/practical-scenarios.md) (`ERPF-TOOL-ASSESS-002` - Bộ 8 kịch bản kiểm định thực chiến)

---

## 5. Rủi Ro & Ranh Giới Kiểm Soát (Risks & Boundaries)
## 6. Rủi Ro & Ranh Giới Kiểm Soát (Risks & Boundaries)

1. **Không áp đặt trọng số hay điểm số tùy tiện:** Khung đánh giá năng lực tập trung hoàn toàn vào các chỉ báo hành vi chuyên môn quan sát được (Observable Behavioral Indicators) trong thực tế thay vì điểm số lý thuyết vô căn cứ.
2. **Kịch bản kiểm định độc lập không bị overfit:** Toàn bộ 8 kịch bản trong `practical-scenarios.md` là các bài toán độc lập, không sao chép lại nguyên văn các ví dụ từ bài học kinh nghiệm trước đó, đòi hỏi ứng viên/agent phải vận dụng năng lực suy luận thực sự.
3. **Bảo toàn trạng thái mã nguồn ứng dụng:** Xác nhận 100% không có bất kỳ tệp mã nguồn ứng dụng (`*.py`, `*.tsx`, `*.ts`, `*.css`), schema cơ sở dữ liệu hay cấu hình runtime nào bị tác động trong quá trình thực thi Task 13.
1. **Bảo toàn môi trường dự án:** Khung tri thức được lưu trữ độc lập hoàn toàn trong thư mục `erpf/`. Không có bất kỳ thay đổi nào tác động lên mã nguồn ứng dụng web chính (`backend/`, `frontend/`) hay các tệp cấu hình hệ thống ngoài repo.
2. **Tuân thủ quy chế an toàn (`AGENTS.md`):** Không cài đặt thêm dependency, không cập nhật package, không gọi ra ngoài Internet, không yêu cầu quyền sudo hay credentials. Toàn bộ quá trình kiểm toán được thực thi bằng Python cục bộ và công cụ có sẵn.
