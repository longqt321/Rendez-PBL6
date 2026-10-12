import type { components } from "./generated";

// The frontend contract is generated from Django's OpenAPI serializers.
export type Attribute = components["schemas"]["VisualAttribute"];
export type PublicPhoto = components["schemas"]["PublicPhoto"];
export type VisualPlace = components["schemas"]["VisualPlace"];
export type FeedItem = components["schemas"]["FeedItem"];
export type VisualDetail = components["schemas"]["VisualDetail"];
export type PhotoDetail = components["schemas"]["PhotoDetail"];
export type VisualMap = components["schemas"]["VisualMap"];
export type Submission = components["schemas"]["PhotoSubmission"];
