/**
 * Mock data cho chế độ xem UI không cần backend.
 *
 * Kích hoạt: `api()` bắt lỗi mạng (fetch thất bại, không phải HTTP lỗi) và
 * trả về dữ liệu mock cho các GET endpoint đọc-đọc. Mutation không bao giờ
 * dùng mock — báo lỗi thật để không lỡ người dùng rằng thao tác đã thành công.
 *
 * Ảnh mock nằm trong `public/mock/` (12 ảnh thật từ media local, copy tĩnh).
 * Tên địa điểm dùng địa điểm có thật ở Đà Nẵng để dữ liệu demo giống thật.
 * Chỉ phục vụ xem giao diện, không đụng dữ liệu thật.
 */
import type { FeedItem, VisualPlace, Category, Page } from "./types";

const MOCK_CATEGORIES = [
  { slug: "cafe", name: "Cà phê" },
  { slug: "food", name: "Ăn uống" },
  { slug: "checkin", name: "Ngắm cảnh" },
  { slug: "night", name: "Đêm" },
] as const;

const MOCK_PLACES: VisualPlace[] = [
  {
    id: "m-place-1",
    name: "43 Factory Coffee Roaster",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Ngô Thì Nhậm, Hải Châu, Đà Nẵng",
    latitude: 16.045,
    longitude: 108.242,
    cover_image_url: "/mock/3c30420a.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-1",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-2",
    name: "Bánh mì Cô Ba",
    category: { slug: "food", name: "Ăn uống" },
    address: "Trần Cao Vân, Thanh Khê, Đà Nẵng",
    latitude: 16.048,
    longitude: 108.219,
    cover_image_url: "/mock/76200b5e.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-2",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-3",
    name: "Cà phê Mộc Miên",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Lê Duẩn, Hải Châu, Đà Nẵng",
    latitude: 16.061,
    longitude: 108.226,
    cover_image_url: "/mock/eecf8efa.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-3",
    is_saved: true,
    supporting_photo: null,
  },
  {
    id: "m-place-4",
    name: "Đèo Hải Vân",
    category: { slug: "checkin", name: "Ngắm cảnh" },
    address: "Đèo Hải Vân, Lăng Cô, Thừa Thiên Huế",
    latitude: 16.193,
    longitude: 108.281,
    cover_image_url: "/mock/dd95c62b.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-4",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-5",
    name: "Cà phê Hoa Khanh",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Điện Biên Phủ, Liên Chiểu, Đà Nẵng",
    latitude: 16.085,
    longitude: 108.205,
    cover_image_url: "/mock/255c0ef2.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-5",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-6",
    name: "Quán 1961 Traditional Coffee",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Trưng Nữ Vương, Hải Châu, Đà Nẵng",
    latitude: 16.055,
    longitude: 108.231,
    cover_image_url: "/mock/0515ff1c.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-6",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-7",
    name: "Bún chả cá Bà Lữ",
    category: { slug: "food", name: "Ăn uống" },
    address: "Hùng Vương, Hải Châu, Đà Nẵng",
    latitude: 16.058,
    longitude: 108.229,
    cover_image_url: "/mock/ef41185e.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-7",
    is_saved: true,
    supporting_photo: null,
  },
  {
    id: "m-place-8",
    name: "The Cups Coffee & Workspace",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Nguyễn Chi Thanh, Hải Châu, Đà Nẵng",
    latitude: 16.043,
    longitude: 108.235,
    cover_image_url: "/mock/7a65723b.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-8",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-9",
    name: "Đồi Ngự Hoa Vang",
    category: { slug: "checkin", name: "Ngắm cảnh" },
    address: "Quảng Nam, Hòa Vang, Đà Nẵng",
    latitude: 16.096,
    longitude: 108.162,
    cover_image_url: "/mock/74f3ced2.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-9",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-10",
    name: "Highlands Coffee Cẩm Lệ",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Nguyễn Tri Phương, Cẩm Lệ, Đà Nẵng",
    latitude: 16.038,
    longitude: 108.208,
    cover_image_url: "/mock/599563d1.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-10",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-11",
    name: "Góc Hà Nội Atiso Coffee",
    category: { slug: "cafe", name: "Cà phê" },
    address: "Tố Hữu, Liên Chiểu, Đà Nẵng",
    latitude: 16.065,
    longitude: 108.165,
    cover_image_url: "/mock/eb8be25b.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-11",
    is_saved: false,
    supporting_photo: null,
  },
  {
    id: "m-place-12",
    name: "Nhà hàng Bé Mặn",
    category: { slug: "food", name: "Ăn uống" },
    address: "Trường Sa, Ngũ Hành Sơn, Đà Nẵng",
    latitude: 16.007,
    longitude: 108.254,
    cover_image_url: "/mock/ae91bb49.jpg",
    cover_media_url: null,
    cover_photo_id: "m-photo-12",
    is_saved: false,
    supporting_photo: null,
  },
];

