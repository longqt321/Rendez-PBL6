/**
 * Hợp đồng phân trang cursor dùng chung cho mọi endpoint danh sách.
 *
 * `next` do server quyết định — frontend chỉ chuyền lại giá trị đó ở request kế tiếp,
 * không tự tính offset.
 */
export interface Page<T> {
  items: T[]
  next: string | null
}
