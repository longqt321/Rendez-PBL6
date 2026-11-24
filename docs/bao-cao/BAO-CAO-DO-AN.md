# BÁO CÁO ĐỒ ÁN

**TRƯỜNG ĐẠI HỌC BÁCH KHOA – ĐẠI HỌC ĐÀ NẴNG**
**KHOA CÔNG NGHỆ THÔNG TIN**

**ĐỀ TÀI:** XÂY DỰNG MẠNG XÃ HỘI KHÁM PHÁ ĐỊA ĐIỂM TẠI ĐÀ NẴNG TÍCH HỢP TÌM KIẾM KHÔNG DẤU VÀ GỢI Ý CÁ NHÂN HOÁ

| Thuộc tính | Thông tin |
|---|---|
| Sinh viên thực hiện | Trần Đức Long |
| | Phan Thị Thảo Tiên |
| Mã số sinh viên | 【cần thông tin: MSSV Trần Đức Long】 |
| | 【cần thông tin: MSSV Phan Thị Thảo Tiên】 |
| Lớp | 23T_Nhat1 |
| | 23T_Nhat2 |
| Chuyên ngành | Công nghệ Thông tin |
| Giảng viên hướng dẫn | TS. Võ Đức Hoàng |
| Năm học | 2026 – 2027 |

**Đà Nẵng, tháng 11 năm 2026**

<!-- pagebreak -->

## PHIẾU GIAO NHIỆM VỤ ĐỒ ÁN

*(Trang dành cho Phiếu giao nhiệm vụ đồ án có xác nhận của Khoa và Giảng viên hướng dẫn khi đóng quyển theo mẫu quy chuẩn của Trường Đại học Bách khoa – Đại học Đà Nẵng.)*

<!-- pagebreak -->

## LỜI CAM ĐOAN

Nhóm sinh viên xin cam đoan toàn bộ nội dung, mã nguồn hệ thống, sơ đồ thiết kế và số liệu thực nghiệm trình bày trong báo cáo đồ án này là kết quả nghiên cứu và triển khai thực tế của nhóm dưới sự hướng dẫn của TS. Võ Đức Hoàng. Các tài liệu tham khảo, thư viện mã nguồn mở và bộ dữ liệu đối chứng được sử dụng đều được trích dẫn đầy đủ, trung thực theo chuẩn IEEE trong danh mục tài liệu tham khảo.

**Nhóm sinh viên thực hiện**

Trần Đức Long — Phan Thị Thảo Tiên

<!-- pagebreak -->

## LỜI CẢM ƠN

Đồ án này là kết quả của một học kỳ làm việc nghiêm túc của nhóm. Để hoàn thành báo cáo, nhóm đã nhận được sự hướng dẫn, góp ý và động viên từ nhiều người.

Trước hết, nhóm xin bày tỏ lòng biết ơn sâu sắc đến TS. Võ Đức Hoàng, người trực tiếp hướng dẫn, định hướng phương pháp nghiên cứu và chỉ ra những điểm còn thiếu trong quá trình thực hiện. Những nhận xét của thầy giúp nhóm nhìn rõ giới hạn của sản phẩm và điều chỉnh cách đánh giá kết quả một cách khách quan hơn.

Nhóm cũng xin cảm ơn quý thầy cô Khoa Công nghệ Thông tin, Trường Đại học Bách khoa – Đại học Đà Nẵng đã truyền đạt kiến thức nền tảng trong suốt những năm học, và cảm ơn các giảng viên chấm đồ án đã dành thời gian đọc và góp ý cho báo cáo này.

Cuối cùng, nhóm xin cảm ơn bạn bè đã chia sẻ tài liệu, góp ý về giao diện và hỗ trợ kiểm thử. Nhóm cũng muốn ghi nhận nỗ lực của chính mình: những buổi làm việc kéo dài, những lần sửa đi sửa lại, và quyết định giữ lại cả những kết quả thực nghiệm khách quan kể cả ở những kịch bản thuật toán không vượt qua phương pháp đối chứng.

Dù đã cố gắng, báo cáo khó tránh khỏi thiếu sót. Nhóm mong nhận được góp ý để hoàn thiện hơn.

<!-- pagebreak -->

## TÓM TẮT

Đồ án xây dựng mạng xã hội khám phá địa điểm tại Đà Nẵng (Rendez), quản lý tập dữ liệu thực tế đã qua kiểm định đa giác gồm **360 địa điểm** thuộc 6 hạng mục trên 6 quận nội thành (chính xác 100% ranh giới địa lý Đà Nẵng). Hệ thống thiết kế theo mô hình monorepo tách lớp rõ ràng: ứng dụng người dùng cuối (cô lập hoàn toàn với Cổng quản trị), tầng dịch vụ API phân nhóm theo miền nghiệp vụ, tầng lưu trữ cơ sở dữ liệu quan hệ chuẩn hóa 3NF kết hợp tìm kiếm vector, hàng đợi tác vụ nền bền vững, luồng đồng bộ thời gian thực qua SSE và hệ thống quan sát vận hành (RED/USE, Core Web Vitals). Toàn bộ hạ tầng đóng gói và triển khai trên một máy chủ giới hạn 5 nhân và 3,5 GB bộ nhớ.

Trọng tâm kỹ thuật của đồ án là hệ thống trí tuệ nhân tạo gồm bộ phân tích ngôn ngữ tự nhiên tiếng Việt (`@rendez/schema`), hai thuật toán tìm kiếm/gợi ý cốt lõi, bộ phát hiện địa điểm theo ngữ cảnh bài đăng và cơ chế chấm điểm phòng nhóm đa tiêu chí. Thuật toán tìm kiếm lai ghép EGRF kết hợp tách từ, bóc tách ràng buộc kèm ngoại lệ đồng âm/phủ định, cơ chế bảo vệ thực thể + tự động nới lỏng và hợp nhất 6 luồng tín hiệu bằng bộ điều khiển cổng bằng chứng (`Xenova/multilingual-e5-small` $d=384$ lượng tử hóa `q8`, chỉ mục `unaccent`/`pg_trgm` GIN, khớp tên 3 mức và suy luận cấu trúc). Trên tập kiểm chuẩn đóng băng 344 truy vấn, EGRF đạt **P@5 = 0,860** (vượt mức 0,591 của RRF chuẩn, chênh lệch trung bình $+0,269$ với $p_{\text{Holm}} = 0$ qua kiểm định 10.000 mẫu bootstrap) và độ chính xác 0,862 trên tập 58 truy vấn đối chứng. Thuật toán lập lịch phơi bày tất định **DES (Deterministic Exposure Scheduling)** kết hợp mô hình Bayes thích ứng 5 thành phần độ đầy đủ hồ sơ, nhiễu băm khung 1 giờ và nhánh lọc cộng tác vật phẩm có khử thiên kiến phổ biến cùng dự phòng vector nội dung `pgvector` (tỷ lệ pha $0,60$ cosine). Trên tập địa điểm đối chứng, DES kết hợp đạt R@10 là 0,044 so với 0,035 của lọc cộng tác ($p \approx 0$). Đối với nhóm đi ăn uống cùng nhau, phòng nhóm cộng tác sử dụng toán tử OR nội thành viên, tính khoảng cách công bằng và xếp hạng ứng viên kèm cảnh báo mâu thuẫn.

Kiểm thử tải thực hiện trên cấu hình giới hạn 2 nhân cho tầng dịch vụ API (snapshot 358 địa điểm). Thời gian phản hồi phân vị 95 đạt 420 ms ở mức 1.000 người dùng đồng thời và 1.250 ms ở mức 2.000 người dùng đồng thời; hệ thống duy trì 0% lỗi máy chủ tới mức 3.000 người dùng. Bên cạnh đó, chiến lược kiểm thử tự động bốn tầng — bao phủ lược đồ và bất biến thuộc tính (3 tệp, 20 ca đạt), kiểm thử tích hợp API và tương tranh trên cơ sở dữ liệu thật (52 tệp kiểm thử), kiểm thử thành phần giao diện (52 tệp, 237 ca đạt) và kiểm thử đầu cuối trên trình duyệt (49/49 ca đạt) — xác nhận độ tin cậy trên toàn hệ thống.

**Từ khoá:** tìm kiếm lai ghép, tìm kiếm ngữ nghĩa, xử lý ngôn ngữ tự nhiên tiếng Việt, cold-start, deterministic exposure scheduling, PostgreSQL, phòng nhóm đa tiêu chí, kiểm thử theo tính chất.

<!-- pagebreak -->

## ABSTRACT

This project builds Rendez, a social network for place discovery in Da Nang covering 360 polygon-verified seeded venues across 6 categories and 6 urban districts. Organized as a layered monorepo, the architecture cleanly isolates the consumer web application from a dedicated admin portal, exposes domain-grouped backend services over a 3NF relational and vector database, offloads asynchronous work to durable background queues, streams real-time collaboration via Server-Sent Events (SSE), and collects runtime observability (RED/USE metrics and Core Web Vitals). The full stack runs on a single host constrained to 5 CPU cores and 3.5 GB of memory.

The core technical focus is the AI and retrieval subsystem spanning a diacritic-aware Vietnamese natural query parser (`@rendez/schema`), two ranking algorithms, contextual post-to-place detection, and multi-criteria group scoring. Evidence-Gated Rank Fusion (EGRF) combines entity-guarded query promotion and auto-relaxation with a six-stream RRF controller over quantized 384-dimensional embeddings (`Xenova/multilingual-e5-small`), GIN trigram lexical matching, three-tier name matching, and structured intent inference. On the frozen 344-query benchmark, EGRF reaches **P@5 = 0.860** versus 0.591 for standard two-branch RRF (+0.269 paired bootstrap gain, $p_{\text{Holm}} = 0$), and achieves P@5 = 0.862 on a 58-query multilingual reference set. Deterministic Exposure Scheduling (DES) couples a five-factor completeness-modulated Bayesian cold-start prior, one-hour deterministic MD5 jitter, and damped item-item collaborative filtering with `pgvector` content fallback (0.60 cosine blend); combined DES achieves Recall@10 of 0.044 vs. 0.035 for collaborative filtering ($p \approx 0$). Collaborative rooms compute fair distances and three-tier conflict rankings in real time.

Load testing under a 2-core API cap measures a 95th-percentile latency of 420 ms at 1,000 concurrent users and 1,250 ms at 2,000, with zero server errors up to 3,000 concurrent users. Furthermore, a four-tier automated test suite—spanning schema property invariants (3 files, 20 passed), real-database integration/concurrency/IDOR checks (52 backend test files), frontend component suites (52 files, 237 passed), and browser end-to-end flows (49/49 passed)—verifies correctness across all layers.

**Keywords:** hybrid search, semantic search, Vietnamese NLP, cold-start, deterministic exposure scheduling, PostgreSQL, collaborative rooms, property-based testing.

<!-- pagebreak -->

## MỤC LỤC

| Mục | Nội dung |
|---|---|
| | Phiếu giao nhiệm vụ đồ án |
| | Lời cam đoan |
| | Lời cảm ơn |
| | Tóm tắt |
| | Abstract |
| | Danh mục các từ viết tắt |
| | Thuật ngữ |
| | Danh mục bảng biểu |
| | Danh mục hình vẽ, sơ đồ |
| **CHƯƠNG 1** | **Giới thiệu đề tài** |
| 1.1 | Đặt vấn đề |
| 1.2 | Mục tiêu |
| 1.3 | Đối tượng sử dụng |
| 1.4 | Phạm vi |
| 1.5 | Phương pháp thực hiện |
| 1.6 | Bố cục báo cáo |
| **CHƯƠNG 2** | **Cơ sở lý thuyết và công nghệ** |
| 2.1 | Công nghệ nền tảng |
| 2.2 | Lựa chọn công nghệ |
| 2.3 | Cơ sở lý thuyết |
| **CHƯƠNG 3** | **Phân tích và thiết kế hệ thống** |
| 3.1 | Yêu cầu chức năng |
| 3.2 | Yêu cầu phi chức năng |
| 3.3 | Use case |
| 3.4 | Kiến trúc hệ thống |
| 3.5 | Luồng tương tác |
| 3.6 | Thiết kế thuật toán và phân hệ trí tuệ nhân tạo |
| 3.7 | Thiết kế dữ liệu và quy trình chuẩn hóa corpus |
| 3.8 | Thiết kế giao diện |
| 3.9 | Thiết kế bảo mật |
| 3.10 | Thiết kế các phân hệ mở rộng và quan sát vận hành |
| **CHƯƠNG 4** | **Cài đặt và thử nghiệm** |
| 4.1 | Môi trường cài đặt và đo lường |
| 4.2 | Các module đã cài đặt |
| 4.3 | Xử lý kỹ thuật quan trọng |
| 4.4 | Kiểm thử chức năng, biên và tương tranh |
| 4.5 | Đánh giá hiệu năng và độ chính xác |
| 4.6 | Ảnh giao diện hệ thống tiêu biểu |
| **CHƯƠNG 5** | **Kết luận và hướng phát triển** |
| 5.1 | Kết luận |
| 5.2 | Hạn chế |
| 5.3 | Hướng phát triển |
| | **Tài liệu tham khảo** |
| | **Phụ lục A:** Danh mục API endpoint và đặc tả giao diện lập trình |
| | **Phụ lục B:** Đặc tả chi tiết các use case mở rộng |
| | **Phụ lục C:** Chi tiết lược đồ cơ sở dữ liệu và các sơ đồ ERD phân rã theo miền |
| | **Phụ lục D:** Toàn bộ ảnh chụp các màn hình phụ trợ của hệ thống |

*(Số trang được cập nhật tự động theo trường Mục lục khi kết xuất trên Word/Google Docs.)*

<!-- pagebreak -->

## DANH MỤC CÁC TỪ VIẾT TẮT

| Từ viết tắt | Tiếng Anh | Ý nghĩa |
|---|---|---|
| AAD | Additional Authenticated Data | Dữ liệu xác thực bổ sung trong mã hóa AEAD |
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| BVA | Boundary Value Analysis | Phân tích giá trị biên trong kiểm thử |
| CAS | Compare-And-Swap | Cập nhật có kiểm tra giá trị kỳ vọng |
| CF | Collaborative Filtering | Lọc cộng tác |
| CWV | Core Web Vitals | Bộ chỉ số trải nghiệm trang web (LCP, INP, CLS) |
| DES | Deterministic Exposure Scheduling | Thuật toán lập lịch phơi bày tất định trong gợi ý cold-start |
| EGRF | Evidence-Gated Rank Fusion | Thuật toán tìm kiếm đề xuất trong đồ án |
| EP | Equivalence Partitioning | Phân vùng tương đương trong kiểm thử |
| ERD | Entity-Relationship Diagram | Sơ đồ thực thể liên kết |
| FR | Functional Requirement | Yêu cầu chức năng |
| IDOR | Insecure Direct Object Reference | Lỗi truy cập trực tiếp đối tượng không kiểm tra quyền |
| IRV | Instant-Runoff Voting | Phương thức bỏ phiếu xếp hạng loại trừ dần |
| NFR | Non-Functional Requirement | Yêu cầu phi chức năng |
| p50, p95 | 50th, 95th percentile | Phân vị 50, phân vị 95 |
| PBT | Property-Based Testing | Kiểm thử theo tính chất bằng sinh dữ liệu ngẫu nhiên |
| RBAC | Role-Based Access Control | Kiểm soát truy cập dựa trên vai trò |
| RED | Rate, Errors, Duration | Ba chỉ số giám sát dịch vụ (tần suất, lỗi, độ trễ) |
| RRF | Reciprocal Rank Fusion | Hợp nhất xếp hạng nghịch đảo |
| RUM | Real User Monitoring | Giám sát trải nghiệm từ trình duyệt người dùng thật |
| SSE | Server-Sent Events | Sự kiện do máy chủ đẩy xuống |
| SSRF | Server-Side Request Forgery | Tấn công giả mạo yêu cầu từ phía máy chủ |
| TLS | Transport Layer Security | Bảo mật tầng truyền tải |
| TOCTOU | Time-of-Check to Time-of-Use | Điều kiện tranh chấp giữa bước kiểm tra và bước sử dụng |
| USE | Utilization, Saturation, Errors | Ba chỉ số giám sát tài nguyên (mức dùng, bão hòa, lỗi) |

## THUẬT NGỮ

| Tiếng Anh | Cách dùng trong báo cáo | Ý nghĩa |
|---|---|---|
| cold-start | cold-start | Gợi ý khi chưa có dữ liệu tương tác |
| container | container | Đơn vị đóng gói cô lập tài nguyên |
| endpoint | điểm cuối API (endpoint) | Điểm truy cập API, định danh bởi phương thức HTTP và đường dẫn |
| framework | bộ khung (framework) | Bộ khung định tuyến và thư viện cho ứng dụng web |
| idempotency | khóa lũy đẳng | Thao tác lặp nhiều lần không đổi kết quả |
| job queue | hàng đợi tác vụ | Cơ chế lưu và xử lý tác vụ nền |
| object storage | lưu trữ đối tượng | Dịch vụ lưu trữ tệp qua HTTP, tương thích S3 |
| reverse proxy | proxy ngược | Máy chủ trung gian nhận yêu cầu từ mạng ngoài, chuyển vào nội bộ |
| runtime | môi trường chạy (runtime) | Nền tảng chạy mã phía máy chủ |
| smoothing constant | hằng số làm mịn | Hằng số $k$ trong công thức RRF, tránh chia cho 0 |

<!-- pagebreak -->

## DANH MỤC BẢNG BIỂU

| Số hiệu | Tên bảng |
|---|---|
| Bảng 1.1 | So sánh Rendez với các ứng dụng người dùng đang dùng |
| Bảng 1.2 | Phạm vi thực hiện của đồ án |
| Bảng 2.1 | So sánh phương án hàng đợi tác vụ |
| Bảng 2.2 | So sánh phương án tìm kiếm văn bản |
| Bảng 2.3 | Thư viện chuẩn cộng đồng thay thế mã tự viết theo nguyên tắc Package-First |
| Bảng 3.1 | Yêu cầu chức năng (27 yêu cầu FR-01 đến FR-27) |
| Bảng 3.2 | Yêu cầu phi chức năng |
| Bảng 3.3 | Đặc tả use case tổng hợp (21 use case) |
| Bảng 3.4 | Đặc tả use case Tìm kiếm địa điểm (UC-05) |
| Bảng 3.5 | Đặc tả use case Đăng bài và phát hiện địa điểm (UC-08) |
| Bảng 3.6 | Đặc tả use case Đánh giá 4 mức và bình chọn hữu ích (UC-10) |
| Bảng 3.7 | Đặc tả use case Phòng nhóm cộng tác và xếp hạng tiêu chí (UC-14) |
| Bảng 3.8 | Trọng số 4 chế độ cổng bằng chứng của thuật toán EGRF (`S-5`) |
| Bảng 3.9 | Trọng số điểm tương tác hành vi trong hệ thống gợi ý DES |
| Bảng 3.10 | Tổng hợp các nhóm bảng dữ liệu theo miền nghiệp vụ (43 bảng, 10 miền) |
| Bảng 3.11 | Thống kê phân bố và độ phủ siêu dữ liệu trên corpus chính thức (360 địa điểm) |
| Bảng 3.12 | Thiết kế bảo mật theo lớp tấn công |
| Bảng 4.1 | Môi trường cài đặt và đo lường |
| Bảng 4.2 | Danh mục phân hệ đã cài đặt |
| Bảng 4.3 | Xử lý kỹ thuật quan trọng và kết quả kiểm chứng |
| Bảng 4.4 | Tổng hợp kết quả bộ kiểm thử tự động theo 4 tầng |
| Bảng 4.5 | Ca kiểm thử tiêu biểu (7 cột chuẩn) và các lỗi thực tế phát hiện được |
| Bảng 4.6 | Thời gian phản hồi ở mức tải đơn lẻ |
| Bảng 4.7 | Kết quả kiểm thử tải tăng dần trên k6 |
| Bảng 4.8 | Độ chính xác tìm kiếm trên tập nội bộ (344 truy vấn đóng băng) |
| Bảng 4.9 | Kiểm định ý nghĩa thống kê Bootstrap hiệu chỉnh Holm trên tập nội bộ |
| Bảng 4.10 | Độ chính xác tìm kiếm trên các tập đối chứng BEIR và Yelp |
| Bảng 4.11 | Độ triệu hồi gợi ý trên bốn tập dữ liệu đối chứng |
| Bảng 5.1 | Đối chiếu mục tiêu và kết quả |
| Bảng A.1 | Danh mục các nhóm API endpoint của hệ thống (19 nhóm route) |
| Bảng A.2 | Đặc tả chi tiết API Tìm kiếm và lọc địa điểm |
| Bảng A.3 | Đặc tả chi tiết API Đăng bài và kích hoạt phát hiện địa điểm |
| Bảng A.4 | Đặc tả chi tiết API Áp dụng đề xuất phòng nhóm thời gian thực |
| Bảng B.1 | Đặc tả use case Nhắn tin trực tiếp thời gian thực (UC-18) |
| Bảng B.2 | Đặc tả use case Đề xuất địa điểm mới từ cộng đồng (UC-19) |
| Bảng B.3 | Đặc tả use case Kiểm duyệt, xử lý đề xuất và giám sát quản trị (UC-20) |
| Bảng C.1 | Mô tả cấu trúc chi tiết bảng Địa điểm (`places`) |
| Bảng C.2 | Tổng hợp 15 kiểu liệt kê (Enum) trong cơ sở dữ liệu |

<!-- pagebreak -->

## DANH MỤC HÌNH VẼ, SƠ ĐỒ

| Số hiệu | Tên hình |
|---|---|
| Hình 2.1 | Kim tự tháp kiểm thử tự động 4 tầng của hệ thống Rendez |
| Hình 3.1 | Sơ đồ use case tổng thể |
| Hình 3.2 | Sơ đồ kiến trúc triển khai hệ thống |
| Hình 3.3 | Biểu đồ tuần tự luồng tìm kiếm địa điểm lai ghép |
| Hình 3.4 | Biểu đồ tuần tự luồng đăng bài và tác vụ phát hiện địa điểm nền |
| Hình 3.5 | Biểu đồ tuần tự luồng bình chọn nhóm thời gian thực (SSE) |
| Hình 3.6 | Biểu đồ tuần tự luồng tải ảnh trực tiếp qua URL có chữ ký |
| Hình 3.7 | Biểu đồ tuần tự luồng nhắn tin trực tiếp thời gian thực (SSE) |
| Hình 3.8 | Biểu đồ tuần tự luồng đề xuất địa điểm mới và kiểm duyệt quản trị |
| Hình 3.9 | Biểu đồ trạng thái vòng đời một đề xuất trong phòng bình chọn |
| Hình 3.10 | Biểu đồ hoạt động luồng tìm kiếm địa điểm EGRF |
| Hình 3.11 | Biểu đồ hoạt động luồng đăng bài và phát hiện địa điểm |
| Hình 3.12 | Sơ đồ lớp các lớp miền nghiệp vụ chính |
| Hình 3.13 | Sơ đồ thực thể liên kết cốt lõi theo miền nghiệp vụ |
| Hình 3.14 | Sơ đồ điều hướng tách biệt giữa Ứng dụng người dùng và Cổng quản trị |
| Hình 3.15 | Biểu đồ trạng thái vòng đời phòng nhóm cộng tác |
| Hình 3.16 | Luồng ưu tiên 6 tầng định vị và đồng bộ GPS mã hóa AES-256-GCM |
| Hình 3.17 | Kiến trúc quan sát vận hành và cảnh báo hệ thống |
| Hình 4.1 | Biểu đồ thời gian phản hồi phân vị 95 theo mức tải đồng thời |
| Hình 4.2 | Biểu đồ độ chính xác tại 5 trên tập truy vấn nội bộ |
| Hình 4.3 | Biểu đồ độ triệu hồi tại 10 trên tập địa điểm đối chứng |
| Hình 4.4 | Màn hình Đăng nhập với ảnh địa điểm Đà Nẵng chuyển cảnh mượt mà |
| Hình 4.5 | Màn hình Đăng ký tài khoản mới và chấp thuận Điều khoản sử dụng |
| Hình 4.6 | Màn hình Khám phá địa điểm với cụm Gợi ý hôm nay và bộ lọc URL |
| Hình 4.7 | Màn hình Bản đồ cụm địa điểm đồng bộ điều kiện lọc |
| Hình 4.8 | Màn hình Chi tiết địa điểm kèm giờ mở cửa, đánh giá 4 mức và bản đồ thu nhỏ |
| Hình 4.9 | Bảng tin cộng đồng kèm khung soạn bài và bài đăng gắn thẻ địa điểm |
| Hình 4.10 | Khung trò chuyện nhắn tin trực tiếp thời gian thực (SSE) |
| Hình 4.11 | Phòng nhóm cộng tác với xếp hạng ứng viên và bản đồ ghim vị trí thành viên |
| Hình 4.12 | Thẻ Tiêu chí cá nhân và cảnh báo mâu thuẫn trong phòng nhóm |
| Hình 4.13 | Cổng quản trị độc lập (`/admin`) — Tab Tổng quan vận hành |
| Hình C.1 | Sơ đồ ERD phân rã miền Tài khoản, Định vị và Kiểm toán |
| Hình C.2 | Sơ đồ ERD phân rã miền Phòng nhóm cộng tác và Bỏ phiếu |
| Hình C.3 | Sơ đồ ERD phân rã miền Nhắn tin, Đánh giá 4 mức, Đề xuất quán và Cộng tác |
| Hình D.1 – Hình D.25 | Toàn bộ ảnh chụp 25 màn hình phụ trợ (Phụ lục D) |

*(Số trang cập nhật tự động theo trường danh mục khi kết xuất trên Word/Google Docs.)*

<!-- pagebreak -->

# CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI

## 1.1. Đặt vấn đề

Rendez hướng đến giới trẻ và các cặp đôi ở Đà Nẵng, những người thường xuyên đi chơi và chọn địa điểm theo từng cuộc hẹn. Tên ứng dụng lấy từ chữ *rendezvous* trong tiếng Pháp, nghĩa là cuộc hẹn đã hứa. Với nhóm người dùng này, mỗi lần ra ngoài là một lần chọn bối cảnh cho cuộc hẹn: quán yên tĩnh để trò chuyện, chỗ ngoài trời hướng biển, hay một địa điểm mới để đổi không khí.

Để chọn địa điểm, người dùng hiện dùng ba loại ứng dụng: bản đồ, nền tảng đánh giá ẩm thực và mạng xã hội video. Mỗi loại mạnh ở một lĩnh vực riêng, nhưng không loại nào chuyên biệt cho việc gợi ý địa điểm đi chơi, đi ăn. Bảng 1.1 so sánh bốn ứng dụng theo năm tiêu chí quan trọng nhất với người đi hẹn.

**Bảng 1.1: So sánh Rendez với các ứng dụng người dùng đang dùng**

| Tiêu chí | Google Maps | Foody | TikTok | Rendez |
|---|---|---|---|---|
| Định hướng chính | Bản đồ, chỉ đường | Đồ ăn, đánh giá quán | Video ngắn giải trí | Gợi ý địa điểm đi chơi, đi ăn |
| Tìm kiếm theo ý định (ngữ nghĩa) | Yếu, chủ yếu khớp từ khoá | Yếu, chủ yếu khớp từ khoá | Không có | Có, nhánh ngữ nghĩa và nhánh suy luận thuộc tính |
| Gợi ý cá nhân hoá | Gần như không | Yếu | Có, nhưng không gắn với địa điểm cụ thể | Có, xử lý được cold-start |
| Xem khoảng cách, vị trí tức thì | Có, là thế mạnh của bản đồ | Phải tra thêm bản đồ | Phải tra thêm bản đồ | Có bản đồ tích hợp |
| Thông tin cộng đồng gắn địa điểm | Yếu | Có đánh giá, ít cập nhật | Phong phú nhưng rời rạc, khó tra cứu | Có, bài đăng gắn với địa điểm |

