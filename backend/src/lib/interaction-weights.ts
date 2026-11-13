/**
 * Trọng số chuẩn hoá cho MỌI sự kiện tương tác — MỘT nguồn duy nhất.
 *
 * Quy ước (báo cáo kiến trúc mục 9.2): trọng số dương = tín hiệu quan tâm,
 * âm = tín hiệu loại trừ. `interaction_events.weight` lưu sẵn giá trị này để
 * job affinity/ALS/eval đọc nhanh, KHÔNG tính lại ở nơi khác.
 *
 * Cấm hardcode trọng số ở route/job/FE — mọi nơi import từ file này.
 */
export const INTERACTION_WEIGHTS = {
  impression: 1,
  click: 2,
  detailView: 1,
  search: 2,
  filterChange: 1,
  comment: 3,
  like: 4,
  save: 5,
  share: 6,
  checkin: 6,
  review: 8,
  explicit: 10,
  /** "Ẩn quán này" — tín hiệu âm mạnh hơn "bớt gợi ý loại này". */
  hide: -3,
  lessLikeThis: -2,
  /** Bỏ qua onboarding — không phải tín hiệu sở thích, chỉ để đo funnel. */
  skipped: 0,
} as const

export type InteractionKind = keyof typeof INTERACTION_WEIGHTS

/**
 * Tên event gửi từ FE/BE → kind trọng số. Tên event là hợp đồng API (FE dùng
 * đúng chuỗi này); giữ ở đây để một chỗ duy nhất định nghĩa cả tên lẫn weight.
 */
export const EVENT_TO_KIND: Record<string, InteractionKind> = {
  place_impression: "impression",
  place_click: "click",
  place_detail_view: "detailView",
  search_query: "search",
  filter_change: "filterChange",
  comment_created: "comment",
  post_like: "like",
  post_save: "save",
  place_save: "save",
  place_share: "share",
  post_checkin: "checkin",
  review_created: "review",
  onboarding_step_complete: "explicit",
  preference_updated: "explicit",
  feedback_hide: "hide",
  feedback_less_like_this: "lessLikeThis",
  onboarding_skipped: "skipped",
} as const

/** Trọng số của một event theo tên; `null` khi event không thuộc taxonomy. */
export function weightForEvent(eventType: string): number | null {
  const kind = EVENT_TO_KIND[eventType]
  return kind ? INTERACTION_WEIGHTS[kind] : null
}
