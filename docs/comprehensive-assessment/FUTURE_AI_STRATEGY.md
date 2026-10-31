# Future AI Strategy (Research Only)

Date: 2026-10-31. Research: web search on VLM captioning/metadata/retrieval architecture 2025.

## Trạng thái
Không triển khai. Đây là tài liệu định hướng.

## Đánh giá các ý tưởng

### 1. VLM image captioning (upload-time metadata)
- User value: tự động tạo caption/alt-text, giảm friction đóng góp.
- Feasibility: cao. Qwen2.5-VL / InternVL (open weights) hoặc Gemini/GPT-4o-mini API.
- Cost: GPU inference (self-host) hoặc API per-image. JSON-mode structured output.
- Integration: async worker queue sau upload, không block hot path.
- Risk: hallucination → cần human review trước khi publish attribute.

### 2. Visual attribute extraction (PhotoAttribute auto-suggest)
- Cao value: giảm manual tagging workload moderator.
- Data: PhotoAttribute hiện tại là ground truth tốt.
- Approach: VLM JSON-mode trả attribute codes từ taxonomy hiện có, moderator confirm.
- Incremental: bắt đầu suggest-only, không auto-publish.

### 3. Image-text embedding (natural language place search)
- "Tìm chỗ có nhiều cây xanh ngắm hoàng hôn" → embedding query → similarity với ảnh/metadata.
- Cần vector DB (pgvector trên PostgreSQL hiện có — không cần thêm DB).
- Latency: embedding query ~10ms, retrieval <100ms. OK.
- Data: cần đủ ảnh + metadata để có ý nghĩa. MVP chưa đủ.

### 4. Hybrid search (BM25 + vector + re-rank)
- Research finding: production pattern là hybrid dense+sparse + cross-encoder re-rank.
- Chỉ có giá trị khi có cả FTS và vector index. Sau MVP.

### 5. Similar place recommendation
- Hiện tại: attribute overlap (deterministic). Có thể nâng cấp bằng CLIP/SigLIP embedding similarity.
- Value: tăng engagement. Cost: embedding batch offline.

### 6. Conversational discovery
- Rủi ro cao nhất: hallucination, latency, cost. Không khuyến nghị trước khi có 1–3 hoạt động tốt.

### 7. Photo quality assessment
- Blur/exposure scoring bằng traditional CV (không cần VLM) — có thể thêm sớm nếu cần.

### 8. Content moderation assistance
- NSFW/safety classifier trước moderation. Incremental, moderator vẫn quyết.

## Kiến trúc boundary cần lưu ý (không implement)
- Ingestion async queue tách khỏi request path.
- Metadata lưu vào field riêng (không đè PhotoAttribute manual).
- pgvector khi cần vector search — không thêm schema bây giờ.
- Cost control: model cascading (small model cho ảnh đơn giản, large cho phức tạp), quantization INT4/FP8, serverless GPU.

## Khi nào nên bắt đầu
Chỉ khi: (1) có ≥ 500 ảnh thật, (2) moderator workload chứng minh cần automation, (3) ngân sách GPU/API được duyệt. Trước đó: giữ deterministic.