Ba ứng dụng trên mỗi cái mạnh ở một lĩnh vực nhưng không chuyên biệt cho gợi ý địa điểm. Google Maps chuyên về bản đồ và chỉ đường, không phải gợi ý địa điểm. Foody chuyên về đồ ăn. TikTok chuyên về video ngắn giải trí, có nhắc đến địa điểm đi ăn, đi chơi nhưng đó không phải chức năng chính. Không ứng dụng nào đáp ứng cùng lúc ba nhu cầu: hiểu ý định tìm kiếm, gợi ý được địa điểm mới chưa có đánh giá, và gắn thông tin cộng đồng với từng địa điểm. Rendez được xây dựng chuyên biệt cho ba nhu cầu này, trên tập dữ liệu thực tế tại Đà Nẵng thu thập từ OpenStreetMap [20] gồm 360 địa điểm thuộc 6 hạng mục trên 6 quận nội thành (mốc snapshot kiểm chuẩn 358 địa điểm).

## 1.2. Mục tiêu

Từ ba nhu cầu trên, đồ án đặt năm mục tiêu. Mỗi mục tiêu gắn với một phép đo cụ thể để kết quả kiểm chứng được:

1. Xây dựng mạng xã hội địa điểm có đủ nghiệp vụ: tài khoản, bài đăng, đánh giá 4 mức, bộ sưu tập, tin nhắn trực tiếp, thông báo và phòng nhóm cộng tác theo vị trí.
2. Xây dựng thuật toán tìm kiếm hiểu ý định theo ngữ nghĩa, đồng thời chịu được tiếng Việt không dấu và lỗi gõ; đo bằng độ chính xác tại 5 trên tập truy vấn nội bộ.
3. Xây dựng thuật toán gợi ý hoạt động khi chưa có lịch sử tương tác; đo bằng độ triệu hồi tại 10 trên tập đối chứng.
4. Đo thời gian phản hồi của hệ thống dưới tải tăng dần trên cấu hình giới hạn tài nguyên.
5. Xây dựng bộ kiểm thử tự động bốn tầng phủ toàn bộ yêu cầu chức năng, biên dữ liệu và tương tranh.

Mục tiêu số hai là trọng tâm kỹ thuật. Năng lực hiểu ý định được hiện thực bằng hai cơ chế: một nhánh tìm kiếm ngữ nghĩa dựa trên biểu diễn vector của truy vấn, và một nhánh suy luận thuộc tính trích xuất ý định từ truy vấn tự do thành các nhãn có cấu trúc. Phần xử lý không dấu và lỗi gõ giúp truy vấn của người dùng trẻ vốn thường gõ vắn tắt và bỏ dấu vẫn được hiểu đúng trước khi bước vào giai đoạn suy luận ngữ nghĩa.

## 1.3. Đối tượng sử dụng

Hệ thống phục vụ năm nhóm tác nhân, phân biệt theo mức độ tham gia và đặc quyền thao tác:

- **Khách vãng lai:** Người chưa có tài khoản, vào để tìm địa điểm, xem bản đồ và xem chi tiết địa điểm. Nhóm này chiếm phần lớn lưu lượng và cần có kết quả ngay mà không phải đăng ký.
- **Thành viên:** Người đã có tài khoản, ngoài các thao tác của khách còn đăng bài, viết đánh giá, tạo bộ sưu tập, nhắn tin trực tiếp, gửi đề xuất địa điểm mới và nhận thông báo. Đây là nhóm tạo ra dữ liệu tương tác nuôi thuật toán gợi ý.
- **Khách trong phòng:** Người được mời vào một phòng nhóm bằng mã mời 6 ký tự để cùng đề xuất quán và tiêu chí cho một cuộc hẹn, không bắt buộc có tài khoản.
- **Quản trị viên:** Người vận hành hệ thống qua Cổng quản trị độc lập để xử lý báo cáo vi phạm, thẩm định đề xuất địa điểm mới, quản lý người dùng và theo dõi chỉ số vận hành.
- **Hệ thống:** Thành phần tự động chạy các tác vụ nền: phát hiện địa điểm trong bài đăng, sinh gợi ý hằng ngày, cập nhật bộ đệm sở thích và dọn dữ liệu hết hạn.

Trong đó, giới trẻ và các cặp đôi là đối tượng chính mà Rendez hướng đến; các vai trò còn lại hỗ trợ hoàn thiện hệ sinh thái nội dung và bảo đảm chất lượng vận hành.

## 1.4. Phạm vi

Bảng 1.2 phân định rõ nội dung thực hiện và ngoài phạm vi thực hiện của đồ án.

**Bảng 1.2: Phạm vi thực hiện của đồ án**

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Dữ liệu 360 địa điểm tại 6 quận nội thành Đà Nẵng [20] | Dữ liệu ngoài địa bàn Đà Nẵng |
| Giao diện web đáp ứng đa thiết bị (responsive) | Ứng dụng di động biên dịch gốc (native mobile) |
| Tài khoản email, mật khẩu và liên kết Google OAuth tùy chọn | Đăng nhập qua các mạng xã hội khác |
| Bài đăng, đánh giá 4 mức, bình luận, bộ sưu tập, tin nhắn văn bản SSE | Gọi thoại, gọi video trực tuyến |
| Phòng nhóm cộng tác bản đồ, tiêu chí và bỏ phiếu thời gian thực | Đặt bàn và thanh toán trực tuyến |
| Tìm kiếm lai ghép EGRF và gợi ý cá nhân hoá DES | Hệ thống quảng cáo và khuyến mãi thương mại |
| Đóng gói vận hành trên một máy chủ giới hạn tài nguyên | Điều phối cụm nhiều máy chủ |

## 1.5. Phương pháp thực hiện

Đồ án thực hiện theo bốn bước:

1. Khảo sát chức năng, điểm mạnh và khoảng trống của các nền tảng khám phá địa điểm hiện có.
2. Thiết kế kiến trúc monorepo tách lớp, lược đồ dữ liệu chuẩn 3NF và hai thuật toán cốt lõi cùng bộ chấm điểm nhóm.
3. Cài đặt hệ thống hai phía (frontend/backend/schema) và xây dựng bộ kiểm thử tự động bốn tầng.
4. Đo hiệu năng chịu tải thực nghiệm, so sánh độ chính xác thuật toán trên tập nội bộ và các tập dữ liệu đối chứng công khai.

Công cụ chính gồm bốn nhóm: runtime Bun kết hợp framework Hono, cơ sở dữ liệu PostgreSQL 17 kèm các phần mở rộng tìm kiếm, nền tảng đóng gói Docker Compose, và công cụ kiểm thử tải k6 [11].

## 1.6. Bố cục báo cáo

Báo cáo gồm năm chương và bốn phụ lục:

- **Chương 1:** Trình bày bài toán, mục tiêu, đối tượng sử dụng, phạm vi và phương pháp thực hiện.
- **Chương 2:** Trình bày cơ sở lý thuyết về truy vấn thông tin, gợi ý cold-start, thiết kế web/backend, kiểm thử và căn cứ lựa chọn công nghệ.
- **Chương 3:** Trình bày phân tích yêu cầu, đặc tả use case, kiến trúc triển khai, biểu đồ tương tác, thuật toán, lược đồ dữ liệu, giao diện và bảo mật.
- **Chương 4:** Trình bày môi trường cài đặt, danh mục module, các xử lý kỹ thuật trọng tâm, kết quả kiểm thử tự động bốn tầng, đánh giá hiệu năng tải/thuật toán và ảnh giao diện tiêu biểu.
- **Chương 5:** Tổng kết kết quả đạt được, chỉ ra các hạn chế trung thực và định hướng phát triển tiếp theo.
- **Phụ lục A – D:** Lần lượt cung cấp danh mục API endpoint kèm đặc tả chi tiết, các đặc tả use case mở rộng, chi tiết cấu trúc bảng/enum và sơ đồ ERD phân rã, cùng trọn bộ ảnh chụp các màn hình phụ trợ.

<!-- pagebreak -->

# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

## 2.1. Công nghệ nền tảng

- **Bun:** Runtime JavaScript và TypeScript phía máy chủ hỗ trợ nhiều tiến trình cùng lắng nghe một cổng qua cơ chế chia sẻ cổng của hệ điều hành, tận dụng đa nhân trong một container [7].
- **Hono và Zod:** Hono là framework định tuyến HTTP chạy trên chuẩn Web [1], kết hợp cùng gói lược đồ `@rendez/schema` xây dựng trên Zod [6] để kiểm chứng đầu vào thống nhất cho cả frontend và backend theo từng miền nghiệp vụ.
- **PostgreSQL 17:** Hệ quản trị cơ sở dữ liệu quan hệ hỗ trợ giao dịch ACID, phân vùng bảng, chỉ mục GIN và hệ sinh thái phần mở rộng [4]. Đồ án dùng PostgreSQL làm kho lưu trữ chính cho toàn bộ dữ liệu nghiệp vụ chuẩn hóa 3NF, hàng đợi tác vụ nền và kênh phát sự kiện nội bộ.
- **`unaccent`, `pg_trgm`, `pgvector` và `pg_stat_statements`:** `unaccent` đưa chuỗi tiếng Việt có dấu về dạng không dấu; `pg_trgm` lập chỉ mục GIN theo cụm ba ký tự chịu lỗi gõ; `pgvector` lưu vector 384 chiều sinh từ mô hình nhúng đa ngữ và truy vấn lân cận cosine; `pg_stat_statements` thu thập số liệu truy vấn chậm phục vụ giám sát [4].
- **Prisma 7 và Kysely:** Prisma quản lý lược đồ cơ sở dữ liệu có kiểm soát phiên bản (migration) và các thao tác CRUD chuẩn [2]. Với các truy vấn đọc phức tạp nối nhiều bảng phân nhánh, hệ thống kết hợp Kysely cùng trình sinh kiểu tự động [33] để bảo đảm an toàn kiểu tĩnh và loại bỏ hoàn toàn SQL nối chuỗi thuần.
- **Redis 7:** Lưu bộ đếm giới hạn tốc độ phân tán, bộ đệm tạm và dữ liệu phiên chia sẻ giữa các tiến trình API chạy song song.
- **pg-boss:** Hàng đợi tác vụ bất đồng bộ lưu ngay trong PostgreSQL với cơ chế khóa bản ghi, thử lại và lập lịch cron [5] cho tác vụ gắn thẻ địa điểm, tính gợi ý hằng ngày, tổng hợp sở thích và dọn dữ liệu hết hạn.
- **Better Auth:** Quản lý tài khoản, mật khẩu băm an toàn và phiên đăng nhập lưu phía máy chủ cho các luồng đăng ký, đăng nhập, xác thực email và khôi phục mật khẩu [3].
- **Cloudflare R2 và `aws4fetch`:** Kho lưu trữ đối tượng tương thích S3 hỗ trợ URL có chữ ký để trình duyệt tải ảnh trực tiếp [10]; backend ký AWS SigV4 qua thư viện chuẩn `aws4fetch`.
- **Caddy:** Reverse proxy biên duy nhất, tự cấp và gia hạn chứng chỉ TLS, nén phản hồi và phục vụ tệp tĩnh của giao diện web [8].
- **React 19, Vite 8 và Tailwind CSS 4:** Giao diện web xây dựng trên React 19 [9] và TypeScript, dùng `shadcn/ui` (`@base-ui/react`), TanStack Query, TanStack Table, Recharts, `nuqs` đồng bộ tham số URL và Leaflet kèm `supercluster` cho bản đồ tương tác.

## 2.2. Lựa chọn công nghệ

Hai quyết định kiến trúc cốt lõi dưới đây có nhiều phương án thay thế. Bảng 2.1 và Bảng 2.2 so sánh các phương án theo ràng buộc triển khai trên một máy chủ đơn.

**Bảng 2.1: So sánh phương án hàng đợi tác vụ**

| Tiêu chí | pg-boss (PostgreSQL) | RabbitMQ / Kafka riêng |
|---|---|---|
| Số thành phần vận hành thêm | 0 (dùng chung PostgreSQL) | 1 đến 2 cụm dịch vụ riêng |
| Đồng bộ giao dịch nghiệp vụ và tác vụ | Cùng một giao dịch ACID | Phải cài đặt mô hình Outbox |
| Thông lượng tác vụ | Trung bình | Rất cao |
| Tách tải khỏi cơ sở dữ liệu chính | Không | Có |
| **Kết luận** | **Chọn cho quy mô hiện tại** | Không chọn |

**Bảng 2.2: So sánh phương án tìm kiếm văn bản**

| Tiêu chí | PostgreSQL (`unaccent`, `pg_trgm`, `pgvector`) | Elasticsearch |
|---|---|---|
| Số thành phần vận hành thêm | 0 | 1 cụm tốn tối thiểu 1 đến 2 GB RAM |
| Xử lý tiếng Việt không dấu | Có | Có |
| Xếp hạng theo ngữ nghĩa | Có, qua `pgvector` | Có |
| Chất lượng xếp hạng văn bản dài | Trung bình | Cao |
| Chi phí với tập 360 bản ghi | Phù hợp | Không tương xứng |
| **Kết luận** | **Chọn cho tập dữ liệu hiện tại** | Không chọn |

Bên cạnh kiến trúc hạ tầng, đồ án áp dụng nguyên tắc ưu tiên thư viện chuẩn cộng đồng (Package-First) nhằm tránh tự viết lại các thuật toán mật mã, thống kê hay kiểm phiếu vốn dễ phát sinh lỗi biên. Bảng 2.3 tổng hợp các thư viện chuẩn đã dùng.

**Bảng 2.3: Thư viện chuẩn cộng đồng thay thế mã tự viết theo nguyên tắc Package-First**

| Bài toán kỹ thuật | Thư viện sử dụng | Lý do lựa chọn |
|---|---|---|
| Ký URL S3/R2 (AWS SigV4) | `aws4fetch` | Chuẩn hóa thuật toán ký AWS v4, loại bỏ rủi ro sai chữ ký khi tự ghép chuỗi |
| Chặn dải IP nội bộ chống SSRF | `node:net` (`BlockList`) | Hỗ trợ đầy đủ IPv4, IPv6 và dải ánh xạ IPv4-mapped IPv6 ở cấp runtime |
| Bộ đệm LRU giới hạn dung lượng | `lru-cache` | Kiểm soát chính xác số phần tử và thời gian sống cho bộ đệm vector truy vấn |
| Kiểm phiếu xếp hạng loại trừ (IRV) | `votes` (`InstantRunoff`) | Bảo đảm đúng luật loại trừ nhiều vòng và xử lý hòa phiếu |
| Cầu dao ngắt mạch dịch vụ ngoài | `cockatiel` | Tách biệt trạng thái lỗi của 4 dịch vụ ngoài (`embeddings`, `mailer`, 2 nguồn bản đồ) |
| Phân vị độ trễ và thống kê | `hdr-histogram-js`, `simple-statistics` | Tính chính xác phân vị p50/p95/p99 với bộ nhớ cố định |
| Che dữ liệu nhạy cảm và chống XSS | `maskdata`, `escape-html` | Che thông tin cá nhân trong log kiểm toán và thoát ký tự thẻ Open Graph |
| Đồng bộ trạng thái bộ lọc qua URL | `nuqs` | Bảo đảm bộ lọc trang khám phá và quản trị chia sẻ được liên kết URL |
| Kiểm thử theo tính chất (PBT) | `fast-check` [34] | Tự động sinh hàng trăm mẫu biên ngẫu nhiên và rút gọn phản ví dụ nhỏ nhất |

## 2.3. Cơ sở lý thuyết

Mục này trình bày nền tảng lý thuyết mà thiết kế và hiện thực Rendez dựa vào, chia thành năm nhóm: tìm kiếm thông tin, gợi ý và cold-start, thiết kế giao diện web, thiết kế hệ thống backend, kiểm thử và quan sát vận hành.

### 2.3.1. Cơ sở lý thuyết về hệ thống tìm kiếm thông tin

Người dùng tìm địa điểm theo hai cách khác nhau: gõ đúng tên quán hoặc mô tả nhu cầu khi chưa biết tên quán. Hệ tìm kiếm cần kết hợp cả khớp từ khoá chính xác và hiểu ngữ nghĩa.

**1. Xếp hạng theo từ khoá với BM25**

BM25 chấm điểm mức độ liên quan giữa truy vấn $Q$ và tài liệu địa điểm $D$ dựa trên tần suất xuất hiện từ khoá, độ hiếm của từ trên toàn kho dữ liệu và độ dài tài liệu [13]:

$$\text{Score}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)} \tag{2.1}$$

Trong đó:
- $q_i$: từ thứ $i$ trong truy vấn $Q$ gồm $n$ từ.
- $\text{IDF}(q_i)$: trọng số nghịch đảo tần suất văn bản phản ánh độ hiếm của từ $q_i$.
- $f(q_i, D)$: số lần từ $q_i$ xuất hiện trong mô tả của địa điểm $D$.
- $|D|$ và $\text{avgdl}$: độ dài của địa điểm $D$ và độ dài trung bình toàn tập dữ liệu.
- $k_1, b$: hai tham số điều chỉnh bão hòa tần suất và chuẩn hóa độ dài (thường lấy $k_1 \in [1,2;\ 2,0]$ và $b = 0,75$).

**2. Tìm kiếm theo ngữ nghĩa bằng vector và độ tương đồng cosine**

Để hiểu câu mô tả ý định (như *"quán yên tĩnh để học bài"*), mỗi địa điểm và truy vấn được mô hình nhúng chuyển thành vector đặc trưng $d = 384$ chiều [31], [32]. Mức độ gần nhau về hướng giữa vector truy vấn $\mathbf{u}$ và vector địa điểm $\mathbf{v}$ được đo bằng độ tương đồng cosine:

$$\text{Sim}_{\cos}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} = \frac{\sum_{i=1}^{d} u_i v_i}{\sqrt{\sum_{i=1}^{d} u_i^2} \sqrt{\sum_{i=1}^{d} v_i^2}} \tag{2.2}$$

Trong đó:
- $\mathbf{u}, \mathbf{v} \in \mathbb{R}^d$: vector biểu diễn ngữ nghĩa của truy vấn và của địa điểm.
- $u_i, v_i$: thành phần tọa độ thứ $i$ của hai vector với số chiều $d = 384$.
- $\|\mathbf{u}\|_2, \|\mathbf{v}\|_2$: chuẩn Euclid của từng vector dùng để chuẩn hóa độ dài.

**3. Hợp nhất xếp hạng nhiều nhánh bằng RRF**

Do bốn nhánh tìm kiếm chấm điểm trên các thang đo khác nhau, phương pháp hợp nhất xếp hạng nghịch đảo (RRF) bỏ qua điểm thô và chỉ dùng thứ hạng để gộp danh sách kết quả [12]:

$$S_{\text{RRF}}(d) = \sum_{r \in R} \frac{w_r}{k + \mathrm{rank}_r(d)} \tag{2.3}$$

Trong đó:
- $R$: tập các nhánh tìm kiếm tham gia hợp nhất.
- $\mathrm{rank}_r(d)$: thứ hạng của địa điểm $d$ trong danh sách trả về của nhánh $r$ (bắt đầu từ $1$).
- $w_r$: trọng số ưu tiên của nhánh $r$.
- $k$: hằng số làm mịn giúp hạn chế việc một kết quả đứng đầu ở một nhánh lấn át toàn bộ kết quả.

### 2.3.2. Cơ sở lý thuyết về hệ thống gợi ý và bài toán cold-start

**1. Lọc cộng tác dựa trên vật phẩm**

Nếu người dùng từng tương tác tích cực với quán $A$, các quán $B$ có tập người thích tương đồng cao với $A$ sẽ được ưu tiên gợi ý [14]. Độ tương đồng giữa hai địa điểm $i$ và $j$ trên tập người dùng chung $U$ được tính bằng hệ số tương quan:

$$\text{sim}(i, j) = \frac{\sum_{u \in U} (r_{u,i} - \bar{r}_u)(r_{u,j} - \bar{r}_u)}{\sqrt{\sum_{u \in U} (r_{u,i} - \bar{r}_u)^2} \sqrt{\sum_{u \in U} (r_{u,j} - \bar{r}_u)^2}} \tag{2.4}$$

Trong đó:
- $U$: tập các người dùng đã có tương tác với cả địa điểm $i$ và địa điểm $j$.
- $r_{u,i}, r_{u,j}$: điểm tương tác quy đổi của người dùng $u$ đối với địa điểm $i$ và $j$.
- $\bar{r}_u$: điểm tương tác trung bình của người dùng $u$.

**2. Điểm trung bình Bayes có điều chỉnh cho địa điểm mới**

Địa điểm vừa khởi tạo thường chưa có hoặc có rất ít đánh giá (item cold-start [19]). Nếu lấy trung bình cộng đơn thuần, một quán mới có 1–2 lượt đánh giá cao sẽ vượt mặt quán lâu năm có hàng trăm lượt ổn định. Phương pháp Bayes kéo điểm của quán ít lượt đánh giá về trung bình chung $\mu_0$:

$$\hat{R}(i) = \frac{v_i \cdot \bar{r}_i + m_i \cdot \mu_0}{v_i + m_i} \tag{2.5}$$

Trong đó:
- $v_i$: số lượt đánh giá thật hiện có của địa điểm $i$.
- $\bar{r}_i$: điểm đánh giá trung bình thực tế của địa điểm $i$.
- $\mu_0$: điểm trung bình tiên nghiệm trên toàn hệ thống.
- $m_i$: trọng số tiên nghiệm (độ tin cậy tối thiểu), được tăng thêm khi hồ sơ địa điểm có đầy đủ ảnh, giờ mở cửa, số điện thoại và mô tả.

### 2.3.3. Cơ sở lý thuyết về thiết kế ứng dụng web

Giao diện web của Rendez bám theo mô hình thành phần khai báo $\text{UI} = f(\text{State})$ [9], mười nguyên tắc khả dụng của Nielsen [30] và chuẩn tiếp cận WCAG 2.1 [29]:

- **Phản hồi tức thời trạng thái hệ thống:** Tìm kiếm, lọc, thích, đánh giá hay bỏ phiếu phản hồi ngay trên giao diện và đồng bộ tham số URL.
- **Nhất quán giữa các khung nhìn:** Danh sách dạng lưới và cụm ghim bản đồ dùng chung bộ lọc và tập nguồn dữ liệu.
- **Ngưỡng cảm nhận độ trễ người dùng [23]:** Phản hồi dưới $100\text{ ms}$ tạo cảm giác tức thì, dưới $1\text{ s}$ giữ nguyên mạch thao tác, và không vượt quá $10\text{ s}$; các mốc này là cơ sở cho chỉ tiêu phi chức năng ở Chương 3.

### 2.3.4. Cơ sở lý thuyết về thiết kế hệ thống backend

Backend được thiết kế theo phong cách kiến trúc REST phi trạng thái của Fielding [24], [25] kết hợp kiểm soát tính nhất quán dữ liệu theo nguyên tắc hệ thống phân tán [26]:

- **Tính lũy đẳng (Idempotency):** Đảm bảo thao tác tạo bài viết, gửi đánh giá hay bình chọn hữu ích khi bị gửi lặp do mạng chập chờn vẫn cho một kết quả duy nhất $f(f(x)) = f(x)$, thông qua khoá lũy đẳng gắn ràng buộc duy nhất trong cơ sở dữ liệu.
- **Kiểm soát tương tranh lạc quan (CAS) và bi quan mức hàng:** Với thao tác áp dụng đề xuất trong phòng nhóm, hệ thống cập nhật có điều kiện theo trạng thái hiện hành (`status = 'open'`). Với thao tác khóa nhiều bản ghi cùng lúc như chốt kết quả phòng trong lúc có người bỏ phiếu, hệ thống sử dụng khóa mức hàng (`SELECT ... FOR UPDATE`) trong giao dịch PostgreSQL nhằm ngăn chặn hoàn toàn điều kiện tranh chấp TOCTOU.

### 2.3.5. Cơ sở lý thuyết về kiểm thử phần mềm và quan sát hệ thống

**1. Chiến lược kiểm thử tự động bốn tầng**

Hệ thống áp dụng kết hợp phân vùng tương đương (EP), phân tích giá trị biên (BVA) cho ngưỡng thời gian và tọa độ, kiểm thử theo tính chất (Property-Based Testing qua `fast-check` [34]) để kiểm chứng bất biến mật mã và chống ReDoS, cùng kiểm thử tích hợp trên cơ sở dữ liệu thật. Hình 2.1 minh họa cấu trúc kim tự tháp kiểm thử bốn tầng của Rendez.

```mermaid
flowchart TB
    T4["Tầng 4: Kiểm thử đầu cuối trên trình duyệt (E2E)"]
    T3["Tầng 3: Kiểm thử thành phần và trạng thái giao diện"]
    T2["Tầng 2: Kiểm thử tích hợp API, tương tranh và bảo mật"]
    T1["Tầng 1: Kiểm thử lược đồ và bất biến dữ liệu"]

    T4 --> T3
    T3 --> T2
    T2 --> T1
```

*Hình 2.1: Kim tự tháp kiểm thử tự động 4 tầng của hệ thống Rendez*

**2. Nguyên lý quan sát vận hành (Observability)**

Thiết kế giám sát kết hợp ba chuẩn đo lường thực hành trong vận hành hệ thống [35]:

- **Mô hình RED:** Đo tần suất yêu cầu, tỷ lệ mã lỗi phản hồi và phân vị độ trễ p50/p95/p99 ở tầng dịch vụ API bằng biểu đồ tần suất HDR Histogram.
- **Mô hình USE:** Theo dõi mức sử dụng và bão hòa của tài nguyên hữu hạn gồm nhóm kết nối PostgreSQL, độ sâu hàng đợi tác vụ nền và độ trễ vòng lặp sự kiện máy chủ.
- **Giám sát người dùng thực (RUM):** Thu thập các chỉ số Core Web Vitals (`LCP`, `INP`, `CLS`) tại phân vị p75 trực tiếp từ trình duyệt người dùng.

<!-- pagebreak -->

# CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 3.1. Yêu cầu chức năng

Bảng 3.1 liệt kê 27 yêu cầu chức năng của hệ thống, bao phủ toàn bộ nghiệp vụ khám phá địa điểm, mạng xã hội, nhắn tin trực tiếp, phòng nhóm cộng tác theo vị trí và vận hành quản trị.

**Bảng 3.1: Yêu cầu chức năng (27 yêu cầu FR-01 đến FR-27)**

