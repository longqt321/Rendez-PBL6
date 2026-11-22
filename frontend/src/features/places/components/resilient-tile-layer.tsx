import { useEffect } from "react"
import L from "leaflet"
import "leaflet.tilelayer.fallback"
import { TileLayer, useMap } from "react-leaflet"
import { OSM_TILE_LAYER_PROPS, OSM_TILE_URL } from "../lib/map-tiles"

/**
 * Bọc `L.tileLayer.fallback` (plugin cộng đồng `leaflet.tilelayer.fallback`):
 * khi tile mức zoom cao tạm lỗi hoặc chưa có trong cache offline, tự động
 * scale mượt từ tile cha ở mức zoom thấp hơn; đồng thời giữ nguyên tương thích
 * mock `<TileLayer />` trong môi trường test jsdom.
 */
export function ResilientTileLayer() {
  const map = useMap()
  const isRealLeafletMap =
    typeof map?.addLayer === "function" && typeof L.tileLayer?.fallback === "function"

  useEffect(() => {
    if (!isRealLeafletMap) return

    const layer = L.tileLayer.fallback(OSM_TILE_URL, {
      attribution: OSM_TILE_LAYER_PROPS.attribution,
      updateWhenIdle: OSM_TILE_LAYER_PROPS.updateWhenIdle,
      updateWhenZooming: OSM_TILE_LAYER_PROPS.updateWhenZooming,
      keepBuffer: OSM_TILE_LAYER_PROPS.keepBuffer,
      minNativeZoom: OSM_TILE_LAYER_PROPS.minNativeZoom,
      maxNativeZoom: OSM_TILE_LAYER_PROPS.maxNativeZoom,
      detectRetina: OSM_TILE_LAYER_PROPS.detectRetina,
      errorTileUrl: OSM_TILE_LAYER_PROPS.errorTileUrl,
    })
    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [isRealLeafletMap, map])

  if (!isRealLeafletMap) {
    return <TileLayer {...OSM_TILE_LAYER_PROPS} />
  }
  return null
}
