import type { components } from "./generated";

/**
 * Backend contract.
 *
 * Every type here is derived from the generated OpenAPI schema. Do not
 * redeclare these shapes by hand in feature code — regenerate with
 * `bun run schema:generate` when the backend contract changes.
 */
type Schemas = components["schemas"];

export type Profile = Schemas["Profile"];
export type Category = Schemas["Category"];
export type VisualAttribute = Schemas["VisualAttribute"];
export type VisualPlace = Schemas["VisualPlace"];
export type VisualDetail = Schemas["VisualDetail"];
export type PublicPhoto = Schemas["PublicPhoto"];
export type PhotoDetail = Schemas["PhotoDetail"];
export type FeedItem = Schemas["FeedItem"];
export type VisualMap = Schemas["VisualMap"];
export type Post = Schemas["Post"];
export type PostMedia = Schemas["PostMedia"];
export type PostComment = Schemas["Comment"];
export type PhotoSubmission = Schemas["PhotoSubmission"];
export type SubmissionAsset = Schemas["SubmissionAsset"];
export type CreatorProfile = Schemas["CreatorProfile"];
export type OpeningHours = Schemas["OpeningHours"];
export type AttributeEvidence = Schemas["AttributeEvidence"];
export type ReasonEnum = Schemas["ReasonEnum"];

/** Django page-number pagination envelope. */
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Photo likes endpoint payload. */
export type PhotoLikes = Schemas["PhotoLikes"];

/** Sort orders accepted by the discovery endpoints. */
export const SORT_OPTIONS = [
  { value: "recent", label: "Mới nhất" },
  { value: "name", label: "Tên A → Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** The filter set shared by discovery, search and the map. */
export type DiscoveryFilters = {
  q: string;
  category: string;
  attributes: string[];
  sort: string;
};

export const EMPTY_FILTERS: DiscoveryFilters = {
  q: "",
  category: "",
  attributes: [],
  sort: "recent",
};

/** Serialise filters into the query string the backend expects. */
export function filtersToParams(filters: DiscoveryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.attributes.length) {
    params.set("attributes", [...filters.attributes].sort().join(","));
  }
  if (filters.sort && filters.sort !== "recent")
    params.set("sort", filters.sort);
  return params;
}

/** Read filters back out of a query string, tolerating unknown values. */
export function paramsToFilters(params: URLSearchParams): DiscoveryFilters {
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    attributes: (params.get("attributes") ?? "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean),
    sort: params.get("sort") ?? "recent",
  };
}

export function hasActiveFilters(filters: DiscoveryFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.category || filters.attributes.length,
  );
}