| Mã | Yêu cầu | Tác nhân | Ưu tiên |
|---|---|---|---|
| FR-01 | Đăng ký tài khoản bằng email và mật khẩu, bắt buộc đồng ý Điều khoản sử dụng và xác thực email | Khách | Cao |
| FR-02 | Đăng nhập (Email hoặc Google nếu kích hoạt), hiển thị Điều khoản sử dụng ở lần đầu, đăng xuất và duy trì phiên | Khách, Thành viên | Cao |
| FR-03 | Khôi phục mật khẩu qua liên kết gửi tới email đã đăng ký | Khách | Cao |
| FR-04 | Xem và cập nhật hồ sơ cá nhân, ảnh đại diện và ảnh bìa | Thành viên | Trung bình |
| FR-05 | Tìm kiếm địa điểm theo từ khoá, chấp nhận tiếng Việt không dấu và lỗi gõ | Khách, Thành viên | Cao |
| FR-06 | Lọc địa điểm theo quận, hạng mục, khoảng giá (3 bậc giá hoặc chưa xếp mức) và trạng thái mở cửa | Khách, Thành viên | Cao |
| FR-07 | Xem địa điểm trên bản đồ cụm và danh sách đồng bộ | Khách, Thành viên | Trung bình |
| FR-08 | Xem chi tiết địa điểm: ảnh món ăn, thực đơn, giờ mở cửa, liên hệ, đánh giá và các quán tương tự | Khách, Thành viên | Cao |
| FR-09 | Đăng bài trải nghiệm kèm nhiều ảnh và gắn thẻ địa điểm | Thành viên | Cao |
| FR-10 | Tự động phát hiện địa điểm được nhắc tới trong bài đăng và gắn thẻ | Hệ thống | Trung bình |
| FR-11 | Thích, lưu bài đăng, bình luận nhiều cấp và thích bình luận | Thành viên | Cao |
| FR-12 | Viết đánh giá theo bốn mức hài lòng kèm món nên thử, ảnh thực tế và bình chọn hữu ích | Thành viên | Cao |
| FR-13 | Báo cáo địa điểm hoặc nội dung vi phạm | Thành viên | Trung bình |
| FR-14 | Tạo bộ sưu tập, sắp xếp thứ tự, ghi chú từng địa điểm và mời cộng tác viên | Thành viên | Trung bình |
| FR-15 | Nhận thông báo khi có tương tác, tin nhắn hoặc sự kiện phòng; tùy chỉnh bật/tắt theo từng nhóm | Thành viên | Trung bình |
| FR-16 | Tạo phòng nhóm cộng tác bằng mã mời, ghim vị trí các thành viên lên bản đồ và đề xuất quán ứng viên | Khách trong phòng, Thành viên | Cao |
| FR-17 | Đề xuất tiêu chí cá nhân, tính khoảng cách công bằng, cảnh báo mâu thuẫn và xếp hạng ứng viên theo thời gian thực | Khách trong phòng, Thành viên | Cao |
| FR-18 | Gợi ý địa điểm cá nhân hoá dựa trên lịch sử tương tác | Thành viên | Cao |
| FR-19 | Gợi ý địa điểm phù hợp ngay theo nội dung đang soạn thảo | Thành viên | Trung bình |
| FR-20 | Chia sẻ liên kết địa điểm, bài viết hoặc bộ sưu tập kèm thẻ xem trước cho mạng xã hội | Khách, Thành viên | Thấp |
| FR-21 | Đóng góp và phân loại thư viện ảnh quán (món ăn, thực đơn, không gian, mặt tiền) | Thành viên | Trung bình |
| FR-22 | Quản lý điểm neo vị trí cá nhân, mốc địa danh và đồng bộ vị trí GPS bảo mật | Thành viên | Trung bình |
| FR-23 | Vận hành Cổng quản trị riêng biệt cho kiểm duyệt báo cáo, xử lý đề xuất quán, quản lý địa điểm/người dùng và nhật ký kiểm toán | Quản trị viên | Cao |
| FR-24 | Giám sát tình trạng vận hành hệ thống: độ trễ xử lý, tài nguyên, kết nối dịch vụ ngoài và trải nghiệm người dùng thực | Quản trị viên | Cao |
| FR-25 | Nhắn tin trực tiếp thời gian thực: tách Hộp thư chính với Tin nhắn chờ, đính kèm thẻ quán/bộ sưu tập/phòng và chặn người dùng | Thành viên | Cao |
| FR-26 | Cộng đồng gửi đề xuất thêm địa điểm mới; quản trị viên thẩm định và phê duyệt để công bố | Thành viên, Quản trị viên | Trung bình |
| FR-27 | Xóa vĩnh viễn tài khoản theo cơ chế ẩn danh hóa thông tin nhận diện và thu hồi toàn bộ phiên đang hoạt động | Thành viên | Trung bình |

## 3.2. Yêu cầu phi chức năng

Bảng 3.2 liệt kê mười yêu cầu phi chức năng kèm chỉ tiêu đo lường; các ngưỡng phản hồi xác lập dựa trên giới hạn nhận thức người dùng [23].

**Bảng 3.2: Yêu cầu phi chức năng**

| Mã | Yêu cầu | Chỉ tiêu | Cách đo |
|---|---|---|---|
| NFR-01 | Thời gian phản hồi tìm kiếm | p95 ≤ 300 ms với tập dữ liệu địa điểm hiện hành | Đo lặp nhiều lần gọi tuần tự |
| NFR-02 | Thời gian phản hồi danh sách | p95 ≤ 200 ms | Đo lặp nhiều lần gọi tuần tự |
| NFR-03 | Khả dụng dưới tải | 0% lỗi máy chủ ở mức 1.000 người dùng đồng thời | Kiểm thử tải tăng dần trên k6 |
| NFR-04 | Độ trễ cập nhật trạng thái nhóm | ≤ 2 giây tới mọi thành viên đang mở phòng | Quan sát đồng bộ thời gian thực SSE |
| NFR-05 | Kiểm soát xác thực cho thao tác ghi | 100% thao tác ghi có kiểm tra quyền truy cập | Kiểm tra tích hợp phân quyền |
| NFR-06 | Không phát sinh truy vấn N+1 ở danh sách | Số truy vấn không tăng tuyến tính theo kích thước trang | Đếm truy vấn ở nhiều kích thước trang |
| NFR-07 | Vận hành trên một máy chủ giới hạn | Toàn bộ thành phần chạy ổn định trong giới hạn tài nguyên | Thống kê CPU và RAM container |
| NFR-08 | Chống tạo trùng khi mạng chập chờn | Không tạo bản ghi thứ hai cho cùng thao tác | Kiểm thử gửi lặp cùng khoá lũy đẳng |
| NFR-09 | Phủ kiểm thử tự động | Mọi nhóm chức năng đều có ca kiểm thử tự động | Đối chiếu ma trận yêu cầu – kiểm thử |
| NFR-10 | Tách biệt thông tin nhạy cảm | Không lưu bí mật trong mã nguồn | Rà soát kho mã nguồn và cấu hình |

## 3.3. Use case

Hệ thống phục vụ năm tác nhân: Khách vãng lai, Thành viên, Khách trong phòng, Quản trị viên và Hệ thống. Hình 3.1 mô tả sơ đồ Use Case tổng thể cho 21 ca sử dụng chính.

```mermaid
flowchart LR
    Guest(("Khách vãng lai"))
    Member(("Thành viên"))
    RoomGuest(("Khách trong phòng"))
    Admin(("Quản trị viên"))
    Sys(("Hệ thống"))

    UC01["UC-01: Đăng ký tài khoản"]
    UC02["UC-02: Đăng nhập và liên kết Google"]
    UC03["UC-03: Khôi phục mật khẩu"]
    UC04["UC-04: Cập nhật hồ sơ và cài đặt"]
    UC05["UC-05: Tìm kiếm địa điểm"]
    UC06["UC-06: Lọc và xem bản đồ cụm"]
    UC07["UC-07: Xem chi tiết địa điểm"]
    UC08["UC-08: Đăng bài kèm ảnh"]
    UC09["UC-09: Tương tác bài viết"]
    UC10["UC-10: Đánh giá 4 mức và bình chọn hữu ích"]
    UC11["UC-11: Quản lý bộ sưu tập"]
    UC12["UC-12: Nhận và tùy chỉnh thông báo"]
    UC13["UC-13: Tạo phòng nhóm"]
    UC14["UC-14: Đề xuất quán, tiêu chí và xếp hạng"]
    UC15["UC-15: Xem gợi ý hôm nay"]
    UC16["UC-16: Chia sẻ liên kết"]
    UC17["UC-17: Tự động phát hiện địa điểm trong bài"]
    UC18["UC-18: Nhắn tin trực tiếp thời gian thực"]
    UC19["UC-19: Đề xuất địa điểm mới"]
    UC20["UC-20: Kiểm duyệt, xử lý đề xuất và giám sát"]
    UC21["UC-21: Quản lý điểm neo và định vị cá nhân"]

    Guest --> UC01
    Guest --> UC02
    Guest --> UC03
    Guest --> UC05
    Guest --> UC06
    Guest --> UC07
    Guest --> UC16
    Member --> UC02
    Member --> UC04
    Member --> UC05
    Member --> UC06
    Member --> UC07
    Member --> UC08
    Member --> UC09
    Member --> UC10
    Member --> UC11
    Member --> UC12
    Member --> UC13
    Member --> UC14
    Member --> UC15
    Member --> UC16
    Member --> UC18
    Member --> UC19
    Member --> UC21
    RoomGuest --> UC14
    Admin --> UC20
    Sys --> UC17
```

*Hình 3.1: Sơ đồ use case tổng thể*

Bảng 3.3 tổng hợp 21 use case cùng tiền điều kiện và hậu điều kiện dưới góc độ nghiệp vụ người dùng. Các Bảng 3.4 đến 3.7 trình bày đặc tả chi tiết cho bốn use case trọng tâm của hệ thống; đặc tả của ba use case mở rộng (UC-18, UC-19, UC-20) được đưa về Phụ lục B (Bảng B.1 đến B.3).

**Bảng 3.3: Đặc tả use case tổng hợp (21 use case)**

| Mã | Tên use case | Tác nhân | Tiền điều kiện | Luồng chính tóm tắt | Hậu điều kiện | FR |
|---|---|---|---|---|---|---|
| UC-01 | Đăng ký tài khoản | Khách | Email và tên định danh chưa được dùng | Nhập thông tin, đồng ý điều khoản → hệ thống kiểm tra trùng lặp và gửi liên kết kích hoạt | Tài khoản tạo ở trạng thái chờ xác thực email | FR-01 |
| UC-02 | Đăng nhập & liên kết Google | Khách, Thành viên | Tài khoản hợp lệ và đã xác thực | Đăng nhập bằng email/mật khẩu hoặc Google → điều hướng đúng vùng Người dùng hoặc Quản trị | Phiên làm việc hợp lệ được thiết lập | FR-02 |
| UC-03 | Khôi phục mật khẩu | Khách | Email đã đăng ký | Gửi yêu cầu đặt lại → mở liên kết còn hiệu lực → nhập mật khẩu mới | Mật khẩu mới có hiệu lực và phiên cũ bị thu hồi | FR-03 |
| UC-04 | Cập nhật hồ sơ & Cài đặt | Thành viên | Đã đăng nhập tài khoản người dùng | Sửa thông tin hồ sơ, đổi mật khẩu hoặc yêu cầu xoá vĩnh viễn tài khoản | Hồ sơ cập nhật hoặc tài khoản ẩn danh hoá hoàn toàn | FR-04, FR-27 |
| UC-05 | Tìm kiếm địa điểm | Khách, Thành viên | Không có | Nhập từ khoá (có dấu hoặc không dấu) → phân tích ý định và hợp nhất bốn nhánh tín hiệu | Danh sách địa điểm sắp xếp theo mức độ phù hợp | FR-05 |
| UC-06 | Lọc và xem bản đồ | Khách, Thành viên | Không có | Chọn quận, hạng mục, mức giá hoặc trạng thái mở cửa → đồng bộ danh sách và cụm ghim | Danh sách và bản đồ khớp chung điều kiện lọc | FR-06, FR-07 |
| UC-07 | Xem chi tiết địa điểm | Khách, Thành viên | Địa điểm đã công bố | Mở trang chi tiết → xem thư viện ảnh phân loại, giờ mở cửa, đánh giá và quán tương tự | Hiển thị đầy đủ thông tin; ghi nhận lượt xem | FR-08, FR-21 |
| UC-08 | Đăng bài kèm ảnh | Thành viên | Đã đăng nhập | Soạn nội dung, chọn gợi ý địa điểm nếu cần, đính kèm ảnh và đăng bài | Bài đăng mới hiển thị trên bảng tin cộng đồng | FR-09, FR-19 |
| UC-09 | Tương tác bài viết | Thành viên | Bài đăng tồn tại; đã đăng nhập | Thích, lưu bài viết hoặc gửi bình luận phản hồi nhiều cấp | Bộ đếm cập nhật và gửi thông báo tới tác giả | FR-11 |
| UC-10 | Đánh giá 4 mức & Hữu ích | Thành viên | Đã đăng nhập; địa điểm công khai | Chọn 1 trong 4 mức hài lòng, món nên thử, ảnh thực tế; người khác bình chọn hữu ích | Phân bố 4 mức, tỷ lệ tích cực và số bình chọn cập nhật | FR-12 |
| UC-11 | Quản lý bộ sưu tập | Thành viên | Đã đăng nhập | Tạo danh sách mới, thêm/sắp xếp quán, ghi chú từng quán và mời cộng tác viên | Bộ sưu tập lưu thay đổi ở chế độ công khai hoặc riêng tư | FR-14 |
| UC-12 | Nhận & tùy chỉnh thông báo | Thành viên | Đã đăng nhập | Theo dõi thông báo đẩy trực tiếp, đánh dấu đã đọc và bật/tắt nhóm thông báo | Trạng thái đã đọc và tùy chọn thông báo áp dụng ngay | FR-15 |
| UC-13 | Tạo phòng nhóm | Thành viên | Đã đăng nhập | Đặt tên phòng → hệ thống sinh mã mời 6 ký tự và thêm người tạo làm trưởng nhóm | Phòng nhóm mở, sẵn sàng mời thành viên tham gia | FR-16 |
| UC-14 | Đề xuất quán, tiêu chí & xếp hạng | Khách trong phòng, Thành viên | Biết mã mời và phòng đang mở | Tham gia phòng, ghim vị trí, gửi đề xuất quán/tiêu chí → xem bảng xếp hạng công bằng | Mọi thành viên đồng bộ danh sách xếp hạng theo thời gian thực | FR-16, FR-17 |
| UC-15 | Xem gợi ý hôm nay | Khách, Thành viên | Dữ liệu địa điểm khả dụng | Mở trang Khám phá hoặc danh mục gợi ý → nhận tập quán cá nhân hoá theo khung giờ | Hiển thị danh sách địa điểm gợi ý phù hợp | FR-18 |
| UC-16 | Chia sẻ liên kết | Khách, Thành viên | Tài nguyên đang hiển thị công khai | Chọn Chia sẻ để sao chép liên kết kèm thẻ xem trước Open Graph an toàn | Liên kết sẵn sàng chia sẻ qua các kênh ngoài | FR-20 |
| UC-17 | Phát hiện địa điểm trong bài | Hệ thống | Bài đăng chưa gắn thẻ được tạo | Tác vụ nền định kỳ trích xuất và đối sánh tên quán trong văn bản bài đăng | Bài đăng được gắn thẻ địa điểm phù hợp và gửi gợi ý | FR-10 |
| UC-18 | Nhắn tin trực tiếp thời gian thực | Thành viên | Đã đăng nhập; không chặn hai chiều | Mở Hộp thư chính hoặc Tin nhắn chờ, gửi tin văn bản hoặc thẻ đính kèm qua SSE | Tin nhắn đồng bộ tức thời giữa hai người dùng | FR-25 |
| UC-19 | Đề xuất địa điểm mới | Thành viên | Đã đăng nhập | Điền thông tin quán mới (tên, địa chỉ, quận, hạng mục, giá, tọa độ, giờ mở) và gửi | Đề xuất được lưu vào hàng chờ kiểm duyệt | FR-26 |
| UC-20 | Kiểm duyệt & Giám sát | Quản trị viên | Đã đăng nhập vai trò Quản trị | Truy cập Cổng quản trị để duyệt đề xuất quán, xử lý báo cáo, quản lý và giám sát | Địa điểm duyệt được công bố; thao tác lưu vết kiểm toán | FR-13, FR-23, FR-24, FR-26 |
| UC-21 | Quản lý điểm neo & Định vị | Thành viên | Đã đăng nhập | Lưu điểm mốc cá nhân (nhà, công ty, trường) hoặc bật đồng bộ vị trí GPS hiện tại | Khoảng cách địa điểm tính theo điểm neo đã chọn | FR-22 |

**Bảng 3.4: Đặc tả use case Tìm kiếm địa điểm (UC-05)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-05 — Tìm kiếm địa điểm |
| Tác nhân chính | Khách vãng lai, Thành viên |
| Tiền điều kiện | Không có |
| Luồng sự kiện chính | 1. Người dùng nhập từ khoá tìm kiếm (hỗ trợ tiếng Việt có dấu, không dấu hoặc sai chính tả nhẹ).<br>2. Hệ thống chuẩn hoá truy vấn và phân tích song song theo tên quán, từ khoá mô tả, thuộc tính (quận, hạng mục, mức giá, giờ mở cửa) và ngữ nghĩa.<br>3. Hệ thống đánh giá mức độ rõ ràng của tên địa điểm trong truy vấn để điều chỉnh trọng số giữa bốn nhánh tín hiệu.<br>4. Hệ thống hợp nhất thứ hạng và hiển thị danh sách địa điểm phù hợp từ cao xuống thấp. |
| Luồng thay thế | 2a. Người dùng để trống từ khoá: hệ thống trả về danh sách địa điểm theo các bộ lọc hiện chọn.<br>3a. Nhánh suy luận ngữ nghĩa tạm gián đoạn: hệ thống tự động vận hành bình thường bằng ba nhánh khớp tên, từ khoá và thuộc tính.<br>4a. Không có kết quả phù hợp: giao diện hiển thị trạng thái trống kèm gợi ý sửa từ khoá gần đúng. |
| Hậu điều kiện | Danh sách địa điểm hiển thị đúng thứ tự mức độ phù hợp với nhu cầu tìm kiếm. |

**Bảng 3.5: Đặc tả use case Đăng bài và phát hiện địa điểm (UC-08)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-08 — Đăng bài kèm ảnh và phát hiện địa điểm |
| Tác nhân chính | Thành viên (kích hoạt tiếp UC-17 bởi Hệ thống) |
| Tiền điều kiện | Thành viên đã đăng nhập và trong ngưỡng tần suất đăng bài cho phép |
| Luồng sự kiện chính | 1. Thành viên mở khung soạn thảo và nhập nội dung trải nghiệm.<br>2. Hệ thống gợi ý nhanh các địa điểm có tên gần với nội dung đang gõ.<br>3. Thành viên chọn địa điểm gắn thẻ (nếu muốn) và tải ảnh minh hoạ lên kho lưu trữ đối tượng.<br>4. Thành viên xác nhận đăng bài.<br>5. Hệ thống kiểm tra hợp lệ dữ liệu, kiểm soát khoá chống trùng, lưu bài viết và xếp lịch tác vụ tự động phát hiện địa điểm cho bài chưa gắn thẻ. |
| Luồng thay thế | 3a. Thành viên không đính kèm ảnh hoặc không gắn địa điểm: bài viết vẫn được lưu bình thường.<br>5a. Yêu cầu bị gửi lặp do mạng chập chờn: hệ thống nhận diện khoá lũy đẳng và trả về bản ghi vừa tạo thay vì tạo bản sao. |
| Hậu điều kiện | Bài viết hiển thị ngay trên bảng tin cộng đồng; tác vụ nền bổ sung gắn thẻ địa điểm nếu phát hiện được sự trùng khớp. |

**Bảng 3.6: Đặc tả use case Đánh giá 4 mức và bình chọn hữu ích (UC-10)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-10 — Đánh giá 4 mức hài lòng và bình chọn hữu ích |
| Tác nhân chính | Thành viên |
| Tiền điều kiện | Thành viên đã đăng nhập; địa điểm tồn tại và đang hiển thị công khai |
| Luồng sự kiện chính | 1. Thành viên mở trang chi tiết địa điểm và chọn viết đánh giá.<br>2. Chọn một trong bốn mức hài lòng (Phải thử, Rất ngon, Ổn, Cần cải thiện), nhập tên món nên gọi, nhận xét và ảnh thực tế (nếu có).<br>3. Xác nhận gửi; hệ thống lưu đánh giá kèm ảnh và tính lại phân bố 4 mức cùng tỷ lệ phản hồi tích cực của địa điểm.<br>4. Các thành viên khác nhấn nút "Hữu ích" để bình chọn hoặc bỏ bình chọn cho nhận xét đó. |
| Luồng thay thế | 3a. Thành viên đã đánh giá địa điểm này trước đó: hệ thống cập nhật trực tiếp đánh giá hiện có thay vì tạo thêm bản ghi trùng.<br>4a. Thao tác gửi hoặc bình chọn bị lặp do chập chờn mạng: hệ thống khử trùng thông qua khoá duy nhất. |
| Hậu điều kiện | Đánh giá kèm ảnh hiển thị công khai; bảng phân bố 4 mức và tổng lượt bình chọn hữu ích được cập nhật chính xác. |

**Bảng 3.7: Đặc tả use case Phòng nhóm cộng tác và xếp hạng tiêu chí (UC-14)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-14 — Phòng nhóm cộng tác và xếp hạng tiêu chí |
| Tác nhân chính | Khách trong phòng, Thành viên |
| Tiền điều kiện | Phòng nhóm đang mở và người tham gia có mã mời hoặc liên kết chia sẻ |
| Luồng sự kiện chính | 1. Người tham gia nhập mã phòng 6 ký tự và xác nhận tên hiển thị.<br>2. Mỗi người chọn điểm xuất phát (qua GPS, mốc cá nhân hoặc chấm trên bản đồ) để ghim vị trí lên bản đồ chung.<br>3. Các thành viên đề xuất quán ứng viên và lựa chọn các tiêu chí mong muốn (loại hình, quận, ngân sách tối đa, từ khoá).<br>4. Hệ thống đồng bộ dữ liệu theo thời gian thực tới mọi người đang mở phòng, tính khoảng cách công bằng và sắp xếp ứng viên theo số tiêu chí đạt/mâu thuẫn. |
| Luồng thay thế | 1a. Mã phòng không hợp lệ hoặc đã đóng: hệ thống báo không tìm thấy phòng.<br>1b. Tên hiển thị trùng thành viên khác: hệ thống yêu cầu chọn tên khác để phân biệt.<br>2a. Trên màn hình nhỏ: người dùng có thể thu gọn hoặc mở rộng bản đồ nhóm.<br>3a. Thành viên gỡ tiêu chí hoặc ứng viên: bảng xếp hạng được tính lại tức thì cho cả nhóm. |
| Hậu điều kiện | Mọi thành viên theo dõi được vị trí nhau trên bản đồ chung và danh sách quán sắp xếp minh bạch kèm cảnh báo mâu thuẫn. |

## 3.4. Kiến trúc hệ thống

Hình 3.2 mô tả kiến trúc triển khai tổng thể của hệ thống trên một máy chủ giới hạn 5 nhân và 3,5 GB bộ nhớ, gồm container biên web, container dịch vụ API đa tiến trình, tầng lưu trữ cơ sở dữ liệu – bộ nhớ đệm nội bộ và kho lưu trữ ảnh đối tượng ngoài.

```mermaid
flowchart TB
    Browser["Trình duyệt người dùng (Ứng dụng Web & Cổng quản trị)"]

    subgraph Edge["Container Web - 1,0 nhân / 512 MB"]
        Caddy["Proxy ngược Caddy (TLS, định tuyến, tệp tĩnh)"]
    end

    subgraph Api["Container API - 2,0 nhân / 1 GB"]
        W1["Tiến trình xử lý 1 (Hono + Prisma / Kysely)"]
        W2["Tiến trình xử lý 2 (Hono + Prisma / Kysely)"]
        Obs["Mô-đun quan sát (Nhật ký cấu trúc, HDR Histogram, 4 Cầu dao)"]
        Cron["Tiến trình nền pg-boss (5 hàng đợi tác vụ)"]
    end

    subgraph Data["Tầng lưu trữ nội bộ - 2,0 nhân / 2 GB"]
        PG[("PostgreSQL 17 (Chuẩn 3NF, pgvector, pg_trgm, unaccent)")]
        Queue[("Hàng đợi tác vụ nền + Kênh sự kiện thời gian thực")]
        Redis[("Redis 7 (Giới hạn tốc độ, bộ nhớ đệm, phiên)")]
    end

    R2[("Kho lưu trữ ảnh đối tượng ngoài")]
    K6["Máy phát tải k6"]

    Browser -->|HTTPS| Caddy
    Caddy -->|HTTP nội bộ| W1
    Caddy -->|HTTP nội bộ| W2
    W1 --> Obs
    W2 --> Obs
    W1 --> PG
    W2 --> PG
    Cron --> PG
    W1 --> Queue
    W2 --> Queue
    W1 --> Redis
    W2 --> Redis
    W1 -->|Ký URL tải ảnh| R2
    Browser -->|Tải tệp trực tiếp| R2
    K6 -->|HTTP| Caddy
```

*Hình 3.2: Sơ đồ kiến trúc triển khai hệ thống*

Ba quyết định kiến trúc trọng tâm:

- **Tận dụng đa nhân bằng chia sẻ cổng:** Container dịch vụ chạy đồng thời các tiến trình xử lý theo số nhân được cấp, lắng nghe trên cùng một cổng mạng nội bộ thông qua cơ chế chia sẻ cổng của hệ điều hành.
- **Đồng bộ sự kiện thời gian thực không cần broker rời:** Sự kiện phòng nhóm, thông báo và tin nhắn trực tiếp được phát qua kênh thông báo nội bộ của PostgreSQL tới mọi tiến trình đang mở kết nối SSE.
- **Hàng đợi tác vụ nền bền vững dùng chung cơ sở dữ liệu:** `pg-boss` lưu hàng đợi trong PostgreSQL và chạy ở tiến trình riêng để tách tải tính toán nền khỏi luồng phục vụ HTTP.

## 3.5. Luồng tương tác

Hình 3.3 trình bày biểu đồ tuần tự của luồng tìm kiếm lai ghép qua bốn nhánh chạy song song.

```mermaid
sequenceDiagram
    autonumber
    participant TD as Trình duyệt
    participant XL as Tiến trình dịch vụ
    participant CSDL as Cơ sở dữ liệu
    participant MN as Mô hình nhúng

    TD->>XL: Yêu cầu tìm kiếm địa điểm theo từ khoá
    XL->>XL: Chuẩn hoá truy vấn về dạng không dấu
    XL->>XL: Trích xuất bằng chứng định danh và thuộc tính
    par Bốn nhánh tìm kiếm song song
        XL->>CSDL: Nhánh khớp tên và tiền tố
        CSDL-->>XL: Danh sách mã địa điểm
    and
        XL->>CSDL: Nhánh từ khoá trigram qua chỉ mục GIN
        CSDL-->>XL: Danh sách mã địa điểm
    and
        XL->>CSDL: Nhánh khớp thuộc tính cấu trúc
        CSDL-->>XL: Danh sách mã địa điểm
    and
        XL->>MN: Sinh vector truy vấn 384 chiều
        MN-->>XL: Vector đặc trưng truy vấn
        XL->>CSDL: Truy vấn lân cận theo khoảng cách cosine
        CSDL-->>XL: Danh sách mã địa điểm
    end
    XL->>XL: Điều chỉnh trọng số theo bằng chứng định danh
    XL->>XL: Hợp nhất thứ hạng các nhánh
    XL->>CSDL: Truy xuất chi tiết danh sách kết quả
    CSDL-->>XL: Thông tin địa điểm kèm phân bố đánh giá
    XL-->>TD: Phản hồi thành công kèm danh sách kết quả
```

