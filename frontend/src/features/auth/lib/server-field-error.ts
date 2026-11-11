/**
 * Gắn lỗi server về đúng field của form xác thực.
 *
 * Backend trả `{ message: string }` (xem `lib/axios.ts` — interceptor chuẩn hoá
 * thành `ApiError`). Message như "Email đã được sử dụng" hay "Handle đã được
 * sử dụng" có thể gắn thẳng lên field tương ứng; message nhắc nhiều field
 * ("Email hoặc mật khẩu không đúng") hoặc không nhắc field nào thì giữ ở dòng
 * lỗi chung cuối form.
 */

/** Từ khoá nhận diện field trong message lỗi server (không phân biệt hoa/thường). */
const FIELD_PATTERNS: ReadonlyArray<{ field: string; pattern: RegExp }> = [
  { field: "email", pattern: /email/i },
  { field: "handle", pattern: /handle/i },
  { field: "password", pattern: /mật khẩu|password/i },
  { field: "name", pattern: /\btên\b|\bname\b/i },
]

/**
 * Trả về field duy nhất được nhắc trong message, hoặc `undefined` nếu message
 * nhắc nhiều field / không nhắc field nào (khi đó UI hiện lỗi chung cuối form).
 *
 * @param fields Danh sách field của form gọi hàm — kết quả luôn thuộc danh sách này.
 */
export function serverErrorField<K extends string>(
  message: string,
  fields: ReadonlyArray<K>,
): K | undefined {
  const matched = new Set(
    FIELD_PATTERNS.filter(({ pattern }) => pattern.test(message)).map(({ field }) => field),
  )
  const hits = fields.filter((field) => matched.has(field))
  return hits.length === 1 ? hits[0] : undefined
}
