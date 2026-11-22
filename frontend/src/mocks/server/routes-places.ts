import type { Review } from "@/features/places/types/review"
import type { CollectionSummary } from "@/features/collections/types/collection"
import type { Page } from "@/types/api"
import { CURRENT_USER } from "../fixtures/users"
import { userSuggestionRoutes } from "../users-suggestions"
import {
  PLACES_PAGE_SIZE,
  DAILY_PICK_REASONS,
  db,
  toPlaceDto,
  findPlace,
  sortPublishedPlaces,
  paginate,
  isPubliclyVisible,
  listPublishedPlaces,
  suggestPlacesForCaption,
  listReviews,
  toCollectionDto,
  listMyCollections,
  createPlaceReport,
  createReview,
  deleteReview,
  createCollection,
  updateCollection,
  setCollectionLike,
  deleteCollection,
  setCollectionPlaces,
  notFound,
  query,
  type Route,
} from "./context"

export const placeMockRoutes: Route[] = [
  // Gợi ý người theo dõi — route `/users/suggestions` phải khớp TRƯỚC `/users/:handle`.
  ...userSuggestionRoutes,
  {
    method: "get",
    pattern: /^\/places\/suggestions$/,
    handler: (config) => {
      const { q = "", limit = "3" } = query(config)
      return { suggestions: suggestPlacesForCaption(q, Number(limit)) }
    },
  },
  {
    method: "get",
    pattern: /^\/places$/,
    handler: (config) => {
      const {
        cursor,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
        sort,
        lat,
        lng,
      } = query(config)
      const matched = sortPublishedPlaces(
        listPublishedPlaces({
          category,
          district,
          q,
          priceMax,
          excludeCategory,
          excludeDistrict,
          includeKeyword,
          excludeKeyword,
        }),
        sort,
        lat,
        lng,
      )
      // Cùng hợp đồng `meta` với backend thật: totalResults là COUNT toàn bộ
      // kết quả khớp (không phải số item của trang này).
      return {
        ...paginate(matched, cursor ?? null, PLACES_PAGE_SIZE),
        meta: { tookMs: 0, cacheHit: false, totalResults: matched.length },
      }
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved".
    pattern: /^\/places\/map$/,
    handler: (config) => {
      const {
        bbox,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
      } = query(config)
      // Bản đồ không phân trang: trả mọi địa điểm trong khung (chặn trên để
      // khung nhìn quá rộng ở zoom nhỏ không trả cả dataset).
      const MAP_MAX_PLACES = 300
      const items = listPublishedPlaces({
        bbox,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
      })
      return { items: items.slice(0, MAP_MAX_PLACES), total: items.length }
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "saved".
    pattern: /^\/places\/saved$/,
    handler: (config) => {
      const { cursor } = query(config)
      // "Đã lưu" = nằm trong ít nhất một bộ sưu tập của chính mình; gộp + loại trùng.
      const savedIds = new Set(
        db.collections
          .filter((collection) => collection.owner.id === CURRENT_USER.id)
          .flatMap((collection) => collection.placeIds),
      )
      const items = db.places
        .filter((place) => savedIds.has(place.id) && isPubliclyVisible(place))
        .map(toPlaceDto)
      return paginate(items, cursor ?? null, PLACES_PAGE_SIZE)
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt "daily-picks".
    pattern: /^\/places\/daily-picks$/,
    handler: () => {
      // Mock không có job hằng ngày: lấy 3 quán công khai đầu tiên, cùng bộ mỗi
      // lần tải. Ảnh lấy từ MOCK_PLACES (fixture cold-start) như lưới bên dưới.
      const items = db.places
        .filter(isPubliclyVisible)
        .slice(0, 3)
        .map((place, index) => ({
          place: toPlaceDto(place),
          reason: DAILY_PICK_REASONS[index % DAILY_PICK_REASONS.length],
          // Mock tính "vì sao" theo cùng hình dạng backend trả (không phải số
          // liệu thật của thuật toán — chỉ để UI/e2e có dữ liệu hiển thị).
          why: {
            matchPercent: 70 - index * 10,
            district: place.district,
            distanceKm: null,
            openNow: null,
            signals: place.imageUrl ? ["Ảnh thật"] : [],
          },
        }))
      return { date: new Date().toISOString().slice(0, 10), items }
    },
  },
  {
    method: "get",
    // Cá nhân hoá theo lịch sử — mock chưa có dữ liệu tương tác nên trả rỗng;
    // FE coi rỗng là "ẩn dải". Đứng trước `/places/:id` như daily-picks.
    pattern: /^\/places\/recommended$/,
    handler: () => ({
      items: [],
      next: null,
      meta: { tookMs: 0, cacheHit: false, totalResults: 0 },
    }),
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      return toPlaceDto(place)
    },
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      return { items: listReviews(placeId), next: null } satisfies Page<Review>
    },
  },
  {
    method: "post",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => createReview(config, placeId),
  },
  {
    method: "delete",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => deleteReview(config, placeId),
  },
  {
    method: "post",
    pattern: /^\/places\/([^/]+)\/reports$/,
    handler: (config, [placeId]) => createPlaceReport(config, placeId),
  },
  {
    method: "get",
    pattern: /^\/collections$/,
    handler: (config) => {
      const { placeId } = query(config)
      return { items: listMyCollections(placeId), next: null } satisfies Page<CollectionSummary>
    },
  },
  {
    method: "post",
    pattern: /^\/collections$/,
    handler: (config) => createCollection(config),
  },
  {
    method: "get",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => {
      const collection = db.collections.find((item) => item.id === collectionId)
      if (!collection) notFound(config, "Không tìm thấy bộ sưu tập")
      return toCollectionDto(collection)
    },
  },
  {
    method: "delete",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => deleteCollection(config, collectionId),
  },
  {
    method: "patch",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => updateCollection(config, collectionId),
  },
  {
    method: "post",
    pattern: /^\/collections\/([^/]+)\/like$/,
    handler: (config, [collectionId]) => setCollectionLike(config, collectionId, true),
  },
  {
    method: "delete",
    pattern: /^\/collections\/([^/]+)\/like$/,
    handler: (config, [collectionId]) => setCollectionLike(config, collectionId, false),
  },
  {
    method: "patch",
    pattern: /^\/collections\/([^/]+)\/places$/,
    handler: (config, [collectionId]) => setCollectionPlaces(config, collectionId),
  },
]
