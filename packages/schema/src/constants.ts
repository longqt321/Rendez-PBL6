
// ---------------------------------------------------------------------------
// Địa lý
// ---------------------------------------------------------------------------

export interface Coordinates {
  lat: number
  lng: number
}

export const DANANG_CENTER: Coordinates = {
  lat: 16.0612,
  lng: 108.2272,
}

export const DANANG_CENTER_TUPLE: [number, number] = [DANANG_CENTER.lat, DANANG_CENTER.lng]

export const DANANG_DEFAULT_ZOOM = 13

// ---------------------------------------------------------------------------
// Giới hạn ký tự — khớp validate ở `mocks/server.ts`
// ---------------------------------------------------------------------------

export const MAX_CAPTION_LENGTH = 500

export const MIN_CAPTION_LENGTH = 3

export const MAX_POST_IMAGES = 4

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024

export const PLACE_SUGGESTION_MIN_CHARS = 8

export const MAX_REVIEW_CONTENT_LENGTH = 1000

export const MAX_REPORT_DETAIL_LENGTH = 300

export const MAX_COLLECTION_NAME_LENGTH = 80

export const MAX_COLLECTION_DESCRIPTION_LENGTH = 400

// ---------------------------------------------------------------------------
// Phòng lọc nhóm
// ---------------------------------------------------------------------------

export const MAX_ROOM_NAME_LENGTH = 60

export const ROOM_CODE_LENGTH = 6

export const MAX_ROOM_KEYWORD_LENGTH = 30

export const MAX_MEMBER_NAME_LENGTH = 30

// ---------------------------------------------------------------------------
// Hồ sơ cá nhân — khớp validate form ở `settings-page`
// ---------------------------------------------------------------------------

export const MAX_PROFILE_NAME_LENGTH = 40

export const MAX_PROFILE_BIO_LENGTH = 160

export const MAX_PROFILE_LOCATION_LENGTH = 60
