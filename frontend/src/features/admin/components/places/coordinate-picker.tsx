import { useTheme } from "next-themes"
import { MapContainer, Marker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { FieldDescription } from "@/components/ui/field"
import { ResilientTileLayer } from "@/features/places/components/resilient-tile-layer"
import { DANANG_CENTER_TUPLE } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { ADMIN_UI } from "../../lib/admin-constants"

function CoordinateClickHandler({
  onPick,
}: Readonly<{ onPick: (lat: number, lng: number) => void }>) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export function AdminCoordinatePicker({
  lat,
  lng,
  onPick,
}: Readonly<{
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const hasCoords = lat !== null && lng !== null
  const center: [number, number] = hasCoords ? [lat, lng] : DANANG_CENTER_TUPLE

  return (
    <div className="space-y-1.5">
      <FieldDescription className="text-xs">Bấm lên bản đồ để chọn tọa độ</FieldDescription>
      <div className="relative h-44 w-full overflow-hidden rounded-surface border border-border bg-muted">
        <MapContainer
          center={center}
          zoom={hasCoords ? ADMIN_UI.MAP_ZOOM_PINNED : ADMIN_UI.MAP_ZOOM_CITY}
          scrollWheelZoom={false}
          className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
        >
          <ResilientTileLayer />
          <CoordinateClickHandler onPick={onPick} />
          {hasCoords ? <Marker position={[lat, lng]} /> : null}
        </MapContainer>
      </div>
    </div>
  )
}
