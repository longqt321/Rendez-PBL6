/**
 * Metadata vận hành của một trang danh sách (đo server-side, không phải suy đoán
 * ở client). Mọi giá trị đều là số liệu thật của lần xử lý request đó.
 */
export interface PageMeta {
  /** Thời gian server xử lý phần truy vấn (ms, số nguyên). */
  tookMs: number
  /** `true` chỉ khi body được phục vụ từ cache ứng dụng (không phải HTTP cache). */
  cacheHit: boolean
  /** Tổng số bản ghi khớp bộ lọc (COUNT thật) — KHÔNG phải số item trong trang. */
  totalResults: number
  /**
   * Chỉ có ở các endpoint tìm kiếm: khi không có kết quả, tên địa điểm gần nhất
   * theo `pg_trgm` (similarity ≥ 0.45, tên ≥ 5 ký tự chuẩn hoá, loại ứng viên trùng đúng
   * query) để client gợi ý "ý bạn là…".
   */
  didYouMean?: string | null
}

/** Hợp đồng phân trang cursor dùng chung cho mọi endpoint danh sách. */
export interface Page<T> {
  items: T[]
  next: string | null
  /** Optional để không phá các endpoint/consumer chưa gắn metadata. */
  meta?: PageMeta
}
