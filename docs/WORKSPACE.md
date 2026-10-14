# Workspace

Mọi mã nguồn, dữ liệu nguồn và scripts nằm tại gốc `rendez-web`:

```text
frontend/       React, TypeScript, ảnh chủ đề và bản đồ local
backend/        Django, API, migrations, quản trị và tests
data/           manifest, JPEG thật và nguồn/giấy phép
docs/           hướng dẫn, checklist và kết quả kiểm chứng
scripts/        setup/start/stop/check/backup/restore
.local/         PostgreSQL, media, secrets, logs, backup; không commit
```

`compose.local.yaml` dùng PostgreSQL riêng ở 55433, bind mount trong workspace. `compose.yaml` cũ giữ nguyên để không đổi nhận diện container/volume đang có. Database/media cũ được giữ; cấu hình local mới nằm ở `.local/runtime.env`, được scripts nạp trước khi chạy.

`make setup`, `make start` chạy bản build ở 8080. `make backend`, `make frontend` phục vụ phát triển ở 8000/5173. Không triển khai cloud. Caddyfile cũ được giữ nhưng bản local không cần Caddy.

`.gitignore` bỏ secrets/runtime/dependencies/artifacts khỏi Git. `.ignore` bỏ thư mục lớn khỏi tìm kiếm bằng rg. Mỗi module được kiểm tra sau khi hoàn thành; kết quả/log nằm trong `.local/logs`, ảnh kiểm chứng ở `.local/screenshots`. Không đưa ảnh kiểm chứng vào dữ liệu sản phẩm.

Xem [README](../README.md) để chạy và [LOCAL-RELEASE](LOCAL-RELEASE.md) để biết phạm vi đã kiểm chứng.
