import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type {
  Category,
  CreatorProfile,
  FeedItem,
  Page,
  PhotoDetail,
  PhotoLikes,
  Post,
  PostComment,
  PublicPhoto,
  VisualAttribute,
  VisualDetail,
  VisualMap,
  VisualPlace,
} from "./types";

/**
 * Query keys.
 *
 * Centralised so mutations can invalidate precisely. Every key that depends on
 * the signed-in user includes their id: saving a place changes `is_saved` on
 * every cached place payload, so a stale cache from a previous session must
 * never be reused.
 */
export const queryKeys = {
  me: ["me"] as const,
  categories: ["categories"] as const,
  attributes: ["attributes"] as const,
  feed: (params: string, userId?: string) => ["feed", params, userId] as const,
  places: (params: string, userId?: string) =>
    ["places", params, userId] as const,
  savedPlaces: (params: string, userId?: string) =>
    ["saved-places", params, userId] as const,
  place: (id: string, userId?: string) => ["place", id, userId] as const,
  placeGallery: (id: string, params: string) =>
    ["place-gallery", id, params] as const,
  photo: (id: string, userId?: string) => ["photo", id, userId] as const,
  photoLikes: (id: string) => ["photo-likes", id] as const,
  photoComments: (id: string) => ["photo-comments", id] as const,
  similarPhotos: (id: string, userId?: string) =>
    ["similar-photos", id, userId] as const,
  post: (id: string, userId?: string) => ["post", id, userId] as const,
  posts: (params: string) => ["posts", params] as const,
  savedPosts: (userId?: string) => ["saved-posts", userId] as const,
  postComments: (id: string) => ["post-comments", id] as const,
  map: (params: string, bbox: string) => ["map", params, bbox] as const,
  creator: (id: string) => ["creator", id] as const,
  creatorPhotos: (id: string, page: number) =>
    ["creator-photos", id, page] as const,
};

/** Build a `page`-suffixed query string from an existing parameter string. */
function withPage(params: string, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return next.toString();
}

/** Extract the page number from a pagination `next`/`previous` URL. */
function pageFromUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  const parsed = new URL(url, window.location.origin);
  return parsed.searchParams.get("page") ?? undefined;
}

/* ------------------------------------------------------------- Taxonomies */

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => api<Category[]>("categories/", { signal }),
    staleTime: 10 * 60_000,
  });
}

export function useAttributes() {
  return useQuery({
    queryKey: queryKeys.attributes,
    queryFn: ({ signal }) => api<VisualAttribute[]>("attributes/", { signal }),
    staleTime: 10 * 60_000,
  });
}

/* -------------------------------------------------------------- Discovery */

/** Community feed: one card per published photo, grouped with its place. */
export function useFeed(params: string, userId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(params, userId),
    initialPageParam: "1",
    queryFn: ({ signal, pageParam }) =>
      api<Page<FeedItem>>("feed/?" + withPage(params, Number(pageParam)), {
        signal,
      }),
    getNextPageParam: (lastPage) => pageFromUrl(lastPage.next),
    enabled,
  });
}

/** Places list — used by search results and the place picker. */
export function usePlaces(params: string, userId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.places(params, userId),
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("places/?" + params, { signal }),
    enabled,
  });
}

/** Saved places for the signed-in member. */
export function useSavedPlaces(params: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.savedPlaces(params, userId),
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("favorites/?" + params, { signal }),
    enabled: Boolean(userId),
  });
}

export function usePlace(id: string | undefined, userId?: string) {
  return useQuery({
    queryKey: queryKeys.place(id ?? "", userId),
    queryFn: ({ signal }) =>
      api<VisualDetail>("places/" + id + "/", { signal }),
    enabled: Boolean(id),
  });
}

export function usePlaceGallery(
  id: string | undefined,
  params: string,
  initialPage?: Page<PublicPhoto>,
) {
  return useQuery({
    queryKey: queryKeys.placeGallery(id ?? "", params),
    queryFn: ({ signal }) =>
      api<Page<PublicPhoto>>("places/" + id + "/photos/?" + params, { signal }),
    enabled: Boolean(id),
    initialData: initialPage,
  });
}

export function usePhoto(id: string | undefined, userId?: string) {
  return useQuery({
    queryKey: queryKeys.photo(id ?? "", userId),
    queryFn: ({ signal }) => api<PhotoDetail>("photos/" + id + "/", { signal }),
    enabled: Boolean(id),
  });
}