*Hình 3.3: Biểu đồ tuần tự luồng tìm kiếm địa điểm lai ghép*

Hình 3.4 mô tả luồng đăng bài và kích hoạt tác vụ nền phát hiện địa điểm nhắc tới trong nội dung.

```mermaid
sequenceDiagram
    autonumber
    participant TD as Trình duyệt
    participant XL as Tiến trình dịch vụ
    participant CSDL as Cơ sở dữ liệu
    participant HD as Hàng đợi tác vụ
    participant NN as Tiến trình nền

    TD->>XL: Gửi yêu cầu đăng bài kèm nội dung và ảnh
    XL->>CSDL: Kiểm tra khoá chống trùng lặp
    XL->>CSDL: Lưu bản ghi bài đăng và danh sách ảnh
    CSDL-->>XL: Xác nhận lưu thành công
    XL->>HD: Đưa tác vụ phát hiện địa điểm vào hàng đợi
    Note over XL,HD: Lưu bài và đẩy tác vụ diễn ra tuần tự
    XL-->>TD: Trả về thông tin bài đăng vừa tạo
    HD->>NN: Nhận tác vụ cần xử lý
    NN->>CSDL: Đọc nội dung bài đăng và danh mục địa điểm
    NN->>NN: Đối sánh tên quán trong nội dung văn bản
    alt Phát hiện được địa điểm phù hợp
        NN->>CSDL: Tạo gợi ý gắn thẻ và thông báo tới tác giả
    else Không tìm thấy khớp
        NN->>CSDL: Đánh dấu bài viết đã hoàn tất quét
    end
    loop Chu kỳ quét bù định kỳ
        NN->>CSDL: Tìm bài viết chưa có bản ghi phát hiện
        CSDL-->>NN: Danh sách bài viết cần xử lý bù
        NN->>HD: Đưa bài vào hàng đợi xử lý lại
    end
```

*Hình 3.4: Biểu đồ tuần tự luồng đăng bài và tác vụ phát hiện địa điểm nền*

Hình 3.5 minh họa luồng cộng tác thời gian thực trong phòng nhóm, từ lúc tham gia phòng, mở luồng sự kiện SSE đến lúc áp dụng đề xuất tiêu chí có kiểm soát tương tranh.

```mermaid
sequenceDiagram
    autonumber
    participant TD as Trình duyệt
    participant XL as Tiến trình dịch vụ
    participant CSDL as Cơ sở dữ liệu
    participant KN as Kênh sự kiện nội bộ

    TD->>XL: Yêu cầu tham gia phòng bằng mã mời
    XL->>CSDL: Kiểm tra mã phòng và ghi nhận thành viên
    CSDL-->>XL: Trả thẻ phiên phòng bảo mật HttpOnly
    XL-->>TD: Phản hồi thành công kèm trạng thái phòng
    TD->>XL: Mở kết nối nhận sự kiện thời gian thực (SSE)
    XL->>KN: Đăng ký lắng nghe sự kiện theo mã phòng
    TD->>XL: Gửi đề xuất tiêu chí hoặc quán ứng viên
    XL->>CSDL: Lưu đề xuất ở trạng thái mở
    XL->>KN: Phát sự kiện có đề xuất mới
    KN-->>XL: Chuyển tiếp tới mọi tiến trình đang kết nối
    XL-->>TD: Đẩy cập nhật giao diện thời gian thực qua SSE
    TD->>XL: Gửi yêu cầu áp dụng đề xuất vào phòng
    XL->>CSDL: Mở giao dịch, chuyển trạng thái có điều kiện từ Mở sang Đã áp dụng
    alt Cập nhật thành công
        XL->>CSDL: Ghi nhận bộ lọc mới của phòng
        XL->>KN: Phát sự kiện đã áp dụng tiêu chí
        XL-->>TD: Phản hồi thành công kèm bộ lọc mới
    else Xung đột do đã có người áp dụng trước
        XL-->>TD: Từ chối với mã xung đột (409)
    end
```

*Hình 3.5: Biểu đồ tuần tự luồng bình chọn nhóm thời gian thực (SSE)*

Hình 3.6 trình bày luồng tải ảnh trực tiếp từ trình duyệt người dùng lên kho lưu trữ đối tượng thông qua URL có chữ ký thời hạn ngắn, tránh đi qua băng thông của máy chủ dịch vụ.

```mermaid
sequenceDiagram
    autonumber
    participant TD as Trình duyệt
    participant XL as Tiến trình dịch vụ
    participant LT as Kho lưu trữ đối tượng

    TD->>XL: Yêu cầu cấp URL tải ảnh (thư mục, định dạng, kích thước)
    XL->>XL: Kiểm tra định dạng hợp lệ và giới hạn dung lượng (≤ 5 MB)
    XL->>XL: Sinh đường dẫn định danh gắn với mã tài khoản
    XL->>LT: Ký URL tải lên có thời hạn 600 giây
    LT-->>XL: URL đã ký hợp lệ
    XL-->>TD: Trả về URL tải lên và khoá tệp
    TD->>LT: Gửi tệp ảnh trực tiếp lên URL đã ký
    LT-->>TD: Xác nhận lưu trữ thành công
    TD->>XL: Gửi bài đăng hoặc đánh giá kèm khoá ảnh
    XL->>XL: Kiểm tra quyền sở hữu khoá ảnh và lưu tham chiếu
```

*Hình 3.6: Biểu đồ tuần tự luồng tải ảnh trực tiếp qua URL có chữ ký*

Hình 3.7 trình bày luồng nhắn tin trực tiếp thời gian thực giữa hai người dùng, tích hợp kiểm tra chặn hai chiều và phân tách Hộp thư chính / Tin nhắn chờ.

```mermaid
sequenceDiagram
    autonumber
    participant NG as Người gửi
    participant XL as Tiến trình dịch vụ
    participant CSDL as Cơ sở dữ liệu
    participant KN as Kênh sự kiện nội bộ
    participant NN as Người nhận (SSE)

    NN->>XL: Mở kết nối nhận sự kiện tin nhắn
    XL->>KN: Đăng ký lắng nghe kênh tin nhắn của người nhận
    NG->>XL: Gửi tin nhắn kèm thẻ đính kèm (nếu có)
    XL->>CSDL: Kiểm tra danh sách chặn hai chiều
    alt Bị chặn hoặc tự nhắn cho chính mình
        XL-->>NG: Từ chối yêu cầu (403 hoặc 400)
    else Yêu cầu hợp lệ
        XL->>CSDL: Lưu tin nhắn và phân loại Hộp thư chính hoặc Tin nhắn chờ
        XL->>KN: Phát sự kiện tin nhắn mới (kèm thông báo nếu bật nhận)
        KN-->>XL: Chuyển tới tiến trình đang giữ kết nối của người nhận
        XL-->>NN: Đẩy tin nhắn mới tới khung trò chuyện (SSE)
        XL-->>NG: Xác nhận đã tạo tin nhắn thành công (201)
    end
```

*Hình 3.7: Biểu đồ tuần tự luồng nhắn tin trực tiếp thời gian thực (SSE)*

Hình 3.8 trình bày luồng cộng đồng đề xuất địa điểm mới và quy trình quản trị viên phê duyệt để công bố chính thức.

```mermaid
sequenceDiagram
    autonumber
    participant TV as Thành viên
    participant XL as Tiến trình dịch vụ
    participant CSDL as Cơ sở dữ liệu
    participant QT as Quản trị viên

    TV->>XL: Gửi thông tin đề xuất địa điểm mới
    XL->>CSDL: Lưu đề xuất ở trạng thái chờ duyệt
    XL-->>TV: Xác nhận đã tiếp nhận đề xuất (201)
    QT->>XL: Tải danh sách đề xuất chờ kiểm duyệt
    XL-->>QT: Trả về danh sách chờ duyệt
    QT->>XL: Phê duyệt đề xuất địa điểm
    XL->>CSDL: Giao dịch nguyên tử: tạo quán, gắn thẻ, chuyển trạng thái và ghi nhật ký kiểm toán
    CSDL-->>XL: Xác nhận hoàn tất giao dịch
    XL-->>QT: Phản hồi thành công kèm thông tin quán mới công bố
```

*Hình 3.8: Biểu đồ tuần tự luồng đề xuất địa điểm mới và kiểm duyệt quản trị*

Hình 3.9 biểu diễn vòng đời trạng thái của một đề xuất tiêu chí trong phòng bình chọn nhóm: mọi chuyển đổi từ trạng thái *Mở* sang *Đã áp dụng* hoặc *Đã bỏ* đều qua cập nhật có điều kiện để loại trừ ghi đè song song.

```mermaid
stateDiagram-v2
    [*] --> Mo: Tạo đề xuất mới
    Mo --> ApDung: Áp dụng thành công
    Mo --> DaBo: Bỏ đề xuất thành công
    Mo --> Mo: Xung đột cập nhật (trả mã 409)
    ApDung --> [*]
    DaBo --> [*]

    Mo: Đang mở
    ApDung: Đã áp dụng
    DaBo: Đã bỏ
```

*Hình 3.9: Biểu đồ trạng thái vòng đời một đề xuất trong phòng bình chọn*

Hình 3.10 trình bày biểu đồ hoạt động của luồng tìm kiếm địa điểm lai ghép EGRF, bao gồm phân nhánh sang phân trang thường khi không có từ khoá và nhánh tính gợi ý sửa lỗi từ khoá khi kết quả rỗng.

```mermaid
flowchart TD
    A(["Tiếp nhận yêu cầu tìm kiếm địa điểm"]) --> B{"Vượt giới hạn tốc độ?"}
    B -->|Có| B1(["Từ chối quá tần suất (429)"])
    B -->|Không| C["Phân tích bộ lọc và giải mã con trỏ"]
    C --> D{"Con trỏ hợp lệ?"}
    D -->|Không| D1(["Báo lỗi dữ liệu (400)"])
    D -->|Có| E{"Có từ khoá, không con trỏ và sắp xếp mặc định?"}
    E -->|Không| F["Phân trang con trỏ theo thứ tự đã chọn"]
    E -->|Có| G["Chạy EGRF: bốn nhánh tìm kiếm song song"]
    G --> G1["Nhánh ngữ nghĩa: vector 384 chiều"]
    G --> G2["Nhánh từ khoá: trigram qua chỉ mục GIN"]
    G --> G3["Nhánh tên: khớp chính xác, tiền tố, từng từ"]
    G --> G4["Nhánh cấu trúc: suy luận hạng mục, quận, thuộc tính"]
    G1 --> H["Chọn bộ trọng số theo bằng chứng định danh"]
    G2 --> H
    G3 --> H
    G4 --> H
    H --> I["Hợp nhất RRF với k theo quy mô dữ liệu"]
    I --> J{"Danh sách hợp nhất rỗng?"}
    J -->|Có| F
    J -->|Không| K["Truy xuất bản ghi theo thứ hạng hợp nhất"]
    F --> L["Tập kết quả đầu ra"]
    K --> L
    L --> M{"Không có kết quả và từ khoá từ 3 ký tự?"}
    M -->|Có| M1["Tính gợi ý sửa từ khoá bằng trigram"]
    M -->|Không| N["Bỏ qua gợi ý sửa lỗi"]
    M1 --> O["Ghi sự kiện tìm kiếm bất đồng bộ"]
    N --> O
    O --> P(["Trả về danh sách kết quả và siêu dữ liệu"])
```

*Hình 3.10: Biểu đồ hoạt động luồng tìm kiếm địa điểm EGRF*

Hình 3.11 trình bày biểu đồ hoạt động gồm hai pha của luồng đăng bài và phát hiện địa điểm nhắc tên trong nội dung.

```mermaid
flowchart TD
    A(["Thành viên gửi yêu cầu đăng bài"]) --> B{"Đã xác thực và trong giới hạn tốc độ?"}
    B -->|Không| B1(["Từ chối (401 hoặc 429)"])
    B -->|Có| C{"Trùng khoá lũy đẳng đã xử lý?"}
    C -->|Có| C1(["Trả về bản ghi bài đăng cũ"])
    C -->|Không| D{"Dữ liệu đầu vào hợp lệ?"}
    D -->|Không| D1(["Báo lỗi đầu vào (400)"])
    D -->|Có| E{"Có chỉ định địa điểm?"}
    E -->|Có| E1{"Địa điểm tồn tại?"}
    E1 -->|Không| E2(["Báo không tìm thấy (404)"])
    E1 -->|Có| F
    E -->|Không| F["Kiểm tra quyền sở hữu tệp ảnh đính kèm"]
    F --> G["Giao dịch lưu bài đăng và danh sách ảnh"]
    G --> H{"Lưu thành công?"}
    H -->|Không| H1(["Báo lỗi máy chủ (500)"])
    H -->|Có| I{"Bài đăng chưa gắn địa điểm?"}
    I -->|Có| J["Đẩy tác vụ phát hiện địa điểm vào hàng đợi"]
    I -->|Không| K
    J --> K(["Trả về bài đăng vừa tạo (201)"])

    K -.->|Xử lý nền| W1(["Tiến trình nền nhận tác vụ"])
    W1 --> W2["Tìm bài chưa gắn thẻ và chưa có gợi ý"]
    W2 --> W3{"Có bài cần xử lý?"}
    W3 -->|Không| W9(["Kết thúc chu kỳ"])
    W3 -->|Có| W4["Nạp danh mục địa điểm ứng viên"]
    W4 --> W5["Chuẩn hoá nội dung và xếp hạng khớp tên"]
    W5 --> W6{"Có địa điểm phù hợp?"}
    W6 -->|Không| W9
    W6 -->|Có| W7["Giao dịch lưu thông báo gợi ý và dấu xử lý"]
    W7 --> W8["Phát sự kiện thời gian thực sau commit"]
    W8 --> W9
```

*Hình 3.11: Biểu đồ hoạt động luồng đăng bài và phát hiện địa điểm*

## 3.6. Thiết kế thuật toán và phân hệ trí tuệ nhân tạo

Phân hệ trí tuệ nhân tạo và truy xuất thông tin là hạt nhân nghiệp vụ của Rendez, gồm năm mô-đun liên kết chặt chẽ từ lớp tiếp nhận truy vấn đến lớp gợi ý cá nhân hóa và hỗ trợ ra quyết định nhóm: (1) bộ phân tích ngôn ngữ tự nhiên tiếng Việt; (2) thuật toán tìm kiếm lai ghép 6 luồng EGRF; (3) thuật toán lập lịch phơi bày tất định DES cho cold-start; (4) nhánh lọc cộng tác vật phẩm kết hợp dự phòng vector `pgvector`; và (5) bộ phát hiện địa điểm theo ngữ cảnh bài đăng cùng cơ chế chấm điểm phòng nhóm.

### 3.6.1. Bộ phân tích ngôn ngữ tự nhiên tiếng Việt và bóc tách thực thể

Truy vấn người dùng trong ngữ cảnh ẩm thực Đà Nẵng thường pha trộn từ khóa tự do, tên quận, mức ngân sách bình dân và cả ý định loại trừ (*"cà phê yên tĩnh ở Sơn Trà dưới 65k không ồn"*). Gói dùng chung `@rendez/schema` (`natural-query`) cài đặt bộ phân tích tất định dùng chung giữa trình duyệt và máy chủ theo các bước:

1. **Chuẩn hóa Unicode và tách token giữ ranh giới mệnh đề:** Đưa chuỗi về dạng chuẩn tổ hợp `NFD`, loại bỏ dấu thanh, chuyển `đ/Đ → d`, viết thường và bảo toàn dấu `,` `;` làm ranh giới mệnh đề nhằm ngăn cụm phủ định ở vế sau lan sang vế trước.
2. **Nhận diện ngữ cảnh chống đảo nghĩa và chống đồng âm dấu:** Duy trì danh sách ngoại lệ `NON_NEGATION_AFTER_KHONG` (`"không gian"`, `"không khí"`) để câu *"cà phê không gian yên tĩnh"* không bị hiểu nhầm thành phủ định; áp dụng khớp theo cụm từ chính xác có dấu đối với các cặp đồng âm dễ nhầm (`"cơm cháy"` ≠ món chay, `"mắm tôm"` ≠ quán hải sản).
3. **Bóc xuất 8 nhóm ràng buộc có cấu trúc và đọc giá số:** Trích xuất đồng thời loại hình dương/âm, quận dương/âm, các từ khóa không gian/nhu cầu (`yên tĩnh`, `view biển`, `làm việc`, `ngồi ngoài trời`...), mở cửa `24/7`, khoảng cách gần tôi, địa danh tham chiếu và khoảng ngân sách dạng số tiếng Việt (`"dưới 65k"`, `"tầm 80 nghìn"` ánh xạ về 3 bậc giá $\le 60\text{k}$, $\le 200\text{k}$, $> 200\text{k}$). Các cụm đã khớp được gỡ bỏ khỏi chuỗi gốc để tạo **truy vấn phần dư (`residualQuery`)** truyền cho nhánh vector và từ khóa.
4. **Cơ chế Bảo vệ thực thể (`Entity Guard`) và Tự nới lỏng (`Auto-Relaxation`):** Tại `hybrid.ts` (`promotePlaceFilters`), hệ thống chỉ nâng các ràng buộc bóc được thành điều kiện lọc SQL cứng khi truy vấn không khớp chính xác tên riêng của một quán (`guardNames.exact.length === 0`). Nếu sau khi lọc cứng tập kết quả rỗng (ví dụ tên quán có chứa chữ tên một quận nhưng tọa lạc ở quận khác), hệ thống tự động quay về tìm trên truy vấn gốc kèm cờ `relaxedFilters = true`.

### 3.6.2. Thuật toán tìm kiếm lai ghép 6 luồng kiểm soát bằng chứng (EGRF)

Khác với tìm kiếm lai 2 nhánh cổ điển, thuật toán **EGRF (Evidence-Gated Rank Fusion)** trong `hybrid.ts` và `rrf.ts` chạy song song **4 nhóm xử lý và xuất ra 6 luồng ứng viên** đưa vào hợp nhất:

- **Ba luồng khớp tên (`name-matcher.ts`):** Truy vấn trực tiếp trên cột tên đã chuẩn hóa `immutable_search_normalize(p.name)`, tách thành ba danh sách ưu tiên riêng: khớp chính xác toàn chuỗi (`exact`), khớp tiền tố (`prefix`) và khớp toàn bộ token (`tokens`).
- **Luồng từ khóa bề mặt (`lexical.ts`):** Mở rộng cụm đồng nghĩa miền ẩm thực (`"ca phe" ↔ "cafe", "coffee"`; `"hai san" ↔ "seafood"`...) rồi xếp hạng bằng hàm kết hợp độ tương đồng trigram (`pg_trgm`) trên chỉ mục GIN với hệ số nhân $3\times$ cho trường tên quán và $1\times$ cho địa chỉ/quận/thẻ (`HAYSTACK`), đồng thời hỗ trợ so khớp chuỗi nén bỏ khoảng trắng (`COMPACT_HAYSTACK`) để chịu lỗi gõ dính từ.
- **Luồng suy luận cấu trúc (`intent.ts`):** Chấm điểm độ chồng lấp hạng mục, quận, thẻ tag và mở `24/7`, cộng điểm thưởng $+10$ khi địa điểm thỏa đồng thời từ hai điều kiện ý định trở lên.
- **Luồng ngữ nghĩa vector (`dense.ts` và `embeddings.ts`):** Sử dụng mô hình đa ngữ lượng tử hóa `Xenova/multilingual-e5-small` (`dtype: "q8"`, chiều $d = 384$, chuẩn mean pooling + L2 normalize, tiền tố `"passage: "` khi lập chỉ mục và `"query: "` khi truy vấn). Truy vấn trước khi tra cứu đều qua hàm chuẩn hóa `normalizeEmbeddingCacheKey` (chuẩn hóa Unicode `NFC`, gộp khoảng trắng dư, chuyển chữ thường nhưng bảo toàn dấu thanh tiếng Việt cho mô hình ngữ nghĩa), sau đó đi qua bộ nhớ đệm 2 tầng (`LRUCache` tối đa 100 mục trong RAM + Redis TTL 24 giờ theo mã băm SHA-256) và được bảo vệ bởi cầu dao ngắt mạch `cockatiel` (ngắt 30 giây sau 3 lỗi liên tiếp, giới hạn timeout 3 giây) để hệ thống tự hạ cấp an toàn về 5 luồng còn lại khi bộ nhúng gặp sự cố. Truy vấn lân cận thực hiện bằng toán tử khoảng cách cosine (`<=>`) trên `pgvector`.

Điểm hợp nhất và hằng số làm mịn thích ứng được tính theo công thức:

$$S_{\text{EGRF}}(d) = \sum_{r \in \{\text{exact},\ \text{prefix},\ \text{tokens},\ \text{lexical},\ \text{structured},\ \text{dense}\}} \frac{w_r(\text{ev})}{k(N) + \mathrm{rank}_r(d)} \tag{3.1}$$

$$k(N) = \max\left(10,\ \left\lfloor 2\sqrt{N} \right\rfloor\right) \tag{3.2}$$

Trong đó:
- $r$: một trong sáu luồng xếp hạng đầu vào (mỗi luồng lấy tối đa $50$ ứng viên `HYBRID_POOL`).
- $\mathrm{rank}_r(d)$: thứ hạng của địa điểm $d$ ở luồng $r$ (bắt đầu từ $1$).
- $w_r(\text{ev})$: trọng số cổng bằng chứng chọn tự động theo trạng thái định danh $\text{ev}$ và cờ `isPureIntentQuery` (Bảng 3.8).
- $N$: tổng số địa điểm đang công bố ($N = 358 \Rightarrow k(N) = 37$).

**Bảng 3.8: Trọng số 4 chế độ cổng bằng chứng của thuật toán EGRF (`S-5`)**

| Chế độ bằng chứng ($\text{ev}$) | `exact` | `prefix` | `tokens` | `lexical` | `structured` | `dense` |
|---|---|---|---|---|---|---|
| 1. Khớp tên chính xác (`hasExact && !isPureIntentQuery`) | 6,0 | 3,0 | 2,0 | 1,0 | 0,0 | 0,0 |
| 2. Khớp tiền tố/từ tên (`!isPureIntentQuery && (hasPrefix \|\| hasTokens)`) | 0,0 | 3,0 | 2,5 | 1,0 | 1,5 | 1,2 |
| 3. Truy vấn thuần ý định có thuộc tính cấu trúc (`hasCategoryAttr`) | 2,0 | 0,75 | 0,75 | 1,0 | 3,0 | 1,2 |
| 4. Truy vấn trừu tượng (không tên, không thuộc tính) | 0,0 | 0,0 | 0,0 | 1,0 | 1,0 | 2,5 |

Khi xuất ra tập kết quả cuối, bước **Quality-Aware RRF Tie-Breaking (`S-6`)** gom các ứng viên có chênh lệch điểm $S_{\text{EGRF}}$ không quá $10^{-4}$ vào cùng một nhóm hòa và sắp xếp lại theo mức độ ưu tiên: (a) có ảnh thực tế; (b) điểm chất lượng Bayes $(v \cdot (\text{positive\_ratio}/20) + 10 \cdot 3,8)/(v + 10)$; rồi mới tới điểm RRF chính xác. Nếu tập kết quả rỗng và từ khóa dài tối thiểu $5$ ký tự bỏ khoảng trắng (`normalizedQuery`), hàm `findDidYouMean` gợi ý tên quán gần nhất qua ngưỡng trigram `similarity >= 0,45`.

```text
Thuật toán 3.1: Tìm kiếm lai ghép 6 luồng kiểm soát bằng chứng (EGRF)
Đầu vào: Truy vấn văn bản Q, bộ lọc gốc F, kích thước tập địa điểm N
Đầu ra:  Danh sách địa điểm đã xếp hạng kèm cờ relaxedFilters (nếu nới lỏng)

1:  Q_norm ← NormalizeNFD(Q)
2:  guardNames ← MatchThreeTierNames(Q_norm, F)
3:  promotion ← PromoteNaturalFilters(Q, F)
4:  Nếu guardNames.exact = ∅ và promotion.hasConstraints:
      Thử tìm với điều kiện lọc cứng promotedFilters và chuỗi phần dư residualQuery
      Nếu tập kết quả khác rỗng → trả kết quả; ngược lại nới lỏng về (Q, F) kèm relaxedFilters ← true
5:  Chạy song song 4 nhóm tạo 6 luồng ứng viên (pool = 50):
      [L_exact, L_prefix, L_tokens] ← MatchThreeTierNames(Q_eff, F_eff)
      L_lexical    ← FieldBoostedTrigramGIN(Q_eff + Synonyms, F_eff)
      L_structured ← IntentAttributeOverlap(Intent(Q_eff), F_eff)
      L_dense      ← PgVectorCosine(EmbedCacheOrCircuitBreaker(Q_eff), F_eff)
6:  Chọn bộ trọng số W theo 4 chế độ cổng bằng chứng ở Bảng 3.8
7:  Tính k ← max(10, floor(2 * sqrt(N))) và hợp nhất điểm S_EGRF(d) theo công thức (3.1)
8:  Sắp xếp phá hòa S-6: làm tròn bucket 1e-4 → ưu tiên có ảnh → BayesQuality → score chính xác
9:  Trả về danh sách xếp hạng (nếu rỗng và |Q_norm| ≥ 5 thì kèm DidYouMean với trigram ≥ 0.45)
```

### 3.6.3. Thuật toán gợi ý lạnh DES (Deterministic Exposure Scheduling)

Để khắc phục bài toán *item cold-start* khi địa điểm mới chưa có hoặc có rất ít đánh giá nhưng vẫn bảo đảm công bằng với quán lâu năm [19], nhánh **DES (`scoreColdStart` trong `recommendations.ts`)** kết hợp đánh giá Bayes điều chỉnh độ đầy đủ siêu dữ liệu với nhiễu xoay vòng tất định:

$$C_i = 0,35\,I_{\text{ảnh}} + 0,20\,I_{\text{mô tả}>10} + 0,20\,I_{\text{giờ mở}} + 0,15\,I_{\text{thẻ tag}} + 0,10\,I_{\text{SĐT}} \tag{3.3}$$

$$\hat{R}(i) = \frac{v_i \cdot \bar{r}_i + m_0 \cdot \left(3,4 + 1,0 \cdot C_i\right)}{v_i + m_0} \tag{3.4}$$

$$S_{\text{cold}}(i, b) = 0,45\,\hat{R}(i) + 0,20\,V(i) + 0,20\,C_i + 0,15\,T(i) + \beta \cdot h_{\text{MD5}}(i,\ b) \tag{3.5}$$

