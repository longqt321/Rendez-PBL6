/**
 * Schema đã chuyển sang `@rendez/schema` (workspace chung FE/BE).
 * File này chỉ re-export để giữ nguyên import path cũ trong feature.
 */
export {
  userProfileSchema,
  userSuggestionSchema,
  userSuggestionsSchema,
  updateMeInputSchema,
} from "@rendez/schema"
export type { UpdateMeInput, UserSuggestion } from "@rendez/schema"
