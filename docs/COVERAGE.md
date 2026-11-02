# COVERAGE: 36 nhóm vấn đề → cơ chế xử lý

Ký hiệu:
- **Máy chặn**: hook, script hoặc git hook tự chặn hoặc báo lỗi, không phụ thuộc agent nhớ.
- **Một phần**: máy kiểm được một số dấu hiệu, phần còn lại là hướng dẫn.
- **Hướng dẫn**: nằm trong skill, CLAUDE.md, hoặc reviewer. Agent được nhắc nhưng không bị máy chặn.

Lưu ý trung thực: bộ kit không thể đảm bảo agent không bao giờ sai. Nó làm cho sai lầm khó lọt qua hơn, và buộc agent phải có bằng chứng trước khi báo xong.

| # | Nhóm vấn đề | Cơ chế | Mức |
|---|---|---|---|
| 1 | Hiểu sai yêu cầu | /task-start hỏi lại; skill requirements-and-scope; .agent/task.json khóa phạm vi | Một phần |
| 2 | Mất ngữ cảnh | Hook SessionStart nạp trạng thái; PROGRESS, DECISIONS, FAILED_ATTEMPTS; Stop gate bắt cập nhật PROGRESS | Máy chặn |
| 3 | Bịa API, schema, kết quả | STACK.md; skill engineering-discipline bắt xác minh trong source; reviewer đối chiếu | Một phần |
| 4 | Lệch phiên bản API | stack-snapshot.mjs; SessionStart cảnh báo STACK cũ; skill api-contracts | Một phần |
| 5 | Tự viết lại thứ đã có | Quy tắc grep trước khi viết; reviewer kiểm | Hướng dẫn |
| 6 | Overengineering | Quy tắc không thêm abstraction sớm; ghi DECISIONS khi thêm dependency | Một phần |
| 7 | Lệch kiến trúc | DECISIONS làm nguồn sự thật; reviewer đối chiếu; quy tắc một nghiệp vụ một chỗ | Một phần |
| 8 | Hồi quy | verify.mjs chạy lint, typecheck, test, build; Stop gate chặn khi bằng chứng cũ | Máy chặn |
| 9 | Lập kế hoạch kém | /task-start yêu cầu tiêu chí xong và phụ thuộc; guard chặn sửa ngoài phạm vi | Một phần |
| 10 | UI đại trà | VOICE.md, UX_RULES.md; check-copy cảnh báo eyebrow và cụm cấm | Một phần |
| 11 | Landing page bias | UX_RULES cấm hero trên màn hình công cụ; check-copy cảnh báo eyebrow | Một phần |
| 12 | Không khám phá thiết kế | /audit-design; quy tắc đưa phương án cho người duyệt | Hướng dẫn |
| 13 | UX và thông tin kém | UX_RULES mục 2, 3, 6; ui-auditor | Hướng dẫn |
| 14 | Design system không nhất quán | /audit-design; skill ui-copy-and-layout; ui-auditor | Hướng dẫn |
| 15 | UI nông (thiếu trạng thái) | UX_RULES mục 4 (rỗng, tải, lỗi); ui-auditor kiểm từng trạng thái | Hướng dẫn |
| 16 | Responsive và truy cập | UX_RULES mục 9; kiểm 1280×720 và 390×844 | Hướng dẫn |
| 17 | Kiến trúc frontend | Quy tắc component và state; reviewer | Hướng dẫn |
| 18 | Thiết kế không khớp code | ui-auditor đối chiếu; /review-ui | Hướng dẫn |
| 19 | Backend ngây thơ | backend-data-and-security (transaction, lỗi, job nền) | Hướng dẫn |
| 20 | N+1, query kém | backend skill; không có máy kiểm tự động (EXPLAIN do người hoặc agent chạy) | Hướng dẫn |
| 21 | Thiếu tối ưu | release-and-reliability: đo trước, đo sau | Hướng dẫn |
| 22 | Thiết kế dữ liệu kém | Guard chặn sửa migration cũ; backend skill về ràng buộc và kiểu dữ liệu | Một phần |
| 23 | API thiết kế kém | api-contracts-and-integration | Hướng dẫn |
| 24 | Tách trách nhiệm kém | Quy tắc ranh giới trong engineering-discipline; reviewer | Hướng dẫn |
| 25 | Bảo mật | Pre-commit quét secret; guard chặn .env và lệnh xóa; backend skill (authz, upload, rate limit) | Một phần |
| 26 | Đồng thời, nhất quán dữ liệu | backend skill (transaction, optimistic lock, idempotency) | Hướng dẫn |
| 27 | Chưa sẵn sàng production | release-and-reliability (log, rollback, migration nhiều bước) | Hướng dẫn |
| 28 | Không mở rộng được | Không có máy kiểm; đánh giá khi thiết kế | Hướng dẫn |
| 29 | Chọn công nghệ sai | Guard hỏi trước khi thêm dependency; DECISIONS bắt ghi phương án bị loại | Máy chặn (một phần) |
| 30 | Lệch frontend–backend | api-contracts; kiểu dữ liệu một nguồn; reviewer | Hướng dẫn |
| 31 | Test yếu | verify chạy test thật; release skill yêu cầu test biên và lỗi; reviewer | Một phần |
| 32 | Phụ thuộc và môi trường lệch | Guard chặn sửa lockfile bằng tay; stack-snapshot; cảnh báo lockhash | Một phần |
| 33 | Git hỗn loạn | Guard chặn reset, clean, checkout ., force push, xóa nhánh, --no-verify; commit-msg; pre-commit | Máy chặn |
| 34 | Tối ưu sai chỉ số | release skill: đo người dùng thật, nêu đánh đổi | Hướng dẫn |
| 35 | Báo xong giả | Stop gate; verify ghi hash mã; reviewer; mục "Chưa xác minh" bắt buộc | Máy chặn |
| 36 | Rủi ro agent tự chủ | Loop guard chặn lặp; Stop gate có giới hạn chống kẹt; scope guard; reviewer độc lập; guard hành động phá hủy | Máy chặn (một phần) |

## Phần chưa được máy chặn và cách bù

- Chất lượng thiết kế, trải nghiệm, đúng nghiệp vụ: không máy nào đánh giá được. Bù bằng ui-auditor, reviewer, và người dùng duyệt ở các điểm đã ghi trong quy trình.
- Hiệu năng và query: cần đo thật. Bù bằng quy trình đo trước và sau, và yêu cầu ghi số liệu.
- Kết quả hook trong phiên Claude Code thật: chưa kiểm trong sandbox. Bước 6 của AGENT_BOOTSTRAP.md yêu cầu người dùng xác nhận.
