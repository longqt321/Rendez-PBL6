import type { TileLayerProps } from "react-leaflet"
import { env } from "@/lib/env"

export const OSM_TILE_URL = env.enableMocks
  ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  : `${env.apiBaseUrl.replace(/\/$/, "")}/tiles/{z}/{x}/{y}.png`

/**
 * Tile dự phòng dạng SVG data URI đồng bộ màu giấy ấm Rendez: đảm bảo
 * bản đồ không bao giờ hiện ô vuông ảnh vỡ nếu cả server lẫn mạng đều gián đoạn.
 */
export const FALLBACK_ERROR_TILE_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#f5f1e8"/>
      <path d="M 64 0 V 256 M 128 0 V 256 M 192 0 V 256 M 0 64 H 256 M 0 128 H 256 M 0 192 H 256" stroke="#eae3d5" stroke-width="1"/>
    </svg>`,
  )

export const OSM_TILE_LAYER_PROPS: Pick<
  TileLayerProps,
  "url" | "attribution" | "minNativeZoom" | "errorTileUrl"
> &
  Pick<TileLayerProps, "updateWhenIdle" | "keepBuffer" | "maxNativeZoom" | "detectRetina"> = {
  url: OSM_TILE_URL,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  updateWhenIdle: true,
  keepBuffer: 3,
  minNativeZoom: 10,
  maxNativeZoom: 18,
  detectRetina: false,
  errorTileUrl: FALLBACK_ERROR_TILE_URL,
}