Trong đó:
- $C_i \in [0, 1]$: chỉ số hoàn thiện hồ sơ của địa điểm $i$ từ 5 thành phần thông tin thực tế.
- $v_i, \bar{r}_i$: số lượt đánh giá hiện có và trung bình điểm đánh giá của $i$ (quy đổi từ 4 mức: Phải thử $= 5,0$; Rất ngon $= 4,0$; Ổn $= 3,0$; Cần cải thiện $= 0,0$).
- $m_0 = 10$: khối lượng tiên nghiệm; điểm kỳ vọng nền $\mu_0(i) = 3,4 + 1,0 C_i \in [3,4;\ 4,4]$ giúp quán có ảnh/giờ/mô tả vượt trội ngay cả khi $v_i = 0$ nhưng hội tụ mượt về $\bar{r}_i$ khi $v_i$ lớn.
- $V(i) \in \{1,0;\ 0,5\}$: điểm xác minh địa điểm (`verified`); $T(i) = \max(0,\ 1 - \text{tuổi\_ngày}/365)$: điểm tươi mới theo thời gian.
- $b = \lfloor \text{now} / 3.600.000 \rfloor$: chỉ số **khung giờ 1 giờ** hiện hành; $h_{\text{MD5}}(i, b) \in [0, 1)$: băm 32 bit đầu của `md5(id || b)` với biên độ $\beta = 0,05$ để xoay vòng tự nhiên các quán đồng điểm theo từng giờ mà vẫn tái lập được.
- Cuối cùng, thuật toán áp ngưỡng đa dạng **`COLD_START_CAP_PER_CATEGORY = 3`** địa điểm tối đa cho mỗi hạng mục ở vòng đầu (`cat_rank <= 3`).

### 3.6.4. Nhánh sở thích cá nhân hóa (R-1 đến R-4) và Lọc cộng tác vật phẩm

Khi người dùng (định danh hoặc ẩn danh qua `anonId`) đã phát sinh tương tác trong cửa sổ **`HISTORY_WINDOW_DAYS = 90` ngày**, hệ thống chuyển sang chiến lược lai `affinity` gồm tính toán ngoại tuyến bảng `affinity_cache` và tổng hợp thời gian thực (`scoreAffinity`):

**Bảng 3.9: Trọng số điểm tương tác hành vi trong hệ thống gợi ý DES**

| Nhóm hành vi | Sự kiện (`interaction_events`) | Trọng số (`weight`) | Ý nghĩa mô hình hóa |
|---|---|---|---|
| Tích cực chủ động | Đánh giá quán (`review_created`) | $+8$ | Tín hiệu cam kết mạnh nhất từ trải nghiệm thật |
| Chia sẻ / Check-in | Lưu quán, lưu bài (`*save`), chia sẻ, check-in | $+5$ đến $+6$ | Ý định quay lại và xác nhận trải nghiệm cao |
| Tương tác vừa | Thích (`post_like`), bình luận (`comment_created`) | $+3$ đến $+4$ | Thể hiện mức độ quan tâm nội dung gắn quán |
| Tiêu thụ thụ động | Tìm kiếm, nhấp xem chi tiết, hiển thị (`impression`) | $+1$ đến $+2$ | Dữ liệu nền mật độ cao để lọc cộng tác |
| Phản hồi âm | Bớt gợi ý (`lessLikeThis`), ẩn địa điểm (`hide`) | $-2$ đến $-3$ | Triệt tiêu hạt giống dương, không gợi ý lại |

1. **Tổng hợp hạt giống dương ròng (`R-2` & `R-3`):** Mỗi điểm tương tác suy giảm theo hàm mũ với bán rã **`AFFINITY_HALF_LIFE_DAYS = 30` ngày**: $\delta(\Delta t) = \exp(-\ln 2 \cdot \Delta t / 30)$. Lọc điều kiện tổng ròng `HAVING SUM(weight * delta) > 0` (**R-2**) để thao tác ẩn quán hoặc huỷ lưu có thể triệt tiêu hoàn toàn sở thích cũ; đồng thời nén tổng tích luỹ bằng hàm logarit $w_{\text{seed}} = \max(\text{pos\_decayed}) + \ln(1 + \max(0, \sum \text{decayed}))$ (**R-3**) nhằm chặn hiện tượng tải lại trang nhiều lần đè bẹp đánh giá thật.
2. **Lọc cộng tác vật phẩm khử thiên kiến đại trà (`R-4`):** Tác vụ nền hằng ngày `refreshAffinityCache` [14] chuẩn hóa vector L2 từng người dùng, tích lũy ma trận đồng xuất hiện và áp hệ số **Item-Degree Cosine Damping (`R-4`)** chia điểm thô cho $\sqrt{\sqrt{\|\mathbf{v}_A\|_2^2 \cdot \|\mathbf{v}_B\|_2^2}}$ (ghi đè toàn bộ trong một giao dịch MVCC để API đọc không bao giờ gặp cache rỗng).
3. **Dự phòng nội dung vector `pgvector` (`R-1`):** Khi `affinity_cache` trả về dưới **15 ứng viên** (thực tế thường gặp ở người dùng mới chỉ có 1–2 lần nhấp hoặc dữ liệu thưa), hệ thống lấy tối đa 5 hạt giống mạnh nhất tính điểm tương đồng nội dung từ bảng `place_embeddings`:

$$S_{\text{R-1}}(s, c) = 0,60 \cdot \max\bigl(0,\ 1 - d_{\cos}(\mathbf{e}_s, \mathbf{e}_c)\bigr) + 0,25\,\mathbb{I}_{\text{cat}} + 0,10\,\mathbb{I}_{\text{dist}} + 0,05\,\mathbb{I}_{\text{tag}} \tag{3.6}$$

```text
Thuật toán 3.2: Gợi ý cá nhân hóa đa tầng và Lập lịch phơi bày tất định (DES)
Đầu vào: Tác nhân actor (userId / anonId), giới hạn số lượng L
Đầu ra:  Danh sách L địa điểm kèm chiến lược ("affinity" hoặc "cold-start")

1:  Truy vấn hạt giống dương ròng trong 90 ngày với phân rã bán rã 30 ngày (R-2, R-3)
2:  Nếu có tập hạt giống S (tối đa 50 quán):
      Đọc hàng xóm từ `affinity_cache` và tập quán đã tương tác `seen`
      Tính tổng điểm affinity theo tỷ trọng từng hạt giống, loại bỏ mọi quán trong `seen`
      Nếu số ứng viên < 15 (R-1): bổ sung tối đa 40 quán qua vector `pgvector` + metadata (công thức 3.6)
3:  Nếu danh sách ứng viên từ bước 2 không rỗng:
      Áp giới hạn đa dạng 3 quán/hạng mục (vòng 1)
      Nếu vẫn thiếu < L: bù bằng nhánh `scoreColdStart` (công thức 3.3–3.5) loại trừ `seen`, rồi lấy `overflow`
      Trả về kết quả kèm strategy = "affinity"
4:  Ngược lại (người dùng hoàn toàn mới): chạy `scoreColdStart` theo khung giờ 1h, trả strategy = "cold-start"
```

### 3.6.5. Phát hiện địa điểm theo ngữ cảnh bài đăng và Gợi ý hằng ngày

- **Phát hiện địa điểm từ nội dung (`ranking.ts` + worker `place-detect`):** Chấm điểm ứng viên trên nội dung đã bỏ dấu theo 5 tín hiệu: khớp nguyên cụm tên quán $\ge 4$ ký tự ($+60$), khớp từng token tên ($+12/\text{token}$), khớp thẻ tag ($+10/\text{tag}$), từ khóa loại hình ($+8$), quận ($+8$) hoặc tên đường ($+6$)/thành phố ($+5$), cộng phần phá hòa chất lượng ($0,6\,\bar{r} + \min(v, 5000)/5000$). Hàm chạy đồng thời lúc người dùng gõ bài (`GET /places/suggestions`) và ở tiến trình nền quét bù định kỳ cho bài chưa gắn thẻ.
- **Gợi ý hằng ngày (`daily-picks.ts`):** Chọn 3 địa điểm theo điểm cơ bản $2\ln(1 + v_i) + 2\,\mathbb{I}_{\text{mới }\le 30\text{d}} + 2\,\mathbb{I}_{\text{có ảnh}} + \mathbb{I}_{\bar{r}_i \ge 4.0 \land v_i \ge 3}$, áp xoay vòng `round-robin` theo thứ tự hạng mục xáo trộn tất định qua FNV-1a + PRNG `mulberry32`, ưu tiên đa dạng quận và loại trừ quán đã chọn trong 7 ngày gần nhất. Chỉ số `matchPercent` và nhãn lý do (`"Có ảnh thật"`, `"Nhiều đánh giá"`, `"Quán mới"`) suy trực tiếp từ ngưỡng thật, không tự tạo lý do thiếu căn cứ.

### 3.6.6. Thuật toán chấm điểm khoảng cách công bằng và tiêu chí phòng nhóm

Hàm `scoreAndRankRoomCandidates` biên dịch tiêu chí từng thành viên bằng toán tử **HOẶC (OR)** trong cùng trường `category`/`district` của một người (giữ `priceMax` mới nhất, kiểm tra độc lập điều kiện loại trừ và từ khóa), sau đó tính khoảng cách trắc địa `@turf/distance` tới mọi thành viên đã ghim vị trí $u \in M_{\text{đã ghim}}$:

$$\text{fairDistance}(c) = 0,6 \cdot \bar{d}(c) + 0,4 \cdot d_{\max}(c) \tag{3.7}$$

Trong đó $\bar{d}(c)$ là khoảng cách trung bình (km) và $d_{\max}(c)$ là khoảng cách tới thành viên xa nhất. Danh sách ứng viên sắp xếp theo 3 tầng: (1) số tiêu chí xung đột tăng dần; (2) số tiêu chí đáp ứng giảm dần; và (3) `fairDistance(c)` tăng dần.

## 3.7. Thiết kế dữ liệu và quy trình chuẩn hóa corpus

Lược đồ cơ sở dữ liệu gồm **43 bảng (15 kiểu liệt kê Enum)** quản lý qua **30 phiên bản migration**, đạt chuẩn hóa 3NF. Bảng 3.10 tóm tắt phân nhóm 43 bảng theo mười miền nghiệp vụ; chi tiết cấu trúc bảng `places` và danh mục 15 Enum trình bày trong Phụ lục C (Bảng C.1 và Bảng C.2).

**Bảng 3.10: Tổng hợp các nhóm bảng dữ liệu theo miền nghiệp vụ (43 bảng, 10 miền)**

| Miền nghiệp vụ | Số bảng | Vai trò chính |
|---|---|---|
| Tài khoản và phiên | 4 | Quản lý thông tin người dùng, phiên đăng nhập, tài khoản liên kết và mã xác thực |
| Quan hệ xã hội & chặn | 2 | Lưu quan hệ theo dõi một chiều và quan hệ chặn hai chiều |
| Tin nhắn trực tiếp | 1 | Lưu hội thoại văn bản, thẻ đính kèm JSON và trạng thái đã đọc |
| Địa điểm, đánh giá & đề xuất | 13 | Thông tin quán, ảnh, thẻ phân loại, nguồn thu thập, đánh giá 4 mức, báo cáo, đề xuất mới, vector 384 chiều và gợi ý hằng ngày |
| Nội dung và tương tác | 7 | Bài đăng cộng đồng, ảnh bài đăng, lượt thích/lưu, bình luận nhiều cấp và nhật ký sự kiện tương tác phân vùng theo tháng |
| Bộ sưu tập | 4 | Danh sách địa điểm cá nhân, ghi chú từng quán, lượt thích và danh sách cộng tác viên |
| Phòng nhóm cộng tác | 5 | Phòng nhóm, thành viên kèm tọa độ, đề xuất tiêu chí, ứng viên và phiếu bầu |
| Thông báo | 2 | Lưu thông báo chung và thông báo gợi ý gắn địa điểm tự động |
| Định vị và địa danh | 2 | Lưu điểm neo vị trí cá nhân và danh mục địa danh Đà Nẵng |
| Hạ tầng và kiểm toán | 3 | Khoá chống trùng lặp lũy đẳng, bộ đệm sở thích và nhật ký thao tác quản trị |

### 3.7.1. Quy trình làm sạch, chuẩn hóa dữ liệu và thống kê phân bố corpus

Nguồn dữ liệu địa điểm thu thập thô từ OpenStreetMap [20] đi qua đường ống xử lý trong `clean-and-validate-corpus.ts` và `embed-places.ts` gồm 5 bước trước khi đưa vào PostgreSQL:

1. **Loại bỏ nhiễu phi ẩm thực (`isNonFnbPlace`):** Chặn các địa điểm không thuộc nhóm ăn uống/giải trí ẩm thực (rạp chiếu phim, bảo tàng, công viên, cơ sở lưu trú thuần túy, sân thể thao hoặc tên trơ số nhà) thông qua danh sách thẻ loại trừ và mẫu biểu thức chính quy tiếng Việt không dấu.
2. **Chuẩn hóa phân loại và tên hành chính:** Ánh xạ phân loại chi tiết về đúng 6 hạng mục chuẩn; quy chiếu tên phường/quận cũ và mới về đúng 6 quận nội thành Đà Nẵng (`DISTRICT_ALIAS`).
3. **Kiểm định ranh giới hình học (`@turf/boolean-point-in-polygon`):** Đối chiếu từng cặp tọa độ $(\text{lat}, \text{lng})$ với đa giác hành chính `danang-districts.geojson`, chỉnh sửa các điểm geocode nhảy bờ sông Hàn (`COORD_FIXES_BY_NAME`) và tách giãn tọa độ trùng lặp (`destackCoordinates`).
4. **Hợp nhất ảnh thực tế và khử trùng lặp:** Gộp các bản ghi trùng cặp `(tên chuẩn hóa, quận)` bằng cách giữ lại bản ghi giàu siêu dữ liệu và hợp nhất tập thẻ tags; phân tách hai tệp phát hành đồng bộ (`places-expanded.json` 360 quán chuẩn hóa làm tập seed lõi và `frontend/data/cold-start/places.json` 487 quán cho môi trường thử nghiệm giao diện).
5. **Sinh và đồng bộ vector nhúng gia tăng (`embed-places.ts`):** Ghép văn bản mô tả ngữ nghĩa đầy đủ gồm tên quán, nhãn hạng mục tiếng Việt (`CATEGORY_LABEL`), mã hạng mục, quận, thẻ phân loại (`tags`) và mô tả chi tiết (`description`), sau đó tính mã băm `SHA-256` thành cột `content_hash` để chỉ gọi mô hình `Xenova/multilingual-e5-small` cho các địa điểm mới hoặc thay đổi nội dung.

Bảng 3.11 thống kê chính xác phân bố hạng mục, phân bố địa bàn và tỷ lệ hoàn thiện siêu dữ liệu thực tế trên 360 địa điểm của corpus chính thức (`backend/data/places-expanded.json`).

**Bảng 3.11: Thống kê phân bố và độ phủ siêu dữ liệu trên corpus chính thức (360 địa điểm)**

| Nhóm thống kê | Chi tiết giá trị đo thực tế | Tỷ lệ / Nhận xét kỹ thuật |
|---|---|---|
| Phân bố theo 6 hạng mục | Quán ăn (165), Cà phê (77), Ăn vặt (47), Quán bar (32), Tiệm bánh (28), Tráng miệng (11) | Tập trung đúng nhu cầu ăn uống và hẹn hò (`restaurant` 45,8%, `cafe` 21,4%) |
| Phân bố theo 6 quận | Hải Châu (114), Sơn Trà (59), Thanh Khê (57), Liên Chiểu (46), Ngũ Hành Sơn (42), Cẩm Lệ (42) | Bảo đảm hiện diện tại toàn bộ 6 quận nội thành; Hải Châu chiếm 31,7% |
| Tọa độ chuẩn hóa đa giác | 360 / 360 địa điểm có đầy đủ `lat`, `lng` kiểm định hợp lệ | **100,0%** phục vụ cụm bản đồ và tính khoảng cách phòng nhóm chính xác |
| Thẻ phân loại (`tags`) | 257 / 360 địa điểm có tối thiểu 1 tag | **71,4%** giúp nhánh suy luận cấu trúc và vector `e5-small` hoạt động hiệu quả |
| Siêu dữ liệu bổ trợ | Giờ mở cửa: 53 (**14,7%**); Số điện thoại: 49 (**13,6%**); Mô tả $>10$ ký tự: 28 (**7,8%**); Ảnh thật: 22 (**6,1%**) | Cho thấy độ thưa tự nhiên của nguồn OSM — lý do trực tiếp cần thành phần thưởng $C_i$ trong DES |
| Mức giá tĩnh (`priceLevel`) | 0 / 360 địa điểm có sẵn trường mức giá trong JSON thô | Dữ liệu seed phát triển (`SEED_MODE=dev`) và người dùng/quản trị bổ sung dần trong vận hành |

Hình 3.12 mô tả sơ đồ lớp các miền nghiệp vụ chính trong hệ thống, thống nhất ngôn ngữ tiếng Việt và tách biệt lớp nghiệp vụ `DichVuTimKiem` cùng `DichVuGoiY`.

```mermaid
classDiagram
    class NguoiDung {
        +Chuoi ma
        +Chuoi tenHienThi
        +Chuoi dinhDanh
        +Chuoi email
        +Bool hoSoRiengTu
        +ThoiGian ngayTao
        +dangKy()
        +dangNhap()
        +capNhatHoSo()
        +theoDoi(nguoiKhac)
    }
    class DiaDiem {
        +Chuoi ma
        +Chuoi ten
        +Chuoi diaChi
        +Chuoi quan
        +HangMuc hangMuc
        +SoNguyen mucGia
        +SoThuc viDo
        +SoThuc kinhDo
        +TrangThai trangThai
        +locDanhSach(boLoc)
        +xemChiTiet(ma)
        +xemBanDo(khungNhin)
    }
    class DanhGia {
        +MucHaiLong mucDanhGia
        +Chuoi noiDung
        +Chuoi[] monNenThu
        +ThoiGian ngayTao
        +taoDanhGia()
        +capNhatDanhGia()
        +binhChonHuuIch()
    }
    class BaiDang {
        +Chuoi noiDung
        +ThoiGian ngayTao
        +taoBaiDang()
        +phatHienDiaDiem()
        +thichBai()
        +luuBai()
    }
    class BoSuuTap {
        +Chuoi ten
        +Chuoi moTa
        +Bool riengTu
        +themDiaDiem(diaDiem)
        +sapXepThuTu()
        +moiCongTac()
    }
    class PhongNhom {
        +Chuoi maMoi
        +Chuoi tenPhong
        +Json boLocChung
        +taoPhong()
        +thamGia(tenHienThi)
        +themTieuChi(tieuChi)
        +xepHangCongBang()
    }
    class TieuChiPhong {
        +Chuoi truong
        +Chuoi giaTri
        +ThoiGian ngayTao
        +moTaTiengViet()
    }
    class ThongBao {
        +LoaiThongBao loai
        +Bool daDoc
        +ThoiGian ngayTao
        +danhDauDaDoc()
        +phatThoiGianThuc()
    }
    class DichVuTimKiem {
        +nhungVanBan(truyVan)
        +xepHangTuKhoa(truyVan)
        +khopTenVaTienTo(truyVan)
        +suyLuanCauTruc(truyVan)
        +hopNhatRRF(danhSach, k)
        +timKiemLaiGhep(boLoc)
    }
    class DichVuGoiY {
        +tinhDiemBayes(diaDiem)
        +nhieuKhungGio(diaDiem, moc)
        +locCongTacVatPham(nguoiDung)
        +layGoiYHomNay(ngay)
        +goiYCaNhanHoa(nguoiDung)
    }

    NguoiDung "1" --> "*" BaiDang : tạo
    NguoiDung "1" --> "*" DanhGia : viết
    NguoiDung "1" --> "*" BoSuuTap : sở hữu
    NguoiDung "1" --> "*" PhongNhom : lập phòng
    NguoiDung "1" --> "*" ThongBao : nhận
    DiaDiem "1" --> "*" DanhGia : nhận
    DiaDiem "1" --> "*" BaiDang : gắn thẻ
    BoSuuTap "*" --> "*" DiaDiem : chứa
    PhongNhom "1" *-- "*" TieuChiPhong : gồm
    PhongNhom "*" --> "*" NguoiDung : tham gia
    DichVuTimKiem ..> DiaDiem : xếp hạng
    DichVuGoiY ..> DiaDiem : xếp hạng
```

*Hình 3.12: Sơ đồ lớp các lớp miền nghiệp vụ chính*

Hình 3.13 trình bày sơ đồ thực thể liên kết (ERD) cốt lõi kết nối các thực thể trung tâm của hệ thống. Các sơ đồ ERD chi tiết phân rã theo ba miền chuyên sâu (Tài khoản & Định vị; Phòng nhóm & Bỏ phiếu; Nhắn tin, Đánh giá 4 mức, Đề xuất quán & Cộng tác) được đặt tại Phụ lục C (Hình C.1 đến Hình C.3).

```mermaid
erDiagram
    NGUOI_DUNG ||--o{ BAI_DANG : "tạo"
    NGUOI_DUNG ||--o{ BINH_LUAN : "viết"
    NGUOI_DUNG ||--o{ DANH_GIA : "đánh giá"
    NGUOI_DUNG ||--o{ BO_SUU_TAP : "sở hữu"
    NGUOI_DUNG ||--o{ THANH_VIEN_PHONG : "tham gia"
    NGUOI_DUNG ||--o{ THONG_BAO : "nhận"
    NGUOI_DUNG ||--o{ SU_KIEN_TUONG_TAC : "phát sinh"

    DIA_DIEM ||--o{ DANH_GIA : "được đánh giá"
    DIA_DIEM ||--o{ VECTOR_DIA_DIEM : "có vector"
    DIA_DIEM ||--o{ BAI_DANG : "được gắn thẻ"
    DIA_DIEM ||--o{ DIA_DIEM_BO_SUU_TAP : "nằm trong"

    BAI_DANG ||--o{ BINH_LUAN : "chứa"
    BO_SUU_TAP ||--o{ DIA_DIEM_BO_SUU_TAP : "bao gồm"
    PHONG ||--o{ THANH_VIEN_PHONG : "có thành viên"
    PHONG ||--o{ DE_XUAT_PHONG : "có tiêu chí"

    NGUOI_DUNG {
        uuid ma PK
        text email UK
        text dinh_danh UK
        text ten_hien_thi
        text vai_tro
    }
    DIA_DIEM {
        text ma PK
        text ten
        text ten_khong_dau
        text hang_muc
        text quan
        smallint muc_gia
    }
    BAI_DANG {
        uuid ma PK
        uuid tac_gia_ma FK
        text dia_diem_ma FK
        text noi_dung
    }
    DANH_GIA {
        uuid ma PK
        uuid tac_gia_ma FK
        text dia_diem_ma FK
        text muc_hai_long
        text noi_dung
    }
    PHONG {
        uuid ma PK
        text ma_moi UK
        uuid chu_phong_ma FK
        text trang_thai
    }
```

*Hình 3.13: Sơ đồ thực thể liên kết cốt lõi theo miền nghiệp vụ*

## 3.8. Thiết kế giao diện

Giao diện hệ thống chia làm hai vùng vận hành tách biệt hoàn toàn: **Ứng dụng người dùng cuối** (xác thực tài khoản với ảnh địa điểm Đà Nẵng chuyển cảnh mượt mà kèm Điều khoản sử dụng ở lần đầu đăng ký/đăng nhập, khám phá và tìm kiếm, bản đồ cụm, chi tiết địa điểm kèm thư viện ảnh phân loại và đánh giá 4 mức, bảng tin cộng đồng, tin nhắn trực tiếp SSE, đã lưu và bộ sưu tập, phòng nhóm cộng tác, hồ sơ cá nhân, cài đặt tài khoản) và **Cổng quản trị độc lập** (`/admin`).

Để tránh lẫn lộn vai trò và bảo đảm an toàn vận hành, hai vùng được cô lập chặt chẽ:

- Giao diện người dùng không hiển thị bất kỳ liên kết quản trị hay thanh trạng thái nhân viên nào; các trang người dùng tự động chuyển hướng sang `/admin` nếu phiên đăng nhập mang vai trò quản trị hoặc kiểm duyệt.
- Cổng quản trị (`/admin`) không cung cấp nút chuyển sang giao diện người dùng công khai; khi cần trải nghiệm luồng người dùng, quản trị viên phải đăng xuất và đăng nhập bằng một tài khoản thành viên riêng biệt.

Hình 3.14 mô tả luồng điều hướng hai vùng tách biệt này.

```mermaid
flowchart TD
    Auth["Đăng nhập tài khoản"] -->|"Vai trò người dùng"| Home["Khám phá địa điểm"]
    Auth -->|"Vai trò quản trị hoặc kiểm duyệt"| Admin["Cổng quản trị độc lập (7 phân hệ)"]

    subgraph UserZone["Vùng ứng dụng người dùng (cô lập khỏi Quản trị)"]
        Home --> Map["Bản đồ cụm địa điểm"]
        Home --> Search["Tìm kiếm tổng hợp"]
        Home --> Detail["Chi tiết địa điểm"]
        Map --> Detail
        Home --> Social["Bảng tin cộng đồng"]
        Social --> Post["Chi tiết bài viết"]
        Social --> Messages["Tin nhắn trực tiếp"]
        Detail --> Saved["Đã lưu và Bộ sưu tập"]
        Saved --> SuggestPlace["Đề xuất địa điểm mới"]
        Saved --> Collection["Chi tiết bộ sưu tập"]
        Home --> RoomsLobby["Sảnh phòng nhóm"]
        RoomsLobby --> Room["Phòng nhóm cộng tác"]
        Profile["Hồ sơ cá nhân"] --> Collection
        Profile --> UserProfile["Hồ sơ công khai người khác"]
        Notif["Trung tâm thông báo"] --> Detail
    end
```

*Hình 3.14: Sơ đồ điều hướng tách biệt giữa Ứng dụng người dùng và Cổng quản trị*

## 3.9. Thiết kế bảo mật

Bảng 3.12 liệt kê mười lớp tấn công và cơ chế phòng thủ tương ứng đã triển khai trong hệ thống [21], [22]. Mọi đầu vào đều được kiểm chứng lược đồ chặt chẽ trước khi xuống tầng lưu trữ [6].

**Bảng 3.12: Thiết kế bảo mật theo lớp tấn công**

| Lớp tấn công | Cơ chế phòng thủ | Tham số và bằng chứng kiểm soát |
|---|---|---|
| Chiếm đoạt phiên | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; phiên kiểm soát phía máy chủ | Hạn phiên 7 ngày |
| Giả mạo yêu cầu chéo trang (CSRF) | Kiểm tra `SameSite` kết hợp xác minh tiêu đề `Origin` ở thao tác ghi | Từ chối yêu cầu ngoài nguồn cho phép |
| Tiêm mã SQL | Truy vấn tham số hóa hoàn toàn qua ORM và trình dựng truy vấn có kiểm kiểu | Không nối chuỗi vào câu lệnh SQL |
| Truy cập trái phép đối tượng (IDOR) | Xác minh quyền sở hữu trên từng tài nguyên riêng tư và điểm neo vị trí | Trả lỗi từ chối; có ca kiểm thử IDOR tự động |
| Leo thang đặc quyền quản trị | Lớp trung gian kiểm tra vai trò theo phân hệ và cô lập Cổng quản trị | Mọi thao tác quản trị đều ghi nhật ký kiểm toán |
| Giả mạo yêu cầu máy chủ (SSRF) | Lọc dải IP nội bộ IPv4/IPv6 và danh sách miền được phép cho proxy bản đồ | Chặn loopback, mạng nội bộ RFC1918, link-local |
| Dò mật khẩu và lạm dụng API | Bộ đếm giới hạn tốc độ phân tán trên Redis theo IP và định danh | Ngưỡng riêng theo mức độ nhạy cảm |
| Lộ dữ liệu vị trí và thông tin cá nhân | Mã hóa GPS bằng AES-256-GCM gắn AAD theo tài khoản; che PII trong log | IV ngẫu nhiên 12 byte; từ chối bản mã bị sửa |
| Lộ bí mật trong mã nguồn | Đọc toàn bộ khóa từ biến môi trường và kiểm tra khi khởi động | Từ chối khởi động nếu thiếu khóa bắt buộc |
| Đoán mã phòng và tranh chấp bỏ phiếu | Mã mời 6 ký tự loại ký tự dễ nhầm; khóa hàng PostgreSQL khi chốt phiếu | Chặn hoàn toàn phiếu gửi sau thời điểm chốt |

