# BÁO CÁO ĐỒ ÁN

**TRƯỜNG ĐẠI HỌC BÁCH KHOA – ĐẠI HỌC ĐÀ NẴNG**
**KHOA CÔNG NGHỆ THÔNG TIN**

**ĐỀ TÀI:** XÂY DỰNG MẠNG XÃ HỘI KHÁM PHÁ ĐỊA ĐIỂM TẠI ĐÀ NẴNG TÍCH HỢP TÌM KIẾM KHÔNG DẤU VÀ GỢI Ý CÁ NHÂN HOÁ

| | |
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

---

## LỜI CẢM ƠN

Đồ án này là kết quả của một học kỳ làm việc nghiêm túc của nhóm. Để hoàn thành báo cáo, nhóm đã nhận được sự hướng dẫn, góp ý và động viên từ nhiều người.

Trước hết, nhóm xin bày tỏ lòng biết ơn sâu sắc đến TS. Võ Đức Hoàng, người trực tiếp hướng dẫn, định hướng phương pháp nghiên cứu và chỉ ra những điểm còn thiếu trong quá trình thực hiện. Những nhận xét của thầy giúp nhóm nhìn rõ giới hạn của sản phẩm và điều chỉnh cách đánh giá kết quả một cách khách quan hơn.

Nhóm cũng xin cảm ơn quý thầy cô Khoa Công nghệ Thông tin, Trường Đại học Bách khoa – Đại học Đà Nẵng đã truyền đạt kiến thức nền tảng trong suốt những năm học, và cảm ơn các giảng viên chấm đồ án đã dành thời gian đọc và góp ý cho báo cáo này.

Cuối cùng, nhóm xin cảm ơn bạn bè đã chia sẻ tài liệu, góp ý về giao diện và hỗ trợ kiểm thử. Nhóm cũng muốn ghi nhận nỗ lực của chính mình: những buổi làm việc kéo dài, những lần sửa đi sửa lại, và quyết định giữ lại cả những kết quả chưa đạt kỳ vọng thay vì che giấu chúng.

Dù đã cố gắng, báo cáo khó tránh khỏi thiếu sót. Nhóm mong nhận được góp ý để hoàn thiện hơn.

---

## TÓM TẮT

Đồ án xây dựng một mạng xã hội khám phá địa điểm tại Đà Nẵng, gồm 358 địa điểm thuộc 6 hạng mục trên 6 quận. Hệ thống gồm 29 bảng dữ liệu, 12 nhóm endpoint và 356 ca kiểm thử tự động, chạy trên một máy chủ với 5 nhân và 3,5 GB bộ nhớ.

Đồ án thiết kế hai thuật toán. Thuật toán tìm kiếm lai ghép EGRF hợp nhất bốn nhánh tín hiệu, trong đó nhánh ngữ nghĩa và nhánh suy luận thuộc tính cho phép hệ thống hiểu ý định ẩn sau truy vấn thay vì chỉ khớp chữ nghĩa; trọng số các nhánh được chọn theo bằng chứng định danh có trong truy vấn. Trên tập nội bộ 344 truy vấn, EGRF đạt độ chính xác tại 5 là 0,820, so với 0,591 của hợp nhất xếp hạng chuẩn. Thuật toán gợi ý DES tính điểm theo trung bình Bayes có điều chỉnh và thêm nhiễu thay đổi theo khung giờ. Trên tập địa điểm đối chứng, DES kết hợp đạt độ triệu hồi tại 10 là 0,044, so với 0,035 của lọc cộng tác. Kiểm định bootstrap cho nDCG@10 cho chênh lệch trung bình 0,0046, khoảng tin cậy 95% [0,0028; 0,0065].

Kiểm thử tải dùng cấu hình giới hạn 2 nhân cho tầng dịch vụ. Thời gian phản hồi phân vị 95 đạt 420 ms ở mức 1.000 người dùng đồng thời và 1.250 ms ở mức 2.000. Hệ thống không có lỗi máy chủ cho tới mức 3.000 người dùng đồng thời.

**Từ khoá:** tìm kiếm lai ghép, tìm kiếm theo ngữ nghĩa, cold-start, tiếng Việt không dấu, PostgreSQL, kiến trúc đa tiến trình.

---

## ABSTRACT

This project builds a social network for place discovery in Da Nang, covering 358 places in 23 categories across 6 urban districts. The system comprises 29 database tables, 12 endpoint groups and 356 automated test cases, running on a single server with 5 CPU cores and 3.5 GB of memory.

The project designs two algorithms. The hybrid search algorithm EGRF fuses four signal branches; its semantic branch and its attribute-inference branch let the system understand the intent behind a query instead of matching surface text alone, while branch weights are selected according to the identifying evidence present in the query. On an internal set of 344 queries, EGRF achieves precision at 5 of 0.820, compared with 0.591 for standard rank fusion. The recommendation algorithm DES scores places by an adjusted Bayesian average and adds noise that varies by time window. On the reference place set, combined DES reaches recall at 10 of 0.044, compared with 0.035 for collaborative filtering. A bootstrap test on nDCG@10 gives a mean difference of 0.0046 with a 95% confidence interval of [0.0028, 0.0065].

Load testing uses a configuration that limits the service tier to 2 cores. The 95th percentile response time reaches 420 ms at 1,000 concurrent users and 1,250 ms at 2,000. The system records no server errors up to 3,000 concurrent users. These results are limited to a corpus of 358 places and an internally constructed query set; the report states both limitations explicitly.

**Keywords:** hybrid search, semantic search, cold-start, Vietnamese without diacritics, PostgreSQL, multi-process architecture.

## MỤC LỤC

| Chương | Nội dung |
|---|---|
| | Lời cảm ơn |
| | Lời cam đoan |
| | Tóm tắt |
| | Abstract |
| | Danh mục hình vẽ |
| | Danh mục bảng biểu |
| | Danh mục từ viết tắt |
| | Thuật ngữ |
| **1** | Giới thiệu đề tài |
| **2** | Cơ sở lý thuyết và công nghệ |
| **3** | Phân tích và thiết kế hệ thống |
| **4** | Cài đặt và thử nghiệm |
| **5** | Kết luận và hướng phát triển |
| | Tài liệu tham khảo |
| | Phụ lục A – Danh mục API endpoint |

## DANH MỤC HÌNH VẼ

| Số hiệu | Tên hình |
|---|---|
| Hình 3.1 | Sơ đồ use case tổng thể |
| Hình 3.2 | Sơ đồ kiến trúc triển khai |
| Hình 3.3 | Sequence diagram luồng tìm kiếm |
| Hình 3.4 | Sequence diagram luồng tác vụ nền |
| Hình 3.5 | Sequence diagram luồng bình chọn nhóm thời gian thực |
| Hình 3.6 | Sequence diagram luồng tải ảnh qua URL có chữ ký |
| Hình 3.7 | State diagram vòng đời một đề xuất trong phòng bình chọn |
| Hình 3.8 | Activity diagram luồng tìm kiếm địa điểm |
| Hình 3.9 | Activity diagram luồng đăng bài và phát hiện địa điểm |
| Hình 3.10 | Sơ đồ lớp các lớp miền nghiệp vụ chính |
| Hình 3.11 | Sơ đồ thực thể liên kết (theo miền, 29 bảng) |
| Hình 3.12 | Sơ đồ điều hướng các màn hình chính |
| Hình 4.1 | Biểu đồ thời gian phản hồi theo mức tải |
| Hình 4.2 | Biểu đồ độ chính xác tìm kiếm trên tập nội bộ |
| Hình 4.3 | Biểu đồ độ triệu hồi gợi ý trên tập địa điểm |
| Hình 4.4 | Màn hình tìm kiếm với truy vấn không dấu |
| Hình 4.5 | Màn hình chi tiết địa điểm |
| Hình 4.6 | Màn hình phòng bình chọn |
| Hình 4.7 | Màn hình soạn bài có gợi ý địa điểm |
| Hình 4.8 | Màn hình bản đồ các địa điểm |
| Hình 4.9 | Màn hình hồ sơ cá nhân |

Số trang cập nhật khi kết xuất theo mẫu của trường.

## DANH MỤC BẢNG BIỂU

| Số hiệu | Tên bảng |
|---|---|
| Bảng 1.1 | So sánh Rendez với các ứng dụng người dùng đang dùng |
| Bảng 1.2 | Phạm vi thực hiện của đồ án |
| Bảng 2.1 | So sánh phương án hàng đợi tác vụ |
| Bảng 2.2 | So sánh phương án tìm kiếm văn bản |
| Bảng 3.1 | Yêu cầu chức năng |
| Bảng 3.2 | Yêu cầu phi chức năng |
| Bảng 3.3 | Đặc tả use case tổng hợp |
| Bảng 3.4 | Đặc tả use case tìm kiếm địa điểm |
| Bảng 3.5 | Đặc tả use case đăng bài |
| Bảng 3.6 | Đặc tả use case bình chọn nhóm |
| Bảng 3.7 | Trọng số gate của thuật toán EGRF |
| Bảng 3.8 | Mô tả các nhóm bảng dữ liệu |
| Bảng 3.9 | Mô tả cấu trúc bảng địa điểm |
| Bảng 3.10 | Thiết kế bảo mật theo lớp tấn công |
| Bảng 4.1 | Môi trường cài đặt và đo lường |
| Bảng 4.2 | Danh mục module đã cài đặt |
| Bảng 4.3 | Xử lý kỹ thuật và kết quả đo |
| Bảng 4.4 | Kết quả kiểm thử chức năng theo nhóm |
| Bảng 4.5 | Test case tiêu biểu |
| Bảng 4.6 | Thời gian phản hồi ở mức tải đơn lẻ |
| Bảng 4.7 | Kết quả kiểm thử tải tăng dần |
| Bảng 4.8 | Độ chính xác tìm kiếm trên tập nội bộ |
| Bảng 4.9 | Độ chính xác tìm kiếm trên tập đối chứng |
| Bảng 4.10 | Độ triệu hồi gợi ý trên tập đối chứng |
| Bảng 5.1 | Đối chiếu mục tiêu và kết quả |
| Bảng A.1 | Danh mục API endpoint |

Số trang cập nhật khi kết xuất theo mẫu của trường.

## DANH MỤC TỪ VIẾT TẮT

| Từ viết tắt | Tiếng Anh | Ý nghĩa |
|---|---|---|
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| CAS | Compare-And-Swap | Cập nhật có kiểm tra giá trị kỳ vọng |
| CF | Collaborative Filtering | Lọc cộng tác |
| DES | Dynamic Evidence Scoring | Thuật toán gợi ý đề xuất trong đồ án |
| EGRF | Evidence-Gated Rank Fusion | Thuật toán tìm kiếm đề xuất trong đồ án |
| ERD | Entity-Relationship Diagram | Sơ đồ thực thể liên kết |
| FR | Functional Requirement | Yêu cầu chức năng |
| NFR | Non-Functional Requirement | Yêu cầu phi chức năng |
| p50, p95 | 50th, 95th percentile | Phân vị 50, phân vị 95 |
| RRF | Reciprocal Rank Fusion | Hợp nhất xếp hạng nghịch đảo |
| SSE | Server-Sent Events | Sự kiện do máy chủ đẩy xuống |
| TLS | Transport Layer Security | Bảo mật tầng truyền tải |

## THUẬT NGỮ

| Tiếng Anh | Cách dùng trong báo cáo | Ý nghĩa |
|---|---|---|
| cold-start | cold-start | Gợi ý khi chưa có dữ liệu tương tác |
| container | container | Đơn vị đóng gói cô lập tài nguyên |
| endpoint | endpoint | Điểm truy cập API, định danh bởi HTTP method và đường dẫn |
| framework | framework | Bộ khung định tuyến và thư viện cho ứng dụng web |
| idempotency | khóa lũy đẳng | Thao tác lặp nhiều lần không đổi kết quả |
| job queue | hàng đợi tác vụ | Cơ chế lưu và xử lý tác vụ nền |
| object storage | object storage | Dịch vụ lưu trữ tệp qua HTTP, tương thích S3 |
| reverse proxy | reverse proxy | Máy chủ trung gian nhận yêu cầu từ internet, chuyển vào nội bộ |
| runtime | runtime | Nền tảng chạy mã phía máy chủ |
| smoothing constant | hằng số làm mịn | Hằng số $k$ trong công thức RRF, tránh chia cho 0 |

---

# CHƯƠNG 1. GIỚI THIỆU ĐỀ TÀI

## 1.1. Đặt vấn đề

Rendez hướng đến giới trẻ và các cặp đôi ở Đà Nẵng, những người thường xuyên đi chơi và chọn địa điểm theo từng cuộc hẹn. Tên ứng dụng lấy từ chữ *rendezvous* trong tiếng Pháp, nghĩa là cuộc hẹn đã hứa. Với nhóm người dùng này, mỗi lần ra ngoài là một lần chọn bối cảnh cho cuộc hẹn: quán yên tĩnh để trò chuyện, chỗ ngoài trời view biển, hay một địa điểm mới để đổi không khí.

Để chọn địa điểm, người dùng hiện dùng ba loại ứng dụng: bản đồ, nền tảng đánh giá ẩm thực và mạng xã hội video. Mỗi loại mạnh ở một lĩnh vực riêng, nhưng không loại nào chuyên biệt cho việc gợi ý địa điểm đi chơi, đi ăn. Bảng 1.1 so sánh bốn ứng dụng theo năm tiêu chí quan trọng nhất với người đi hẹn.

**Bảng 1.1. So sánh Rendez với các ứng dụng người dùng đang dùng**

| Tiêu chí | Google Maps | Foody | TikTok | Rendez |
|---|---|---|---|---|
| Định hướng chính | Bản đồ, chỉ đường | Đồ ăn, đánh giá quán | Video ngắn giải trí | Gợi ý địa điểm đi chơi, đi ăn |
| Tìm kiếm theo ý định (ngữ nghĩa) | Yếu, chủ yếu khớp từ khoá | Yếu, chủ yếu khớp từ khoá | Không có | Có, nhánh ngữ nghĩa và nhánh suy luận thuộc tính |
| Gợi ý cá nhân hoá | Gần như không | Yếu | Có, nhưng không gắn với địa điểm cụ thể | Có, xử lý được cold-start |
| Xem khoảng cách, vị trí tức thì | Có, là thế mạnh của bản đồ | Phải tra thêm bản đồ | Phải tra thêm bản đồ | Có bản đồ tích hợp |
| Thông tin cộng đồng gắn địa điểm | Yếu | Có đánh giá, ít cập nhật | Phong phú nhưng rời rạc, khó tra cứu | Có, bài đăng gắn với địa điểm |

Ba ứng dụng trên mỗi cái mạnh ở một lĩnh vực nhưng không chuyên biệt cho gợi ý địa điểm. Google Maps chuyên về bản đồ và chỉ đường, không phải gợi ý địa điểm. Foody chuyên về đồ ăn. TikTok chuyên về video ngắn giải trí, có nhắc đến địa điểm đi ăn, đi chơi nhưng đó không phải chức năng chính. Không ứng dụng nào đáp ứng cùng lúc ba nhu cầu: hiểu ý định tìm kiếm, gợi ý được địa điểm mới chưa có đánh giá, và gắn thông tin cộng đồng với từng địa điểm. Rendez được xây dựng chuyên biệt cho ba nhu cầu này, trên tập dữ liệu thật của Đà Nẵng gồm 358 địa điểm thuộc 6 hạng mục trên 6 quận nội thành, thu thập từ OpenStreetMap [20].

## 1.2. Mục tiêu

Từ ba nhu cầu trên, đồ án đặt năm mục tiêu. Mỗi mục tiêu gắn với một phép đo cụ thể để kết quả kiểm chứng được:

1. Xây dựng mạng xã hội địa điểm có đủ nghiệp vụ: tài khoản, bài đăng, đánh giá, bộ sưu tập, thông báo, phòng bình chọn nhóm.
2. Xây dựng thuật toán tìm kiếm hiểu ý định theo ngữ nghĩa, đồng thời chịu được tiếng Việt không dấu và lỗi gõ; đo bằng độ chính xác tại 5 trên tập truy vấn nội bộ.
3. Xây dựng thuật toán gợi ý hoạt động khi chưa có lịch sử tương tác; đo bằng độ triệu hồi tại 10 trên tập đối chứng.
4. Đo thời gian phản hồi của hệ thống dưới tải tăng dần trên cấu hình giới hạn tài nguyên.
5. Xây dựng bộ kiểm thử tự động phủ toàn bộ yêu cầu chức năng.

Mục tiêu số hai là trọng tâm kỹ thuật. Năng lực hiểu ý định được hiện thực bằng hai cơ chế: một nhánh tìm kiếm ngữ nghĩa dựa trên biểu diễn vector của truy vấn, và một nhánh suy luận thuộc tính trích xuất ý định từ truy vấn tự do thành các nhãn có cấu trúc. Phần xử lý không dấu và lỗi gõ là khả năng kèm theo, giúp truy vấn của người dùng trẻ vốn thường gõ vắn tắt và bỏ dấu vẫn được hiểu đúng trước khi bước vào giai đoạn suy luận ngữ nghĩa.

## 1.3. Đối tượng sử dụng

Hệ thống phục vụ bốn nhóm người dùng, phân biệt theo mức tham gia:

- **Khách vãng lai.** Người chưa có tài khoản, vào để tìm địa điểm, xem bản đồ và xem chi tiết địa điểm. Nhóm này chiếm phần lớn lưu lượng và cần có kết quả ngay mà không phải đăng ký.
- **Thành viên.** Người đã có tài khoản, ngoài các thao tác của khách còn đăng bài, viết đánh giá, tạo bộ sưu tập và nhận thông báo. Đây là nhóm tạo ra dữ liệu tương tác nuôi thuật toán gợi ý.
- **Khách trong phòng bình chọn.** Người được mời vào một phòng để cùng chọn địa điểm cho một cuộc hẹn nhóm, không bắt buộc có tài khoản. Nhóm này gắn trực tiếp với tình huống các cặp đôi và nhóm bạn rủ nhau đi chơi.
- **Hệ thống.** Thành phần tự động chạy các tác vụ nền: phát hiện địa điểm trong bài đăng, sinh gợi ý hằng ngày, cập nhật bộ đệm sở thích và dọn dữ liệu cũ.

Trong bốn nhóm trên, giới trẻ và các cặp đôi là đối tượng chính mà Rendez hướng đến; ba nhóm còn lại là cách hệ thống mở rộng phạm vi phục vụ xoay quanh nhóm chính.

## 1.4. Phạm vi

Bảng 1.2 phân định nội dung thực hiện và không thực hiện của đồ án.

**Bảng 1.2. Phạm vi thực hiện của đồ án**

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Dữ liệu 358 địa điểm tại 6 quận nội thành Đà Nẵng [20] | Dữ liệu ngoài địa bàn Đà Nẵng |
| Giao diện web responsive | Ứng dụng di động native |
| Tài khoản email và mật khẩu | Đăng nhập qua mạng xã hội bên thứ ba |
| Bài đăng, đánh giá, bình luận, bộ sưu tập | Nhắn tin riêng tư, gọi video |
| Phòng bình chọn nhóm thời gian thực | Đặt chỗ, thanh toán trực tuyến |
| Tìm kiếm lai ghép và gợi ý cá nhân hoá | Quảng cáo và khuyến mãi |
| Triển khai trên một máy chủ | Điều phối đa nút, cân bằng tải nhiều máy |

## 1.5. Phương pháp thực hiện

Đồ án thực hiện theo bốn bước. Bước một khảo sát chức năng của các nền tảng khám phá địa điểm hiện có. Bước hai thiết kế kiến trúc, lược đồ dữ liệu và hai thuật toán. Bước ba cài đặt hệ thống và bộ kiểm thử tự động. Bước bốn đo hiệu năng và đánh giá thuật toán trên tập dữ liệu có đối chứng.

Công cụ chính gồm bốn nhóm. Nhóm thực thi dùng Bun và Hono. Nhóm lưu trữ dùng PostgreSQL 17 với các phần mở rộng tìm kiếm. Nhóm đóng gói dùng Docker Compose. Nhóm đo tải dùng k6 [11].

## 1.6. Bố cục báo cáo

Báo cáo gồm năm chương. Chương 1 trình bày bài toán, mục tiêu và phạm vi. Chương 2 trình bày cơ sở lý thuyết và căn cứ lựa chọn công nghệ. Chương 3 trình bày phân tích và thiết kế: yêu cầu, use case, kiến trúc, luồng tương tác, dữ liệu và giao diện. Chương 4 trình bày cài đặt, kiểm thử chức năng và đánh giá hiệu năng, độ chính xác. Chương 5 kết luận, nêu hạn chế và hướng phát triển.

---

# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

## 2.1. Công nghệ nền tảng

**Bun.** Bun là runtime JavaScript và TypeScript phía máy chủ. Bun hỗ trợ nhiều tiến trình cùng lắng nghe một cổng qua cơ chế chia sẻ cổng của hệ điều hành. Đồ án dùng cơ chế này để tận dụng nhiều nhân bộ xử lý trong một container [7].

**Hono.** Hono là framework định tuyến HTTP chạy trên chuẩn Web. Hono tích hợp mô tả OpenAPI và middleware xử lý. Đồ án dùng Hono cho toàn bộ 12 nhóm endpoint [1].

**PostgreSQL 17.** PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ, hỗ trợ giao dịch, chỉ mục GIN và phần mở rộng. Đồ án dùng PostgreSQL làm nơi lưu trữ duy nhất cho dữ liệu nghiệp vụ, hàng đợi tác vụ và kênh thông báo nội bộ [4].

**`unaccent`.** Phần mở rộng `unaccent` chuyển chuỗi có dấu về dạng không dấu. Đồ án dùng `unaccent` để đưa truy vấn và tên địa điểm về cùng một dạng trước khi so khớp [4].

**`pg_trgm`.** Phần mở rộng `pg_trgm` tách chuỗi thành các cụm ba ký tự liên tiếp và đo độ tương đồng giữa các cụm. Chỉ mục GIN trên `pg_trgm` cho phép tìm chuỗi gần đúng. Đồ án dùng `pg_trgm` để chịu lỗi gõ trong truy vấn [4].

**`pgvector`.** Phần mở rộng `pgvector` thêm kiểu dữ liệu vector và toán tử khoảng cách. Đồ án lưu vector 384 chiều cho mỗi địa điểm và truy vấn lân cận theo khoảng cách cosine [4].

**pg-boss.** pg-boss lưu tác vụ bất đồng bộ trong bảng của PostgreSQL. Mỗi tác vụ có trạng thái chờ, đang xử lý hoặc hoàn tất, kèm thời hạn xử lý. Đồ án dùng pg-boss cho bốn loại tác vụ nền [5].

**Prisma.** Prisma định nghĩa lược đồ dữ liệu, sinh migration có phiên bản và sinh kiểu dữ liệu cho mã ứng dụng. Đồ án dùng Prisma cho 21 migration và toàn bộ truy vấn nghiệp vụ [2].

**Better Auth.** Better Auth quản lý tài khoản, mật khẩu và phiên theo mô hình lưu phiên phía máy chủ. Đồ án dùng Better Auth cho đăng ký, đăng nhập, khôi phục mật khẩu và xác thực email [3].

**Cloudflare R2.** R2 là object storage tương thích giao diện S3. R2 hỗ trợ URL có chữ ký để máy khách tải tệp trực tiếp. Đồ án dùng R2 để lưu ảnh, không truyền tệp qua tầng dịch vụ [10].

**Caddy.** Caddy là reverse proxy tự cấp và gia hạn chứng chỉ TLS, chuyển tiếp yêu cầu và nén phản hồi. Đồ án dùng Caddy làm máy chủ biên duy nhất [8].

**React.** React là thư viện xây dựng giao diện theo thành phần. Đồ án dùng React với TypeScript và Vite, đóng gói tĩnh để Caddy phục vụ [9].

## 2.2. Lựa chọn công nghệ

Hai quyết định công nghệ dưới đây có nhiều phương án thay thế. Bảng 2.1 và Bảng 2.2 so sánh các phương án và nêu kết luận.

**Bảng 2.1. So sánh phương án hàng đợi tác vụ**

| Tiêu chí | pg-boss (PostgreSQL) | Redis + RabbitMQ |
|---|---|---|
| Số thành phần phải vận hành | 1 | 3 |
| Đồng bộ dữ liệu giữa nghiệp vụ và hàng đợi | Cùng một cơ sở dữ liệu | Phải tự đồng bộ |
| Thông lượng tác vụ | Trung bình | Cao |
| Tách tải khỏi cơ sở dữ liệu | Không | Có |
| Kết luận | Chọn cho quy mô hiện tại | Không chọn |

**Bảng 2.2. So sánh phương án tìm kiếm văn bản**

| Tiêu chí | PostgreSQL (`unaccent`, `pg_trgm`, `pgvector`) | Elasticsearch |
|---|---|---|
| Số thành phần phải vận hành | 0 thêm | 1 thêm |
| Xử lý tiếng Việt không dấu | Có | Có |
| Xếp hạng theo ngữ nghĩa | Có, qua `pgvector` | Có |
| Chất lượng xếp hạng với truy vấn dài | Trung bình | Cao |
| Chi phí phù hợp corpus 358 bản ghi | Phù hợp | Không tương xứng |
| Kết luận | Chọn cho corpus hiện tại | Không chọn |

## 2.3. Cơ sở lý thuyết

Mục này trình bày những nền tảng lý thuyết mà thiết kế và hiện thực Rendez dựa vào, chia thành bốn nhóm: tìm kiếm thông tin, hệ thống gợi ý và xử lý cold-start, thiết kế giao diện web, và thiết kế backend.

### 2.3.1. Cơ sở lý thuyết về hệ thống tìm kiếm thông tin

Người dùng tìm địa điểm theo hai cách khác nhau: gõ đúng tên quán, hoặc mô tả điều mình muốn mà chưa biết tên. Một hệ tìm kiếm tốt phải làm được cả hai, nên cần kết hợp tìm theo từ khoá và tìm theo ngữ nghĩa.

**1. Xếp hạng theo từ khoá với BM25**

BM25 chấm điểm mức liên quan giữa truy vấn $Q$ và một địa điểm $D$ dựa trên ba yếu tố: từ khoá xuất hiện bao nhiêu lần trong $D$, từ đó hiếm hay phổ biến trong toàn bộ dữ liệu, và $D$ dài hay ngắn so với mặt bằng chung [13]:

$$\text{Score}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

Trong đó $f(q_i, D)$ là số lần từ $q_i$ xuất hiện trong $D$; $|D|$ và $\text{avgdl}$ là độ dài của $D$ và độ dài trung bình của cả kho dữ liệu; $k_1$ và $b$ là hai tham số điều chỉnh, thường lấy $k_1 \in [1.2, 2.0]$ và $b = 0.75$.

BM25 mạnh nhất khi người dùng gõ đúng tên riêng hoặc địa danh, ví dụ "bún chả cá Bà Mua". Ngược lại, nó gần như không hiểu được những câu mô tả như "quán yên tĩnh để nói chuyện".

**2. Tìm theo ngữ nghĩa bằng vector và độ tương đồng cosine**

Để hiểu được những câu mô tả như vậy, mỗi địa điểm và mỗi truy vấn được chuyển thành một vector 384 chiều. Hai vector càng gần nhau về hướng thì nội dung càng giống nhau, đo bằng độ tương đồng cosine:

$$\text{Sim}_{\cos}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} = \frac{\sum_{i=1}^{d} u_i v_i}{\sqrt{\sum_{i=1}^{d} u_i^2} \sqrt{\sum_{i=1}^{d} v_i^2}}$$

Cách này giúp tìm ra địa điểm phù hợp dù người dùng dùng từ đồng nghĩa, mô tả cảm xúc hay bối cảnh, chẳng hạn "chỗ lãng mạn ngắm hoàng hôn".

**3. Gộp kết quả nhiều nhánh bằng RRF**

Bốn nhánh tìm kiếm trả về bốn danh sách, mỗi danh sách chấm điểm theo một thang khác nhau nên không cộng trực tiếp được. RRF bỏ qua điểm số, chỉ dùng thứ hạng để gộp [12]:

$$S(d) = \sum_{r \in R} \frac{w_r}{k + \mathrm{rank}_r(d)}$$

Ở đây $R$ là tập bốn nhánh, $\mathrm{rank}_r(d)$ là vị trí của địa điểm $d$ trong danh sách của nhánh $r$, $w_r$ là trọng số của nhánh, và $k$ là hằng số làm mịn để một địa điểm đứng đầu ở một nhánh không lấn át toàn bộ kết quả.

### 2.3.2. Cơ sở lý thuyết về hệ thống gợi ý và bài toán cold-start

Phần gợi ý giúp người dùng tìm được địa điểm phù hợp mà không cần gõ tìm kiếm. Khó khăn nằm ở chỗ dữ liệu tương tác ban đầu rất ít, nên hệ thống phải vẫn cho ra kết quả hợp lý khi chưa có gì để học.

**1. Lọc cộng tác dựa trên vật phẩm**

Ý tưởng khá trực quan: nếu người dùng từng thích quán A, mà quán B có tập người thích gần giống A, thì nhiều khả năng người đó cũng thích B [14]. Độ giống nhau giữa hai địa điểm $i$ và $j$ tính trên vector đánh giá của những người đã tương tác với cả hai:

$$\text{sim}(i, j) = \frac{\sum_{u \in U} (r_{u,i} - \bar{r}_u)(r_{u,j} - \bar{r}_u)}{\sqrt{\sum_{u \in U} (r_{u,i} - \bar{r}_u)^2} \sqrt{\sum_{u \in U} (r_{u,j} - \bar{r}_u)^2}}$$

Cách tính theo vật phẩm ổn định hơn tính theo người dùng, vì danh sách địa điểm thay đổi chậm hơn nhiều so với danh sách người dùng. Nhờ vậy có thể tính trước định kỳ rồi lưu vào bộ đệm, không phải tính lại mỗi lần có người mở ứng dụng.

**2. Điểm trung bình Bayes có điều chỉnh cho địa điểm mới**

Một địa điểm vừa đưa lên hệ thống thường chưa có đánh giá, hoặc chỉ có vài lượt. Đây là bài toán cold-start phía vật phẩm (item cold-start) [19]. Nếu lấy trung bình cộng đơn thuần, một quán mới nhận hai lượt 5 sao sẽ vượt mặt quán lâu năm có 4,7 sao từ 500 lượt, rõ ràng không công bằng. Cách xử lý là kéo điểm của địa điểm ít đánh giá về mức trung bình chung $\mu_0$ của toàn hệ thống:

$$\hat{R}(i) = \frac{v_i \cdot \bar{r}_i + m_i \cdot \mu_0}{v_i + m_i}$$

Trong đó $v_i$ là số lượt đánh giá thật, $\bar{r}_i$ là điểm trung bình hiện có, và $m_i$ là "độ tin cậy" gán cho địa điểm. Khi $v_i$ còn nhỏ, điểm $\hat{R}(i)$ nằm gần $\mu_0$; khi $v_i$ lớn dần, điểm tiến về $\bar{r}_i$. Điểm đáng chú ý là $m_i$ không cố định mà tăng theo độ đầy đủ của hồ sơ địa điểm: địa điểm mới nhưng đã có ảnh, giờ mở cửa, số điện thoại và mô tả chi tiết sẽ được tin tưởng hơn địa điểm mới chỉ có mỗi cái tên.

