#!/bin/sh
set -e

# Xác định số lượng tiến trình cần khởi chạy dựa trên số CPU được cấp hoặc mặc định 2
NUM_CORES=$(nproc 2>/dev/null || echo 2)
if [ "$NUM_CORES" -lt 1 ]; then
  NUM_CORES=2
fi
# Giới hạn tối đa 3 workers (1 primary giữ ONNX + cron + 2 HTTP workers) để tiết kiệm RAM
if [ "$NUM_CORES" -gt 3 ]; then
  NUM_CORES=3
fi

EMBEDDING_PORT="${EMBEDDING_INTERNAL_PORT:-8001}"
echo "Khởi chạy API Cluster với $NUM_CORES tiến trình Bun --smol (shared ONNX :$EMBEDDING_PORT + reusePort)..."

PIDS=""
STOPPING=0

# Tiến trình 1: Nhận request HTTP + chạy pg-boss background cron + giữ ONNX Runtime duy nhất
WORKER_DISABLED=false EMBEDDING_INTERNAL_PORT="$EMBEDDING_PORT" bun --smol backend/dist/server.js &
PIDS="$!"

# Các tiến trình còn lại: Chỉ nhận request HTTP, gọi embedding qua loopback (không nạp ONNX)
i=2
while [ "$i" -le "$NUM_CORES" ]; do
  WORKER_DISABLED=true EMBEDDING_SERVICE_URL="http://127.0.0.1:$EMBEDDING_PORT" bun --smol backend/dist/server.js &
  PIDS="$PIDS $!"
  i=$((i + 1))
done

cleanup() {
  STOPPING=1
  kill -TERM $PIDS 2>/dev/null || true
  wait
}

trap cleanup TERM INT

# Giám sát các worker: nếu bất kỳ worker nào chết bất thường (VD: OOM), thoát non-zero để Docker restart
while [ "$STOPPING" -eq 0 ]; do
  for pid in $PIDS; do
    if ! kill -0 "$pid" 2>/dev/null; then
      if [ "$STOPPING" -eq 0 ]; then
        echo "Worker PID $pid đã dừng bất thường — dừng cluster để khởi động lại" >&2
        STOPPING=1
        kill -TERM $PIDS 2>/dev/null || true
        wait
        exit 1
      fi
    fi
  done
  sleep 5
done