## 3.10. Thiết kế các phân hệ mở rộng và quan sát vận hành

### 3.10.1. Phòng nhóm cộng tác theo vị trí và xếp hạng tiêu chí

Thay vì dùng bộ lọc cứng, phòng nhóm cộng tác cho phép thành viên ghim tọa độ thực tế lên bản đồ (hiển thị ảnh đại diện và tên, có hộp thoại đóng/mở bản đồ trên di động), đề xuất ứng viên và đặt tiêu chí cá nhân. Hệ thống đồng bộ tức thời qua SSE, tính khoảng cách công bằng và hỗ trợ chuyển sang pha bỏ phiếu (chọn nhiều, xếp hạng loại trừ dần IRV hoặc quay chọn ngẫu nhiên). Hình 3.15 mô tả vòng đời trạng thái của phòng nhóm.

```mermaid
stateDiagram-v2
    [*] --> DangLoc: Tạo phòng kèm mã mời 6 ký tự
    DangLoc --> DangLoc: Đề xuất tiêu chí và ứng viên
    DangLoc --> DangBau: Chủ phòng mở bỏ phiếu (chọn nhiều hoặc IRV)
    DangLoc --> DaChot: Chủ phòng quay chọn ngẫu nhiên
    DangBau --> DangBau: Thành viên bỏ phiếu (khóa giao dịch)
    DangBau --> DaChot: Chủ phòng chốt kết quả cuối
    DaChot --> [*]

    DangLoc: Đang lọc và đề xuất
    DangBau: Đang bỏ phiếu
    DaChot: Đã chốt quán
```

*Hình 3.15: Biểu đồ trạng thái vòng đời phòng nhóm cộng tác*

### 3.10.2. Luồng ưu tiên định vị 6 tầng và đồng bộ GPS mã hóa

Để tính khoảng cách chính xác kể cả khi trình duyệt chưa cấp GPS hoặc người dùng đang ở xa địa điểm dự kiến, ứng dụng xác định tâm tìm kiếm theo chuỗi ưu tiên 6 tầng. Khi bật đồng bộ GPS liên thiết bị, tọa độ được mã hóa AES-256-GCM gắn định danh tài khoản làm AAD trước khi lưu xuống máy chủ (Hình 3.16).

```mermaid
flowchart TD
    Start["Mở Khám phá hoặc Bản đồ"] --> L1{"1. Đã chọn điểm neo cá nhân?"}
    L1 -->|Có| Use["Dùng tọa độ đã chọn tính khoảng cách"]
    L1 -->|Không| L2{"2. Đã chọn mốc địa danh Đà Nẵng?"}
    L2 -->|Có| Use
    L2 -->|Không| L3{"3. Trình duyệt cấp GPS trực tiếp?"}
    L3 -->|Có| Sync{"Bật đồng bộ GPS vào tài khoản?"}
    Sync -->|Có| Enc["Mã hóa AES-256-GCM gắn AAD theo tài khoản"] --> Use
    Sync -->|Không| Use
    L3 -->|Không| L4{"4. Có GPS mã hóa đồng bộ trên máy chủ?"}
    L4 -->|Có| Dec["Tải về và giải mã AES-256-GCM"] --> Use
    L4 -->|Không| L5{"5. Có tọa độ lưu trong phiên trình duyệt?"}
    L5 -->|Có| Use
    L5 -->|Không| L6["6. Mặc định trung tâm Đà Nẵng (Cầu Rồng)"] --> Use
```

*Hình 3.16: Luồng ưu tiên 6 tầng định vị và đồng bộ GPS mã hóa AES-256-GCM*

### 3.10.3. Kiến trúc quan sát vận hành và cảnh báo

Hệ thống quan sát thu thập đồng thời tín hiệu phía máy chủ (RED, USE, trạng thái cầu dao, an ninh, tỷ lệ tìm kiếm rỗng) và phía trình duyệt (Core Web Vitals p75), chuẩn hóa và hiển thị tập trung trên Cổng quản trị (Hình 3.17).

```mermaid
flowchart LR
    subgraph Sources["Nguồn thu thập tín hiệu vận hành"]
        HTTP["Middleware HTTP (Log cấu trúc và HDR Histogram)"]
        Pool["Nhóm kết nối DB và Hàng đợi nền"]
        Loop["Độ trễ vòng lặp sự kiện"]
        CB["Cầu dao dịch vụ ngoài (nhúng, mail, 2 nguồn bản đồ)"]
        RUM["Trình duyệt người dùng (Core Web Vitals)"]
        Sec["Bộ đếm bảo mật (401/403/429) và Tìm kiếm rỗng"]
    end

    Agg["Bộ tổng hợp số liệu và Phân vị thống kê"]
    API["Cổng dữ liệu quan sát (phân quyền Quản trị)"]
    UI["Cổng quản trị (Biểu đồ, Thẻ sức khỏe và Ngưỡng cảnh báo)"]

    HTTP --> Agg
    Pool --> Agg
    Loop --> Agg
    CB --> Agg
    RUM --> Agg
    Sec --> Agg
    Agg --> API --> UI
```

*Hình 3.17: Kiến trúc quan sát vận hành và cảnh báo hệ thống*

<!-- pagebreak -->

# CHƯƠNG 4: CÀI ĐẶT VÀ THỬ NGHIỆM

## 4.1. Môi trường cài đặt và đo lường

Bảng 4.1 mô tả môi trường cài đặt và đo lường của hệ thống trên máy chủ thực nghiệm.

**Bảng 4.1: Môi trường cài đặt và đo lường**

| Thành phần | Công nghệ | Phiên bản | Giới hạn tài nguyên |
|---|---|---|---|
| Máy chủ vật lý | x86_64 | Không áp dụng | 8 nhân, 32 GB RAM |
| Hệ điều hành | Linux | Kernel 6.x | Không giới hạn riêng |
| Runtime backend | Bun | 1.3.14 | 2,0 nhân / 1 GB (container api) |
| Framework và truy vấn | Hono / Prisma / Kysely | 4.13.17 / 7.10.1 / 0.29.9 | Chạy trong container api |
| Giao diện web | React / Vite / Tailwind CSS | 19.3.1 / 8.3.6 / 4.3.5 | Đóng gói tĩnh phục vụ qua Caddy |
| Cơ sở dữ liệu | PostgreSQL (`pgvector`) | 17 | 2,0 nhân / 2 GB (container postgres) |
| Bộ đệm và giới hạn tốc độ | Redis | 7-alpine | Chia sẻ trong mạng nội bộ |
| Proxy ngược biên | Caddy | 2.x | 1,0 nhân / 512 MB (container web) |
| Đóng gói | Docker Compose | v2 | Tổng giới hạn cụm 5 nhân / 3,5 GB |
| Kiểm thử tải | k6 | 0.5x | Chạy trên cùng máy vật lý |

### 4.1.1. Hướng dẫn cài đặt và vận hành hệ thống

Dự án hỗ trợ cả hai chế độ phát triển cục bộ và triển khai đóng gói đầy đủ bằng Docker Compose.

**Chế độ phát triển cục bộ:** Yêu cầu Bun (từ 1.3.14) và Docker; hai biến môi trường bắt buộc là `DATABASE_URL` và `BETTER_AUTH_SECRET` (tối thiểu 32 ký tự):

```bash
bun install                        # Cài phụ thuộc cho cả monorepo
bun run db:up                      # Khởi động PostgreSQL (pgvector) và Redis 7
cd backend && cp .env.example .env # Khởi tạo tệp cấu hình môi trường
bun run db:migrate                 # Chạy toàn bộ 30 phiên bản migration
bun run db:generate                # Sinh kiểu dữ liệu Prisma và Kysely
bun run db:seed                    # Nạp 360 địa điểm mẫu và mốc địa danh Đà Nẵng
bun run dev:api                    # Khởi động dịch vụ API
bun run dev                        # Khởi động giao diện React
```

Lệnh `db:seed` có tính lũy đẳng: ưu tiên nạp 360 địa điểm đã làm giàu từ `backend/data/places-expanded.json` (dùng tệp dự phòng nếu thiếu), không tạo trùng khi chạy lại nhiều lần.

**Chế độ triển khai đầy đủ:** Thực thi lệnh `docker compose up -d --build` để khởi động PostgreSQL/Redis qua healthcheck, chạy migration tự động, sau đó khởi động API đa tiến trình và Caddy phục vụ giao diện web.

## 4.2. Các module đã cài đặt

Bảng 4.2 tổng hợp 18 phân hệ chức năng đã hoàn thiện theo từng miền nghiệp vụ.

**Bảng 4.2: Danh mục phân hệ đã cài đặt**

| Phân hệ | Phạm vi chức năng chính |
|---|---|
| Xác thực và phiên | Đăng ký kèm Điều khoản sử dụng, đăng nhập (Email + Google OAuth tùy chọn), khôi phục mật khẩu, phân quyền RBAC và xóa ẩn danh tài khoản |
| Địa điểm và thư viện ảnh | Danh sách, bản đồ cụm, chi tiết địa điểm, bộ lọc đa điều kiện kiểm kiểu tĩnh, thư viện ảnh phân loại |
| Tìm kiếm lai ghép (EGRF) | Chạy song song bốn nhánh tín hiệu, chọn trọng số theo bằng chứng định danh và gợi ý sửa lỗi từ khoá |
| Gợi ý cá nhân hóa (DES) | Tính điểm Bayes điều chỉnh độ đầy đủ hồ sơ, nhiễu theo khung giờ và tổng hợp hồ sơ sở thích |
| Bài đăng cộng đồng | Tạo, xem, xoá, thích, lưu, bình luận nhiều cấp và tự động phát hiện địa điểm qua tác vụ nền |
| Đánh giá 4 mức & Hữu ích | Đánh giá theo bốn mức hài lòng kèm món đề xuất, ảnh thực tế, bình chọn hữu ích và báo cáo vi phạm |
| Đề xuất địa điểm cộng đồng | Thành viên gửi đề xuất quán mới vào hàng chờ; quản trị viên thẩm định và phê duyệt công bố |
| Bộ sưu tập | Tạo, sửa, sắp xếp thứ tự địa điểm, ghi chú từng quán, thích và mời cộng tác viên |
| Nhắn tin trực tiếp thời gian thực | Tách Hộp thư chính và Tin nhắn chờ, đẩy tin tức thời qua SSE, đính kèm thẻ và chặn người dùng |
| Phòng nhóm cộng tác | Tạo phòng mã mời, ghim vị trí thành viên, đề xuất ứng viên và tiêu chí, tính khoảng cách công bằng và cảnh báo mâu thuẫn |
| Điểm neo vị trí và GPS mã hóa | Quản lý điểm neo cá nhân, mốc địa danh Đà Nẵng, tìm tọa độ và đồng bộ GPS mã hóa AES-256-GCM |
| Thông báo | Lưu trữ thông báo tương tác, đánh dấu đã đọc, đẩy thời gian thực qua SSE và tùy chỉnh theo loại |
| Phương tiện và Proxy bản đồ | Ký URL tải ảnh trực tiếp lên kho lưu trữ đối tượng, proxy tile bản đồ chống SSRF và cầu dao bảo vệ |
| Tác vụ nền | Lập lịch và xử lý bất đồng bộ (tự động gắn thẻ quán, gợi ý hằng ngày, tổng hợp sở thích và dọn dữ liệu) |
| Thẻ xem trước chia sẻ | Sinh siêu dữ liệu Open Graph có thoát ký tự an toàn cho liên kết địa điểm và bài viết |
| Cổng quản trị độc lập | Giao diện riêng với 7 phân hệ quản trị theo phân quyền RBAC, cô lập hoàn toàn khỏi ứng dụng người dùng |
| Quan sát vận hành | Thu thập số liệu RED/USE phía máy chủ, trạng thái cầu dao, chỉ số bảo mật và Core Web Vitals từ trình duyệt |
| Gói lược đồ dùng chung (`@rendez/schema`) | Hợp đồng dữ liệu Zod dùng chung hai đầu, phân tích truy vấn tự nhiên và đánh giá giờ mở cửa đa múi giờ |

### 4.2.1. Cấu trúc tổ chức mã nguồn

Dự án tổ chức theo mô hình monorepo gồm ba không gian làm việc liên kết chặt chẽ: `frontend`, `backend` và `packages/schema`:

```text
rendez/
├── package.json              # Kịch bản workspace, kiểm kiểu và kiểm thử toàn hệ thống
├── compose.yaml              # Cụm triển khai: PostgreSQL, Redis, Migration, API, Caddy
├── backend/
│   ├── prisma/               # Lược đồ cơ sở dữ liệu chuẩn 3NF và 30 migration
│   ├── src/
│   │   ├── routes/           # Tầng định tuyến REST/SSE phân nhóm theo 19 nhóm route
│   │   └── lib/              # Tầng xử lý: EGRF, DES, phòng nhóm, mã hóa, quan sát vận hành
│   ├── test/                 # 52 tệp kiểm thử tích hợp API, tương tranh và bảo mật (Testcontainers)
│   └── scripts/              # Nạp dữ liệu mẫu, benchmark k6 và đo lường thuật toán
├── frontend/
│   ├── src/
│   │   ├── app/              # Định tuyến, cô lập vai trò Consumer/Admin và providers
│   │   ├── features/         # Các phân hệ giao diện người dùng và Cổng quản trị độc lập
│   │   ├── components/       # Thành phần UI chuẩn (@base-ui/react) và khung bố cục
│   │   ├── hooks/            # Custom hook trạng thái lạc quan, định vị và API
│   │   └── lib/              # Định dạng dữ liệu, khoảng cách và HTTP client
│   └── e2e/                  # Bộ kịch bản kiểm thử đầu cuối tự động Playwright
└── packages/schema/          # Lược đồ Zod dùng chung, phân tích truy vấn và giờ mở cửa
```

## 4.3. Xử lý kỹ thuật quan trọng

Bảng 4.3 tổng hợp mười vấn đề kỹ thuật trọng tâm gặp phải khi phát triển cùng giải pháp và kết quả đo kiểm thực tế.

**Bảng 4.3: Xử lý kỹ thuật quan trọng và kết quả kiểm chứng**

| Vấn đề | Giải pháp | Kết quả đo / kiểm chứng |
|---|---|---|
| Truy vấn tiếng Việt không dấu không khớp tên có dấu | Lưu cột tên bỏ dấu kèm chỉ mục GIN trigram | Truy vấn không dấu đạt p95 18 ms trên tập 358 địa điểm |
| Lỗi gõ làm mất kết quả | Xếp hạng từ khoá bằng trigram, so khớp cả chuỗi không dấu nén | Nhánh từ khoá vẫn xếp hạng truy vấn lệch ký tự |
| Hợp nhất đa nhánh làm giảm hạng tên đúng | Điều chỉnh trọng số 4 chế độ và bảo vệ thực thể theo bằng chứng (EGRF) | P@5 tăng từ 0,591 lên 0,860 trên 344 truy vấn (`pHolm = 0`) |
| Truy vấn SQL chuỗi thuần rủi ro khi đổi lược đồ | Dùng trình dựng truy vấn kiểm kiểu tĩnh kết hợp nối ngang phân nhánh | Loại bỏ hoàn toàn truy vấn nối chuỗi ở luồng đọc chính |
| Tiến trình JavaScript đơn luồng giới hạn CPU | Khởi tạo đa tiến trình cùng lắng nghe cổng qua chia sẻ cổng OS | Tận dụng đa nhân, đạt 1.400 req/s ở mốc 5.000 người dùng |
| Sự kiện SSE không tới được kết nối ở tiến trình khác | Phát qua kênh thông báo nội bộ của PostgreSQL tới mọi tiến trình | Sự kiện phòng nhóm và tin nhắn đến đầy đủ trên mọi tiến trình |
| Tranh chấp TOCTOU khi vừa bỏ phiếu vừa chốt phòng | Khóa giao dịch mức hàng trên bản ghi phòng khi chốt phiếu | 18 yêu cầu song song trên PostgreSQL thật đạt 0 phiếu lọt |
| Mạng chập chờn tạo bản ghi trùng | Khoá lũy đẳng gắn ràng buộc duy nhất cho thao tác ghi | Toàn bộ ca kiểm thử gửi lặp giữ nguyên một bản ghi |
| Lọc ra 0 địa điểm làm ẩn thanh lọc hoặc giật trang | Cố định thanh công cụ; đồng bộ URL qua `nuqs` và giữ dữ liệu cũ lúc tải | Không mất bộ lọc và giữ nguyên vị trí cuộn khi đổi lọc |
| Sai lệch giờ mở cửa theo múi giờ máy chủ | Chuẩn hóa tính toán theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) | Kết quả đồng nhất dưới các múi giờ hệ điều hành khác nhau |

## 4.4. Kiểm thử chức năng, biên và tương tranh

Chiến lược kiểm thử tự động gồm bốn tầng (Hình 2.1). Các kiểm thử tích hợp API vận hành trực tiếp trên PostgreSQL thật dựng qua Testcontainers, kết hợp kiểm thử theo tính chất (`fast-check`) kiểm chứng bất biến mật mã, con trỏ phân trang và bộ phân tích truy vấn. Bảng 4.4 tổng hợp quy mô và kết quả kiểm thử toàn hệ thống.

**Bảng 4.4: Tổng hợp kết quả bộ kiểm thử tự động theo 4 tầng**

| Tầng kiểm thử | Công cụ | Số tệp | Số ca đạt | Tỷ lệ | Phạm vi kiểm tra trọng tâm |
|---|---|---|---|---|---|
| 1. Lược đồ và logic thuần (`packages/schema`) | `bun:test`, `fast-check` | 3 tệp | 20/20 (721 assertions) | 100% | Giờ mở cửa xuyên đêm đa múi giờ, biên tọa độ, chống ReDoS, bất biến lược đồ |
| 2. Backend API, bảo mật & tương tranh | `bun:test`, Testcontainers, `fast-check` | 52 tệp | Toàn bộ nhóm API nghiệp vụ | Đạt | Mã hóa AES-256-GCM (AAD/tampering), con trỏ PBT, tranh chấp phòng nhóm, IDOR, SSRF, phân quyền RBAC |
| 3. Frontend Unit & Component | Vitest, Testing Library, `fast-check` | 52 tệp | 237/237 | 100% | Cô lập vai trò Quản trị/Người dùng, tách bộ lọc URL, tính điểm nhóm, hoàn tác lạc quan |
| 4. Kiểm thử đầu cuối trên trình duyệt (E2E) | Playwright | 23 tệp | 49/49 | 100% | Đăng nhập, đăng ký kèm điều khoản, tìm kiếm, bản đồ cụm, chi tiết, cộng đồng, phòng nhóm SSE |

Quá trình viết ca kiểm thử biên, ngoại lệ và tương tranh đã phát hiện và xử lý triệt để các lỗi thực tế: (1) sai lệch tên trường đếm truy vấn rỗng ở tầng quan sát; (2) tranh chấp TOCTOU cho phép phiếu bầu ghi nhận muộn sau khi chốt phòng; (3) bộ đếm tương tác có thể giảm âm khi hoàn tác lạc quan gặp lỗi mạng; và (4) xung đột vùng nhận con trỏ của thanh công cụ nổi với nút phóng to bản đồ cùng trạng thái đóng menu chọn quận.

Bảng 4.5 trình bày mười hai kịch bản kiểm thử tiêu biểu theo cấu trúc 7 cột chuẩn từ cả bốn tầng kiểm thử.

**Bảng 4.5: Ca kiểm thử tiêu biểu (7 cột chuẩn) và các lỗi thực tế phát hiện được**

| Mã TC | Mục tiêu | Dữ liệu vào | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| TC-01 | Tìm kiếm tiếng Việt không dấu | Từ khoá `"banh xeo"` | Gửi yêu cầu tìm kiếm qua API và kiểm tra danh sách địa điểm trả về | Chỉ trả địa điểm có tên chuẩn hoá khớp cụm từ | Mọi kết quả khớp chính xác Bánh xèo | Đạt |
| TC-02 | Từ chối con trỏ phân trang sai (PBT) | Hàng trăm chuỗi con trỏ ngẫu nhiên sinh bởi `fast-check` | Gửi lần lượt các con trỏ bị cắt, đảo byte qua tham số phân trang | Từ chối bằng mã 400, không phát sinh lỗi 500 | 100% mẫu biến dạng trả về mã 400 | Đạt |
| TC-03 | Chặn ký tự điều khiển ở bộ lọc | Tham số quận chứa byte NUL | Gửi truy vấn lọc mang byte NUL tới endpoint danh sách quán | Lược đồ Zod từ chối ngay ở đầu vào với mã 400 | Trả mã 400 kèm thông báo rõ ràng | Đạt |
| TC-04 | Đánh giá giờ mở cửa xuyên đêm đa múi giờ | Khung `18:00-02:00` dưới nhiều múi giờ OS | Thực thi hàm kiểm tra mở cửa qua biến môi trường `TZ` khác nhau | Khớp giờ Việt Nam (`UTC+7`) tại mọi thời điểm biên | Đồng nhất chính xác dưới mọi múi giờ | Đạt |
| TC-05 | Gợi ý địa điểm theo ngữ cảnh bài viết | Nội dung nhắc món và địa danh Đà Nẵng | Gọi API gợi ý theo nội dung đang soạn trên giao diện và API | Trả 1–3 địa điểm phù hợp kèm lý do khớp | Trả đủ danh sách và lý do trong ngưỡng p95 | Đạt |
| TC-06 | Tính toàn vẹn mã hóa GPS AES-256-GCM | Tọa độ người dùng A, khóa/AAD của B hoặc sửa 1 byte | Mã hóa bằng AAD A rồi thử giải mã bằng AAD B hoặc bản mã sửa bit | Từ chối giải mã, ném lỗi xác thực GCM, không lộ tọa độ | Từ chối 100% mẫu giả mạo hoặc tráo AAD | Đạt |
| TC-07 | Chống truy cập trái phép điểm neo (IDOR) | Tài khoản B, mã điểm neo của A | Tài khoản B gửi yêu cầu sửa/xoá điểm neo của A | Từ chối 403/404, dữ liệu tài khoản A giữ nguyên | Mọi thao tác đọc/ghi chéo chủ đều bị chặn | Đạt |
| TC-08 | Chống SSRF và lùi thư mục (Path Traversal) | URL trỏ `127.0.0.1`, tên tệp chứa `../` | Gửi yêu cầu proxy bản đồ nội bộ và kiểm chứng URL ảnh | Chặn tại bước kiểm tra đầu vào, không gọi mạng ngoài | 100% URL nội bộ và đường dẫn lùi bị chặn | Đạt |
| TC-09 | Chống tranh chấp TOCTOU khi chốt phiếu | 18 yêu cầu bỏ phiếu + 1 lệnh chốt phòng | Gửi song song đồng thời các yêu cầu bỏ phiếu và chốt kết quả lên PostgreSQL | Khóa mức hàng tuần tự hóa giao dịch, không lọt phiếu sau khi chốt | Đạt tuyệt đối: 0 phiếu ghi nhận sau khi chốt | Đạt |
| TC-10 | Đo đúng tỷ lệ truy vấn rỗng (Observability) | Truy vấn không có kết quả kết hợp tra cứu thống kê | Thực hiện tìm kiếm rỗng và đọc lại số liệu tổng hợp ở Cổng quản trị | Bộ đếm truy vấn rỗng tăng và phản ánh tỷ lệ > 0 | Phản ánh chính xác sau khi đồng nhất tên trường | Đạt |
| TC-11 | Hoàn tác bộ đếm lạc quan khi mạng lỗi | Thao tác thích/bỏ thích với API giả lập lỗi 500 | Bấm nút thích trên giao diện, nhận lỗi 500 từ máy chủ | Hủy yêu cầu cũ và khôi phục bộ đếm gốc, không âm | Bộ đếm trở về nguyên trạng, không xuống âm | Đạt |
| TC-12 | Bảo đảm tính lũy đẳng tác vụ gợi ý hằng ngày | Gọi tác vụ `daily-picks` 2 lần trong cùng ngày | Kích hoạt worker tạo gợi ý hai lần liên tiếp cho cùng ngày | Dữ liệu trong bảng gợi ý giữ nguyên, không tạo trùng | Chỉ tồn tại đúng 1 bộ bản ghi trong ngày | Đạt |

## 4.5. Đánh giá hiệu năng và độ chính xác

### 4.5.1. Thời gian phản hồi ở mức tải đơn lẻ

Bảng 4.6 ghi thời gian phản hồi của sáu endpoint cốt lõi trên tập dữ liệu đối chứng 358 địa điểm, mỗi endpoint đo lặp 20 lần tuần tự không có tải đồng thời.

**Bảng 4.6: Thời gian phản hồi ở mức tải đơn lẻ**

| Endpoint | p50 (ms) ↓ | p95 (ms) ↓ | Chỉ tiêu NFR (ms) |
|---|---|---|---|
| Tìm kiếm, một từ khoá | 10 | 17 | p95 ≤ 300 |
| Tìm kiếm, không dấu | 11 | 18 | p95 ≤ 300 |
| Danh sách lọc theo quận | 8 | 14 | p95 ≤ 200 |
| Bản đồ theo khung nhìn | 12 | 21 | p95 ≤ 200 |
| **Chi tiết địa điểm** | **7** | **13** | p95 ≤ 200 |
| Gợi ý hằng ngày | 9 | 16 | p95 ≤ 200 |

Các độ trễ đơn lẻ đều thấp hơn từ 9 đến 16 lần so với ngưỡng NFR đề ra, nhờ chỉ mục GIN trigram và các truy vấn đọc có kiểm soát tránh phát sinh N+1.

### 4.5.2. Kiểm thử tải tăng dần

Kịch bản kiểm thử tải k6 mô phỏng bốn thao tác hỗn hợp theo tỷ trọng: tìm kiếm (35%), xem gợi ý (25%), duyệt bản đồ (25%) và xem chi tiết (15%), với khoảng nghỉ ngẫu nhiên 1–3 giây giữa các lượt. Tải tăng dần qua năm mốc và giữ ổn định 30 giây mỗi mốc (40 giây ở mốc 5.000 người dùng).

**Bảng 4.7: Kết quả kiểm thử tải tăng dần trên k6**

| Người dùng đồng thời | Thông lượng (yêu cầu/giây) ↑ | Lỗi máy chủ ↓ | Phản hồi > 1 giây ↓ | p95 (ms) ↓ |
|---|---|---|---|---|
| 500 | 195 – 350 | **0%** | **0%** | **185** |
| 1.000 | 550 | **0%** | 4,2% | 420 |
| 2.000 | 820 | **0%** | 18,5% | 1.250 |
| 3.000 | 1.100 | **0%** | 38,0% | 3.400 |
| 5.000 | **1.400** | 0,002% | 53,1% | 8.250 |

Hình 4.1 biểu diễn đường cong tăng độ trễ phân vị 95 theo số người dùng đồng thời.

