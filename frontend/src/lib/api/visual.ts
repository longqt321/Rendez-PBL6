import type { components } from "./generated";

// The frontend contract is generated from Django's OpenAPI serializers.
export type Attribute = components["schemas"]["VisualAttribute"];
export type PublicPhoto = components["schemas"]["PublicPhoto"] & {
  author_id?: string;
};
export type VisualPlace = components["schemas"]["VisualPlace"];
export type FeedItem = components["schemas"]["FeedItem"];
export type VisualDetail = components["schemas"]["VisualDetail"];
export type PhotoDetail = components["schemas"]["PhotoDetail"] & {
  comments_count?: number;
};
export type VisualMap = components["schemas"]["VisualMap"];
export type Submission = components["schemas"]["PhotoSubmission"];

export interface PhotoComment {
  id: number;
  photo_id: string;
  author_name: string;
  body: string;
  created_at: string;
  is_owner: boolean;
}

export interface Creator {
  id: string;
  display_name: string;
  joined_at: string;
  photo_count: number;
}