### 2.3.3. Cơ sở lý thuyết về thiết kế ứng dụng web

Giao diện Rendez phải vừa dễ dùng với người lần đầu mở, vừa đủ nhanh khi người dùng thao tác liên tục trên bản đồ và bảng tin. Hai nền tảng dưới đây định hình cách làm đó.

**1. Giao diện dựng từ các thành phần**

Giao diện được chia thành các thành phần độc lập, mỗi thành phần tự giữ trạng thái của mình và ghép lại thành cây giao diện [9]. Dữ liệu chảy một chiều từ thành phần cha xuống con, nên khi trạng thái đổi thì giao diện tự cập nhật theo:

$$\text{UI} = f(\text{State})$$

Cách tổ chức này giúp một lỗi ở màn hình chi tiết địa điểm không lan sang bản đồ hay bảng tin, đồng thời cho phép cập nhật cục bộ những vùng thay đổi thay vì dựng lại cả trang.

**2. Nguyên tắc dễ dùng và khả năng tiếp cận**

Phần giao diện bám theo mười nguyên tắc dễ dùng của Nielsen [30] và hướng dẫn tiếp cận nội dung WCAG 2.1 [29]. Ba điểm được chú trọng nhất:

- **Cho người dùng biết hệ thống đang làm gì.** Tìm kiếm, lọc hay bình chọn đều phản hồi ngay, không để người dùng đoán.
- **Giữ mọi thứ nhất quán.** Danh sách địa điểm và các ghim trên bản đồ luôn phản ánh cùng một tập kết quả.
- **Tôn trọng giới hạn cảm nhận thời gian.** Dưới 100 ms thì người dùng thấy như tức thời, dưới 1 giây vẫn giữ được mạch suy nghĩ, còn quá 10 giây thì họ bắt đầu mất tập trung [23]. Các ngưỡng này là mốc để đặt chỉ tiêu hiệu năng ở Chương 3.

### 2.3.4. Cơ sở lý thuyết về thiết kế hệ thống backend

Backend của Rendez phải chạy gọn trên một máy chủ tài nguyên giới hạn, nên mọi quyết định thiết kế đều xoay quanh ba chữ: đơn giản để vận hành, nhất quán về dữ liệu, và tiết kiệm tài nguyên [26].

**1. Kiến trúc RESTful và máy chủ không nhớ trạng thái**

Dịch vụ backend được tổ chức theo mô hình REST của Fielding [24], [25]: mỗi tài nguyên có một địa chỉ URI rõ ràng, thao tác bằng các phương thức HTTP chuẩn (GET, POST, PATCH, DELETE), và máy chủ không nhớ trạng thái giữa các yêu cầu. Mỗi yêu cầu đều mang theo đủ thông tin để xử lý, nên thêm tiến trình xử lý hay thêm máy chủ đều đơn giản: phiên đăng nhập nằm trong cookie có chữ ký ở phía máy khách, không cần lưu tập trung ở đâu cả.

**2. Tính lũy đẳng và xử lý khi nhiều người cùng thao tác**

Mạng di động hay chập chờn, nên một yêu cầu tạo bài hoặc bình chọn có thể bị gửi đi hai lần mà người dùng không hề biết. Tính lũy đẳng (idempotency) bảo đảm thao tác đó chạy một lần hay nhiều lần thì kết quả vẫn như nhau [26]:

$$f(f(x)) = f(x)$$

Hệ thống lưu một khoá lũy đẳng kèm mỗi yêu cầu; thấy khoá đã xử lý thì trả lại kết quả cũ thay vì tạo bản ghi thứ hai.

Riêng phòng bình chọn nhóm, vấn đề thường gặp là hai người cùng bấm áp một đề xuất vào bộ lọc phòng. Thay vì khoá bản ghi và cho người kia chờ (khoá bi quan, dễ làm nghẽn hàng đợi cơ sở dữ liệu), hệ thống dùng cách đổi trạng thái có điều kiện: chỉ nhận khi đề xuất còn đang mở, ai đến sau sẽ nhận lỗi xung đột. Một câu lệnh cập nhật là đủ:

$$\text{UPDATE table SET status = 'applied' WHERE id = :id AND status = 'open'}$$

Cách này gọi là kiểm soát tương tranh lạc quan (optimistic concurrency control), hay nói gọn là "cập nhật nếu còn nguyên trạng thái cũ". Hai người cùng bấm chỉ một người thành công, không xảy ra tình trạng hai người cùng ghi đè dữ liệu của nhau.

---

# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 3.1. Yêu cầu chức năng

Bảng 3.1 liệt kê 20 yêu cầu chức năng của hệ thống.

**Bảng 3.1. Yêu cầu chức năng**

| Mã | Yêu cầu | Tác nhân | Ưu tiên |
|---|---|---|---|
| FR-01 | Đăng ký tài khoản bằng email và mật khẩu, xác thực email | Khách | Cao |
| FR-02 | Đăng nhập, đăng xuất, duy trì phiên | Khách, Thành viên | Cao |
| FR-03 | Khôi phục mật khẩu qua email | Khách | Cao |
| FR-04 | Xem và cập nhật hồ sơ, ảnh đại diện, ảnh bìa | Thành viên | Trung bình |
| FR-05 | Tìm kiếm địa điểm theo từ khoá, chấp nhận không dấu và lỗi gõ | Khách, Thành viên | Cao |
| FR-06 | Lọc địa điểm theo quận, hạng mục, khoảng giá, trạng thái mở cửa | Khách, Thành viên | Cao |
| FR-07 | Xem địa điểm trên bản đồ và danh sách đồng bộ | Khách, Thành viên | Trung bình |
| FR-08 | Xem chi tiết địa điểm: ảnh, giờ mở cửa, số điện thoại, đánh giá | Khách, Thành viên | Cao |
| FR-09 | Đăng bài kèm nhiều ảnh, gắn thẻ địa điểm | Thành viên | Cao |
| FR-10 | Tự phát hiện địa điểm trong bài và gắn thẻ | Hệ thống | Trung bình |
| FR-11 | Thích, lưu, bình luận bài viết; thích bình luận | Thành viên | Cao |
| FR-12 | Viết đánh giá địa điểm kèm điểm số và ảnh | Thành viên | Cao |
| FR-13 | Báo cáo địa điểm hoặc nội dung vi phạm | Thành viên | Trung bình |
| FR-14 | Tạo bộ sưu tập và sắp xếp địa điểm trong bộ sưu tập | Thành viên | Trung bình |
| FR-15 | Nhận thông báo khi có tương tác với nội dung của mình | Thành viên | Trung bình |
| FR-16 | Tạo phòng bình chọn nhóm, đề xuất địa điểm | Thành viên | Cao |
| FR-17 | Kết quả bình chọn cập nhật tức thời cho mọi thành viên | Khách, Thành viên | Cao |
| FR-18 | Gợi ý địa điểm cá nhân hoá theo lịch sử tương tác | Thành viên | Cao |
| FR-19 | Gợi ý địa điểm theo nội dung đang soạn | Thành viên | Trung bình |
| FR-20 | Chia sẻ liên kết địa điểm hoặc bài viết có thẻ xem trước | Khách, Thành viên | Thấp |

## 3.2. Yêu cầu phi chức năng

Bảng 3.2 liệt kê các yêu cầu phi chức năng với chỉ tiêu đo được; ngưỡng thời gian phản hồi lấy theo giới hạn nhận thức người dùng [23].

**Bảng 3.2. Yêu cầu phi chức năng**

| Mã | Yêu cầu | Chỉ tiêu | Cách đo |
|---|---|---|---|
| NFR-01 | Thời gian phản hồi tìm kiếm | p95 ≤ 300 ms với corpus 358 địa điểm | Đo 20 lần gọi tuần tự |
| NFR-02 | Thời gian phản hồi danh sách | p95 ≤ 200 ms | Đo 20 lần gọi tuần tự |
| NFR-03 | Khả dụng dưới tải | 0% lỗi máy chủ ở 1.000 người dùng đồng thời | Kiểm thử tải tăng dần |
| NFR-04 | Độ trễ cập nhật bình chọn nhóm | ≤ 2 giây | Quan sát trên một tiến trình |
| NFR-05 | Xác thực cho thao tác ghi | 100% endpoint ghi | Kiểm tra cấu trúc route |
| NFR-06 | Không phát sinh truy vấn N+1 ở endpoint danh sách | Số truy vấn không tăng theo số bản ghi | Đếm truy vấn ở ba kích thước |
| NFR-07 | Chạy trên máy chủ 2 nhân | Toàn bộ thành phần trong 5 GB bộ nhớ | Thống kê container |
| NFR-08 | Chống tạo trùng khi mạng chập chờn | Không tạo bản ghi thứ hai cho cùng yêu cầu | Kiểm thử với khoá lũy đẳng |
| NFR-09 | Phủ kiểm thử tự động | Mỗi nhóm FR có ít nhất một ca kiểm thử | Đối chiếu ma trận |
| NFR-10 | Không lưu bí mật trong mã nguồn | Không có khoá bí mật trong repository | Rà soát kho mã |

## 3.3. Use case

Hệ thống có bốn tác nhân: Khách, Thành viên, Khách trong phòng và Hệ thống. Hình 3.1 mô tả các use case chính của bốn tác nhân.

```mermaid
flowchart LR
    Guest(("Khách"))
    Member(("Thành viên"))
    RoomGuest(("Khách trong phòng"))
    Sys(("Hệ thống"))

    UC01["Đăng ký tài khoản"]
    UC02["Đăng nhập"]
    UC03["Khôi phục mật khẩu"]
    UC04["Cập nhật hồ sơ"]
    UC05["Tìm kiếm địa điểm"]
    UC06["Lọc và xem bản đồ"]
    UC07["Xem chi tiết địa điểm"]
    UC08["Đăng bài kèm ảnh"]
    UC09["Tương tác bài viết"]
    UC10["Viết đánh giá"]
    UC11["Tạo bộ sưu tập"]
    UC12["Nhận thông báo"]
    UC13["Tạo phòng bình chọn"]
    UC14["Bình chọn trong phòng"]
    UC15["Xem gợi ý hôm nay"]
    UC16["Chia sẻ liên kết"]
    UC17["Phát hiện địa điểm trong bài"]

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
    RoomGuest --> UC14
    Sys --> UC17
```

**Hình 3.1. Sơ đồ use case tổng thể**

Bảng 3.3 đặc tả gọn mười bảy use case: tác nhân, tiền điều kiện, luồng chính, hậu điều kiện. Bảng 3.4 đến Bảng 3.6 đặc tả chi tiết ba use case trọng yếu.

**Bảng 3.3. Đặc tả use case tổng hợp**

| Mã | Tên | Tác nhân | Tiền điều kiện | Luồng chính | Hậu điều kiện | FR |
|---|---|---|---|---|---|---|
| UC-01 | Đăng ký tài khoản | Khách | Email chưa dùng | Nhập email, mật khẩu → kiểm tra trùng → tạo tài khoản → gửi email xác thực | Tài khoản ở trạng thái chờ xác thực | FR-01 |
| UC-02 | Đăng nhập | Khách, Thành viên | Tài khoản tồn tại | Nhập thông tin → xác thực mật khẩu → tạo phiên → đặt cookie | Phiên hợp lệ trong 7 ngày | FR-02 |
| UC-03 | Khôi phục mật khẩu | Khách | Email đã đăng ký | Yêu cầu đặt lại → gửi liên kết có hạn → đặt mật khẩu mới | Mật khẩu cũ vô hiệu | FR-03 |
| UC-04 | Cập nhật hồ sơ | Thành viên | Đã đăng nhập | Sửa tên, tiểu sử, ảnh → tải ảnh qua URL có chữ ký → lưu | Hồ sơ cập nhật, ảnh hiển thị | FR-04 |
| UC-05 | Tìm kiếm địa điểm | Khách, Thành viên | Không có | Nhập từ khoá → chuẩn hoá không dấu → chạy bốn nhánh → hợp nhất xếp hạng | Danh sách sắp theo điểm tổng hợp | FR-05 |
| UC-06 | Lọc và xem bản đồ | Khách, Thành viên | Không có | Chọn quận, hạng mục, khoảng giá → tải danh sách và khung nhìn bản đồ | Danh sách và bản đồ đồng bộ | FR-06, FR-07 |
| UC-07 | Xem chi tiết địa điểm | Khách, Thành viên | Địa điểm tồn tại | Mở địa điểm → đọc ảnh, giờ mở cửa, liên hệ, đánh giá | Trang chi tiết hiển thị đủ trường | FR-08 |
| UC-08 | Đăng bài kèm ảnh | Thành viên | Phiên hợp lệ, chưa vượt giới hạn | Soạn nội dung → chọn địa điểm → tải ảnh → gửi kèm khoá lũy đẳng | Bài xuất hiện trong bảng tin | FR-09 |
| UC-09 | Tương tác bài viết | Thành viên | Bài tồn tại | Thích, lưu hoặc bình luận → cập nhật bộ đếm → tạo thông báo | Bộ đếm và thông báo cập nhật | FR-11 |
| UC-10 | Viết đánh giá | Thành viên | Chưa đánh giá địa điểm này | Chọn điểm 1–5 → nhập nội dung → gửi kèm ảnh | Đánh giá hiển thị, điểm Bayes tính lại | FR-12 |
| UC-11 | Tạo bộ sưu tập | Thành viên | Đã đăng nhập | Đặt tên → thêm địa điểm → sắp thứ tự | Bộ sưu tập lưu và chia sẻ được | FR-14 |
| UC-12 | Nhận thông báo | Thành viên | Có sự kiện tác động | Hệ thống tạo thông báo → máy khách tải danh sách → đánh dấu đã đọc | Thông báo ở trạng thái đã đọc | FR-15 |
| UC-13 | Tạo phòng bình chọn | Thành viên | Đã đăng nhập | Đặt tên phòng → hệ thống sinh mã 6 ký tự → chia sẻ mã | Phòng mở, chủ phòng có quyền chốt | FR-16 |
| UC-14 | Bình chọn trong phòng | Khách trong phòng, Thành viên | Biết mã phòng, phòng đang mở | Nhập mã → tham gia → đề xuất hoặc bỏ phiếu → nhận sự kiện | Số phiếu cập nhật tức thời | FR-17 |
| UC-15 | Xem gợi ý hôm nay | Thành viên | Có dữ liệu địa điểm | Hệ thống tính điểm DES → thêm nhiễu khung giờ → trả danh sách | Danh sách gợi ý theo ngữ cảnh | FR-18, FR-19 |
| UC-16 | Chia sẻ liên kết | Khách, Thành viên | Đối tượng công khai | Sao chép liên kết → máy chủ sinh thẻ Open Graph | Thẻ xem trước hiển thị khi chia sẻ | FR-20 |
| UC-17 | Phát hiện địa điểm trong bài | Hệ thống | Bài mới được tạo | Tác vụ nền đọc nội dung → đối sánh tên địa điểm → gắn thẻ | Bài được gắn thẻ nếu tìm thấy | FR-10 |

**Bảng 3.4. Đặc tả use case tìm kiếm địa điểm**

| Trường | Nội dung |
|---|---|
| Mã | UC-05 |
| Tác nhân | Khách, Thành viên |
| Tiền điều kiện | Không có |
| Luồng chính | (1) Người dùng nhập từ khoá. (2) Hệ thống chuẩn hoá truy vấn về dạng không dấu. (3) Hệ thống chạy bốn nhánh tín hiệu. (4) Hệ thống chọn trọng số theo bằng chứng định danh. (5) Hệ thống hợp nhất xếp hạng. (6) Hệ thống trả về danh sách địa điểm. |
| Luồng thay thế | (2a) Truy vấn rỗng: trả về danh sách theo bộ lọc. (3a) Nhánh ngữ nghĩa lỗi: bỏ nhánh này, dùng ba nhánh còn lại. (6a) Không có kết quả: trả danh sách rỗng kèm gợi ý gần đúng. |
| Hậu điều kiện | Danh sách địa điểm được sắp theo điểm tổng hợp. |