```mermaid
xychart-beta
    x-axis ["500", "1000", "2000", "3000", "5000"]
    y-axis "p95 (ms)" 0 --> 8500
    line [185, 420, 1250, 3400, 8250]
```

*Hình 4.1: Biểu đồ thời gian phản hồi phân vị 95 theo mức tải đồng thời*

Ở mốc 2.000 người dùng đồng thời, cả container `api` và container `postgres` chạm trần giới hạn 2 nhân; bộ nhớ sử dụng của `api` đạt 701 MB trên hạn mức 1 GB và không container nào bị ngắt do tràn bộ nhớ. Hệ thống duy trì 0% lỗi máy chủ đến hết mốc 3.000 người dùng; tại mốc 5.000 người dùng chỉ phát sinh 4 phản hồi 502 (tương ứng 0,002%) do proxy biên Caddy ngắt kết nối chờ quá hạn.

### 4.5.3. Độ chính xác tìm kiếm

Tập kiểm chuẩn nội bộ đóng băng `search-eval-v7` (xác thực toàn vẹn qua mã băm SHA-256) gồm 344 truy vấn chia theo năm nhóm ý định cùng nhiều biến thể diễn đạt tiếng Việt không dấu, đảo thứ tự từ, từ đồng nghĩa đa ngữ và truy vấn ngữ cảnh. Bảng 4.8, Hình 4.2 và kết quả kiểm định Bootstrap ở Bảng 4.9 tổng hợp kết quả đo đạc trên tập nội bộ.

**Bảng 4.8: Độ chính xác tìm kiếm trên tập nội bộ (344 truy vấn đóng băng)**

| Phương pháp | P@5 ↑ | P@10 ↑ | R@10 ↑ | nDCG@10 ↑ | MRR ↑ | p95 (ms) ↓ |
|---|---|---|---|---|---|---|
| Khớp từ khoá | 0,507 | 0,441 | 0,715 | 0,730 | 0,825 | 18 |
| Khớp ngữ nghĩa | 0,579 | 0,519 | 0,793 | 0,802 | 0,866 | **11** |
| Hợp nhất chuẩn (RRF 2 nhánh) | 0,591 | 0,513 | 0,797 | 0,807 | 0,878 | 28 |
| **EGRF (6 luồng + S-1..S-6)** | **0,860** | **0,836** | **0,831** | **0,847** | **0,895** | 36 |

```mermaid
xychart-beta
    x-axis ["Từ khoá", "Ngữ nghĩa", "Hợp nhất chuẩn", "EGRF"]
    y-axis "P@5" 0 --> 1
    bar [0.507, 0.579, 0.591, 0.860]
```

*Hình 4.2: Biểu đồ độ chính xác tại 5 trên tập truy vấn nội bộ*

Nhờ kết hợp bộ bóc tách ràng buộc tự nhiên kèm bảo vệ thực thể (`S-1`, `S-4`) và điều chỉnh trọng số 4 chế độ không làm tắt nhánh ngữ nghĩa ở truy vấn ghép (`S-5`), EGRF đạt **P@5 = 0,860** (tăng $+45,5\%$ so với hợp nhất 2 nhánh 0,591) và vượt trội đồng đều trên tất cả các chỉ số còn lại (`P@10 = 0,836`, `R@10 = 0,831`, `nDCG@10 = 0,847`, `MRR = 0,895`), với tỷ lệ trả về kết quả rỗng `0,0%` và độ trễ p95 là `36 ms`. Bảng 4.9 xác nhận sự cải thiện này có ý nghĩa thống kê tuyệt đối qua kiểm định 10.000 mẫu Bootstrap có hiệu chỉnh đa so sánh Holm.

**Bảng 4.9: Kiểm định ý nghĩa thống kê Bootstrap hiệu chỉnh Holm trên tập nội bộ**

| Cặp so sánh trên P@5 | Chênh lệch trung bình ($\Delta$) ↑ | Khoảng tin cậy 95% | $p_{\text{raw}}$ ↓ | $p_{\text{Holm}}$ ↓ |
|---|---|---|---|---|
| **EGRF – Hợp nhất chuẩn (RRF)** | **+0,269** | `[0,226; 0,309]` | `0,0000` | **`0,0000`** |
| **EGRF – Khớp ngữ nghĩa** | **+0,281** | `[0,241; 0,320]` | `0,0000` | **`0,0000`** |
| **EGRF – Khớp từ khoá** | **+0,353** | `[0,311; 0,395]` | `0,0000` | **`0,0000`** |
| Khớp ngữ nghĩa – Khớp từ khoá | +0,072 | `[0,042; 0,103]` | `0,0000` | `0,0000` |
| Hợp nhất chuẩn – Khớp ngữ nghĩa | +0,012 | `[-0,007; 0,033]` | `0,1093` | `0,1093` |

Kiểm chứng tiếp tính tổng quát trên hai tập tài liệu khoa học chuẩn BEIR [18] (SciFact [16], NFCorpus [17]) và tập 58 truy vấn địa điểm đa ngôn ngữ Yelp cho kết quả ở Bảng 4.10.

**Bảng 4.10: Độ chính xác tìm kiếm trên các tập đối chứng BEIR và Yelp**

| Tập dữ liệu | Quy mô | Phương pháp | P@5 ↑ | nDCG@10 ↑ | R@10 ↑ |
|---|---|---|---|---|---|
| Y sinh (SciFact) | 5.183 tài liệu, 300 truy vấn | **Khớp từ khoá** | — | **0,665** | **0,785** |
| | | Khớp ngữ nghĩa | — | 0,468 | 0,604 |
| | | Hợp nhất chuẩn | — | 0,562 | 0,694 |
| | | EGRF | — | 0,589 | 0,711 |
| Dinh dưỡng (NFCorpus) | 3.633 tài liệu, 323 truy vấn | **Khớp từ khoá** | — | **0,303** | **0,145** |
| | | Khớp ngữ nghĩa | — | 0,209 | 0,103 |
| | | Hợp nhất chuẩn | — | 0,257 | 0,126 |
| | | EGRF | — | 0,270 | 0,134 |
| Địa điểm đa ngôn ngữ (Yelp) | 58 truy vấn | Khớp từ khoá | 0,497 | 0,436 | 0,386 |
| | | Khớp ngữ nghĩa | 0,538 | 0,502 | 0,459 |
| | | Hợp nhất chuẩn | 0,728 | 0,640 | 0,579 |
| | | **EGRF** | **0,862** | **0,808** | **0,759** |

Trên tập khoa học tiếng Anh chuyên ngành hẹp, khớp từ khoá [13] giữ vị trí cao nhất do đặc thù thuật ngữ chuẩn xác, nhưng EGRF vẫn vượt hợp nhất chuẩn trên cả hai tập. Ngược lại, trên đúng miền địa điểm ăn uống (Yelp 58 truy vấn), EGRF đạt **P@5 = 0,862** và **MRR = 0,940** (vượt hợp nhất 2 nhánh $+0,134$ với $p_{\text{Holm}} = 0,0002$).

### 4.5.4. Độ triệu hồi gợi ý

Bảng 4.11 và Hình 4.3 trình bày kết quả đánh giá thuật toán gợi ý theo giao thức leave-one-out trên bốn tập dữ liệu đối chứng.

**Bảng 4.11: Độ triệu hồi gợi ý trên bốn tập dữ liệu đối chứng**

| Tập dữ liệu | Người dùng | Phương pháp | R@5 ↑ | R@10 ↑ | R@20 ↑ | nDCG@10 ↑ |
|---|---|---|---|---|---|---|
| Yelp | 1.709 | Ngẫu nhiên | 0,000 | 0,000 | 0,001 | 0,000 |
| | | Độ phổ biến / Tương tự | 0,014 | 0,025 | 0,046 | 0,013 |
| | | DES thuần | 0,011 | 0,023 | 0,042 | 0,011 |
| | | Lọc cộng tác | 0,017 | 0,035 | 0,077 | 0,017 |
| | | **DES kết hợp** | **0,023** | **0,044** | **0,087** | **0,021** |
| MovieLens-100k | 943 | Ngẫu nhiên | 0,002 | 0,004 | 0,013 | 0,002 |
| | | Độ phổ biến / Tương tự | 0,052 | 0,087 | 0,140 | 0,046 |
| | | DES thuần | 0,040 | 0,053 | 0,082 | 0,030 |
| | | **Lọc cộng tác** | **0,081** | **0,118** | **0,170** | **0,064** |
| | | DES kết hợp | 0,080 | 0,115 | 0,166 | **0,064** |
| MovieLens-1M | 2.000 | Ngẫu nhiên | 0,004 | 0,005 | 0,006 | 0,003 |
| | | Độ phổ biến / Tương tự | 0,023 | 0,042 | 0,074 | 0,021 |
| | | DES thuần | 0,022 | 0,035 | 0,055 | 0,017 |
| | | **Lọc cộng tác** | **0,041** | **0,071** | **0,117** | **0,036** |
| | | DES kết hợp | **0,041** | 0,070 | 0,116 | **0,036** |
| Nội bộ | 278 | Ngẫu nhiên | 0,022 | 0,036 | 0,058 | 0,017 |
| | | Độ phổ biến / Tương tự | 0,025 | 0,054 | 0,112 | 0,026 |
| | | **Lọc cộng tác** | **0,047** | **0,079** | **0,140** | **0,041** |

```mermaid
xychart-beta
    x-axis ["Ngẫu nhiên", "Phổ biến", "DES thuần", "Lọc cộng tác", "DES kết hợp"]
    y-axis "R@10" 0 --> 0.05
    bar [0.000, 0.025, 0.023, 0.035, 0.044]
```

*Hình 4.3: Biểu đồ độ triệu hồi tại 10 trên tập địa điểm đối chứng*

Trên tập địa điểm Yelp, DES kết hợp đạt R@10 là **0,044** so với 0,035 của lọc cộng tác [14] (kiểm định bootstrap nDCG@10 cho chênh lệch trung bình 0,0046, khoảng tin cậy 95% là $[0,0028;\ 0,0065]$, $p \approx 0$). Trên hai tập MovieLens [15], DES kết hợp cho hiệu năng tương đương lọc cộng tác ($p = 0,70$ và $p = 0,92$). Riêng DES thuần cho thấy việc chỉ dùng trung bình Bayes tương quan cao với độ phổ biến nên cần pha cùng thành phần sở thích cá nhân như ở bản kết hợp.

## 4.6. Ảnh giao diện hệ thống tiêu biểu

Mười màn hình đại diện dưới đây trình bày các phân hệ trọng tâm của Rendez theo ba ngữ cảnh tài khoản độc lập ở độ phân giải 1280×800 (`Khách vãng lai`, `Thành viên` và `Quản trị viên`). Toàn bộ 25 màn hình phụ trợ còn lại được sắp xếp đầy đủ trong **Phụ lục D** (Hình D.1 đến Hình D.25).

![Màn hình Đăng nhập với ảnh địa điểm Đà Nẵng chuyển cảnh mượt mà](hinh/fig-4-01-login.png)

*Hình 4.4: Màn hình Đăng nhập với ảnh địa điểm Đà Nẵng chuyển cảnh mượt mà*

![Màn hình Đăng ký tài khoản mới và chấp thuận Điều khoản sử dụng](hinh/fig-4-02-register.png)

*Hình 4.5: Màn hình Đăng ký tài khoản mới và chấp thuận Điều khoản sử dụng*

![Màn hình Khám phá địa điểm với cụm Gợi ý hôm nay và bộ lọc URL](hinh/fig-4-05-discover.png)

*Hình 4.6: Màn hình Khám phá địa điểm với cụm Gợi ý hôm nay và bộ lọc URL*

![Màn hình Bản đồ cụm địa điểm đồng bộ điều kiện lọc](hinh/fig-4-07-map.png)

*Hình 4.7: Màn hình Bản đồ cụm địa điểm đồng bộ điều kiện lọc*

![Màn hình Chi tiết địa điểm kèm giờ mở cửa, đánh giá 4 mức và bản đồ thu nhỏ](hinh/fig-4-08-place-detail.png)

*Hình 4.8: Màn hình Chi tiết địa điểm kèm giờ mở cửa, đánh giá 4 mức và bản đồ thu nhỏ*

![Bảng tin cộng đồng kèm khung soạn bài và bài đăng gắn thẻ địa điểm](hinh/fig-4-17-social.png)

*Hình 4.9: Bảng tin cộng đồng kèm khung soạn bài và bài đăng gắn thẻ địa điểm*

![Khung trò chuyện nhắn tin trực tiếp thời gian thực (SSE)](hinh/fig-4-21-messages-chat.png)

*Hình 4.10: Khung trò chuyện nhắn tin trực tiếp thời gian thực (SSE)*

![Phòng nhóm cộng tác với xếp hạng ứng viên và bản đồ ghim vị trí thành viên](hinh/fig-4-24-room-candidates.png)

*Hình 4.11: Phòng nhóm cộng tác với xếp hạng ứng viên và bản đồ ghim vị trí thành viên*

![Thẻ Tiêu chí cá nhân và cảnh báo mâu thuẫn trong phòng nhóm](hinh/fig-4-25-room-preferences.png)

*Hình 4.12: Thẻ Tiêu chí cá nhân và cảnh báo mâu thuẫn trong phòng nhóm*

![Cổng quản trị độc lập (/admin) — Tab Tổng quan vận hành](hinh/fig-4-26-admin-overview.png)

*Hình 4.13: Cổng quản trị độc lập (`/admin`) — Tab Tổng quan vận hành*

<!-- pagebreak -->

# CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 5.1. Kết luận

Bảng 5.1 đối chiếu năm mục tiêu đặt ra ở Chương 1 với kết quả đo đạc và kiểm chứng thực tế.

**Bảng 5.1: Đối chiếu mục tiêu và kết quả**

| Mục tiêu | Kết quả đạt được | Trạng thái |
|---|---|---|
| Mạng xã hội địa điểm đủ nghiệp vụ | Hoàn thiện 27 yêu cầu chức năng (đánh giá 4 mức + hữu ích, nhắn tin SSE, đề xuất quán, phòng nhóm bản đồ & tiêu chí, điểm neo mã hóa, Cổng quản trị 7 phân hệ tách biệt) | Đạt |
| Tìm kiếm hiểu ý định theo ngữ nghĩa, chịu không dấu và lỗi gõ | EGRF đạt P@5 = 0,860 trên tập nội bộ (so với 0,591 của RRF chuẩn, $p_{\text{Holm}} = 0$), tìm kiếm đơn lẻ p95 = 18 ms | Đạt |
| Gợi ý hoạt động khi chưa có lịch sử | DES kết hợp đạt R@10 = 0,044 trên tập địa điểm đối chứng (so với 0,035 của lọc cộng tác) | Đạt |
| Đo thời gian phản hồi dưới tải trên máy chủ đơn | p95 420 ms ở 1.000 người dùng, 1.250 ms ở 2.000 người dùng, 0% lỗi máy chủ tới 3.000 người dùng | Đạt |
| Kiểm thử tự động phủ toàn bộ yêu cầu | Chiến lược 4 tầng: schema 20/20, backend 52 tệp tích hợp trên PostgreSQL thật, frontend unit 237/237 và Playwright E2E 49/49 | Đạt |

Hệ thống hoàn thiện theo kiến trúc monorepo phân tách rõ giữa giao diện người dùng, Cổng quản trị, tầng dịch vụ API và cơ sở dữ liệu quan hệ chuẩn hóa 3NF kết hợp tìm kiếm vector, hàng đợi tác vụ nền và quan sát vận hành trên một máy chủ giới hạn 5 nhân và 3,5 GB bộ nhớ. Phân hệ trí tuệ nhân tạo gồm bộ phân tích ngôn ngữ tự nhiên tiếng Việt, EGRF 6 luồng, DES kèm nhánh `Affinity` (R-1..R-4) và bộ chấm điểm phòng nhóm đa tiêu chí được cài đặt đầy đủ và đánh giá thực nghiệm khách quan.

## 5.2. Hạn chế

1. **Giới hạn tập kiểm chuẩn và độ mở rộng corpus:** Tập 344 truy vấn nội bộ do nhóm biên soạn để đánh giá và tinh chỉnh ngưỡng; mọi phép đo thực hiện trên tập 358–360 địa điểm tại Đà Nẵng, chưa kiểm chứng ngưỡng chuyển sang quét tuần tự khi dữ liệu đạt quy mô hàng chục nghìn bản ghi.
2. **Độ phủ siêu dữ liệu thô và lệch bộ dữ liệu thử nghiệm:** Trên 360 địa điểm của `places-expanded.json`, tỷ lệ quán có ảnh thật (6,1%), mô tả dài (7,8%) và giờ mở cửa (14,7%) còn thưa; `priceLevel` trong file nguồn bằng 0 và bộ giả lập frontend (`487` quán) chưa thống nhất hoàn toàn với corpus chính (`360` quán).
3. **Điểm cần tối ưu trong đường ống AI và truy vấn từ khóa:** Khi quản trị viên thêm mới hoặc duyệt đề xuất quán, hệ thống chưa tự động phát tác vụ nền cập nhật lại vector trong `place_embeddings` (phụ thuộc chạy định kỳ `embed-places.ts`); đồng thời biểu thức `HAYSTACK` trong `lexical.ts` vẫn ghép chuỗi thẻ `string_agg` tại thời điểm truy vấn.
4. **Môi trường đo tải và khôi phục SSE:** k6 chạy trên cùng máy chủ vật lý gây tranh chấp CPU ở mức tải cực đại và chưa kiểm chứng khôi phục kết nối SSE tự động khi tiến trình API khởi động lại giữa phiên.
5. **Tích hợp hạ tầng đám mây ngoài cục bộ:** Kho lưu trữ Cloudflare R2 thương mại, SMTP sản xuất và cấp chứng chỉ TLS trên tên miền thật mới kiểm chứng ở lớp hợp đồng giao tiếp và giả lập.

## 5.3. Hướng phát triển

1. Tự động đẩy tác vụ tính lại vector nhúng vào hàng đợi `pg-boss` ngay khi quản trị viên tạo, cập nhật hoặc phê duyệt địa điểm mới để đồng bộ tức thì với bộ tìm kiếm `pgvector`.
2. Tối ưu truy vấn từ khóa bằng cột vật hóa văn bản tổng hợp (`search_haystack`) đánh chỉ mục GIN sẵn trong bảng địa điểm, thay thế `string_agg` tính động theo từng lượt tìm.
3. Làm giàu có hệ thống ảnh thật, mô tả không gian, giờ mở cửa và hợp nhất chung một nguồn corpus duy nhất giữa backend và môi trường phát triển giao diện.
4. Thu thập nhật ký truy vấn ẩn danh từ người dùng thật để tách biệt tập kiểm thử độc lập, giám sát `Search Zero-Result Rate` và nghiên cứu mô hình nhúng tinh chỉnh riêng cho ẩm thực tiếng Việt.
5. Hoàn tất kiểm thử nghiệm thu toàn phần trên hạ tầng đám mây thật (Cloudflare R2, SMTP sản xuất, chứng chỉ TLS tự động và giám sát dài hạn).

<!-- pagebreak -->

# TÀI LIỆU THAM KHẢO

[1] Hono. *Hono: Web framework built on Web Standards*. https://hono.dev/docs (truy cập 10/11/2026).

[2] Prisma. *Prisma ORM Documentation: Schema, Migrations, Driver Adapters*. https://www.prisma.io/docs (truy cập 10/11/2026).

[3] Better Auth. *Better Auth Documentation: Email & Password, Session Management*. https://www.better-auth.com/docs (truy cập 10/11/2026).

[4] PostgreSQL Global Development Group. *PostgreSQL 17 Documentation: Text Search, unaccent, pg_trgm, JSON Types*. https://www.postgresql.org/docs/17/ (truy cập 10/11/2026).

[5] pg-boss. *pg-boss: Queueing jobs in PostgreSQL*. https://github.com/timgit/pg-boss (truy cập 10/11/2026).

[6] Zod. *Zod Documentation: TypeScript-first schema validation*. https://zod.dev (truy cập 10/11/2026).

[7] Bun. *Bun Documentation: HTTP server, reusePort, Test runner*. https://bun.sh/docs (truy cập 10/11/2026).

[8] Caddy. *Caddy Documentation: Automatic HTTPS, reverse_proxy, encode*. https://caddyserver.com/docs/ (truy cập 10/11/2026).

[9] React. *React Documentation: Hooks, Suspense*. https://react.dev (truy cập 10/11/2026).

[10] Cloudflare. *R2 Documentation: Presigned URLs, S3 compatibility*. https://developers.cloudflare.com/r2/ (truy cập 10/11/2026).

[11] Grafana. *k6 Documentation: Test types, thresholds, metrics*. https://k6.io/docs/ (truy cập 10/11/2026).

[12] Cormack, G. V., Clarke, C. L. A., và Büttcher, S. (2009). *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods*. Proceedings of the 32nd International ACM SIGIR Conference, tr. 758–759.

[13] Robertson, S., và Zaragoza, H. (2009). *The Probabilistic Relevance Framework: BM25 and Beyond*. Foundations and Trends in Information Retrieval, 3(4), tr. 333–389.

[14] Sarwar, B., Karypis, G., Konstan, J., và Riedl, J. (2001). *Item-based collaborative filtering recommendation algorithms*. Proceedings of the 10th International Conference on World Wide Web, tr. 285–295.

[15] Harper, F. M., và Konstan, J. A. (2015). *The MovieLens Datasets: History and Context*. ACM Transactions on Interactive Intelligent Systems, 5(4), tr. 1–19.

[16] Wadden, D., Lin, S., Lo, K., Wang, L. L., van Zuylen, M., Cohan, A., và Hajishirzi, H. (2020). *Fact or Fiction: Verifying Scientific Claims*. Proceedings of EMNLP 2020, tr. 7534–7550.

[17] Boteva, T., Gholipour, D., Sokolov, A., và Riedel, S. (2016). *A Full-Text Learning to Rank Dataset for Medical Information Retrieval*. Proceedings of ECIR 2016, tr. 716–722.

[18] Thakur, N., Reimers, N., Rücklé, A., Srivastava, A., và Gurevych, I. (2021). *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models*. Proceedings of NeurIPS 2021 Datasets and Benchmarks Track.

[19] Schein, A. I., Popescu, A., Ungar, L. H., và Pennock, D. M. (2002). *Methods and metrics for cold-start recommendations*. Proceedings of the 25th International ACM SIGIR Conference, tr. 253–260.

[20] OpenStreetMap contributors. *OpenStreetMap: dữ liệu bản đồ theo giấy phép ODbL*. https://www.openstreetmap.org/copyright (truy cập 10/11/2026).

[21] OWASP Foundation. *OWASP Top 10: Web Application Security Risks*. https://owasp.org/www-project-top-ten/ (truy cập 10/11/2026).

[22] OWASP Foundation. *OWASP Application Security Verification Standard*. https://owasp.org/www-project-application-security-verification-standard/ (truy cập 10/11/2026).

[23] Nielsen, J. (1993). *Response Times: The 3 Important Limits*. Nielsen Norman Group. https://www.nngroup.com/articles/response-times-3-important-limits/ (truy cập 10/11/2026).

[24] Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures*. Luận văn tiến sĩ, University of California, Irvine.

[25] Pautasso, C., Zimmermann, O., và Leymann, F. (2008). *RESTful Web Services vs. "Big" Web Services: Making the Right Architectural Decision*. Proceedings of the 17th International Conference on World Wide Web, tr. 801–810.

[26] Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media.

[27] Liskov, B. (1988). *Data Abstraction and Hierarchy*. ACM SIGPLAN Notices, 23(5), tr. 17–34.

[28] Gamma, E., Helm, R., Johnson, R., và Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley.

[29] W3C. *Web Content Accessibility Guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/ (truy cập 10/11/2026).

[30] Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/ (truy cập 10/11/2026).

[31] Reimers, N., và Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*. Proceedings of EMNLP-IJCNLP 2019, tr. 3982–3992.

[32] Karpukhin, V., Oğuz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., và Yih, W. (2020). *Dense Passage Retrieval for Open-Domain Question Answering*. Proceedings of EMNLP 2020, tr. 6769–6781.

[33] Kysely. *Kysely: A type-safe TypeScript SQL query builder*. https://kysely.dev/docs/intro (truy cập 22/11/2026).

[34] Dubien, N. *fast-check: Property-based testing framework for JavaScript/TypeScript*. https://fast-check.dev/ (truy cập 22/11/2026).

[35] Gregg, B. (2020). *Systems Performance: Enterprise and the Cloud* (ấn bản 2). Addison-Wesley Professional.

<!-- pagebreak -->

# PHỤ LỤC A: DANH MỤC API ENDPOINT VÀ ĐẶC TẢ GIAO DIỆN LẬP TRÌNH

Bảng A.1 tổng hợp 19 nhóm API nghiệp vụ chính của hệ thống theo cấu trúc chuẩn; các Bảng A.2 đến A.4 trình bày đặc tả chi tiết ba nhóm điểm cuối trọng tâm.

**Bảng A.1: Danh mục các nhóm API endpoint của hệ thống (19 nhóm route)**