export function useSimilarPhotos(photoId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: queryKeys.similarPhotos(photoId ?? "", userId),
    queryFn: ({ signal }) =>
      api<FeedItem[]>("photos/" + photoId + "/similar/", { signal }),
    enabled: Boolean(photoId),
  });
}

/* ------------------------------------------------------------- Experiences */

export function usePosts(params: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.posts(params),
    queryFn: ({ signal }) => api<Page<Post>>("posts/?" + params, { signal }),
    enabled,
  });
}

export function usePost(id: string | undefined, userId?: string) {
  return useQuery({
    queryKey: queryKeys.post(id ?? "", userId),
    queryFn: ({ signal }) => api<Post>("posts/" + id + "/", { signal }),
    enabled: Boolean(id),
  });
}

export function useSavedPosts(userId?: string) {
  return useQuery({
    queryKey: queryKeys.savedPosts(userId),
    queryFn: ({ signal }) => api<Page<Post>>("posts/saved/", { signal }),
    enabled: Boolean(userId),
  });
}

export function usePostComments(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.postComments(id ?? ""),
    queryFn: ({ signal }) =>
      api<PostComment[]>("posts/" + id + "/comments/", { signal }),
    enabled: Boolean(id),
  });
}

/* -------------------------------------------------------------------- Map */

export function useMapPlaces(params: string, bbox: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.map(params, bbox),
    queryFn: ({ signal }) =>
      api<VisualMap>(
        "places/map/?" + (params ? params + "&" : "") + "bbox=" + bbox,
        { signal },
      ),
    enabled,
  });
}

/* ---------------------------------------------------------------- Creator */

export function useCreator(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.creator(id ?? ""),
    queryFn: ({ signal }) =>
      api<CreatorProfile>("creators/" + id + "/", { signal }),
    enabled: Boolean(id),
  });
}

export function useCreatorPhotos(id: string | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.creatorPhotos(id ?? "", page),
    queryFn: ({ signal }) =>
      api<Page<PublicPhoto>>("creators/" + id + "/photos/?page=" + page, {
        signal,
      }),
    enabled: Boolean(id),
  });
}

/* -------------------------------------------------------------- Mutations */

/**
 * Saving a place flips `is_saved` on every cached place payload, so the
 * invalidation is scoped to place-shaped keys rather than the whole cache.
 */
export function useSavePlace() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      api<void>("favorites/" + id + "/", {
        method: saved ? "DELETE" : "PUT",
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["places"] });
      void cache.invalidateQueries({ queryKey: ["saved-places"] });
      void cache.invalidateQueries({ queryKey: ["place"] });
      void cache.invalidateQueries({ queryKey: ["feed"] });
      void cache.invalidateQueries({ queryKey: ["map"] });
      void cache.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useTogglePhotoLike(photoId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) =>
      api<PhotoLikes>("photos/" + photoId + "/likes/", {
        method: liked ? "DELETE" : "POST",
      }),
    onSuccess: (data) => {
      cache.setQueryData(queryKeys.photoLikes(photoId), data);
    },
  });
}

export function useAddPhotoComment(photoId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<PostComment>("photos/" + photoId + "/comments/", {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: queryKeys.photoComments(photoId),
      });
    },
  });
}

export function usePostLike(postId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) =>
      api<{ liked: boolean }>("posts/" + postId + "/likes/", {
        method: liked ? "DELETE" : "POST",
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["post", postId] });
      void cache.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function usePostSave(postId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (saved: boolean) =>
      api<{ saved: boolean }>("posts/" + postId + "/saved/", {
        method: saved ? "DELETE" : "POST",
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["post", postId] });
      void cache.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
}

export function usePostShare(postId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ shared: boolean }>("posts/" + postId + "/shares/", {
        method: "POST",
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}

export function usePostView(postId: string) {
  return useMutation({
    mutationFn: () =>
      api<{ viewed: boolean }>("posts/" + postId + "/views/", {
        method: "POST",
      }),
  });
}

export function useAddPostComment(postId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<PostComment>("posts/" + postId + "/comments/", {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: queryKeys.postComments(postId),
      });
      void cache.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}

/** A 404 means "no longer available"; callers render that distinctly. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
