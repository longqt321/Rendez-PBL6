/**
 * Kịch bản lỗi cho mock server — chọn qua biến môi trường `VITE_MOCK_SCENARIO`.
 *
 * Mục đích: kiểm tra UI với trạng thái lỗi (500, 401, mất mạng, chậm, rỗng)
 * mà không phải sửa code. Xem `docs/DECISIONS.md` D-041.
 *
 * Phạm vi áp dụng (xử lý trong `src/mocks/server.ts`):
 * - `slow`, `empty`, `server-error`, `unauthorized` chỉ áp dụng cho **GET** —
 *   mutation (POST/PATCH/DELETE) vẫn hoạt động bình thường.
 * - `offline` áp dụng cho **mọi method** (mọi request lỗi mạng, status 0).
 */

export interface MockScenario {
  /** Trễ thêm mỗi response (ms) */
  delayMs: number
  /** GET trả danh sách rỗng */
  emptyLists: boolean
  /** GET trả 500 */
  serverError: boolean
  /** GET /me trả 401 */
  unauthorized: boolean
  /** Mọi request lỗi mạng (status 0) */
  offline: boolean
  /** `POST /media` trả 503 — môi trường chưa cấu hình R2 (ẩn nút upload) */
  mediaUnavailable: boolean
}

const SCENARIOS: Record<string, MockScenario> = {
  ok: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  slow: {
    delayMs: 3000,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  empty: {
    delayMs: 0,
    emptyLists: true,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  "server-error": {
    delayMs: 0,
    emptyLists: false,
    serverError: true,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  unauthorized: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: true,
    offline: false,
    mediaUnavailable: false,
  },
  offline: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: true,
    mediaUnavailable: false,
  },
  /** Backend chưa cấu hình R2 → `POST /media` trả 503, composer ẩn nút upload. */
  "media-unavailable": {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: true,
  },
}

/**
 * Chuyển tên kịch bản thành cấu hình. Giá trị lạ (kể cả rỗng) rơi về `ok`
 * thay vì crash — sai cấu hình mock không được làm gãy dev server.
 */
export function resolveScenario(name: string): MockScenario {
  return SCENARIOS[name] ?? SCENARIOS.ok
}