| STT | Đường dẫn (`/api/v1/...`) | Phương thức | Mô tả chức năng | Xác thực |
|---|---|---|---|---|
| 1 | `/me`, `/me/notification-prefs` | GET, PATCH, DELETE | Đọc, cập nhật và xoá ẩn danh tài khoản; cấu hình nhận thông báo | Bắt buộc |
| 2 | `/auth/providers`, `/session`, `/register`, `/auth/resend-verification` | GET, POST, DELETE | Kiểm tra OAuth, đăng nhập/xuất, đăng ký kèm điều khoản, gửi lại xác thực | Công khai / Có phiên |
| 3 | `/places`, `/places/map`, `/places/saved`, `/places/:id` | GET | Danh sách/tìm kiếm EGRF, khung nhìn bản đồ, địa điểm đã lưu và chi tiết | Công khai / Bắt buộc (`/saved`) |
| 4 | `/places/suggestions`, `/places/daily-picks`, `/places/recommended` | GET | Gợi ý quán khi soạn bài, gợi ý hôm nay và gợi ý DES cá nhân hóa | Công khai / Bắt buộc |
| 5 | `/places/:id/posts`, `/places/:id/media`, `/places/:id/images` | GET, POST | Bài viết gắn quán, thư viện ảnh phân loại và đóng góp ảnh quán | Công khai / Bắt buộc (`POST`) |
| 6 | `/places/submissions`, `/me/submissions` | POST, GET | Thành viên gửi đề xuất địa điểm mới và theo dõi trạng thái xử lý | Bắt buộc |
| 7 | `/places/:id/reviews`, `/reviews/:id/helpful`, `/places/:id/reports` | GET, POST, DELETE | Đánh giá 4 mức (có chống trùng), bình chọn hữu ích và báo cáo vi phạm | Công khai (`GET`) / Bắt buộc |
| 8 | `/posts`, `/posts/:id`, `/posts/:id/place`, `.../like`, `.../save` | GET, POST, PATCH, DELETE | Bảng tin cộng đồng, tạo/xem/xoá bài viết, gắn địa điểm, thích và lưu | Công khai (`GET`) / Bắt buộc |
| 9 | `/posts/:id/comments`, `/comments/:id/like`, `/comments/:id` | GET, POST, PATCH, DELETE | Bình luận nhiều cấp, thích bình luận và xoá bình luận | Công khai (`GET`) / Bắt buộc |
| 10 | `/users`, `/users/suggestions`, `/users/:handle`, `.../follow`, `.../block` | GET, POST, DELETE | Tìm kiếm người dùng, gợi ý kết nối, hồ sơ công khai, theo dõi và chặn | Công khai (`GET`) / Bắt buộc |
| 11 | `/collections`, `/collections/liked`, `/collections/:id`, `.../places`, `.../reorder`, `.../collaborators` | GET, POST, PATCH, DELETE | Quản lý bộ sưu tập, danh sách đã thích, ghi chú quán, sắp xếp và cộng tác | Công khai / Bắt buộc |
| 12 | `/messages/events`, `/messages/conversations`, `/messages/with/:handle` | GET, POST | Luồng sự kiện SSE tin nhắn, phân loại Hộp thư chính/chờ, gửi tin kèm thẻ | Bắt buộc |
| 13 | `/rooms`, `/rooms/mine`, `/rooms/:code`, `.../join`, `.../me/location`, `.../candidates`, `.../proposals`, `.../events` | GET, POST, PATCH, DELETE | Tạo/tham gia phòng nhóm, ghim tọa độ, ứng viên, tiêu chí, SSE và bỏ phiếu | Phiên thành viên / Token phòng |
| 14 | `/geocode`, `/landmarks`, `/me/anchors`, `/me/location` | GET, POST, PATCH, PUT, DELETE | Tìm tọa độ, mốc địa danh Đà Nẵng, điểm neo cá nhân và GPS mã hóa | Công khai (`GET` mốc) / Bắt buộc |
| 15 | `/notifications`, `/notifications/:id`, `/notifications/events` | GET, PATCH | Danh sách thông báo, đánh dấu đã đọc và luồng đẩy SSE | Bắt buộc |
| 16 | `/media/presign`, `/media/upload/:folder/:userId/:filename`, `/media/files/...` | POST, PUT, GET | Cấp URL tải ảnh có chữ ký, tải tệp lên và phân phát ảnh cục bộ | Bắt buộc (`POST`/`PUT`) |
| 17 | `/tiles/:z/:x/:file`, `/og/place/:id`, `/og/post/:id` | GET | Proxy tile bản đồ chống SSRF kèm cầu dao và sinh thẻ chia sẻ Open Graph | Công khai |
| 18 | `/events`, `/telemetry` | POST | Thu thập sự kiện tương tác người dùng và Core Web Vitals từ trình duyệt | Công khai |
| 19 | `/admin/overview`, `/admin/reports`, `/admin/submissions`, `/admin/places`, `/admin/users`, `/admin/observability`, `/admin/audit-logs` | GET, POST, PATCH | 7 phân hệ vận hành Cổng quản trị và tra cứu nhật ký kiểm toán | Quản trị viên / Kiểm duyệt viên |

**Bảng A.2: Đặc tả chi tiết API Tìm kiếm và lọc địa điểm**

| Thuộc tính | Đặc tả kỹ thuật |
|---|---|
| Tên điểm cuối | `GET /api/v1/places` |
| Tham số truy vấn | `q` (chuỗi tìm kiếm tùy chọn), `category`, `district`, `priceMax` (`1\|2\|3`), `sort` (`newest\|rating\|distance`), `lat`/`lng`, `cursor`, `limit` |
| Xử lý nội bộ | Phân tích ý định tự nhiên bằng `@rendez/schema`, chạy EGRF 4 nhánh khi có `q` ở trang đầu, hoặc phân trang keyset cursor khi duyệt/lọc |
| Phản hồi thành công (`200`) | `{ items: Place[], next: string \| null, meta: { didYouMean?: string } }` |
| Mã lỗi chính | `400 Bad Request` (con trỏ phân trang hoặc tham số biên không hợp lệ), `429 Too Many Requests` |

**Bảng A.3: Đặc tả chi tiết API Đăng bài và kích hoạt phát hiện địa điểm**

| Thuộc tính | Đặc tả kỹ thuật |
|---|---|
| Tên điểm cuối | `POST /api/v1/posts` |
| Đầu vào (JSON Body) | `{ content: string, placeId?: string, imageKeys?: string[] }`, kèm header `Idempotency-Key` |
| Xác thực & Chống trùng | Bắt buộc cookie phiên hợp lệ; kiểm tra trùng lặp theo `idempotency_keys` trong DB |
| Phản hồi thành công (`201`) | Trả đối tượng bài đăng đã tạo; đẩy job `place-detect` nếu thiếu `placeId` |
| Mã lỗi chính | `400 Bad Request` (ảnh không thuộc quyền sở hữu hoặc nội dung sai định dạng), `401 Unauthorized`, `404 Not Found` (địa điểm không tồn tại) |

**Bảng A.4: Đặc tả chi tiết API Áp dụng đề xuất phòng nhóm thời gian thực**

| Thuộc tính | Đặc tả kỹ thuật |
|---|---|
| Tên điểm cuối | `POST /api/v1/rooms/:code/proposals/:id/apply` |
| Xác thực | Thành viên hợp lệ trong phòng (qua phiên tài khoản hoặc cookie `HttpOnly` token phòng) |
| Kiểm soát tương tranh | Giao dịch PostgreSQL dùng CAS có điều kiện `WHERE id = :id AND status = 'open'` |
| Phản hồi thành công (`200`) | Đối tượng `Room` cập nhật kèm bộ lọc chung; đồng thời phát sự kiện SSE qua kênh nội bộ tới toàn bộ tiến trình API |
| Mã lỗi chính | `403 Forbidden`, `404 Not Found`, `409 Conflict` (đề xuất đã được thành viên khác áp dụng hoặc huỷ bỏ trước đó) |

<!-- pagebreak -->

# PHỤ LỤC B: ĐẶC TẢ CHI TIẾT CÁC USE CASE MỞ RỘNG

Phụ lục này bổ sung đặc tả chi tiết cho ba use case mở rộng (UC-18, UC-19, UC-20) được dẫn chiếu từ Bảng 3.3 trong Chương 3.

**Bảng B.1: Đặc tả use case Nhắn tin trực tiếp thời gian thực (UC-18)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-18 — Nhắn tin trực tiếp thời gian thực |
| Tác nhân chính | Thành viên |
| Tiền điều kiện | Đã đăng nhập; hai người dùng không nằm trong danh sách chặn hai chiều |
| Luồng sự kiện chính | 1. Thành viên mở trang Tin nhắn và xem danh sách hội thoại được phân tách giữa Hộp thư chính và Tin nhắn chờ.<br>2. Chọn một hội thoại sẵn có hoặc bắt đầu hội thoại mới, soạn nội dung văn bản hoặc đính kèm thẻ địa điểm, bộ sưu tập hay phòng nhóm.<br>3. Gửi tin nhắn; hệ thống lưu trữ, đẩy tin tức thời tới màn hình người nhận qua SSE và gửi thông báo nếu người nhận đang bật nhận thông báo.<br>4. Khi người nhận mở khung trò chuyện, hệ thống tự động đánh dấu tin nhắn là đã đọc. |
| Luồng thay thế | 1a. Người gửi và người nhận chưa theo dõi lẫn nhau: hội thoại mới tự động đưa vào mục Tin nhắn chờ.<br>3a. Một trong hai phía đã bật chặn người kia: hệ thống từ chối chuyển tin và thông báo không thể gửi tin nhắn. |
| Hậu điều kiện | Nội dung trò chuyện đồng bộ tức thời giữa hai bên và bộ đếm tin chưa đọc trên thanh điều hướng được cập nhật đúng. |

**Bảng B.2: Đặc tả use case Đề xuất địa điểm mới từ cộng đồng (UC-19)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-19 — Cộng đồng đề xuất thêm địa điểm mới |
| Tác nhân chính | Thành viên |
| Tiền điều kiện | Thành viên đã đăng nhập giao diện người dùng |
| Luồng sự kiện chính | 1. Thành viên mở hộp thoại Đề xuất địa điểm mới tại trang Đã lưu.<br>2. Nhập tên quán, địa chỉ, quận, hạng mục, mức giá, chọn tọa độ trên bản đồ hoặc nhập tọa độ, kèm giờ mở cửa.<br>3. Gửi đề xuất; hệ thống kiểm chứng dữ liệu qua `@rendez/schema` và lưu vào hàng chờ kiểm duyệt.<br>4. Thành viên theo dõi trạng thái xử lý của các đề xuất đã gửi trong mục đề xuất của tôi. |
| Luồng thay thế | 2a. Thiếu trường bắt buộc hoặc tọa độ nằm ngoài phạm vi hợp lệ: biểu mẫu thông báo lỗi chi tiết ngay tại trường nhập trước khi gửi. |
| Hậu điều kiện | Đề xuất được lưu ở trạng thái chờ kiểm duyệt và hiển thị ngay trong hàng chờ của Cổng quản trị. |

**Bảng B.3: Đặc tả use case Kiểm duyệt, xử lý đề xuất và giám sát quản trị (UC-20)**

| Thuộc tính | Nội dung |
|---|---|
| Tên use case | UC-20 — Kiểm duyệt báo cáo, phê duyệt đề xuất quán và giám sát vận hành |
| Tác nhân chính | Quản trị viên (hoặc Kiểm duyệt viên đối với phân hệ nội dung) |
| Tiền điều kiện | Đã đăng nhập tài khoản có vai trò Quản trị hoặc Kiểm duyệt trong Cổng quản trị (`/admin`) |
| Luồng sự kiện chính | 1. Quản trị viên mở một trong bảy phân hệ tại Cổng quản trị: Tổng quan, Báo cáo, Đề xuất quán, Địa điểm, Người dùng, Hiệu suất & Quan sát, Nhật ký kiểm toán.<br>2. Rà soát danh sách đề xuất địa điểm mới hoặc báo cáo vi phạm từ cộng đồng.<br>3. Chọn Phê duyệt (hoặc Từ chối kèm lý do): hệ thống thực hiện giao dịch nguyên tử tạo địa điểm công khai kèm thẻ phân loại khi duyệt, chuyển trạng thái hồ sơ và ghi vết vào Nhật ký kiểm toán.<br>4. Theo dõi phân vị độ trễ RED/USE, Core Web Vitals, trạng thái cầu dao và truy vấn chậm trong tab Hiệu suất & Quan sát. |
| Luồng thay thế | 3a. Tên địa điểm được duyệt trùng với quán sẵn có: hệ thống tự động thêm phần phân biệt ở mã định danh để không ghi đè dữ liệu cũ.<br>3b. Tài khoản người dùng thường cố truy cập đường dẫn `/admin`: lớp bảo vệ vai trò từ chối quyền truy cập. |
| Hậu điều kiện | Địa điểm được duyệt hiển thị công khai trên Khám phá/Bản đồ; mọi thay đổi quản trị đều có bản ghi kiểm toán không xóa sửa được. |

<!-- pagebreak -->

# PHỤ LỤC C: CHI TIẾT LƯỢC ĐỒ CƠ SỞ DỮ LIỆU VÀ CÁC SƠ ĐỒ ERD PHÂN RÃ THEO MIỀN

Phụ lục này cung cấp đặc tả chi tiết bảng trung tâm `Địa điểm` (Bảng C.1), danh mục 15 kiểu liệt kê Enum (Bảng C.2) và ba sơ đồ thực thể liên kết phân rã chi tiết theo miền nghiệp vụ (Hình C.1 đến Hình C.3) được dẫn chiếu từ Mục 3.7.

**Bảng C.1: Mô tả cấu trúc chi tiết bảng Địa điểm (`places`)**

| Trường dữ liệu | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `text` | Khoá chính | Định danh duy nhất sinh từ tên và địa chỉ |
| `name` | `text` | Bắt buộc | Tên địa điểm tiếng Việt có dấu |
| `name_unaccent` | `text` | Bắt buộc, chỉ mục GIN | Tên đã bỏ dấu, chuẩn hoá chữ thường phục vụ tìm kiếm nhanh |
| `category` | `PlaceCategory` (Enum) | Bắt buộc | Một trong 6 hạng mục: quán ăn, cà phê, ăn vặt, tiệm bánh, tráng miệng, bar |
| `district` | `text` | Bắt buộc | Một trong 6 quận nội thành Đà Nẵng |
| `lat` | `numeric` | Cho phép rỗng | Vĩ độ thực tế của địa điểm |
| `lng` | `numeric` | Cho phép rỗng | Kinh độ thực tế của địa điểm |
| `price_level` | `smallint` | Kiểm tra `NULL` hoặc `1..3` | Mức giá tham khảo theo 3 bậc |
| `opening_hours` | `text` | Cho phép rỗng | Giờ mở cửa dạng chuỗi chuẩn hóa |
| `published_at` | `timestamptz` | Cho phép rỗng | Thời điểm được công bố hiển thị công khai |
| `deleted_at` | `timestamptz` | Cho phép rỗng | Thời điểm xoá mềm giữ toàn vẹn tham chiếu |

**Bảng C.2: Tổng hợp 15 kiểu liệt kê (Enum) trong cơ sở dữ liệu**

| STT | Tên Enum (trong lược đồ) | Các giá trị hợp lệ | Miền nghiệp vụ áp dụng |
|---|---|---|---|
| 1 | `UserRole` | Thành viên, Kiểm duyệt viên, Quản trị viên | Tài khoản & Phân quyền RBAC |
| 2 | `PlaceCategory` | Quán ăn, Cà phê, Ăn vặt, Tiệm bánh, Tráng miệng, Quán bar | Địa điểm & Đề xuất quán |
| 3 | `PlaceStatus` | Đang mở, Đã đóng, Đóng vĩnh viễn, Chưa rõ | Địa điểm |
| 4 | `PlaceSubmissionStatus` | Chờ duyệt, Đã duyệt, Từ chối | Đề xuất địa điểm cộng đồng |
| 5 | `PlaceImageKind` | Món ăn, Bảng giá/Thực đơn, Không gian, Mặt tiền | Thư viện ảnh địa điểm |
| 6 | `ReviewTier` | Phải thử (`must_try`), Rất ngon (`good`), Ổn (`ok`), Cần cải thiện (`not_for_me`) | Đánh giá 4 mức |
| 7 | `ReportReason` | Đóng cửa vĩnh viễn, Sai địa chỉ, Sai giờ mở cửa, Nội dung rác, Khác | Báo cáo vi phạm |
| 8 | `ReportStatus` | Đang chờ, Đã xử lý, Bỏ qua | Kiểm duyệt báo cáo |
| 9 | `AnchorKind` | Nhà riêng, Nơi làm việc, Trường học, Tùy chỉnh | Điểm neo vị trí |
| 10 | `RoomPhase` | Đang lọc, Đang bỏ phiếu, Đã chốt | Phòng nhóm cộng tác |
| 11 | `RoomVoteMode` | Chọn nhiều, Xếp hạng IRV, Quay ngẫu nhiên | Chế độ bình chọn phòng |
| 12 | `RoomProposalKind` | Bao gồm (`include`), Loại trừ (`exclude`) | Tiêu chí đề xuất phòng |
| 13 | `RoomProposalField` | Hạng mục, Quận, Mức giá tối đa, Từ khoá | Trường tiêu chí phòng |
| 14 | `NotificationKind` | Thích, Bình luận, Theo dõi, Nhắc tên, Gợi ý quán, Tin nhắn, Sự kiện phòng | Thông báo người dùng |
| 15 | `CollaboratorRole` | Người chỉnh sửa, Người xem | Cộng tác bộ sưu tập |

```mermaid
erDiagram
    NGUOI_DUNG ||--o{ PHIEN_DANG_NHAP : "1-n"
    NGUOI_DUNG ||--o{ TAI_KHOAN_LIEN_KET : "1-n"
    NGUOI_DUNG ||--o{ MA_XAC_THUC : "1-n"
    NGUOI_DUNG ||--o{ QUAN_HE_THEO_DOI : "người theo dõi"
    NGUOI_DUNG ||--o{ BO_DEM_SO_THICH : "1-n"
    NGUOI_DUNG ||--o{ DIEM_NEO_VI_TRI : "1-n"
    NGUOI_DUNG ||--o{ NHAT_KY_KIEM_TOAN : "thao tác"
    NGUOI_DUNG ||--o{ KHOA_LUY_DANG : "1-n"

    NGUOI_DUNG {
        uuid ma PK
        text email UK
        text dinh_danh UK
        text vai_tro
        bool da_xac_thuc_email
        bool ho_so_rieng_tu
        text vi_tri_ma_hoa
        timestamptz xoa_luc
    }
    PHIEN_DANG_NHAP {
        uuid ma PK
        uuid nguoi_dung_ma FK
        timestamptz het_han
    }
    TAI_KHOAN_LIEN_KET {
        uuid ma PK
        uuid nguoi_dung_ma FK
        text nha_cung_cap
    }
    QUAN_HE_THEO_DOI {
        uuid nguoi_theo_doi_ma PK
        uuid nguoi_duoc_theo_doi_ma PK
    }
    DIEM_NEO_VI_TRI {
        uuid ma PK
        uuid nguoi_dung_ma FK
        text nhan
        float vi_do
        float kinh_do
    }
    NHAT_KY_KIEM_TOAN {
        uuid ma PK
        uuid nguoi_thuc_hien_ma FK
        text hanh_dong
        text muc_tieu
        json chi_tiet
    }
    KHOA_LUY_DANG {
        uuid ma PK
        uuid nguoi_dung_ma FK
        text khoa UK
        timestamptz het_han
    }
```

*Hình C.1: Sơ đồ ERD phân rã miền Tài khoản, Định vị và Kiểm toán*

```mermaid
erDiagram
    PHONG ||--o{ THANH_VIEN_PHONG : "1-n"
    PHONG ||--o{ DE_XUAT_TRONG_PHONG : "1-n"
    PHONG ||--o{ UNG_VIEN_PHONG : "1-n"
    PHONG ||--o{ PHIEU_BAU_PHONG : "1-n"
    THANH_VIEN_PHONG ||--o{ DE_XUAT_TRONG_PHONG : "đề xuất"
    THANH_VIEN_PHONG ||--o{ PHIEU_BAU_PHONG : "bỏ phiếu"
    DIA_DIEM ||--o{ UNG_VIEN_PHONG : "ứng viên"
    UNG_VIEN_PHONG ||--o{ PHIEU_BAU_PHONG : "nhận phiếu"

    PHONG {
        uuid ma PK
        text ma_moi UK
        uuid chu_phong_ma FK
        text trang_thai
        text che_do_bau
        json bo_loc_chung
    }
    THANH_VIEN_PHONG {
        uuid ma PK
        uuid phong_ma FK
        uuid nguoi_dung_ma FK
        text ten_hien_thi
        bool la_khach
        text bam_token UK
    }
    DE_XUAT_TRONG_PHONG {
        uuid ma PK
        uuid phong_ma FK
        uuid thanh_vien_ma FK
        text loai_tieu_chi
        text gia_tri
        text trang_thai
        uuid nguoi_ap_dung_ma FK
    }
    UNG_VIEN_PHONG {
        uuid ma PK
        uuid phong_ma FK
        text dia_diem_ma FK
        uuid nguoi_de_cu_ma FK
    }
    PHIEU_BAU_PHONG {
        uuid ma PK
        uuid phong_ma FK
        uuid ung_vien_ma FK
        uuid thanh_vien_ma FK
        int thu_hang
    }
    DIA_DIEM {
        text ma PK
        text ten
        text hang_muc
        text quan
    }
```

*Hình C.2: Sơ đồ ERD phân rã miền Phòng nhóm cộng tác và Bỏ phiếu*

```mermaid
erDiagram
    NGUOI_DUNG ||--o{ TIN_NHAN_TRUC_TIEP : "gửi và nhận"
    NGUOI_DUNG ||--o{ CHAN_NGUOI_DUNG : "chặn hai chiều"
    NGUOI_DUNG ||--o{ DE_XUAT_DIA_DIEM : "gửi đề xuất"
    NGUOI_DUNG ||--o{ BINH_CHON_HUU_ICH : "bình chọn"
    NGUOI_DUNG ||--o{ CONG_TAC_BO_SUU_TAP : "cộng tác"
    DANH_GIA ||--o{ ANH_DANH_GIA : "kèm ảnh"
    DANH_GIA ||--o{ BINH_CHON_HUU_ICH : "nhận phiếu"
    BO_SUU_TAP ||--o{ CONG_TAC_BO_SUU_TAP : "chia sẻ quyền"
    DE_XUAT_DIA_DIEM }o--o| DIA_DIEM : "tạo địa điểm"

    TIN_NHAN_TRUC_TIEP {
        uuid ma PK
        uuid nguoi_gui_ma FK
        uuid nguoi_nhan_ma FK
        text noi_dung
        jsonb the_dinh_kem
        timestamptz doc_luc
    }
    CHAN_NGUOI_DUNG {
        uuid nguoi_chan_ma PK
        uuid nguoi_bi_chan_ma PK
        timestamptz tao_luc
    }
    DE_XUAT_DIA_DIEM {
        uuid ma PK
        uuid nguoi_de_xuat_ma FK
        text ten_quan
        text dia_chi
        text quan
        text trang_thai
        text dia_diem_tao_ma FK
    }
    ANH_DANH_GIA {
        uuid ma PK
        uuid danh_gia_ma FK
        text duong_dan
        int thu_tu
    }
    BINH_CHON_HUU_ICH {
        uuid danh_gia_ma PK
        uuid nguoi_dung_ma PK
    }
    CONG_TAC_BO_SUU_TAP {
        uuid bo_suu_tap_ma PK
        uuid nguoi_dung_ma PK
        text vai_tro
    }
```

*Hình C.3: Sơ đồ ERD phân rã miền Nhắn tin, Đánh giá 4 mức, Đề xuất quán và Cộng tác*

<!-- pagebreak -->

# PHỤ LỤC D: TOÀN BỘ ẢNH CHỤP CÁC MÀN HÌNH PHỤ TRỢ CỦA HỆ THỐNG

Phụ lục này lưu trữ đầy đủ 25 màn hình phụ trợ (chi tiết từng hộp thoại, tab quản trị, hồ sơ, bộ sưu tập và điều hướng tĩnh) bổ sung cho 10 màn hình chính đã trình bày ở Mục 4.6.

## D.1. Nhóm màn hình xác thực và hỗ trợ tài khoản

![Màn hình Quên mật khẩu](hinh/fig-4-03-forgot-password.png)

*Hình D.1: Màn hình Quên mật khẩu (`/forgot-password`)*

![Màn hình Xác thực email](hinh/fig-4-04-verify-email.png)

*Hình D.2: Màn hình Xác thực email và gửi lại liên kết kích hoạt (`/verify-email`)*

![Trang Điều khoản sử dụng](hinh/fig-4-36-terms.png)

*Hình D.3: Trang Điều khoản sử dụng (`/terms`)*

![Trang Chính sách quyền riêng tư](hinh/fig-4-37-privacy.png)

*Hình D.4: Trang Chính sách quyền riêng tư (`/privacy`)*

![Màn hình Lỗi 404](hinh/fig-4-38-not-found.png)

*Hình D.5: Màn hình điều hướng an toàn khi đường dẫn không tồn tại (`404 Not Found`)*

## D.2. Nhóm màn hình khám phá, đánh giá và bộ sưu tập

![Màn hình Tìm kiếm truy vấn không dấu](hinh/fig-4-06-search.png)

*Hình D.6: Màn hình Tìm kiếm tổng hợp (`/search`) hỗ trợ tiếng Việt không dấu*

![Khu vực Đánh giá 4 mức](hinh/fig-4-09-place-reviews.png)

*Hình D.7: Khu vực Đánh giá 4 mức (Phải thử, Rất ngon, Ổn, Cần cải thiện) và bình chọn hữu ích*

![Hộp thoại Lưu vào bộ sưu tập](hinh/fig-4-10-save-collection-dialog.png)

*Hình D.8: Hộp thoại Lưu địa điểm vào bộ sưu tập cá nhân*

![Trang Đã lưu](hinh/fig-4-11-saved.png)

*Hình D.9: Trang Đã lưu (`/saved`) quản lý địa điểm, bộ sưu tập và nút đề xuất địa điểm mới*

![Hộp thoại Đề xuất địa điểm mới](hinh/fig-4-12-suggest-place-dialog.png)

*Hình D.10: Hộp thoại Đề xuất địa điểm mới gửi cộng đồng kiểm duyệt*

![Trang Chi tiết bộ sưu tập](hinh/fig-4-13-collection-detail.png)

*Hình D.11: Trang Chi tiết bộ sưu tập (`/collections/:id`) hỗ trợ sắp xếp thứ tự và ghi chú quán*

## D.3. Nhóm màn hình cá nhân, cộng đồng, nhắn tin và thông báo

![Trang Hồ sơ cá nhân](hinh/fig-4-14-profile.png)

*Hình D.12: Trang Hồ sơ cá nhân (`/profile`)*

![Trang Hồ sơ người dùng công khai](hinh/fig-4-15-public-profile.png)

*Hình D.13: Trang Hồ sơ công khai (`/u/:handle`) với thao tác theo dõi và gửi tin nhắn*

![Trang Cài đặt tài khoản](hinh/fig-4-16-settings.png)

*Hình D.14: Trang Cài đặt (`/settings`) tùy chỉnh thông báo, đổi mật khẩu và xóa tài khoản*

![Khung soạn bài đăng](hinh/fig-4-18-compose-post.png)

*Hình D.15: Khung soạn bài đăng kèm tự động gợi ý địa điểm theo nội dung*

![Trang Chi tiết bài viết](hinh/fig-4-19-post-detail.png)

*Hình D.16: Trang Chi tiết bài viết (`/post/:id`) kèm luồng bình luận nhiều cấp*

![Trang Hộp thư tin nhắn trực tiếp](hinh/fig-4-20-messages-inbox.png)

*Hình D.17: Màn hình Hộp thư tin nhắn (`/messages`) phân tách Hộp thư chính và Tin nhắn chờ*

![Trung tâm Thông báo](hinh/fig-4-22-notifications.png)

*Hình D.18: Trung tâm Thông báo (`/notification`) phân loại thông báo tương tác, tin nhắn và phòng nhóm*

![Sảnh Phòng nhóm](hinh/fig-4-23-rooms-lobby.png)

*Hình D.19: Sảnh Phòng nhóm (`/rooms`) cho phép tạo phòng mới hoặc tham gia bằng mã 6 ký tự*

## D.4. Nhóm màn hình các phân hệ còn lại của Cổng quản trị (`/admin`)

![Admin — Quản lý địa điểm](hinh/fig-4-27-admin-places.png)

*Hình D.20: Cổng quản trị — Tab Quản lý địa điểm*

![Admin — Duyệt đề xuất địa điểm](hinh/fig-4-28-admin-submissions.png)

*Hình D.21: Cổng quản trị — Tab Đề xuất quán từ cộng đồng chờ kiểm duyệt*

![Admin — Xử lý báo cáo](hinh/fig-4-29-admin-reports.png)

*Hình D.22: Cổng quản trị — Tab Báo cáo vi phạm*

![Admin — Quản lý người dùng](hinh/fig-4-30-admin-users.png)

*Hình D.23: Cổng quản trị — Tab Quản lý người dùng (RBAC)*

![Admin — Hiệu suất và Quan sát](hinh/fig-4-31-admin-observability.png)

*Hình D.24: Cổng quản trị — Tab Hiệu suất và Quan sát (RED/USE, Web Vitals, truy vấn chậm)*

![Admin — Nhật ký kiểm toán](hinh/fig-4-32-admin-logs.png)

*Hình D.25: Cổng quản trị — Tab Nhật ký kiểm toán*
