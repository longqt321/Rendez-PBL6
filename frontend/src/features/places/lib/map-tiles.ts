import type { TileLayerProps } from "react-leaflet"

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
