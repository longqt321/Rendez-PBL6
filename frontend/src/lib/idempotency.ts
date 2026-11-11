/**
 * Header `Idempotency-Key` cho mutation quan trọng (K2).
 *
 * Mỗi LẦN người dùng bấm là một khoá mới: server lưu response theo
 * `(key, user)` 24 giờ, nên nếu request bị gửi lặp (mạng chập chờn, client
 * retry cùng request) server trả lại đúng kết quả cũ thay vì tạo bản ghi thứ
 * hai. Khoá mới cho thao tác mới là hành vi đúng — dùng lại khoá cũ sẽ bị 422
 * khi payload khác.
 */
export function idempotencyHeaders(): Record<string, string> {
  return { "Idempotency-Key": crypto.randomUUID() }
}
