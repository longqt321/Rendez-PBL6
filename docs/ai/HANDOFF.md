# Handoff — Rendez smart search và dataset POI Đà Nẵng

**Trạng thái:** BLOCKED / PARTIAL — chỉ hoàn tất tài liệu  
**Ngày:** 2026-11-03  
**Repository:** longqt321/Rendez-PBL6  
**Nhánh:** feat/ai-smart-search  
**Base:** e87b04faa0d85842c124cddafd86a0af3961f83c

## Tóm tắt 10 dòng

1. Đã tạo nhánh feat/ai-smart-search từ main; không ghi vào main/master.
2. Đã kiểm tra mã nguồn hiện tại qua GitHub connector; container không có checkout dự án.
3. Backend hiện là Django 5.2, frontend React 19, PostgreSQL 17; tìm kiếm hiện tại là lọc văn bản không dấu, chưa có LambdaMART.
4. Model Place lưu latitude/longitude riêng; giờ mở cửa hiện là text + JSON; ảnh và thuộc tính ảnh nằm trong apps.photos.
5. data/README.md mô tả 12 POI seed và 36 ảnh minh họa sinh tự động; ảnh đó không phải ảnh thực địa nên đã loại khỏi dataset mới.
6. Tất cả 8 endpoint preflight thất bại tại DNS trước khi có HTTP response.
7. Đã rà soát tài liệu license ODbL/Overture/Apache/CC0 và quy tắc license theo từng file Commons; Foursquare HF trực tiếp bị loại do gated terms.
8. Không tải dump, ranh giới, POI hoặc ảnh; số POI mới = 0, ảnh được cấp phép mới = 0, manifest nguồn rỗng.
9. Không chạy baseline tests; không thay code, migration, dữ liệu, model hoặc frontend vì không thể kiểm tra hồi quy.
10. Parser, endpoint, LambdaMART, benchmark, qrels, ablation, latency và Playwright E2E đều CHƯA LÀM / CHƯA ĐO.

## Dataset và ảnh

| Chỉ số | Kết quả |
|---|---:|
| POI mới nhập vào AI dataset | 0 |
| POI seed hiện có (data/README.md) | 12 |
| Ảnh minh họa seed hiện có (data/README.md) | 36 |
| Ảnh ngoài có license được tải về | 0 |
| POI có ảnh licensed mới | 0 |
| Chuỗi opening_hours từ dump đã parse | 0 |
| Nhãn thị giác agent-reviewed | 0 |
| Truy vấn benchmark / qrels | 0 / 0 |
| File snapshot nguồn có checksum | 0 |

Các tài liệu audit cũ có nhắc 14 địa điểm / 39 ảnh ở database phát triển, nhưng database đó không thể truy cập trong lần chạy này. Không dùng con số đó làm tổng dataset mới và không suy diễn trạng thái database hiện tại.

## Nguồn và license

- **Geofabrik / OSM:** ODbL 1.0; cần attribution và đánh giá share-alike trước khi phân phối database dẫn xuất. License đã đọc; dump không tải được.
- **Overture Places:** license theo từng source/provider, không phải một license chung. Tài liệu nêu các nhóm như CDLA-Permissive-2.0, Apache-2.0 và CC0-1.0. Cần giữ source/license metadata. Parquet chưa tải.
- **Foursquare Open Source Places trực tiếp trên HF:** dataset card ghi Apache-2.0 nhưng truy cập gated và kèm điều kiện chấp thuận; đã loại, không chấp nhận thay chủ dự án.
- **Wikidata:** CC0-1.0 áp dụng cho structured data. Chưa truy vấn SPARQL.
- **Wikimedia Commons:** license theo từng file. Chỉ chấp nhận CC0, CC BY, CC BY-SA sau khi kiểm tra extmetadata, author và credit. Chưa tải file nào.
- **Places365:** không sử dụng làm ảnh của POI Đà Nẵng.

Chi tiết và các URL chính thức nằm trong DATA_LICENSE.md.

## Kết quả kết nối

Tám endpoint trong mục preflight đã được probe từ execution container. Cả tám đều trả lỗi DNS resolution; không có HTTP status hoặc header x-deny-reason để đọc:

| Endpoint | Thời gian (ms) | Kết quả |
|---|---:|---|
| download.geofabrik.de | 5059.4 | DNS failure |
| huggingface.co | 5056.7 | DNS failure |
| overturemaps-us-west-2.s3.amazonaws.com | 5055.7 | DNS failure |
| codeberg.org | 5056.3 | DNS failure |
| overpass-api.de/api/status | 10059.5 | DNS failure |
| commons.wikimedia.org/w/api.php | 5044.0 | DNS failure |
| upload.wikimedia.org | 5039.0 | DNS failure |
| query.wikidata.org | 10048.1 | DNS failure |

