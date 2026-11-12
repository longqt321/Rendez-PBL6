/**
 * Nguồn sự thật đã chuyển sang `@rendez/schema` (workspace chung FE/BE).
 * File này chỉ re-export để giữ nguyên import path cũ trong feature.
 */
export type {
  Place,
  PlaceCategory,
  PlaceStatus,
  PlaceSummary,
  PlaceSuggestion,
  DailyPick,
  DailyPicks,
} from "@rendez/schema"
