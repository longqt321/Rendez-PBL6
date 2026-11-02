# Course Requirement Traceability

| Course requirement | Required implementation | Evidence | Current status |
|---|---|---|---|
| Nghiên cứu và áp dụng mô hình trí tuệ nhân tạo (AI) phù hợp với đề tài | Nghiên cứu kiến trúc mô hình học sâu cho bài toán trích xuất đặc trưng thị giác và ngữ nghĩa tiếng Việt | `docs/ai/MODEL_SELECTION.md`, `docs/report/bao-cao-pbl6.md` Mục 2.4 | Hoàn thành |
| Xây dựng pipeline thử nghiệm và đánh giá đa mô hình (Comparative Benchmarking) | So sánh ít nhất 3 hướng tiếp cận: Baseline (từ khóa/thuộc tính), Pretrained Zero-shot Multilingual VLM, và Fine-tuned Model trên tập dữ liệu chuẩn | `docs/ai/MODEL_BENCHMARK.md`, `docs/ai/benchmark/` | Đang thực hiện |
| Tách biệt độc lập tập huấn luyện, kiểm chuẩn và kiểm thử (Train/Val/Test Isolation) | Chuẩn bị tập dữ liệu ảnh/văn bản thực địa, kiểm tra chống rò rỉ dữ liệu (Group leakage prevention theo địa điểm/cơ sở) | `docs/ai/DATASET.md` | Đang thực hiện |
| Tích hợp mô hình AI vào quy trình sản phẩm thực tế của Rendez | Điểm cuối tìm kiếm ngữ nghĩa tiếng Việt (Vietnamese Semantic Retrieval) tại backend và giao diện tìm kiếm người dùng tại frontend | Backend `apps.places` / `apps.photos`, Frontend `SearchPage` | Đang thực hiện |
| Đánh giá và kiểm thử toàn diện hệ thống | Bộ kiểm thử tự động (Unit/Integration backend + frontend), kiểm thử trình duyệt thực tế Playwright và chụp ảnh màn hình minh chứng | Backend pytest, Frontend bun test/build, Playwright E2E | Đang thực hiện |
| Báo cáo đồ án PBL6 chuẩn học thuật ĐH Bách Khoa - ĐH Đà Nẵng | Hoàn thiện báo cáo, cập nhật số liệu thực tế, hình ảnh minh chứng, gỡ bỏ số liệu mock | `docs/report/bao-cao-pbl6.md` | Đang thực hiện |