**Bảng 3.5. Đặc tả use case đăng bài**

| Trường | Nội dung |
|---|---|
| Mã | UC-08 |
| Tác nhân | Thành viên |
| Tiền điều kiện | Người dùng có phiên hợp lệ, chưa vượt giới hạn tần suất đăng bài |
| Luồng chính | (1) Người dùng soạn nội dung. (2) Hệ thống gợi ý địa điểm theo nội dung. (3) Người dùng chọn địa điểm và tải ảnh lên kho lưu trữ. (4) Người dùng bấm đăng. (5) Hệ thống kiểm tra khoá lũy đẳng. (6) Hệ thống ghi bài đăng. (7) Hệ thống đưa tác vụ phát hiện địa điểm vào hàng đợi. (8) Hệ thống trả về bài đăng. |
| Luồng thay thế | (3a) Không có ảnh: bỏ qua bước tải ảnh. (5a) Khoá đã hoàn tất: trả kết quả cũ. (5b) Khoá đang xử lý: trả lỗi xung đột. (7a) Đưa tác vụ thất bại: ghi log, tác vụ quét định kỳ xử lý sau. |
| Hậu điều kiện | Bài đăng xuất hiện trong bảng tin. Tác vụ nền gắn thẻ địa điểm nếu tìm thấy. |

**Bảng 3.6. Đặc tả use case bình chọn nhóm**

| Trường | Nội dung |
|---|---|
| Mã | UC-14 |
| Tác nhân | Khách trong phòng, Thành viên |
| Tiền điều kiện | Phòng tồn tại, đang hoạt động, người tham gia biết mã phòng |
| Luồng chính | (1) Người tham gia nhập mã phòng. (2) Hệ thống kiểm tra phòng và thêm người tham gia. (3) Hệ thống mở luồng sự kiện tới máy khách. (4) Người tham gia xem danh sách đề xuất. (5) Người tham gia đề xuất hoặc bỏ phiếu. (6) Hệ thống cập nhật số phiếu có kiểm tra phiên bản. (7) Hệ thống phát sự kiện cho mọi thành viên. (8) Chủ phòng chốt địa điểm cuối cùng. |
| Luồng thay thế | (2a) Mã phòng không tồn tại: trả không tìm thấy. (2b) Phòng đã chốt: trả trạng thái đã đóng. (5a) Bỏ phiếu cho đề xuất của chính mình: từ chối. (5b) Bỏ phiếu lại cùng đề xuất: từ chối. (6a) Xung đột phiên bản: thử lại tối đa ba lần. |
| Hậu điều kiện | Phòng chuyển sang trạng thái chỉ đọc. Địa điểm được chọn hiển thị cho mọi thành viên. |

## 3.4. Kiến trúc hệ thống

Hình 3.2 mô tả kiến trúc triển khai của hệ thống trên một máy chủ.

```mermaid
flowchart TB
    Browser["Trình duyệt - React SPA"]

    subgraph Edge["Container web - 1.0 nhân / 512 MB"]
        Caddy["Caddy - TLS, định tuyến, tệp tĩnh"]
    end

    subgraph Api["Container api - 2.0 nhân / 1 GB"]
        W1["Tiến trình API 1"]
        W2["Tiến trình API 2"]
        WN["Tiến trình API n"]
        Cron["Tiến trình cron"]
    end

    subgraph Data["Container postgres - 2.0 nhân / 2 GB"]
        PG[("Dữ liệu nghiệp vụ")]
        Queue[("Hàng đợi pg-boss")]
        Notify[("Kênh thông báo nội bộ")]
    end

    R2[("Cloudflare R2 - ảnh")]
    K6["k6 - máy phát tải"]

    Browser -->|HTTPS| Caddy
    Caddy -->|HTTP nội bộ| W1
    Caddy -->|HTTP nội bộ| W2
    Caddy -->|HTTP nội bộ| WN
    W1 --> PG
    W2 --> PG
    WN --> PG
    Cron --> PG
    W1 --> Queue
    W2 --> Queue
    W1 --> Notify
    W2 --> Notify
    W1 -->|URL có chữ ký| R2
    Browser -->|Tải trực tiếp| R2
    K6 -->|HTTP| Caddy
```

**Hình 3.2. Sơ đồ kiến trúc triển khai**

Hệ thống gồm bốn thành phần chạy trên một máy chủ. Container web chạy Caddy. Container api chạy nhiều tiến trình Bun cùng lắng nghe một cổng, cộng một tiến trình cron tách biệt. Container postgres chạy PostgreSQL, chứa cả dữ liệu nghiệp vụ, hàng đợi và kênh thông báo nội bộ. Kho lưu trữ R2 nằm ngoài máy chủ.

Ba điểm thiết kế chính:

- Tiến trình API chạy thành nhiều tiến trình con, số lượng bằng số nhân khả dụng. Mỗi tiến trình lắng nghe cùng một cổng qua chia sẻ cổng. Cách này tận dụng nhiều nhân bộ xử lý trong một container.
- Sự kiện thời gian thực được phát qua kênh thông báo nội bộ của PostgreSQL. Mỗi tiến trình đăng ký lắng nghe kênh của các phòng đang có kết nối mở trên nó. Cách này chuyển sự kiện giữa các tiến trình mà không thêm hạ tầng truyền thông điệp.
- Tác vụ nền được lưu trong bảng PostgreSQL qua pg-boss. Tiến trình cron chạy tách biệt để không chiếm bộ xử lý của tiến trình phục vụ yêu cầu.

## 3.5. Luồng tương tác

Hình 3.3 mô tả luồng tìm kiếm địa điểm.

```mermaid
sequenceDiagram
    autonumber
    participant B as Trình duyệt
    participant A as Tiến trình API
    participant D as PostgreSQL
    participant V as Mô hình nhúng

    B->>A: GET /places?q=bun cha ca
    A->>A: Chuẩn hoá truy vấn về dạng không dấu
    A->>A: Trích xuất bằng chứng định danh và thuộc tính
    par Bốn nhánh chạy song song
        A->>D: Khớp tên và khớp tiền tố
        D-->>A: Danh sách định danh
    and
        A->>D: So khớp từ khoá, xếp hạng trigram qua chỉ mục GIN
        D-->>A: Danh sách định danh
    and
        A->>D: Khớp thuộc tính cấu trúc
        D-->>A: Danh sách định danh
    and
        A->>V: Sinh vector truy vấn
        V-->>A: Vector 384 chiều
        A->>D: Truy vấn lân cận cosine
        D-->>A: Danh sách định danh
    end
    A->>A: Chọn trọng số theo bằng chứng
    A->>A: Hợp nhất xếp hạng
    A->>D: Đọc chi tiết tập kết quả
    D-->>A: Bản ghi kèm điểm đánh giá
    A-->>B: 200 OK kèm danh sách địa điểm
```

**Hình 3.3. Sequence diagram luồng tìm kiếm**

Hình 3.4 mô tả luồng đăng bài và xử lý tác vụ nền.

```mermaid
sequenceDiagram
    autonumber
    participant B as Trình duyệt
    participant A as Tiến trình API
    participant D as PostgreSQL
    participant Q as Hàng đợi pg-boss
    participant W as Tiến trình nền

    B->>A: POST /posts kèm nội dung và ảnh
    A->>D: Kiểm tra khoá lũy đẳng
    A->>D: Ghi bản ghi bài đăng
    D-->>A: Bài đăng đã tạo
    A->>Q: Đưa tác vụ phát hiện địa điểm
    Note over A,Q: Hai lệnh tuần tự, không cùng giao dịch
    A-->>B: 201 Created
    Q->>W: Lấy tác vụ
    W->>D: Đọc nội dung bài và danh mục địa điểm
    W->>W: Đối sánh tên địa điểm trong nội dung
    alt Tìm thấy địa điểm khớp
        W->>D: Gắn thẻ địa điểm, tạo thông báo
    else Không tìm thấy
        W->>D: Ghi nhận đã xử lý
    end
    loop Mỗi chu kỳ quét
        W->>D: Tìm bài chưa có bản ghi phát hiện
        D-->>W: Danh sách bài cần bù
        W->>Q: Đưa bài vào hàng đợi
    end
```

**Hình 3.4. Sequence diagram luồng tác vụ nền**

Hình 3.5 mô tả luồng bình chọn nhóm: tham gia phòng, đề xuất, áp dụng và phát sự kiện thời gian thực.

```mermaid
sequenceDiagram
    autonumber
    participant B as Trình duyệt
    participant A as Tiến trình API
    participant D as PostgreSQL
    participant N as Kênh thông báo nội bộ

    B->>A: POST /rooms/:code/join
    A->>D: Kiểm tra mã phòng, tạo thành viên
    D-->>A: Token phòng (đặt cookie HttpOnly)
    A-->>B: 200 OK kèm trạng thái phòng
    B->>A: GET /rooms/:code/events (mở SSE)
    A->>N: Đăng ký lắng nghe kênh phòng
    B->>A: POST /rooms/:code/proposals
    A->>D: Ghi đề xuất (trạng thái open)
    A->>N: Phát sự kiện "đề xuất mới"
    N-->>A: Đẩy tới mọi tiến trình giữ kết nối
    A-->>B: Sự kiện đề xuất mới qua SSE
    B->>A: POST /rooms/:code/proposals/:id/apply
    A->>D: Mở giao dịch, CAS đổi open → applied
    alt CAS thành công
        A->>D: Đọc lược lọc, áp đề xuất, ghi lại
        A->>N: Phát sự kiện "đã áp dụng"
        A-->>B: 200 OK kèm lược lọc mới
    else CAS thất bại (đã áp dụng hoặc bị bỏ)
        A-->>B: 409 Conflict
    end
```

**Hình 3.5. Sequence diagram luồng bình chọn nhóm thời gian thực**

Hình 3.6 mô tả luồng tải ảnh qua URL có chữ ký: máy khách xin URL từ máy chủ, rồi tải tệp trực tiếp lên kho lưu trữ, không đi qua tầng dịch vụ.

```mermaid
sequenceDiagram
    autonumber
    participant B as Trình duyệt
    participant A as Tiến trình API
    participant R as Cloudflare R2

    B->>A: POST /media (folder, contentType, size)
    A->>A: Kiểm tra loại tệp và kích thước (≤ 5 MB)
    A->>A: Sinh khoá đối tượng theo người dùng
    A->>R: Ký URL PUT, hạn 600 giây
    R-->>A: URL có chữ ký
    A-->>B: 200 OK kèm URL và khoá
    B->>R: PUT tệp trực tiếp lên URL có chữ ký
    R-->>B: 200 OK
    B->>A: Gửi bài kèm khoá đối tượng
    A->>A: Lưu tham chiếu ảnh vào bản ghi bài
```

**Hình 3.6. Sequence diagram luồng tải ảnh qua URL có chữ ký**

Ngoài dòng xử lý, đề xuất trong phòng bình chọn còn có vòng đời riêng thể hiện qua các trạng thái. Hình 3.7 là state diagram của một đề xuất. Đề xuất được tạo ở trạng thái mở. Chủ phòng hoặc tác giả có thể áp đề xuất vào bộ lọc phòng, hoặc bỏ đề xuất. Cả hai chuyển trạng thái đều dùng so sánh và đổi có điều kiện trên trạng thái mở, nên hai người áp cùng lúc chỉ một người thành công, người kia nhận xung đột. Sau khi sang trạng thái đã áp dụng hoặc đã bỏ, đề xuất không còn nhận thao tác nào.

```mermaid
stateDiagram-v2
    [*] --> Mo: POST /proposals
    Mo --> ApDung: apply (CAS thành công)
    Mo --> Bo: dismiss (CAS thành công)
    Mo --> Mo: apply / dismiss (CAS thất bại → 409)
    ApDung --> [*]
    Bo --> [*]

    Mo: Mở (open)
    ApDung: Đã áp dụng (applied)
    Bo: Đã bỏ (dismissed)
```

**Hình 3.7. State diagram vòng đời một đề xuất trong phòng bình chọn**

Hình 3.8 trình bày activity diagram của luồng tìm kiếm địa điểm. Sơ đồ thể hiện nhánh rẽ quyết định giữa tìm kiếm lai ghép EGRF và phân trang thông thường, cùng hai nhánh phụ là gợi ý "Ý bạn là" khi không có kết quả và ghi nhận sự kiện tìm kiếm.

```mermaid
flowchart TD
    A(["Máy khách gửi GET /places?q=..."]) --> B{"Vượt giới hạn tốc độ?"}
    B -->|Có| B1(["Trả 429"])
    B -->|Không| C["Phân tích bộ lọc và giải mã cursor"]
    C --> D{"Cursor hợp lệ?"}
    D -->|Không| D1(["Trả 400"])
    D -->|Có| E{"Có q, không có cursor và sort = newest?"}
    E -->|Không| F["Phân trang keyset theo sort: rating / distance / newest"]
    E -->|Có| G["Chạy EGRF: bốn nhánh song song"]
    G --> G1["Nhánh ngữ nghĩa: nhúng truy vấn, tìm vector gần nhất"]
    G --> G2["Nhánh từ khoá: xếp hạng BM25 có tăng trọng trường"]
    G --> G3["Nhánh tên: khớp chính xác, tiền tố, token"]
    G --> G4["Nhánh cấu trúc: suy luận hạng mục, quận, thuộc tính"]
    G1 --> H["Chọn trọng số theo bằng chứng định danh"]
    G2 --> H
    G3 --> H
    G4 --> H
    H --> I["Hợp nhất RRF với k theo quy mô corpus"]
    I --> J{"Danh sách hợp nhất rỗng?"}
    J -->|Có| F
    J -->|Không| K["Lấy bản ghi theo thứ hạng hợp nhất"]
    F --> L["Tập kết quả cuối"]
    K --> L
    L --> M{"Không có kết quả và q dài từ 3 ký tự?"}
    M -->|Có| M1["Tính gợi ý Ý bạn là bằng trigram"]
    M -->|Không| N["Bỏ qua gợi ý"]
    M1 --> O["Ghi sự kiện search_query, không chặn phản hồi"]
    N --> O
    O --> P(["Trả JSON: items, next, meta"])
```

**Hình 3.8. Activity diagram luồng tìm kiếm địa điểm**

Hình 3.9 trình bày activity diagram của luồng đăng bài và phát hiện địa điểm. Sơ đồ tách hai pha: pha xử lý yêu cầu đồng bộ tạo bài và ảnh trong một giao dịch, và pha xử lý nền phát hiện địa điểm cho bài chưa gắn thẻ.