Đây là lỗi trước HTTP, không phải bằng chứng endpoint trả 403/429. Kiểm tra DNS/egress trước khi chỉ thêm domain vào allowlist.

## Ngữ cảnh hệ thống và an toàn

- Endpoint tìm kiếm cũ: GET /api/v1/places/ với q/category/attributes/sort; endpoint bản đồ: GET /api/v1/places/map/.
- Tọa độ hiện tại là decimal latitude/longitude; không thấy PostGIS geometry trong model Place được kiểm tra.
- Migration hiện có định nghĩa unaccent, pg_trgm và btree_gist. Live DB extensions chưa được xác minh.
- Giờ mở cửa hiện là text + JSON, chưa có phút trong tuần.
- VisualAttribute/PhotoAttribute hiện hữu không đồng nghĩa với bộ nhãn CLIP/agent mới.
- Không xóa hoặc sửa dữ liệu, model, migration hay file người dùng; không thay .env.example; không đọc/ghi token.
- Không có commit nào trên main/master.

## Test và kết quả đo

Baseline: **NOT RUN**. Container không có checkout và Git clone không thể phân giải DNS. BASELINE_TESTS.md ghi lệnh chính thức và các con số test cũ bị mâu thuẫn trong tài liệu hiện có. docs/ui-implementation-status.md từng báo 222 backend + 61 frontend; README cũ báo 168 + 56; không coi đây là kết quả vừa chạy.

Các kết quả sau đều CHƯA ĐO: benchmark quality; P@5/R@10/NDCG@10; Wilcoxon; bootstrap 95% CI; đồng thuận qrels; phân tích 15 truy vấn lỗi; latency p50/p95; CPU checkpoint size; parser giờ mở cửa; endpoint schema; E2E screenshots.

Không có kết quả định lượng nào chứng minh LambdaMART tốt hơn baseline vì mô hình chưa được triển khai hoặc huấn luyện.

## Cách tiếp tục

1. Checkout nhánh feat/ai-smart-search trong môi trường có source code và Git:
   
       git fetch origin
       git switch feat/ai-smart-search
       bash scripts/check.sh all

2. Chạy lại 8 connectivity probes với User-Agent dự án. Ghi status/latency/header thật; không ghi status nếu không nhận HTTP response.
3. Rà soát DATA_LICENSE.md, đặc biệt ODbL và quyết định phân phối dữ liệu conflated.
4. Chọn định nghĩa ranh giới Đà Nẵng (ranh giới đô thị/lịch sử hay đơn vị hành chính hiện hành), tải polygon đã version hóa và lưu ngày snapshot.
5. Tải source theo thứ tự đã yêu cầu, chỉ sau khi license được xác nhận. Tính SHA-256 ngay sau download và ghi từng file vào data/MANIFEST_SOURCES.jsonl.
6. Triển khai extractor/ingest ở chế độ dry-run, test trên subset, đối chiếu số lượng trước khi import.
7. Thực hiện ingestion, ảnh, labels và qrels với provenance; không thay ảnh placeholder bằng ảnh không rõ quyền.
8. Thêm parser, migration additive, management commands, ranker và endpoint theo từng bước; chạy test sau mỗi milestone.
9. Chạy đánh giá CV/ablation và mở test set cố định đúng một lần; ghi log và khoảng tin cậy. Chỉ sau đó mới đo latency và E2E.

## Lệnh và thành phần hiện có

Lệnh baseline hiện có:

    bash scripts/check.sh all

Các lệnh yêu cầu mới dưới đây **chưa tồn tại**: ingest_geofabrik, ingest_overture, ingest_wikidata, ingest_commons, build_visual_labels, build_features, train_ranker và evaluate. Chưa có migration hoặc endpoint smart-search để migrate/serve.

## Việc chủ dự án cần làm

- Kiểm tra DNS/HTTPS egress cho các host trong BLOCKERS.md; allowlist DNS/network nếu chính sách môi trường yêu cầu.
- Rà soát DATA_LICENSE.md và quyết định có phân phối dataset kết hợp OSM/Overture hay không.
- Chốt ranh giới hành chính Đà Nẵng và ngày snapshot cần sử dụng.
- Sau khi có dữ liệu, rà soát 50 POI trong QA_SAMPLE.md và các nhãn ảnh agent review; đây chưa phải human review.
- Cân nhắc token Mapillary nếu muốn dùng ảnh phụ street-level; không có token nào được đọc trong lần này.
- Cân nhắc người chấm độc lập cho nghiên cứu độ nhất quán qrels.

## Commits

Nhánh được tạo từ main. Các tài liệu AI và manifest được commit tuần tự trên feat/ai-smart-search. Không push sang main/master, không force push và không xóa nhánh nào.
