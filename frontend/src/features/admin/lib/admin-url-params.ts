import { parseAsString, parseAsStringLiteral } from "nuqs"

export const ADMIN_TAB_KEYS = [
  "overview",
  "reports",
  "places",
  "users",
  "observability",
  "logs",
] as const

export const ADMIN_REPORT_STATUS_VALUES = ["pending", "reviewed", "dismissed", "all"] as const
export const ADMIN_PLACE_VISIBILITY_VALUES = ["all", "published", "unpublished", "closed"] as const
export const ADMIN_PLACE_CATEGORY_VALUES = [
  "all",
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
] as const
export const ADMIN_USER_ROLE_VALUES = ["all", "user", "moderator", "admin"] as const
export const ADMIN_USER_STATUS_VALUES = ["all", "active", "banned"] as const
export const ADMIN_OBS_KIND_VALUES = [
  "all",
  "slow_request",
  "server_error",
  "client_error",
  "web_vital",
] as const

const REPLACE_OPTS = { history: "replace" } as const

export const ADMIN_URL_PARSERS = {
  tab: parseAsStringLiteral(ADMIN_TAB_KEYS).withDefault("overview").withOptions(REPLACE_OPTS),
  rStatus: parseAsStringLiteral(ADMIN_REPORT_STATUS_VALUES)
    .withDefault("pending")
    .withOptions(REPLACE_OPTS),
  pQ: parseAsString.withDefault("").withOptions(REPLACE_OPTS),
  pVis: parseAsStringLiteral(ADMIN_PLACE_VISIBILITY_VALUES)
    .withDefault("all")
    .withOptions(REPLACE_OPTS),
  pDistrict: parseAsString.withDefault("all").withOptions(REPLACE_OPTS),
  pCat: parseAsStringLiteral(ADMIN_PLACE_CATEGORY_VALUES)
    .withDefault("all")
    .withOptions(REPLACE_OPTS),
  uQ: parseAsString.withDefault("").withOptions(REPLACE_OPTS),
  uRole: parseAsStringLiteral(ADMIN_USER_ROLE_VALUES).withDefault("all").withOptions(REPLACE_OPTS),
  uStatus: parseAsStringLiteral(ADMIN_USER_STATUS_VALUES)
    .withDefault("all")
    .withOptions(REPLACE_OPTS),
  obsKind: parseAsStringLiteral(ADMIN_OBS_KIND_VALUES).withDefault("all").withOptions(REPLACE_OPTS),
  obsQ: parseAsString.withDefault("").withOptions(REPLACE_OPTS),
  lQ: parseAsString.withDefault("").withOptions(REPLACE_OPTS),
  lEntity: parseAsString.withDefault("all").withOptions(REPLACE_OPTS),
  lAction: parseAsString.withDefault("all").withOptions(REPLACE_OPTS),
}

export const CLEAR_ALL_ADMIN_FILTERS = {
  rStatus: null,
  pQ: null,
  pVis: null,
  pDistrict: null,
  pCat: null,
  uQ: null,
  uRole: null,
  uStatus: null,
  obsKind: null,
  obsQ: null,
  lQ: null,
  lEntity: null,
  lAction: null,
} as const