```mermaid
flowchart TD
    A(["Thành viên gửi POST /posts"]) --> B{"Đã xác thực và trong giới hạn tốc độ?"}
    B -->|Không| B1(["Trả 401 hoặc 429"])
    B -->|Có| C{"Trùng khoá lũy đẳng đã xử lý?"}
    C -->|Có| C1(["Trả lại bài đã tạo"])
    C -->|Không| D{"Dữ liệu hợp lệ?"}
    D -->|Không| D1(["Trả 400"])
    D -->|Có| E{"Bài có placeId?"}
    E -->|Có| E1{"Địa điểm tồn tại?"}
    E1 -->|Không| E2(["Trả 404"])
    E1 -->|Có| F
    E -->|Không| F["Kiểm tra ảnh thuộc quyền người dùng"]
    F --> G["Một giao dịch: tạo bài và các ảnh"]
    G --> H{"Tạo thành công?"}
    H -->|Không| H1(["Trả 500"])
    H -->|Có| I{"Bài chưa có placeId?"}
    I -->|Có| J["Đẩy job place-detect vào hàng đợi"]
    I -->|Không| K
    J --> K(["Trả 201 kèm bài đã tạo"])

    K -.->|Xử lý nền| W1(["Worker nhận job"])
    W1 --> W2["Tìm bài chưa gắn địa điểm, chưa có thông báo gợi ý"]
    W2 --> W3{"Có bài cần xử lý?"}
    W3 -->|Không| W9(["Kết thúc"])
    W3 -->|Có| W4["Nạp ứng viên địa điểm để xếp hạng"]
    W4 --> W5["Chuẩn hoá nội dung, xếp hạng gợi ý cho từng bài"]
    W5 --> W6{"Có gợi ý phù hợp?"}
    W6 -->|Không| W9
    W6 -->|Có| W7["Một giao dịch: tạo thông báo và dấu lũy đẳng"]
    W7 --> W8["Phát sự kiện SSE sau khi commit"]
    W8 --> W9
```

**Hình 3.9. Activity diagram luồng đăng bài và phát hiện địa điểm**

## 3.6. Thiết kế thuật toán

### 3.6.1. Thuật toán tìm kiếm EGRF

Hệ thống chạy bốn nhánh tín hiệu song song. Nhánh khớp tên nhận diện tên riêng qua ba mức: khớp chính xác, khớp tiền tố và khớp từng token. Nhánh từ khoá so khớp các token của truy vấn trong trường văn bản tổng hợp (tên, địa chỉ, quận, thẻ) sau khi chuẩn hoá về dạng không dấu, và xếp hạng kết quả bằng độ tương đồng trigram, tăng trọng cho trường tên. Nhánh khớp cấu trúc trích xuất hạng mục, quận, khoảng giá, trạng thái mở cửa từ truy vấn. Nhánh ngữ nghĩa dùng khoảng cách cosine trên vector 384 chiều.

Bốn danh sách xếp hạng được hợp nhất theo công thức hợp nhất xếp hạng nghịch đảo [12]:

$$S(d) = \sum_{r \in R} \frac{w_r}{k + \mathrm{rank}_r(d)}$$

trong đó $R$ là tập bốn nhánh, $\mathrm{rank}_r(d)$ là thứ hạng của địa điểm $d$ trong nhánh $r$, $w_r$ là trọng số nhánh, $k$ là hằng số làm mịn. Hằng số $k$ được tính theo quy mô corpus:

$$k(N) = \max\left(10,\ \left\lfloor 2\sqrt{N} \right\rfloor\right)$$

Với $N = 358$, giá trị $k$ xấp xỉ 37.

Trọng số $w_r$ không cố định mà chọn theo bằng chứng định danh trong truy vấn. Bảng 3.7 ghi bốn bộ trọng số.

**Bảng 3.7. Trọng số gate của thuật toán EGRF**

| Điều kiện bằng chứng | Nhánh tên | Nhánh cấu trúc | Nhánh ngữ nghĩa | Nhánh từ khoá |
|---|---|---|---|---|
| Có khớp tên chính xác | 5,0 | 0 | 0 | 1,0 |
| Có khớp tiền tố hoặc token tên | 3,0 | 0 | 0 | 1,0 |
| Có thuộc tính cấu trúc, không có tên | 0 | 3,0 | 1,0 | 1,0 |
| Truy vấn trừu tượng | 0 | 1,0 | 2,5 | 1,0 |

Nhánh tên gộp ba mức khớp chính xác, tiền tố và token; khi có nhiều mức khớp cùng lúc, mức mạnh hơn (chính xác trước, tiền tố sau, token sau) quyết định trọng số. Nhánh từ khoá luôn giữ trọng số 1,0 vì đóng vai trò nền cho mọi truy vấn.

### 3.6.2. Thuật toán gợi ý DES

Điểm của một địa điểm được tính theo trung bình Bayes có điều chỉnh:

$$\hat{R}(i) = \frac{v_i \cdot \bar{r}_i + m_i \cdot \mu_0}{v_i + m_i}$$

trong đó $\bar{r}_i$ là điểm đánh giá trung bình của địa điểm $i$, $v_i$ là số lượt đánh giá, $\mu_0$ là điểm trung bình tiên nghiệm, $m_i$ là khối lượng tiên nghiệm. Giá trị $m_i$ phụ thuộc độ hoàn thiện thông tin $C_i \in [0,1]$:

$$m_i = m_0 \cdot \left(1 + \gamma \cdot C_i\right)$$

với $m_0 = 10$, $\gamma = 0.5$, $\mu_0 = 4.0$. Độ hoàn thiện thông tin $C_i$ tính từ bốn yếu tố: địa điểm có ảnh thật, có giờ mở cửa, có số điện thoại, có mô tả.

Sau khi tính điểm, hệ thống thêm nhiễu có biên độ 0,05 với hạt giống sinh lại mỗi 6 giờ. Nhiễu xác định theo định danh địa điểm và chỉ số khung giờ, nên ổn định trong một khung giờ. Nhiễu phá thế hoà giữa các địa điểm có điểm gần bằng nhau. Cơ chế cold-start dùng khối lượng tiên nghiệm $m_i$ làm trọng số co điểm về giá trị trung bình [19].

Với người dùng đã có lịch sử, điểm cuối là tổng có trọng số của điểm nội dung và điểm sở thích. Điểm sở thích tính từ bảng sự kiện tương tác theo phương pháp lọc cộng tác dựa trên vật phẩm [14]. Mỗi loại sự kiện có một trọng số: xem, thích, lưu, đánh giá. Điểm tổng hợp trên các địa điểm cùng hạng mục hoặc cùng quận, có suy giảm theo thời gian. Trọng số pha giữa hai thành phần tăng theo số sự kiện quan sát được của người dùng.

## 3.7. Thiết kế dữ liệu

Lược đồ dữ liệu gồm 29 bảng. Bảng 3.8 nhóm các bảng theo miền nghiệp vụ.

**Bảng 3.8. Mô tả các nhóm bảng dữ liệu**

| Miền | Số bảng | Nội dung |
|---|---|---|
| Tài khoản và phiên | 4 | Người dùng, phiên, tài khoản liên kết, mã xác thực |
| Quan hệ xã hội | 1 | Theo dõi giữa người dùng |
| Địa điểm | 6 | Địa điểm, ảnh, đánh giá, báo cáo, vector, gợi ý hằng ngày |
| Nội dung | 7 | Bài đăng, ảnh bài, lượt thích, lượt lưu, bình luận, sự kiện tương tác |
| Bộ sưu tập | 3 | Bộ sưu tập, địa điểm trong bộ sưu tập, lượt thích |
| Phòng bình chọn | 3 | Phòng, thành viên phòng, đề xuất |
| Thông báo | 2 | Thông báo, thông báo gợi ý địa điểm |
| Hạ tầng | 3 | Giới hạn tần suất, khoá lũy đẳng, bộ đệm sở thích |

Hình 3.10 mô tả các lớp miền chính của hệ thống, gồm thuộc tính và hành vi. Thuộc tính lấy từ lược đồ dữ liệu; hành vi ánh xạ từ các hàm xử lý thật trong mã nguồn. Hai lớp dịch vụ `SearchService` và `RecommendationService` gói hai thuật toán EGRF và DES.

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String handle
        +String email
        +Boolean privateProfile
        +DateTime createdAt
        +register()
        +login()
        +updateProfile()
        +follow(otherUser)
    }
    class Place {
        +String id
        +String name
        +String address
        +String district
        +PlaceCategory category
        +Int priceLevel
        +String[] tags
        +Float lat
        +Float lng
        +PlaceStatus status
        +DateTime publishedAt
        +list(filters)
        +detail(id)
        +onMap(bounds)
    }
    class Review {
        +Int rating
        +String content
        +DateTime createdAt
        +createReview()
        +updateReview()
        +reportPlace()
    }
    class Post {
        +String caption
        +DateTime createdAt
        +createPost()
        +detectPlace()
        +likePost()
        +savePost()
    }
    class Collection {
        +String name
        +String description
        +Boolean isPrivate
        +addPlace(place)
        +reorder()
        +like()
    }
    class Room {
        +String code
        +String name
        +Json filter
        +create()
        +join(guest)
        +addProposal(proposal)
        +applyProposal(proposal)
    }
    class RoomProposal {
        +String field
        +String value
        +DateTime createdAt
        +describe()
    }
    class Notification {
        +NotificationKind kind
        +Boolean read
        +DateTime createdAt
        +markRead()
        +publish()
    }
    class SearchService {
        <<service>>
        +embed(query)
        +lexicalRank(query)
        +nameMatch(query)
        +structuredIntent(query)
        +gateWeights(evidence)
        +fuseRrf(lists, k)
        +hybridSearch(filters)
    }
    class RecommendationService {
        <<service>>
        +bayesScore(place)
        +hourNoise(place, window)
        +itemItemAffinity(user)
        +dailyPick(date)
        +getRecommended(user)
    }

    User "1" --> "*" Post : creates
    User "1" --> "*" Review : writes
    User "1" --> "*" Collection : owns
    User "1" --> "*" Room : creates
    User "1" --> "*" Notification : receives
    Place "1" --> "*" Review : receives
    Place "1" --> "*" Post : tagged in
    Collection "*" --> "*" Place : contains
    Room "1" *-- "*" RoomProposal : groups
    Room "*" --> "*" User : joins
    SearchService ..> Place : ranks
    RecommendationService ..> Place : ranks
