import { useEffect, useMemo, useState } from "react"
import escapeHtml from "escape-html"
import L from "leaflet"
import { CrosshairIcon, LocateFixedIcon, MapPinIcon, NavigationIcon } from "lucide-react"
import { MapContainer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResilientTileLayer } from "@/features/places/components/resilient-tile-layer"
import { formatInitials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ScoredCandidate } from "../lib/room-scoring"
import type { RoomMember } from "../types/room"

const DANANG_CENTER = { lat: 16.0544, lng: 108.2022 }

interface RoomGroupMapProps {
  readonly members: readonly RoomMember[]
  readonly scoredCandidates: readonly ScoredCandidate[]
  readonly selectedPlaceId: string | null
  readonly isMember: boolean
  readonly onSelectPlace: (placeId: string | null) => void
  readonly onPickMyLocation: (coords: { lat: number; lng: number }) => Promise<void>
  readonly onUseDeviceLocation: () => void
  readonly isLocating?: boolean
  readonly className?: string
}

function createMemberIcon(member: RoomMember): L.DivIcon {
  const safeName = escapeHtml(member.displayName)
  const safeInitials = escapeHtml(formatInitials(member.displayName))
  const safeAvatar = member.avatarUrl ? escapeHtml(member.avatarUrl) : null

  const avatarHtml = safeAvatar
    ? `<img src="${safeAvatar}" alt="" class="size-6 rounded-full object-cover" />`
    : `<span class="flex size-6 items-center justify-center rounded-full text-xs font-bold ${
        member.isMe
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }">${safeInitials}</span>`

  const html = `
    <div class="inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 shadow-md backdrop-blur ${
      member.isMe
        ? "border-primary bg-card text-foreground ring-2 ring-primary/30"
        : "border-border bg-card/95 text-foreground"
    }" style="transform: translate(-50%, -100%); white-space: nowrap;">
      ${avatarHtml}
      <span class="max-w-24 truncate pr-1 text-xs font-semibold">${safeName}</span>
    </div>
  `
  return L.divIcon({
    html,
    className: "rendez-member-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function createCandidateIcon(rank: number, conflictCount: number, isSelected: boolean): L.DivIcon {
  const bgClass =
    conflictCount === 0
      ? "bg-primary text-primary-foreground border-primary-foreground/30"
      : "bg-destructive text-destructive-foreground border-destructive-foreground/30"

  const html = `
    <div class="flex items-center justify-center rounded-full border-2 font-bold text-xs shadow-md transition-transform ${bgClass} ${
      isSelected ? "size-9 scale-110 ring-4 ring-primary/30" : "size-7"
    }" style="transform: translate(-50%, -50%);">
      #${rank}
    </div>
  `
  return L.divIcon({
    html,
    className: "rendez-candidate-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function MapViewportController({
  points,
  focusCoords,
}: {
  readonly points: readonly [number, number][]
  readonly focusCoords: [number, number] | null
}) {
  const map = useMap()

  useEffect(() => {
    if (focusCoords) {
      map.flyTo(focusCoords, Math.max(map.getZoom(), 15), { duration: 0.45 })
      return
    }
    if (points.length === 0) return
    const firstPoint = points[0]
    if (points.length === 1 && firstPoint) {
      map.setView(firstPoint, 14)
      return
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
  }, [map, points, focusCoords])

  return null
}

function MapClickPinHandler({
  enabled,
  onPick,
}: {
  readonly enabled: boolean
  readonly onPick: (coords: { lat: number; lng: number }) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export function RoomGroupMap({
  members,
  scoredCandidates,
  selectedPlaceId,
  isMember,
  onSelectPlace,
  onPickMyLocation,
  onUseDeviceLocation,
  isLocating = false,
  className,
}: RoomGroupMapProps) {
  const [pinMode, setPinMode] = useState(false)

  const locatedMembers = useMemo(
    () => members.filter((m) => m.lat != null && m.lng != null),
    [members],
  )
  const locatedCandidates = useMemo(
    () =>
      scoredCandidates
        .map((item, idx) => ({ item, rank: idx + 1 }))
        .filter(({ item }) => item.candidate.place.lat != null && item.candidate.place.lng != null),
    [scoredCandidates],
  )

  const allPoints = useMemo<[number, number][]>(
    () => [
      ...locatedMembers.map((m): [number, number] => [m.lat!, m.lng!]),
      ...locatedCandidates.map(({ item }): [number, number] => [
        item.candidate.place.lat!,
        item.candidate.place.lng!,
      ]),
    ],
    [locatedMembers, locatedCandidates],
  )

  const focusCoords = useMemo<[number, number] | null>(() => {
    if (!selectedPlaceId) return null
    const found = locatedCandidates.find(({ item }) => item.candidate.placeId === selectedPlaceId)
    if (!found) return null
    return [found.item.candidate.place.lat!, found.item.candidate.place.lng!]
  }, [selectedPlaceId, locatedCandidates])

  const meMember = members.find((m) => m.isMe)
  const hasMyLocation = meMember?.lat != null && meMember?.lng != null

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-surface border border-border bg-muted/30",
        pinMode && "cursor-crosshair",
        className,
      )}
    >
      <MapContainer
        center={[DANANG_CENTER.lat, DANANG_CENTER.lng]}
        zoom={13}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
        <ResilientTileLayer />
        <MapViewportController points={allPoints} focusCoords={focusCoords} />
        <MapClickPinHandler
          enabled={pinMode && isMember}
          onPick={(coords) => {
            setPinMode(false)
            void onPickMyLocation(coords)
          }}
        />

        {locatedMembers.map((member) => (
          <Marker
            key={`member-${member.id}`}
            position={[member.lat!, member.lng!]}
            icon={createMemberIcon(member)}
            zIndexOffset={member.isMe ? 600 : 400}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold">
                  {member.displayName} {member.isMe ? "(Bạn)" : ""}
                </p>
                {member.locationLabel ? (
                  <p className="text-muted-foreground">{member.locationLabel}</p>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {locatedCandidates.map(({ item, rank }) => {
          const place = item.candidate.place
          const isSelected = selectedPlaceId === place.id
          return (
            <Marker
              key={`place-${place.id}`}
              position={[place.lat!, place.lng!]}
              icon={createCandidateIcon(rank, item.conflicts.length, isSelected)}
              zIndexOffset={isSelected ? 500 : 200}
              eventHandlers={{
                click: () => onSelectPlace(place.id),
              }}
            >
              <Popup>
                <div className="min-w-48 space-y-2 text-xs">
                  <div>
                    <p className="text-sm font-bold">
                      #{rank} · {place.name}
                    </p>
                    <p className="text-muted-foreground">{place.address}</p>
                  </div>

                  {item.totalCriteriaCount > 0 ? (
                    <Badge
                      variant={item.conflicts.length === 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      Đáp ứng {item.satisfiedCount}/{item.totalCriteriaCount} tiêu chí
                    </Badge>
                  ) : null}

                  {item.distances.length > 0 ? (
                    <div className="space-y-0.5 border-t border-border pt-1.5">
                      <p className="font-semibold text-muted-foreground">Khoảng cách:</p>
                      {item.distances.map((d) => (
                        <p key={d.memberId}>
                          {d.displayName}: <strong>{d.distanceKm} km</strong>
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {item.conflicts.length > 0 ? (
                    <div className="space-y-0.5 border-t border-border pt-1.5 text-destructive">
                      <p className="font-semibold">Mâu thuẫn ({item.conflicts.length}):</p>
                      {item.conflicts.slice(0, 3).map((c) => (
                        <p key={`${c.memberId}-${c.proposalId}`}>
                          {c.memberName}: {c.reason}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    size="xs"
                    className="w-full"
                    nativeButton={false}
                    render={<Link to={`/discover/${place.id}`} />}
                  >
                    <NavigationIcon className="size-3" aria-hidden="true" />
                    Xem chi tiết quán
                  </Button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {isMember ? (
        <div className="pointer-events-none absolute top-3 right-3 z-[400] flex flex-wrap justify-end gap-1.5">
          <Button
            type="button"
            size="xs"
            variant={pinMode ? "default" : "secondary"}
            className="pointer-events-auto shadow-md"
            onClick={() => setPinMode((prev) => !prev)}
          >
            <CrosshairIcon className="size-3.5" aria-hidden="true" />
            {pinMode ? "Đang chọn trên bản đồ..." : "Chạm bản đồ đặt vị trí"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="pointer-events-auto shadow-md"
            disabled={isLocating}
            onClick={onUseDeviceLocation}
          >
            <LocateFixedIcon className="size-3.5" aria-hidden="true" />
            {hasMyLocation ? "Cập nhật GPS" : "Chia sẻ vị trí"}
          </Button>
        </div>
      ) : null}

      {pinMode ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-foreground/90 px-3.5 py-1.5 text-xs font-medium text-background shadow-md">
          <MapPinIcon className="mr-1 inline size-3.5" aria-hidden="true" />
          Chạm vào vị trí của bạn trên bản đồ
        </div>
      ) : null}
    </div>
  )
}
