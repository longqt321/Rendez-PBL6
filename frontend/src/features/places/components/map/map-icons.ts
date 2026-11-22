import escapeHtml from "escape-html"
import L from "leaflet"
import { formatDistance } from "@/lib/format"
import { CATEGORY_META, categoryIconSvg } from "../../lib/category-meta"
import { priceLevelLabel } from "../../lib/price-level"
import type { Place } from "../../types/place"

export const LABEL_MIN_ZOOM = 17

export const TOP_LABEL_COUNT = 8

export const CLUSTER_RADIUS = 60

export const CLUSTER_MAX_ZOOM = 16

export const LABEL_CHAR_WIDTH = 6.5
export const LABEL_BASE_WIDTH = 24

export function createPlacePinIcon(
  place: Place,
  {
    isSelected,
    showLabel,
    distanceKm,
  }: { isSelected: boolean; showLabel: boolean; distanceKm?: number },
) {
  const meta = CATEGORY_META[place.category]
  const priceIndicator = priceLevelLabel(place.priceLevel)

  const distanceHtml =
    distanceKm !== undefined
      ? `<span class="text-xs font-bold text-primary">${formatDistance(distanceKm)}</span>`
      : ""

  const labelHtml = showLabel
    ? `<span class="flex max-w-36 items-center gap-1 truncate rounded-full border border-border bg-card/95 px-2 py-0.5 text-xs font-semibold text-card-foreground shadow-sm backdrop-blur">
         <span class="truncate">${escapeHtml(place.name)}</span>
         <span class="shrink-0 font-normal text-muted-foreground">${priceIndicator}</span>
         ${distanceHtml}
       </span>`
    : ""

  const html = `
    <div class="group flex cursor-pointer items-center gap-1.5 focus-visible:outline-none">
      <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-md ring-2 ring-background transition-transform duration-200 ${
        isSelected ? "scale-110 ring-4 ring-primary/40" : "group-hover:scale-110"
      }" style="background-color: ${meta.color}">
        ${categoryIconSvg(place.category, 14)}
      </span>
      ${labelHtml}
    </div>
  `

  // Bề rộng icon co theo nhãn để Leaflet tính đúng vùng bấm; mốc neo luôn ở
  // tâm chấm tròn (14,14) — nhãn nằm bên phải nên không lệch vị trí địa lý.
  const width = showLabel ? 200 : 28

  return L.divIcon({
    html,
    className: "custom-place-marker",
    iconSize: [width, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

export function getClusterSize(count: number): number {
  if (count >= 50) return 52
  if (count >= 10) return 44
  return 36
}

/** Cụm pin: vòng tròn hiện số quán bên trong, to dần theo số lượng. */
export function createClusterIcon(count: number) {
  const size = getClusterSize(count)
  const html = `
    <div class="flex items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground shadow-lg ring-4 ring-primary/25 transition-transform duration-200 hover:scale-105" style="width: ${size}px; height: ${size}px; font-size: ${size >= 44 ? 14 : 12}px">
      ${count}
    </div>
  `
  return L.divIcon({
    html,
    className: "place-cluster-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Marker hiển thị vị trí người dùng — HTML chuỗi vì Leaflet `divIcon` yêu cầu. */
export function createUserLocationIcon() {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="relative flex size-9 items-center justify-center">
        <span class="absolute inline-flex size-9 animate-ping rounded-full bg-user-location/30"></span>
        <span class="relative flex size-9 items-center justify-center rounded-full bg-user-location/20 ring-2 ring-user-location/40">
          <span class="size-4.5 rounded-full border-[3px] border-background bg-user-location shadow-(--shadow-raised)"></span>
        </span>
      </div>
    </div>
  `
  return L.divIcon({
    html,
    className: "user-location-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/**
 * Lớp pin có gom cụm (supercluster — thuật toán chuẩn của Mapbox, thuần JS nên
 * chạy tốt với React 19/react-leaflet v5, không cần plugin React).
 *
 * Ở zoom thấp, các quán sát nhau được gom thành một cụm hiện số lượng; bấm cụm
 * để phóng tới mức zoom mà cụm tách ra. Từ `LABEL_MIN_ZOOM` trở lên mới hiện
 * tên quán, nhờ vậy 286 pin không còn phủ kín bản đồ bằng chữ.
 */
