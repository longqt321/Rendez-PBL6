import type { TileLayerProps } from "react-leaflet"

/**
 * Cấu hình tile OpenStreetMap dùng chung cho mọi bản đồ (`PlacesMap`,
 * `PlaceMiniMap`) — một nguồn duy nhất để không lệch attribution/options giữa
 * các component (trước đây URL + attribution bị copy-paste 2 nơi).
 *
 * Cấu hình giảm số request tới OSM (xem D-054):
 * - `updateWhenIdle: true` — chỉ tải tile khi ngừng pan/zoom, không tải trong
 *   lúc đang kéo (Leaflet mặc định `false` trên desktop → 1 cú drag bắn hàng
 *   chục request).
 * - `keepBuffer: 3` — giữ thêm 3 hàng/cột tile ngoài khung trong bộ nhớ, pan
 *   nhẹ qua lại dùng lại tile có sẵn thay vì gọi lại OSM (Leaflet mặc định 2).
 * - `maxNativeZoom: 18` — trên z18 tile được phóng từ z18 thay vì tải tile z19
 *   (OSM có z19 nhưng hiếm dùng); KHÔNG dùng `maxZoom` vì đặt `maxZoom` thấp
 *   hơn zoom bản đồ sẽ khiến Leaflet ẩn cả lớp tile → bản đồ trắng.
 * - `detectRetina: false` — nếu bật, mỗi tile thành 4 request (2x mỗi chiều);
 *   cố ý ghi rõ để không ai bật vô ý.
 */
export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

export const OSM_TILE_LAYER_PROPS: Pick<TileLayerProps, "url" | "attribution"> &
  Pick<TileLayerProps, "updateWhenIdle" | "keepBuffer" | "maxNativeZoom" | "detectRetina"> = {
  url: OSM_TILE_URL,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  updateWhenIdle: true,
  keepBuffer: 3,
  maxNativeZoom: 18,
  detectRetina: false,
}