```

**Hình 3.10. Sơ đồ lớp các lớp miền nghiệp vụ chính**

Hình 3.11 mô tả quan hệ giữa các bảng, chia theo tám miền nghiệp vụ. Sơ đồ gộp các bảng cùng miền để giữ kích thước đọc được; tên bảng dùng dạng tiếng Việt không dấu.

```mermaid
erDiagram
    NGUOI_DUNG ||--o{ PHIEN : "mở"
    NGUOI_DUNG ||--o{ TAI_KHOAN : "liên kết"
    NGUOI_DUNG ||--o{ THEO_DOI : "theo dõi"
    NGUOI_DUNG ||--o{ BAI_DANG : "tạo"
    NGUOI_DUNG ||--o{ BINH_LUAN : "viết"
    NGUOI_DUNG ||--o{ DANH_GIA : "viết"
    NGUOI_DUNG ||--o{ BAO_CAO : "gửi"
    NGUOI_DUNG ||--o{ BO_SUU_TAP : "tạo"
    NGUOI_DUNG ||--o{ THONG_BAO : "nhận"
    NGUOI_DUNG ||--o{ THANH_VIEN_PHONG : "tham gia"
    NGUOI_DUNG ||--o{ SU_KIEN_TUONG_TAC : "phát sinh"
    NGUOI_DUNG ||--o{ KHOA_LUY_DANG : "sở hữu"

    DIA_DIEM ||--o{ ANH_DIA_DIEM : "có"
    DIA_DIEM ||--o{ DANH_GIA : "được đánh giá"
    DIA_DIEM ||--o{ BAO_CAO : "bị báo cáo"
    DIA_DIEM ||--o{ VECTOR_DIA_DIEM : "có vector"
    DIA_DIEM ||--o{ GOI_Y_HANG_NGAY : "xuất hiện"
    DIA_DIEM ||--o{ BAI_DANG : "được gắn thẻ"
    DIA_DIEM ||--o{ DE_XUAT_TRONG_PHONG : "được đề xuất"
    DIA_DIEM ||--o{ DIA_DIEM_TRONG_BO_SUU_TAP : "nằm trong"

    BAI_DANG ||--o{ ANH_BAI_DANG : "có"
    BAI_DANG ||--o{ BINH_LUAN : "chứa"
    BAI_DANG ||--o{ LUOT_THICH_BAI : "nhận"
    BAI_DANG ||--o{ LUOT_LUU_BAI : "nhận"
    BINH_LUAN ||--o{ LUOT_THICH_BINH_LUAN : "nhận"

    BO_SUU_TAP ||--o{ DIA_DIEM_TRONG_BO_SUU_TAP : "chứa"
    BO_SUU_TAP ||--o{ LUOT_THICH_BO_SUU_TAP : "nhận"

    PHONG ||--o{ THANH_VIEN_PHONG : "có"
    PHONG ||--o{ DE_XUAT_TRONG_PHONG : "có"

    THONG_BAO ||--o| THONG_BAO_GOI_Y : "chi tiết"

    NGUOI_DUNG {
        uuid id PK
        text email UK
        text handle UK
        text ten_hien_thi
        bool rieng_tu
        timestamptz tao_luc
    }
    DIA_DIEM {
        text id PK
        text ten
        text ten_khong_dau
        text hang_muc
        text quan
        numeric vi_do
        numeric kinh_do
        smallint muc_gia
        timestamptz cong_bo_luc
    }
    BAI_DANG {
        uuid id PK
        uuid tac_gia_id FK
        text dia_diem_id FK
        text noi_dung
        timestamptz tao_luc
    }
    PHONG {
        uuid id PK
        text ma UK
        uuid chu_phong_id FK
        json luoc_loc
        timestamptz tao_luc
    }
    DE_XUAT_TRONG_PHONG {
        uuid id PK
        uuid phong_id FK
        uuid thanh_vien_id FK
        text loai
        text gia_tri
        text trang_thai
        timestamptz tao_luc
    }
    DANH_GIA {
        uuid id PK
        uuid tac_gia_id FK
        text dia_diem_id FK
        smallint diem
        text noi_dung
    }
    BO_SUU_TAP {
        uuid id PK
        uuid chu_so_huu_id FK
        text ten
    }
    THONG_BAO {
        uuid id PK
        uuid nguoi_nhan_id FK
        text loai
        json du_lieu
        timestamptz doc_luc
    }
    SU_KIEN_TUONG_TAC {
        uuid id PK
        uuid nguoi_dung_id FK
        text dia_diem_id FK
        text loai
        timestamptz tao_luc
    }
```

**Hình 3.11. Sơ đồ thực thể liên kết (theo miền, 29 bảng)**

Hai sơ đồ dưới đây tách riêng miền tài khoản và miền phòng bình chọn để thấy rõ khoá và quan hệ.

```mermaid
erDiagram
    NGUOI_DUNG ||--o{ PHIEN : "1-n"
    NGUOI_DUNG ||--o{ TAI_KHOAN : "1-n"
    NGUOI_DUNG ||--o{ MA_XAC_THUC : "1-n"
    NGUOI_DUNG ||--o{ THEO_DOI : "follower"
    NGUOI_DUNG ||--o{ THEO_DOI : "following"
    NGUOI_DUNG ||--o{ GIAM_TOC_DO : "1-n"
    NGUOI_DUNG ||--o{ BO_DEM_SO_THICH : "1-n"
    NGUOI_DUNG {
        uuid id PK
        text email UK
        text handle UK
        bool da_xac_thuc_email
        bool rieng_tu
        timestamptz xoa_luc
    }
    PHIEN {
        uuid id PK
        uuid nguoi_dung_id FK
        timestamptz het_han
    }
    TAI_KHOAN {
        uuid id PK
        uuid nguoi_dung_id FK
        text nha_cung_cap
    }
    THEO_DOI {
        uuid nguoi_theo_doi_id PK
        uuid nguoi_duoc_theo_doi_id PK
    }
    KHOA_LUY_DANG {
        uuid id PK
        uuid nguoi_dung_id FK
        text khoa UK
        timestamptz het_han
    }
```

```mermaid
erDiagram
    PHONG ||--o{ THANH_VIEN_PHONG : "1-n"
    PHONG ||--o{ DE_XUAT_TRONG_PHONG : "1-n"
    THANH_VIEN_PHONG ||--o{ DE_XUAT_TRONG_PHONG : "đề xuất"
    DIA_DIEM ||--o{ DE_XUAT_TRONG_PHONG : "được đề xuất"
    PHONG {
        uuid id PK
        text ma UK
        uuid chu_phong_id FK
        json luoc_loc
    }
    THANH_VIEN_PHONG {
        uuid id PK
        uuid phong_id FK
        uuid nguoi_dung_id FK
        text ten_hien_thi
        bool la_khach
        text bam_token UK
    }
    DE_XUAT_TRONG_PHONG {
        uuid id PK
        uuid phong_id FK
        uuid thanh_vien_id FK
        text loai
        text gia_tri
        text trang_thai
        uuid nguoi_ap_dung_id FK
    }
    DIA_DIEM {
        text id PK
        text ten
        text hang_muc
        text quan
    }
```

Bảng 3.9 mô tả cấu trúc bảng địa điểm, bảng trung tâm của hệ thống.

**Bảng 3.9. Mô tả cấu trúc bảng địa điểm**

| Trường | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| id | text | Khoá chính | Định danh sinh từ tên và địa chỉ |
| ten | text | Bắt buộc | Tên địa điểm có dấu |
| ten_khong_dau | text | Bắt buộc, chỉ mục GIN | Tên đã bỏ dấu, chuẩn hoá chữ thường |
| hang_muc | text | Bắt buộc | Một trong 6 hạng mục |
| quan | text | Bắt buộc | Một trong 6 quận nội thành |
| vi_do | numeric | | Vĩ độ |
| kinh_do | numeric | | Kinh độ |
| muc_gia | smallint | Kiểm tra khoảng 1–4 | Mức giá |
| gio_mo_cua | text | | Giờ mở cửa dạng chuỗi |
| cong_bo_luc | timestamptz | | Thời điểm công bố |
| xoa_luc | timestamptz | | Thời điểm xoá mềm |

Bảng vector địa điểm lưu trường 384 chiều và một giá trị băm nội dung để biết khi nào phải tính lại vector. Bảng sự kiện tương tác được phân vùng theo tháng, kèm một phân vùng mặc định để không mất sự kiện ngoài khoảng khai báo.

Lược đồ dữ liệu đi qua 21 migration có phiên bản, mỗi migration một thay đổi có chủ đích. Hai migration tiêu biểu cho thấy cách lược đồ phục vụ hai thuật toán ở mục 3.6. Migration `search_rec_foundation` tạo bảng vector địa điểm và bảng sự kiện tương tác: bảng vector dùng kiểu `vector(384)` của `pgvector` cho nhánh ngữ nghĩa của EGRF, bảng sự kiện phân vùng theo tháng làm nguồn học duy nhất cho DES và cho bộ đệm sở thích. Migration `affinity_cache` tạo bảng đệm sở thích người dùng theo hạng mục và quận, để DES không phải tính lại điểm sở thích từ bảng sự kiện ở mỗi lần gợi ý. Các migration còn lại thêm chỉ mục cho tìm kiếm, ràng buộc dữ liệu và bảo mật phòng bình chọn; danh sách đầy đủ ở Phụ lục A.

## 3.8. Thiết kế giao diện

Giao diện gồm bảy màn hình chính: khám phá và tìm kiếm, chi tiết địa điểm, bảng tin, soạn bài, hồ sơ cá nhân, bộ sưu tập và phòng bình chọn nhóm.

Màn hình khám phá gồm thanh tìm kiếm, bộ lọc theo quận và hạng mục, cùng hai vùng hiển thị danh sách và bản đồ chia sẻ một nguồn dữ liệu. Màn hình chi tiết gồm ảnh, thông tin liên hệ, giờ mở cửa và danh sách đánh giá. Màn hình soạn bài gồm ô nội dung, danh sách gợi ý địa điểm theo nội dung và trình tải ảnh. Màn hình phòng bình chọn gồm danh sách đề xuất kèm số phiếu, cập nhật theo thời gian thực.

Danh sách và bản đồ chia sẻ cùng một nguồn dữ liệu: thao tác kéo bản đồ cập nhật danh sách và ngược lại. Trình tải ảnh dùng URL có chữ ký và hiển thị tiến trình tải trực tiếp từ kho lưu trữ. Danh sách ảnh dùng thuộc tính kích thước và tập nguồn thay thế để trình duyệt chọn biến thể phù hợp.

Hình 3.12 mô tả điều hướng giữa các màn hình chính. Nhóm màn hình công khai gồm khám phá, bản đồ và chi tiết địa điểm. Nhóm yêu cầu phiên gồm bảng tin, hồ sơ, bộ sưu tập, thông báo và phòng bình chọn.

```mermaid
flowchart TD
    Home["Trang chủ /"] --> Discover["Khám phá /discover"]
    Home --> Map["Bản đồ /map"]
    Discover --> Detail["Chi tiết địa điểm /discover/:id"]
    Map --> Detail
    Discover --> Search["Tìm kiếm /search"]
    Home --> Social["Cộng đồng /social"]
    Social --> Post["Chi tiết bài /post/:id"]
    Social --> Compose["Soạn bài + gợi ý địa điểm"]
    Detail --> Compose
    Detail --> Saved["Đã lưu /saved"]
    Saved --> Collection["Bộ sưu tập /collections/:id"]
    Home --> Room["Phòng bình chọn /rooms/:code"]
    Social --> Room
    Room -->|"cập nhật tức thời"| Room
    Profile["Hồ sơ /profile"] --> Collection
    Profile --> UserProfile["Hồ sơ người dùng /u/:handle"]
    Notif["Thông báo /notification"] --> Detail
    Auth["Đăng nhập /login"] --> Profile
```

**Hình 3.12. Sơ đồ điều hướng các màn hình chính**

## 3.9. Thiết kế bảo mật

Bảng 3.10 liệt kê bảy lớp tấn công và cơ chế phòng thủ tương ứng [21], [22]. Dữ liệu vào được kiểm tra kiểu và ràng buộc theo lược đồ trước khi chạm tầng dữ liệu [6].

**Bảng 3.10. Thiết kế bảo mật theo lớp tấn công**

| Lớp tấn công | Cơ chế | Tham số |
|---|---|---|
| Chiếm đoạt phiên | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; phiên lưu phía máy chủ | Hạn phiên 7 ngày |
| Giả mạo yêu cầu chéo trang | Kiểm tra `SameSite` kết hợp kiểm tra tiêu đề `Origin` ở endpoint ghi | Từ chối khi `Origin` không khớp |
| Tiêm mã SQL | Tham số hoá toàn bộ truy vấn; truy vấn thô dùng tham số của thư viện | Không nối chuỗi vào câu lệnh |
| Truy cập tài nguyên không kiểm tra quyền | Kiểm tra chủ sở hữu ở tầng dịch vụ | Tài nguyên riêng tư trả 404 |
| Dò mật khẩu và lạm dụng endpoint | Bộ đếm trong bảng PostgreSQL, khoá theo địa chỉ IP và định danh | Ngưỡng riêng theo nhóm endpoint, ví dụ 30 yêu cầu/60 giây |
| Lộ bí mật trong mã nguồn | Đọc bí mật từ biến môi trường | Từ chối khởi động khi thiếu biến bắt buộc |
| Đoán mã phòng | Mã 6 ký tự trên bảng chữ 30 ký tự, khoảng 7,3×10⁸ tổ hợp | Mã phòng không phải yếu tố xác thực duy nhất |

Mã phòng 6 ký tự không phải yếu tố xác thực duy nhất. Mọi thao tác ghi trong phòng đều yêu cầu phiên hợp lệ và kiểm tra tư cách thành viên. Bộ đếm tần suất giới hạn số lần thử mã phòng.

---

# CHƯƠNG 4. CÀI ĐẶT VÀ THỬ NGHIỆM

## 4.1. Môi trường cài đặt và đo lường

Bảng 4.1 mô tả môi trường cài đặt và đo lường.

**Bảng 4.1. Môi trường cài đặt và đo lường**

| Thành phần | Công nghệ | Phiên bản | Giới hạn tài nguyên |
|---|---|---|---|
| Máy chủ vật lý | — | — | 8 nhân, 32 GB |
| Hệ điều hành | Linux | — | — |
| Runtime | Bun | — | 2,0 nhân / 1 GB (container api) |
| Cơ sở dữ liệu | PostgreSQL | 17 | 2,0 nhân / 2 GB (container postgres) |
| Reverse proxy | Caddy | — | 1,0 nhân / 512 MB (container web) |
| Đóng gói | Docker Compose | — | — |
| Kiểm thử tải | k6 | — | Chạy trên máy vật lý |

Các container được giới hạn cứng tổng cộng 5 nhân và 3,5 GB, phần còn lại của máy vật lý không cấp cho hệ thống. Công cụ sinh tải k6 chạy trên cùng máy vật lý, không chạy trên máy riêng.

### 4.1.1. Hướng dẫn cài đặt và chạy hệ thống

Dự án chạy được theo hai chế độ: phát triển trên máy cục bộ và triển khai đầy đủ bằng Docker Compose.

**Chuẩn bị.** Máy cần có Bun (phiên bản 1.3.14 trở lên) và Docker. Hai biến môi trường bắt buộc là `DATABASE_URL` trỏ tới PostgreSQL và `BETTER_AUTH_SECRET` dài tối thiểu 32 ký tự. Các biến còn lại (kho lưu trữ R2, SMTP gửi thư) có giá trị mặc định rỗng; khi để rỗng thì tính năng lưu ảnh và gửi thư bị tắt nhưng hệ thống vẫn chạy.

**Chạy ở chế độ phát triển.** Các lệnh sau khởi tạo cơ sở dữ liệu, nạp dữ liệu mẫu rồi chạy hai phía:

```bash
bun install                      # Cài phụ thuộc cho cả monorepo
bun run db:up                    # Khởi động PostgreSQL (image pgvector)
cd backend && cp .env.example .env   # Tạo tệp môi trường nếu chưa có
bun run db:migrate               # Chạy 21 migration có phiên bản
bun run db:generate              # Sinh kiểu dữ liệu Prisma cho mã ứng dụng
bun run db:seed                  # Nạp 358 địa điểm mẫu
bun run dev:api                  # Chạy API ở cổng cấu hình
bun run dev                      # Ở cửa sổ khác, chạy giao diện React
```

Lệnh `db:seed` có tính chất lũy đẳng: ưu tiên nạp tệp `backend/data/places-expanded.json` gồm 358 địa điểm đã làm giàu thông tin; nếu tệp không có thì dùng tệp dự phòng 491 địa điểm gốc. Chạy lại seed không tạo bản ghi trùng.

**Chạy ở chế độ triển khai đầy đủ.** Một lệnh khởi động cả bốn dịch vụ:

```bash
docker compose up -d --build     # postgres + migrate + api + web
```

Compose khởi động PostgreSQL trước, chờ qua healthcheck, chạy migration một lần rồi thoát, sau đó API mới khởi động. Caddy phục vụ giao diện tĩnh và làm reverse proxy cho API.

**Dữ liệu mẫu.** Bộ dữ liệu 358 địa điểm lấy từ OpenStreetMap [20], đã làm giàu ảnh, giờ mở cửa và số điện thoại. Dữ liệu tương tác (bài đăng, đánh giá, bộ sưu tập) để rỗng sau seed, vì các số liệu trong báo cáo đo trên dữ liệu thật sinh ra khi chạy, không phải dữ liệu mẫu cài sẵn.

## 4.2. Các module đã cài đặt

Bảng 4.2 liệt kê các module đã cài đặt và chức năng tương ứng.

**Bảng 4.2. Danh mục module đã cài đặt**

| Module | Chức năng |
|---|---|
| Xác thực và phiên | Đăng ký, đăng nhập, khôi phục mật khẩu, quản lý phiên |
| Địa điểm | Danh sách, tìm kiếm, bản đồ, chi tiết |
| Tìm kiếm lai ghép | Bốn nhánh tín hiệu, hợp nhất xếp hạng, kiểm soát bằng chứng |
| Gợi ý | Tính điểm Bayes, nhiễu khung giờ, kết hợp tín hiệu cá nhân |
| Bài đăng | Tạo, đọc, xoá, tương tác, phát hiện địa điểm |
| Đánh giá | Tạo, sửa, xoá, báo cáo |
| Bộ sưu tập | Tạo, sửa, thêm bớt địa điểm, thích |
| Phòng bình chọn | Tạo phòng, đề xuất, bình chọn, luồng sự kiện |
| Thông báo | Tạo, đọc, đánh dấu đã đọc |
| Phương tiện | URL có chữ ký, xác nhận tải lên |
| Tác vụ nền | Phát hiện địa điểm, gợi ý hằng ngày, bộ đệm sở thích, dọn dữ liệu |
| Thẻ xem trước | Sinh thẻ Open Graph cho địa điểm và bài viết |

### 4.2.1. Cấu trúc thư mục project

Dự án là một monorepo quản lý bằng Bun workspaces, gồm ba không gian làm việc: `frontend`, `backend` và `packages/schema`. Cấu trúc thư mục chính như sau:

```text
rendez/
├── package.json              # Cấu hình workspace và các lệnh chung
├── compose.yaml              # Docker Compose: postgres, api, web
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Lược đồ 29 bảng
│   │   └── migrations/       # 21 migration có phiên bản
│   ├── src/
│   │   ├── server.ts         # Điểm khởi động, chia sẻ cổng nhiều tiến trình
│   │   ├── app.ts            # Gắn định tuyến Hono và middleware
│   │   ├── routes/           # 12 nhóm endpoint (places, posts, rooms, ...)
│   │   ├── lib/              # Logic nghiệp vụ
│   │   │   ├── search/       # EGRF: dense, lexical, name, intent, rrf
│   │   │   ├── places/       # Bộ lọc, phân trang, khoảng cách
│   │   │   ├── recommendations.ts   # DES: điểm Bayes, nhiễu khung giờ
│   │   │   ├── ranking.ts    # Xếp hạng gợi ý
│   │   │   ├── daily-picks.ts       # Gợi ý hằng ngày
│   │   │   ├── affinity.ts   # Bộ đệm sở thích
│   │   │   ├── queue.ts      # Hàng đợi pg-boss
│   │   │   └── auth.ts       # Better Auth
│   │   └── env.ts            # Đọc biến môi trường
│   ├── test/                 # 356 ca kiểm thử trong 40 tệp
│   └── scripts/              # Sinh dữ liệu, đánh giá, seed
├── frontend/
│   ├── src/
│   │   ├── features/         # Mỗi tính năng một thư mục (places, search, rooms, ...)
│   │   ├── components/       # Thành phần giao diện dùng chung
│   │   ├── hooks/            # Hook dùng chung
│   │   └── lib/              # Tiện ích phía máy khách
│   └── e2e/                  # Kiểm thử giao diện
└── packages/schema/          # Sơ đồ dữ liệu dùng chung hai phía
```

Cách tổ chức này tách rõ ba tầng: tầng định tuyến trong `routes/` chỉ nhận yêu cầu và trả phản hồi; tầng nghiệp vụ trong `lib/` chứa toàn bộ logic, trong đó hai thuật toán EGRF và DES nằm ở `lib/search/` và `lib/recommendations.ts`; tầng dữ liệu do Prisma quản lý qua `prisma/`. Phía máy khách, mỗi tính năng nằm trong một thư mục riêng của `features/`, giúp thêm tính năng mới mà không ảnh hưởng phần còn lại.

## 4.3. Xử lý kỹ thuật quan trọng

Bảng 4.3 trình bày các xử lý kỹ thuật chính theo mẫu: vấn đề, giải pháp, kết quả đo.

**Bảng 4.3. Xử lý kỹ thuật và kết quả đo**

| Vấn đề | Giải pháp | Kết quả đo |
|---|---|---|
| Truy vấn tiếng Việt không dấu không khớp tên có dấu | Lưu cột tên đã bỏ dấu kèm chỉ mục GIN trigram | Truy vấn không dấu đạt p95 18 ms trên 358 địa điểm |
| Lỗi gõ làm mất kết quả | Xếp hạng từ khoá bằng độ tương đồng trigram, so khớp cả chuỗi nén không dấu | Nhánh từ khoá vẫn xếp hạng được truy vấn lệch một ký tự |
| Hợp nhất nhiều nhánh làm giảm thứ hạng tên đúng | Chọn trọng số theo bằng chứng định danh trong truy vấn | Độ chính xác tại 5 tăng từ 0,591 lên 0,820 |
| Một tiến trình JavaScript chỉ dùng một nhân | Khởi tạo nhiều tiến trình cùng lắng nghe một cổng | Tận dụng 2 nhân, đạt 1.400 yêu cầu/giây ở 5.000 người dùng |
| Sự kiện thời gian thực không tới được tiến trình khác | Phát qua kênh thông báo nội bộ PostgreSQL | Sự kiện tới mọi tiến trình đang giữ kết nối |
| Mạng chập chờn tạo bản ghi trùng | Khoá lũy đẳng với ràng buộc duy nhất | 8 ca kiểm thử lũy đẳng đều đạt |
| Nhiều người bỏ phiếu đồng thời làm mất cập nhật | Cập nhật có kiểm tra phiên bản | Xung đột được phát hiện, thử lại tối đa ba lần |
| Truyền ảnh qua tầng dịch vụ chiếm băng thông | URL có chữ ký, máy khách tải trực tiếp lên kho lưu trữ | Tệp không đi qua tầng dịch vụ |
| Phân trang theo số trang bỏ sót bản ghi khi dữ liệu đổi | Phân trang theo con trỏ với cặp giá trị sắp xếp | Không lặp, không sót bản ghi |

## 4.4. Kiểm thử chức năng

Bộ kiểm thử gồm 356 ca trong 40 tệp, chạy trên một cơ sở dữ liệu thật dựng riêng cho mỗi tệp. Bảng 4.4 tổng hợp kết quả theo nhóm chức năng.

**Bảng 4.4. Kết quả kiểm thử chức năng theo nhóm**

| Nhóm chức năng | Yêu cầu | Số ca | Đạt | Thất bại |
|---|---|---|---|---|
| Xác thực và phiên | FR-01, FR-02, FR-03 | 35 | 35 | 0 |
| Hồ sơ và quyền riêng tư | FR-04 | 17 | 17 | 0 |
| Tìm kiếm và lọc | FR-05, FR-06 | 51 | 51 | 0 |
| Bản đồ, chi tiết, giờ mở cửa | FR-07, FR-08 | 16 | 16 | 0 |
| Bài đăng và phát hiện địa điểm | FR-09, FR-10 | 41 | 41 | 0 |
| Tương tác bài viết | FR-11 | 25 | 25 | 0 |
| Đánh giá và báo cáo | FR-12, FR-13 | 16 | 16 | 0 |
| Bộ sưu tập | FR-14 | 14 | 14 | 0 |
| Thông báo | FR-15 | 11 | 11 | 0 |
| Phòng bình chọn | FR-16, FR-17 | 28 | 28 | 0 |
| Gợi ý | FR-18, FR-19 | 19 | 19 | 0 |
| Thẻ xem trước | FR-20 | 11 | 11 | 0 |
| Xác thực thao tác ghi | NFR-05 | 4 | 4 | 0 |
| Tính lũy đẳng | NFR-08 | 8 | 8 | 0 |
| Hạ tầng và tiện ích | (không ánh xạ FR) | 60 | 60 | 0 |
| **Tổng** | | **356** | **356** | **0** |

Bảng 4.5 trích mười ca tiêu biểu, mỗi ca ghi rõ đầu vào, kỳ vọng và kết quả thực tế. Các ca này lấy nguyên văn từ bộ kiểm thử, không phải ví dụ dựng lại.

**Bảng 4.5. Test case tiêu biểu**

| Mã | Chức năng | Đầu vào | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| TC-01 | Tìm kiếm không dấu | `GET /places?q=banh xeo` | Trả về địa điểm có tên chuẩn hoá chứa "banh xeo" | Đạt: danh sách khớp, mọi tên chuẩn hoá chứa "banh xeo" |
| TC-02 | Cursor không hợp lệ | `GET /places?cursor=khong-phai-cursor` | Mã 400, thông báo "Cursor không hợp lệ" | Đạt: đúng mã và thông báo |
| TC-03 | Ký tự NUL trong bộ lọc | `GET /places?district=%00` | Mã 400, thông báo "Dữ liệu chứa ký tự không hợp lệ" | Đạt: đúng mã và thông báo |
| TC-04 | Giá trị ngoài miền bị bỏ qua | `GET /places?priceMax=9` | Không lỗi, kết quả giống truy vấn không lọc giá | Đạt: danh sách id trùng khớp |
| TC-05 | Gợi ý địa điểm theo nội dung | `GET /places/suggestions?q="an banh"` (dưới 8 ký tự) | Mảng gợi ý rỗng | Đạt: độ dài 0 |
| TC-06 | Gợi ý địa điểm có ngữ cảnh | `q="Hôm nay ăn bánh xèo ở Đà Nẵng rất ngon"` | 1 đến 3 gợi ý, mỗi gợi ý có mã địa điểm và lý do | Đạt: trong khoảng, trường đầy đủ |
| TC-07 | Chặn giới hạn gợi ý | `GET /places/suggestions?limit=99` | Tối đa 10 gợi ý | Đạt: độ dài không vượt 10 |
| TC-08 | Ẩn địa điểm chưa duyệt | `GET /places/:id` với địa điểm chưa publish | Mã 404 | Đạt: đúng mã |
| TC-09 | Bộ nhớ đệm HTTP | `GET /places/:id` kèm `If-None-Match` khớp ETag | Mã 304, có ETag và Cache-Control | Đạt: đúng mã và header |
| TC-10 | Lũy đẳng tác vụ hằng ngày | Chạy `pickDailyPicks` hai lần | Bảng gợi ý vẫn đúng 3 dòng, cùng bộ địa điểm | Đạt: không sinh trùng |

## 4.5. Đánh giá hiệu năng và độ chính xác

### 4.5.1. Thời gian phản hồi ở mức tải đơn lẻ

Bảng 4.6 ghi thời gian phản hồi của sáu endpoint, mỗi endpoint gọi 20 lần tuần tự, không có tải đồng thời.

**Bảng 4.6. Thời gian phản hồi ở mức tải đơn lẻ**

| Endpoint | p50 (ms) | p95 (ms) | Chỉ tiêu NFR |
|---|---|---|---|
| Tìm kiếm, một từ khoá | 10 | 17 | p95 ≤ 300 |
| Tìm kiếm, không dấu | 11 | 18 | p95 ≤ 300 |
| Danh sách lọc theo quận | 8 | 14 | p95 ≤ 200 |
| Bản đồ theo khung nhìn | 12 | 21 | p95 ≤ 200 |
| Chi tiết địa điểm | 7 | 13 | p95 ≤ 200 |
| Gợi ý hằng ngày | 9 | 16 | p95 ≤ 200 |

Số liệu đo trên corpus 358 địa điểm. Không suy ra được hành vi khi corpus lớn hơn, vì truy vấn có thể chuyển sang quét tuần tự.

### 4.5.2. Kiểm thử tải tăng dần

Kịch bản sinh tải mô phỏng bốn thao tác: tìm kiếm (35%), xem gợi ý (25%), duyệt bản đồ (25%), xem chi tiết (15%). Mỗi lượt có thời gian nghỉ ngẫu nhiên 1–3 giây. Tải tăng qua năm mốc, mỗi mốc giữ ổn định 30 giây, riêng mốc cuối giữ 40 giây.

**Bảng 4.7. Kết quả kiểm thử tải tăng dần**

| Người dùng đồng thời | Thông lượng (yêu cầu/giây) | Lỗi máy chủ | Phản hồi > 1 giây | p95 (ms) |
|---|---|---|---|---|
| 500 | 195 – 350 | 0% | 0% | 185 |
| 1.000 | 550 | 0% | 4,2% | 420 |
| 2.000 | 820 | 0% | 18,5% | 1.250 |
| 3.000 | 1.100 | 0% | 38,0% | 3.400 |
| 5.000 | 1.400 | 0,002% | 53,1% | 8.250 |

Hình 4.1 biểu diễn thời gian phản hồi phân vị 95 theo mức tải.

```mermaid
xychart-beta
    title "p95 thời gian phản hồi theo mức tải"
    x-axis ["500", "1000", "2000", "3000", "5000"]
    y-axis "p95 (ms)" 0 --> 8500
    line [185, 420, 1250, 3400, 8250]
```

**Hình 4.1. Biểu đồ thời gian phản hồi theo mức tải**

Ở mốc 2.000 người dùng, cả container api và container postgres chạm giới hạn 2 nhân. Mức sử dụng bộ nhớ container api đạt 701 MB trên hạn mức 1 GB. Không container nào bị huỷ do hết bộ nhớ. Bốn yêu cầu ở mốc 5.000 nhận phản hồi 502 do máy chủ biên cắt kết nối chờ quá hạn.

### 4.5.3. Độ chính xác tìm kiếm

Tập nội bộ gồm 344 truy vấn, sinh theo năm nhóm ý định. Mỗi truy vấn có nhiều biến thể cách diễn đạt: câu tự nhiên, câu dài, từ khoá ngắn, không dấu, có tên quận. Nhãn chuẩn xác định theo ràng buộc hạng mục, thẻ và quận.

**Bảng 4.8. Độ chính xác tìm kiếm trên tập nội bộ**

| Phương pháp | P@5 | P@10 | R@10 | nDCG@10 | MRR | p95 (ms) |
|---|---|---|---|---|---|---|
| Khớp từ khoá | 0,507 | 0,441 | 0,715 | 0,730 | 0,825 | 17 |
| Khớp ngữ nghĩa | 0,579 | 0,519 | 0,793 | 0,802 | 0,866 | 12 |
| Hợp nhất chuẩn | 0,591 | 0,513 | 0,797 | 0,807 | 0,878 | 26 |
| EGRF | 0,820 | 0,804 | 0,780 | 0,799 | 0,865 | 35 |

Hình 4.2 biểu diễn độ chính xác tại 5 của bốn phương pháp.

```mermaid
xychart-beta
    title "Độ chính xác tại 5 trên tập nội bộ"
    x-axis ["Từ khoá", "Ngữ nghĩa", "Hợp nhất chuẩn", "EGRF"]
    y-axis "P@5" 0 --> 1
    bar [0.507, 0.579, 0.591, 0.820]
```

**Hình 4.2. Biểu đồ độ chính xác tìm kiếm trên tập nội bộ**

EGRF tăng P@5 từ 0,591 lên 0,820 và P@10 từ 0,513 lên 0,804 so với hợp nhất chuẩn. EGRF giảm R@10 từ 0,797 xuống 0,780 và MRR từ 0,878 xuống 0,865, do tầng kiểm soát bằng chứng thu hẹp tập kết quả về phía nhánh mạnh.

Hai tập tài liệu khoa học của bộ đối chứng BEIR [18] gồm SciFact [16] và NFCorpus [17] được dùng để kiểm tra tính tổng quát. Bảng 4.9 ghi kết quả.

**Bảng 4.9. Độ chính xác tìm kiếm trên tập đối chứng**

| Tập | Số tài liệu | Số truy vấn | Phương pháp | nDCG@10 | R@10 |
|---|---|---|---|---|---|
| Y sinh | 5.183 | 300 | Khớp từ khoá | 0,665 | 0,785 |
| | | | Khớp ngữ nghĩa | 0,468 | 0,604 |
| | | | Hợp nhất chuẩn | 0,562 | 0,694 |
| | | | EGRF | 0,589 | 0,711 |
| Dinh dưỡng | 3.633 | 323 | Khớp từ khoá | 0,303 | 0,145 |
| | | | Khớp ngữ nghĩa | 0,209 | 0,103 |
| | | | Hợp nhất chuẩn | 0,257 | 0,126 |
| | | | EGRF | 0,270 | 0,134 |

Trên cả hai tập khoa học, khớp từ khoá [13] đạt nDCG@10 cao hơn EGRF. Hai tập gồm tài liệu tiếng Anh chuyên ngành hẹp, nơi tín hiệu từ khoá đã đủ mạnh. EGRF vượt hợp nhất chuẩn trên cả hai tập: 0,589 so với 0,562 và 0,270 so với 0,257.

Tập địa điểm đối chứng gồm 58 truy vấn đa ngôn ngữ. Hợp nhất hai nhánh đạt P@5 là 0,728 và EGRF đạt 0,862. Hai giá trị này so với 0,497 của khớp từ khoá và 0,538 của khớp ngữ nghĩa.

### 4.5.4. Độ triệu hồi gợi ý

Bảng 4.10 ghi kết quả gợi ý trên bốn tập đối chứng.

**Bảng 4.10. Độ triệu hồi gợi ý trên tập đối chứng**

| Tập | Người dùng | Phương pháp | R@5 | R@10 | R@20 | nDCG@10 |
|---|---|---|---|---|---|---|
| Yelp | 1.709 | Ngẫu nhiên | 0,000 | 0,000 | 0,001 | 0,000 |
| | | Similarity | 0,014 | 0,025 | 0,046 | 0,013 |
| | | DES thuần | 0,011 | 0,023 | 0,042 | 0,011 |
| | | Lọc cộng tác | 0,017 | 0,035 | 0,077 | 0,017 |
| | | DES kết hợp | 0,023 | 0,044 | 0,087 | 0,021 |
| MovieLens-100k | 943 | Ngẫu nhiên | 0,002 | 0,004 | 0,013 | 0,002 |
| | | Similarity | 0,052 | 0,087 | 0,140 | 0,046 |
| | | DES thuần | 0,040 | 0,053 | 0,082 | 0,030 |
| | | Lọc cộng tác | 0,081 | 0,118 | 0,170 | 0,064 |
| | | DES kết hợp | 0,080 | 0,115 | 0,166 | 0,064 |
| MovieLens-1M | 2.000 | Ngẫu nhiên | 0,004 | 0,005 | 0,006 | 0,003 |
| | | Similarity | 0,023 | 0,042 | 0,074 | 0,021 |
| | | DES thuần | 0,022 | 0,035 | 0,055 | 0,017 |
| | | Lọc cộng tác | 0,041 | 0,071 | 0,117 | 0,036 |
| | | DES kết hợp | 0,041 | 0,070 | 0,116 | 0,036 |
| Nội bộ | 278 | Ngẫu nhiên | 0,022 | 0,036 | 0,058 | 0,017 |
| | | Similarity | 0,025 | 0,054 | 0,112 | 0,026 |
| | | Lọc cộng tác | 0,047 | 0,079 | 0,140 | 0,041 |

Hình 4.3 biểu diễn độ triệu hồi tại 10 trên tập địa điểm.

```mermaid
xychart-beta
    title "Độ triệu hồi tại 10 trên tập địa điểm"
    x-axis ["Ngẫu nhiên", "Phổ biến", "DES thuần", "Lọc cộng tác", "DES kết hợp"]
    y-axis "R@10" 0 --> 0.05
    bar [0.000, 0.025, 0.023, 0.035, 0.044]
```

**Hình 4.3. Biểu đồ độ triệu hồi gợi ý trên tập địa điểm**

Trên tập địa điểm, DES kết hợp đạt R@10 là 0,044 so với 0,035 của lọc cộng tác [14], chênh lệch 0,009. Kiểm định bootstrap cho nDCG@10 cho chênh lệch trung bình 0,0046, khoảng tin cậy 95% [0,0028; 0,0065], giá trị p xấp xỉ 0.

DES thuần đạt R@10 thấp hơn phương pháp phổ biến ở cả ba tập: 0,023 so với 0,025; 0,053 so với 0,087; 0,035 so với 0,042. DES thuần chỉ dùng điểm đánh giá Bayes, mà điểm này tương quan mạnh với độ phổ biến, nên không tạo khác biệt thứ hạng.

Trên hai tập phim MovieLens [15], DES kết hợp tương đương lọc cộng tác: R@10 là 0,115 so với 0,118 và 0,070 so với 0,071. Khoảng tin cậy 95% của chênh lệch lần lượt là [-0,0017; 0,0010] và [-0,0011; 0,0002], giá trị p lần lượt là 0,70 và 0,92.

Trên tập nội bộ gồm 278 người dùng đánh giá, lọc cộng tác đạt R@10 là 0,079 so với 0,054 của phương pháp phổ biến, chênh lệch 0,025. Kiểm định bootstrap cho nDCG@10 cho chênh lệch trung bình 0,0148, khoảng tin cậy 95% [-0,003; 0,033], giá trị p 0,056.

## 4.6. Ảnh giao diện hệ thống

Sáu ảnh dưới đây chụp hệ thống đang chạy ở chế độ phát triển, khung nhìn 1440×900, giao diện tối.

Hình 4.4 chụp màn hình khám phá với truy vấn không dấu "bun cha ca". Kết quả trả về đúng các địa điểm có tên "Bún chả cá": Bún chả cá Bà Lữ, Bún chả cá Ông Tạ và Bun cha ca 17k.

![Màn hình tìm kiếm với truy vấn không dấu](hinh/fig-4-4-search.png)

**Hình 4.4. Màn hình tìm kiếm với truy vấn không dấu**

Hình 4.5 chụp trang chi tiết địa điểm Bún chả cá Bà Lữ: ảnh bìa, địa chỉ, hạng mục, các nút thao tác và ba thẻ nội dung.

![Màn hình chi tiết địa điểm](hinh/fig-4-5-place-detail.png)

**Hình 4.5. Màn hình chi tiết địa điểm**

Hình 4.6 chụp phòng bình chọn nhóm với mã phòng V62BS9. Màn hình gồm biểu mẫu đề xuất, danh sách đề xuất của cả nhóm và hai nút áp dụng, bỏ qua.

![Màn hình phòng bình chọn](hinh/fig-4-6-room.png)

**Hình 4.6. Màn hình phòng bình chọn nhóm**

Hình 4.7 chụp màn hình soạn bài. Khi người dùng gõ nội dung, hệ thống gợi ý ba địa điểm khớp tên và khu vực để gắn thẻ.

![Màn hình soạn bài có gợi ý địa điểm](hinh/fig-4-7-compose-post.png)

**Hình 4.7. Màn hình soạn bài có gợi ý địa điểm**

Hình 4.8 chụp màn hình bản đồ. Màn hình gồm bộ lọc theo quận, các cụm điểm trên nền bản đồ, chú giải hạng mục và thanh đếm 490 địa điểm tại Đà Nẵng.

![Màn hình bản đồ các địa điểm](hinh/fig-4-8-map.png)

**Hình 4.8. Màn hình bản đồ các địa điểm**

Hình 4.9 chụp trang hồ sơ cá nhân. Màn hình gồm ảnh bìa, tên hiển thị, phần giới thiệu, ba ô thống kê và bốn thẻ nội dung.

![Màn hình hồ sơ cá nhân](hinh/fig-4-9-profile.png)

**Hình 4.9. Màn hình hồ sơ cá nhân**

---

# CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 5.1. Kết luận

Bảng 5.1 đối chiếu năm mục tiêu ở Chương 1 với kết quả đạt được.

**Bảng 5.1. Đối chiếu mục tiêu và kết quả**

| Mục tiêu | Kết quả | Trạng thái |
|---|---|---|
| Mạng xã hội địa điểm đủ nghiệp vụ | 20 yêu cầu chức năng, 356 ca kiểm thử đạt | Đạt |
| Tìm kiếm hiểu ý định theo ngữ nghĩa, chịu không dấu và lỗi gõ | P@5 đạt 0,820 trên tập nội bộ, p95 35 ms | Đạt |
| Gợi ý hoạt động khi chưa có lịch sử | R@10 đạt 0,044 trên tập địa điểm | Đạt |
| Đo thời gian phản hồi dưới tải | p95 420 ms ở 1.000 người dùng, 1.250 ms ở 2.000 | Đạt |
| Kiểm thử tự động phủ toàn bộ FR | 356 ca trong 40 tệp, đạt toàn bộ | Đạt |

Hệ thống gồm 29 bảng dữ liệu, 12 nhóm endpoint, chạy trên máy chủ một nút với 5 nhân và 3,5 GB bộ nhớ. Hai thuật toán EGRF và DES được cài đặt và đánh giá trên tập nội bộ và bốn tập đối chứng công khai.

## 5.2. Hạn chế

1. Tập truy vấn nội bộ do sinh viên xây dựng, các hằng số thuật toán chọn trên chính tập này. Không có tập kiểm thử tách rời.
2. Kiểm thử bảo mật ở mức khói. Chưa có kiểm thử truy cập tài nguyên không kiểm tra quyền có hệ thống, kiểm thử tiêm mã kịch bản, hay thực nghiệm dò mật khẩu [21], [22].
3. Mọi phép đo hiệu năng thực hiện trên corpus 358 địa điểm. Chưa đo hành vi khi corpus lớn hơn.
4. Công cụ sinh tải chạy trên cùng máy với hệ thống, nên số liệu ở mức tải cao có xu hướng bi quan.
5. Chưa có kiểm thử với người dùng thật. Chưa kiểm chứng đồng bộ sự kiện khi tiến trình khởi động lại giữa lúc có kết nối mở.
6. Một số thành phần bên ngoài chưa kiểm chứng trong điều kiện thật: kho lưu trữ tệp, dịch vụ thư, chứng chỉ TLS.

## 5.3. Hướng phát triển

1. Thu thập truy vấn từ người dùng thật, chia thành tập phát triển và tập kiểm thử tách rời.
2. Bổ sung bộ kiểm thử bảo mật có hệ thống: truy cập tài nguyên, tiêm mã, dò mật khẩu có đo lường.
3. Thực hiện phép quét toàn miền cho hệ số làm mịn và các hằng số DES, kèm kiểm định ý nghĩa thống kê.
4. Mở rộng corpus ra ngoài Đà Nẵng, xác định ngưỡng quy mô mà chỉ mục trigram không còn hiệu quả.
5. Thay mô hình nhúng tổng quát bằng mô hình huấn luyện trên dữ liệu tiếng Việt.

---

# TÀI LIỆU THAM KHẢO

[1] Hono. *Hono — Web framework built on Web Standards*. https://hono.dev/docs (truy cập 10/11/2026).

[2] Prisma. *Prisma ORM Documentation — Schema, Migrations, Driver Adapters*. https://www.prisma.io/docs (truy cập 10/11/2026).

[3] Better Auth. *Better Auth Documentation — Email & Password, Session Management*. https://www.better-auth.com/docs (truy cập 10/11/2026).

[4] PostgreSQL Global Development Group. *PostgreSQL 17 Documentation — Text Search, unaccent, pg_trgm, JSON Types*. https://www.postgresql.org/docs/17/ (truy cập 10/11/2026).

[5] pg-boss. *pg-boss — Queueing jobs in PostgreSQL*. https://github.com/timgit/pg-boss (truy cập 10/11/2026).

[6] Zod. *Zod Documentation — TypeScript-first schema validation*. https://zod.dev (truy cập 10/11/2026).

[7] Bun. *Bun Documentation — HTTP server, reusePort, Test runner*. https://bun.sh/docs (truy cập 10/11/2026).

[8] Caddy. *Caddy Documentation — Automatic HTTPS, reverse_proxy, encode*. https://caddyserver.com/docs/ (truy cập 10/11/2026).

[9] React. *React Documentation — Hooks, Suspense*. https://react.dev (truy cập 10/11/2026).

[10] Cloudflare. *R2 Documentation — Presigned URLs, S3 compatibility*. https://developers.cloudflare.com/r2/ (truy cập 10/11/2026).

[11] Grafana. *k6 Documentation — Test types, thresholds, metrics*. https://k6.io/docs/ (truy cập 10/11/2026).

[12] Cormack, G. V., Clarke, C. L. A., và Büttcher, S. (2009). *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods*. Proceedings of the 32nd International ACM SIGIR Conference, tr. 758–759.

[13] Robertson, S., và Zaragoza, H. (2009). *The Probabilistic Relevance Framework: BM25 and Beyond*. Foundations and Trends in Information Retrieval, 3(4), tr. 333–389.

[14] Sarwar, B., Karypis, G., Konstan, J., và Riedl, J. (2001). *Item-based collaborative filtering recommendation algorithms*. Proceedings of the 10th International Conference on World Wide Web, tr. 285–295.

[15] Harper, F. M., và Konstan, J. A. (2015). *The MovieLens Datasets: History and Context*. ACM Transactions on Interactive Intelligent Systems, 5(4), tr. 1–19.

[16] Wadden, D., Lin, S., Lo, K., Wang, L. L., van Zuylen, M., Cohan, A., và Hajishirzi, H. (2020). *Fact or Fiction: Verifying Scientific Claims*. Proceedings of EMNLP 2020, tr. 7534–7550.

[17] Boteva, T., Gholipour, D., Sokolov, A., và Riedel, S. (2016). *A Full-Text Learning to Rank Dataset for Medical Information Retrieval*. Proceedings of ECIR 2016, tr. 716–722.

[18] Thakur, N., Reimers, N., Rücklé, A., Srivastava, A., và Gurevych, I. (2021). *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models*. Proceedings of NeurIPS 2021 Datasets and Benchmarks Track.

[19] Schein, A. I., Popescu, A., Ungar, L. H., và Pennock, D. M. (2002). *Methods and metrics for cold-start recommendations*. Proceedings of the 25th International ACM SIGIR Conference, tr. 253–260.

[20] OpenStreetMap contributors. *OpenStreetMap — dữ liệu bản đồ theo giấy phép ODbL*. https://www.openstreetmap.org/copyright (truy cập 10/11/2026).

[21] OWASP Foundation. *OWASP Top 10 — Web Application Security Risks*. https://owasp.org/www-project-top-ten/ (truy cập 10/11/2026).

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

---

# PHỤ LỤC A. DANH MỤC API ENDPOINT

**Bảng A.1. Danh mục API endpoint**

| Phương thức | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| POST | /api/v1/auth/sign-up/email | Đăng ký tài khoản | email, password, name |
| POST | /api/v1/auth/sign-in/email | Đăng nhập | email, password |
| POST | /api/v1/auth/sign-out | Đăng xuất | — |
| POST | /api/v1/auth/forget-password | Yêu cầu khôi phục mật khẩu | email |
| POST | /api/v1/auth/reset-password | Đặt lại mật khẩu | token, password |
| POST | /api/v1/auth/verify-email | Xác thực email | token |
| GET | /api/v1/session | Đọc phiên hiện tại | — |
| POST | /api/v1/register | Hoàn tất hồ sơ sau đăng ký | name, displayName |
| GET | /api/v1/me | Đọc hồ sơ cá nhân | — |
| PATCH | /api/v1/me | Cập nhật hồ sơ | name, bio, avatarUrl, coverUrl |
| GET | /api/v1/places | Danh sách, tìm kiếm, lọc | q, district, category, priceLevel, openNow, cursor, limit |
| GET | /api/v1/places/map | Dữ liệu bản đồ theo khung nhìn | bbox, category |
| GET | /api/v1/places/:id | Chi tiết địa điểm | id |
| GET | /api/v1/places/suggestions | Gợi ý địa điểm theo ngữ cảnh | q, district |
| GET | /api/v1/places/daily-picks | Gợi ý hằng ngày | — |
| GET | /api/v1/users/:id | Hồ sơ công khai | id |
| GET | /api/v1/users | Danh sách người dùng | q, cursor |
| POST | /api/v1/users/:id/follow | Theo dõi người dùng | id |
| DELETE | /api/v1/users/:id/follow | Bỏ theo dõi | id |
| GET | /api/v1/users/suggestions | Gợi ý người dùng | — |
| GET | /api/v1/posts | Bảng tin | cursor, limit |
| POST | /api/v1/posts | Tạo bài đăng | content, placeId, imageKeys |
| GET | /api/v1/posts/:id | Chi tiết bài đăng | id |
| DELETE | /api/v1/posts/:id | Xoá bài đăng | id |
| POST | /api/v1/posts/:id/like | Thích bài | id |
| DELETE | /api/v1/posts/:id/like | Bỏ thích | id |
| POST | /api/v1/posts/:id/save | Lưu bài | id |
| DELETE | /api/v1/posts/:id/save | Bỏ lưu | id |
| GET | /api/v1/posts/:id/comments | Bình luận của bài | id, cursor |
| POST | /api/v1/posts/:id/comments | Gửi bình luận | id, content |
| DELETE | /api/v1/posts/:id/comments/:cid | Xoá bình luận | id, cid |
| POST | /api/v1/posts/:id/comments/:cid/like | Thích bình luận | id, cid |
| GET | /api/v1/notifications | Danh sách thông báo | cursor |
| PATCH | /api/v1/notifications/:id | Đánh dấu đã đọc | id |
| GET | /api/v1/notifications/unread-count | Đếm chưa đọc | — |
| GET | /api/v1/reviews | Đánh giá của địa điểm | placeId, cursor |
| POST | /api/v1/reviews | Tạo đánh giá | placeId, rating, content, imageKeys |
| PATCH | /api/v1/reviews/:id | Sửa đánh giá | id, rating, content |
| DELETE | /api/v1/reviews/:id | Xoá đánh giá | id |
| POST | /api/v1/reviews/reports | Báo cáo địa điểm | placeId, reason |
| GET | /api/v1/collections | Danh sách bộ sưu tập | cursor |
| POST | /api/v1/collections | Tạo bộ sưu tập | name, description |
| GET | /api/v1/collections/:id | Chi tiết bộ sưu tập | id |
| PATCH | /api/v1/collections/:id | Sửa bộ sưu tập | id, name, description |
| DELETE | /api/v1/collections/:id | Xoá bộ sưu tập | id |
| POST | /api/v1/collections/:id/places | Thêm địa điểm | id, placeId |
| DELETE | /api/v1/collections/:id/places/:pid | Bớt địa điểm | id, pid |
| POST | /api/v1/collections/:id/like | Thích bộ sưu tập | id |
| POST | /api/v1/rooms | Tạo phòng bình chọn | — |
| GET | /api/v1/rooms/:code | Trạng thái phòng | code |
| POST | /api/v1/rooms/:code/join | Tham gia phòng | code |
| POST | /api/v1/rooms/:code/proposals | Đề xuất địa điểm | code, placeId |
| POST | /api/v1/rooms/:code/vote | Bỏ phiếu | code, proposalId, version |
| POST | /api/v1/rooms/:code/decide | Chốt địa điểm | code, proposalId |
| GET | /api/v1/rooms/:code/events | Luồng sự kiện SSE | code |
| POST | /api/v1/media/presign | Xin URL có chữ ký | contentType, size, purpose |
| POST | /api/v1/media/confirm | Xác nhận tải lên | objectKey |
| GET | /api/v1/og/place/:id | Thẻ xem trước địa điểm | id |
| GET | /api/v1/og/post/:id | Thẻ xem trước bài viết | id |
| GET | /api/v1/system/stats | Số liệu vận hành | — |
| POST | /api/v1/system/reset | Đặt lại dữ liệu demo | — |
| POST | /api/v1/events | Ghi nhận sự kiện tương tác | type, placeId, postId, context |
