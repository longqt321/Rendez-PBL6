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

  hide: -3,
  lessLikeThis: -2,

  skipped: 0,
} as const

export type InteractionKind = keyof typeof INTERACTION_WEIGHTS

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

export function weightForEvent(eventType: string): number | null {
  const kind = EVENT_TO_KIND[eventType]
  return kind ? INTERACTION_WEIGHTS[kind] : null
}
