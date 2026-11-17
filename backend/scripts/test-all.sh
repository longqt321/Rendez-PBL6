#!/usr/bin/env bash
# Chạy toàn bộ test backend, mỗi file một process Bun riêng.
#
# Vì sao không dùng `bun test` một lần cho cả thư mục:
#   - `helpers/pg.ts` mở một Testcontainer + một Prisma client cho MỖI file.
#     Chạy chung một process khiến các file ghi đè `process.env.DATABASE_URL`
#     của nhau (file trước trỏ vào container đã dừng → ECONNREFUSED).
#   - Chạy đủ 40 file trong một process còn làm Bun segfault (SIGILL) tại
#     `test/demo-api.test.ts` — lỗi runtime của Bun, không phải lỗi test.
# Tách process giải quyết cả hai: mỗi file có container + env + JIT riêng.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

files=(test/*.test.ts)
total=${#files[@]}
failed=()
passed=0

for file in "${files[@]}"; do
  printf '── %s\n' "$file"
  # `--parallel=1` giữ nguyên thứ tự test trong file; process đã tách riêng.
  if bun test --parallel=1 "$file" >/tmp/rendez-test-$(basename "$file").log 2>&1; then
    passed=$((passed + 1))
  else
    failed+=("$file")
    # In phần lỗi để không phải mở log.
    grep -E "\(fail\)|error:|Expected|Received" "/tmp/rendez-test-$(basename "$file").log" | head -20
  fi
done

printf '\n%s/%s file pass' "$passed" "$total"
if [ ${#failed[@]} -gt 0 ]; then
  printf ', %s file fail:\n' "${#failed[@]}"
  printf '  - %s\n' "${failed[@]}"
  exit 1
fi
printf '\n'
