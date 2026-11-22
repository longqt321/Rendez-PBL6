import { useCallback, useEffect, useRef, useState } from "react"
import L from "leaflet"
import { LayersIcon, XIcon } from "lucide-react"
import { useMap, useMapEvents } from "react-leaflet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MapBounds } from "../../api/get-map-places"
import { CATEGORY_META } from "../../lib/category-meta"
import { DANANG_DISTRICT_CENTERS } from "../../lib/danang-districts"
import type { Place, PlaceCategory } from "../../types/place"

export function MapBoundsUpdater({
  places,
  userCoordinates,
  fitKey,
  isNearbyActive = false,
  isPlacesLoading,
  isPlaceholderData,
  selectedDistrict,
  onFitApplied,
}: Readonly<{
  places: Place[]
  userCoordinates?: { lat: number; lng: number } | null
  fitKey?: string
  isNearbyActive?: boolean
  isPlacesLoading?: boolean
  isPlaceholderData?: boolean
  selectedDistrict?: string
  onFitApplied?: () => void
}>) {
  const map = useMap()
  const fittedKeyRef = useRef<string | null>(null)
  const onFitAppliedRef = useRef(onFitApplied)
  useEffect(() => {
    onFitAppliedRef.current = onFitApplied
  })

  useEffect(() => {
    // Đang chờ dữ liệu mới hoặc đang hiển thị placeholder của bộ lọc cũ → không fit.
    if (isPlaceholderData || isPlacesLoading) return

    // Đã căn cho khoá này rồi thì thôi.
    if (fittedKeyRef.current === fitKey) return

    const hasValidUserCoords =
      userCoordinates &&
      userCoordinates.lat >= 15.95 &&
      userCoordinates.lat <= 16.2 &&
      userCoordinates.lng >= 108.05 &&
      userCoordinates.lng <= 108.35

    // Khi lọc "Gần tôi" (không khoá quận), chỉ căn 1 lần về quanh vị trí người dùng
    // để người dùng tự do zoom/kéo sau đó mà không bị nhảy lại toàn thành phố.
    if (isNearbyActive && !selectedDistrict && hasValidUserCoords) {
      map.flyTo([userCoordinates.lat, userCoordinates.lng], 15, { duration: 0.6 })
      fittedKeyRef.current = fitKey ?? null
      onFitAppliedRef.current?.()
      return
    }

    const validPlaces = places.filter((p) => p.lat !== undefined && p.lng !== undefined)
    const points: [number, number][] = validPlaces.map((p) => [p.lat!, p.lng!])
    if (points.length === 0) {
      const center = selectedDistrict ? DANANG_DISTRICT_CENTERS[selectedDistrict] : undefined
      if (center) {
        map.flyTo(center, 13, { duration: 0.6 })
      }
      fittedKeyRef.current = fitKey ?? null
      onFitAppliedRef.current?.()
      return
    }

    // Chỉ gộp vị trí người dùng vào fitBounds khi không lọc theo quận cụ thể
    // và toạ độ người dùng thực sự nằm trong khu vực Đà Nẵng (tránh kéo văng bản đồ).
    if (
      !selectedDistrict &&
      userCoordinates &&
      userCoordinates.lat >= 15.95 &&
      userCoordinates.lat <= 16.2 &&
      userCoordinates.lng >= 108.05 &&
      userCoordinates.lng <= 108.35
    ) {
      points.push([userCoordinates.lat, userCoordinates.lng])
    }

    const firstPoint = points[0]
    if (points.length === 1 && firstPoint) {
      map.flyTo(firstPoint, 16, { duration: 0.6 })
    } else {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
    fittedKeyRef.current = fitKey ?? null
    onFitAppliedRef.current?.()
  }, [
    fitKey,
    isNearbyActive,
    userCoordinates,
    places,
    isPlacesLoading,
    isPlaceholderData,
    selectedDistrict,
    map,
  ])

  return null
}

export function ViewportReporter({
  onChange,
}: Readonly<{ onChange: (bounds: MapBounds) => void }>) {
  // Giữ callback mới nhất trong ref để `emit` ổn định (không re-run effect khi
  // parent render lại), đồng thời không cần eslint-disable exhaustive-deps.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const map = useMap()
  const emit = useCallback(() => {
    const b = map.getBounds()
    onChangeRef.current({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    })
  }, [map])

  useMapEvents({ moveend: emit, zoomend: emit })

  // Báo khung nhìn ban đầu để lần mở đầu tiên cũng nạp theo vùng thật.
  useEffect(() => {
    emit()
  }, [emit])

  return null
}

export function MapCategoryLegend({
  activeCategory = "all",
  onCategorySelect,
}: Readonly<{
  activeCategory?: PlaceCategory | "all"
  onCategorySelect?: (category: PlaceCategory | "all") => void
}>) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="absolute right-3 bottom-14 z-1000 flex flex-col items-end gap-1.5 sm:top-auto sm:bottom-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 gap-1.5 px-2.5 text-xs shadow-md backdrop-blur sm:hidden"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Đóng chú giải loại hình" : "Mở chú giải loại hình"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <XIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <LayersIcon className="size-3.5" aria-hidden="true" />
        )}
        Chú giải
      </Button>

      <div
        className={cn(
          "flex-col gap-1 rounded-surface border border-border/80 bg-background/92 p-2 text-xs shadow-(--shadow-raised) backdrop-blur-md sm:flex",
          mobileOpen ? "flex" : "hidden",
        )}
      >
        {Object.entries(CATEGORY_META).map(([category, meta]) => {
          const cat = category as PlaceCategory
          const isSelected = activeCategory === cat
          const isDimmed = activeCategory !== "all" && !isSelected

          if (onCategorySelect) {
            return (
              <Button
                key={category}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={isSelected}
                onClick={() => onCategorySelect(isSelected ? "all" : cat)}
                className={cn(
                  "h-auto justify-start gap-2 rounded-control px-2 py-1 text-left text-xs font-normal transition-colors hover:bg-muted",
                  isSelected && "bg-primary/12 font-semibold text-primary",
                  isDimmed && "opacity-55",
                )}
              >
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
              </Button>
            )
          }

          return (
            <span key={category} className="flex items-center gap-1.5 px-1 py-0.5">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function PlacesSummaryText({
  isLoading,
  validCount,
  totalCount,
  compact,
}: Readonly<{ isLoading?: boolean; validCount: number; totalCount?: number; compact?: boolean }>) {
  if (isLoading && validCount === 0) {
    return <span>{compact ? "Đang tải…" : "Đang tải địa điểm trong vùng xem…"}</span>
  }
  if (totalCount !== undefined && totalCount > validCount) {
    return (
      <span>
        {compact
          ? `${validCount}/${totalCount} · Zoom để xem hết`
          : `Đang hiển thị ${validCount}/${totalCount} địa điểm trong vùng xem, zoom sát hơn để xem hết`}
      </span>
    )
  }
  return (
    <span>
      {compact ? `${validCount} địa điểm` : `Đang hiển thị ${validCount} địa điểm trong vùng xem`}
    </span>
  )
}
