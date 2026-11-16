#!/bin/sh
set -e

# Xác định số lượng tiến trình cần khởi chạy dựa trên số CPU được cấp hoặc mặc định 2
NUM_CORES=$(nproc 2>/dev/null || echo 2)
if [ "$NUM_CORES" -lt 1 ]; then
  NUM_CORES=2
fi
# Giới hạn tối đa 4 workers trong container
if [ "$NUM_CORES" -gt 4 ]; then
  NUM_CORES=4
fi

echo "Khởi chạy API Cluster với $NUM_CORES tiến trình Bun (reusePort + Postgres LISTEN/NOTIFY)..."

PIDS=""

# Tiến trình 1: Nhận request HTTP + chạy pg-boss background cron
WORKER_DISABLED=false bun backend/dist/server.js &
PIDS="$! $PIDS"

# Các tiến trình còn lại: Chỉ nhận request HTTP (tận dụng full cores), tắt background cron để tránh duplicate job
i=2
while [ "$i" -le "$NUM_CORES" ]; do
  WORKER_DISABLED=true bun backend/dist/server.js &
  PIDS="$! $PIDS"
  i=$((i + 1))
done

# Bắt tín hiệu SIGTERM / SIGINT để graceful shutdown toàn bộ child processes
trap 'kill -TERM $PIDS 2>/dev/null; wait' TERM INT

wait
