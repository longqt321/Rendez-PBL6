/** Hợp đồng phân trang cursor dùng chung cho mọi endpoint danh sách. */
export interface Page<T> {
  items: T[]
  next: string | null
}