const AUTHORS = ["Nguyễn An", "Trần Minh", "Lê Hà", "Phạm Vy", "Vũ Khoa"];

function mockPhoto(placeIndex: number, order: number) {
  const place = MOCK_PLACES[placeIndex % MOCK_PLACES.length];
  const captions = [
    "Sáng sớm ngồi đây muito sướng, gió biển mát lắm.",
    "Bàn trên tầng 2 có ổ cắm, wifi 30Mbps, làm việc được.",
    "Món signature đáng thử, 45k/bàn đang tiết kiệm so với chỗ khác.",
    "Góc này chiều nắng vàng rất đẹp, chụp đứng đường lên thì tuyệt.",
    "Quán nhỏ mà dễ thương, chủ nhà thân thiện.",
  ];
  return {
    id: `m-photo-${placeIndex + 1}-${order}`,
    place_id: place.id,
    url: place.cover_image_url ?? "/mock/3c30420a.jpg",
    width: 1600,
    height: 1067,
    alt_text: `Ảnh tại ${place.name}`,
    caption: captions[(placeIndex + order) % captions.length],
    published_at: new Date(
      Date.now() - (placeIndex * 7 + order * 3) * 3600_000,
    ).toISOString(),
    attributes: [],
    matched_attribute_codes: [],
    author_id: `m-author-${(placeIndex % AUTHORS.length) + 1}`,
    author_name: AUTHORS[placeIndex % AUTHORS.length],
    is_owner: false,
  };
}

/** Page 1 của feed mock; `next: null` để infinite query dừng ở một trang. */
function mockFeedPage(): Page<FeedItem> {
  const results: FeedItem[] = MOCK_PLACES.map((place, index) => ({
    photo: mockPhoto(index, 1),
    place,
  }));
  return { count: results.length, next: null, previous: null, results };
}

function mockPlacesPage(): { count: number; results: VisualPlace[] } {
  return { count: MOCK_PLACES.length, results: MOCK_PLACES };
}

/** VisualMap envelope cho `places/map/` (màn Bản đồ). */
function mockPlacesMap() {
  return {
    count: MOCK_PLACES.length,
    total_places: MOCK_PLACES.length,
    truncated: false,
    results: MOCK_PLACES,
  };
}

function mockCategories(): Category[] {
  return [...MOCK_CATEGORIES];
}

/** GET endpoints phục vụ mock; endpoint ngoài danh sách này không mock. */
const MOCK_ROUTES: Record<string, () => unknown> = {
  "feed/": mockFeedPage,
  "places/": mockPlacesPage,
  "places/map/": mockPlacesMap,
  "categories/": mockCategories,
};

export function mockEnabled(): boolean {
  return (
    // Chỉ bật mặc định ở dev server; vitest chạy ở DEV=true nhưng phải giữ
    // hành vi thật (RequireLogin, lỗi 5xx) để test route guard còn đúng ý.
    (import.meta.env.DEV && import.meta.env.MODE !== "test") ||
    new URLSearchParams(window.location.search).has("mock")
  );
}

/**
 * Trả về mock cho GET nếu endpoint nằm trong MOCK_ROUTES; `null` nếu không
 * có mock (caller ném lỗi mạng thật).
 */
export function mockResponse(path: string): unknown | null {
  if (!mockEnabled()) return null;
  const base = path.split("?")[0];
  const handler = MOCK_ROUTES[base];
  if (!handler) return null;
  if (base === "places/") {
    // Giữ đồng bộ Page<> qua wrapper riêng trong caller.
    const page = handler() as { count: number; results: VisualPlace[] };
    return { count: page.count, next: null, previous: null, results: page.results };
  }
  return handler();
}
