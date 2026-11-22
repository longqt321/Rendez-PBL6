import { useEffect, useMemo } from "react"
import { toast } from "sonner"
import { useUserLocation, type ResolvedLocationSource } from "@/hooks/use-user-location"
import { useRooms, type JoinRoomStatus } from "@/features/rooms/hooks/use-rooms"
import type { RoomFilterChip } from "@/features/rooms/lib/room"
import type { Room } from "@/features/rooms/types/room"
import { calculateDistanceKm } from "../lib/danang-districts"
import type { Place } from "../types/place"
import type { PageMeta } from "@/types/api"
import { useDiscoverPlaces } from "./use-discover-places"
import type { DiscoverFilters } from "../api/get-places"
import { useDiscoverFilters, type DiscoverFiltersState } from "./use-discover-filters"

export interface DiscoverView {
  filters: DiscoverFiltersState

  room: Room | undefined

  createRoom: (name: string) => Promise<string>

  joinRoom: (code: string, displayName: string) => Promise<JoinRoomStatus>
  leaveRoom: () => void
  removeRoomChip: (chip: RoomFilterChip) => void
  resetRoomFilter: () => void
  coordinates: { lat: number; lng: number } | null
  locationSource: ResolvedLocationSource | null
  selectedSourceKey: string | null
  selectLocationSource: (key: string | null) => void
  isLocating: boolean
  locationError: string | null
  locationGate: React.ReactNode

  clearLocation: () => void
  requestLocation: () => void
  isPending: boolean
  isError: boolean
  refetch: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void

  placesWithDistance: { place: Place; distanceKm?: number }[]
  sortedPlaces: Place[]

  meta: PageMeta | undefined

  serverFilters: DiscoverFilters
}

export function useDiscoverView(options?: { fetchList?: boolean }): DiscoverView {
  const fetchList = options?.fetchList ?? true
  const filters = useDiscoverFilters()
  const { activeCode, getRoom, createRoom, joinRoom, updateRoomFilter, leaveRoom } = useRooms()
  const room = activeCode ? getRoom(activeCode) : undefined
  const {
    coordinates,
    locationSource,
    selectedSourceKey,
    selectLocationSource,
    isLocating,
    locationError,
    requestLocation,
    clearLocation,
    locationGate,
  } = useUserLocation()
  // `/discover` và `/map` luôn dùng bộ lọc cá nhân của người dùng để họ có thể
  // tự tìm kiếm và khám phá riêng ngay cả khi đang tham gia một phòng nhóm
  // (bộ lọc chung của phòng hoạt động độc lập bên trong `/rooms/:code`).
  const serverFilters = useMemo(
    () => ({
      category: filters.category,
      district: filters.district,
      query: filters.query,
      priceMax: filters.priceMax === "all" ? undefined : filters.priceMax,
      sort: filters.sort,
      coords:
        filters.sort === "distance" && coordinates
          ? {
              // Làm tròn 3 chữ số thập phân (~111m) để không lộ tọa độ chính xác trong URL/access log
              lat: Math.round(coordinates.lat * 1000) / 1000,
              lng: Math.round(coordinates.lng * 1000) / 1000,
            }
          : undefined,
    }),
    [
      filters.category,
      filters.district,
      filters.query,
      filters.priceMax,
      filters.sort,
      coordinates,
    ],
  )

  // Khi người dùng gõ "gần tôi" / "gần đây" vào thanh Search, tự động bật định vị & sort distance.
  const { setSort, isNearbyActive } = filters
  useEffect(() => {
    if (filters.parsedQuery.nearMe && !isNearbyActive) {
      setSort("distance")
      requestLocation()
    }
  }, [filters.parsedQuery.nearMe, isNearbyActive, setSort, requestLocation])

  // Toạ độ lên URL khi `sort=distance` (làm tròn 4 chữ số) để link chia sẻ tái
  // tạo đúng thứ tự khoảng cách; tắt sort distance thì dọn khỏi URL.
  const { setCoords } = filters
  useEffect(() => {
    if (filters.sort !== "distance") {
      setCoords(null)
      return
    }
    if (coordinates) setCoords(coordinates)
  }, [filters.sort, coordinates, setCoords])

  const query = useDiscoverPlaces(serverFilters, { enabled: fetchList })

  const rawPlaces = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )

  // Chỉ tính khoảng cách để HIỂN THỊ trên card. Thứ tự do server quyết định
  // (`sort=distance`) — không `.sort()` phía client nữa: sắp xếp client chỉ đúng
  // trong số trang đã tải, còn server sắp trên toàn bộ kết quả.
  const placesWithDistance = useMemo(
    () =>
      rawPlaces.map((place) => ({
        place,
        distanceKm:
          coordinates && place.lat !== undefined && place.lng !== undefined
            ? calculateDistanceKm(coordinates.lat, coordinates.lng, place.lat, place.lng)
            : undefined,
      })),
    [rawPlaces, coordinates],
  )

  const sortedPlaces = useMemo(
    () => placesWithDistance.map((item) => item.place),
    [placesWithDistance],
  )

  return {
    serverFilters,
    filters,
    room,
    createRoom: (name) => createRoom(name),
    joinRoom: (code, displayName) => joinRoom(code, displayName || "Khách"),
    leaveRoom: () => {
      if (room) {
        void leaveRoom(room.code).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Không rời được phòng")
        })
      }
    },
    removeRoomChip: (chip) => {
      if (room) {
        void updateRoomFilter(room.code, {
          action: "remove",
          kind: chip.kind,
          field: chip.field,
          value: chip.value,
        }).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Không gỡ được điều kiện")
        })
      }
    },
    resetRoomFilter: () => {
      if (room) {
        void updateRoomFilter(room.code, { action: "reset" }).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Không đặt lại được bộ lọc")
        })
      }
    },
    clearLocation,
    requestLocation,
    coordinates,
    locationSource,
    selectedSourceKey,
    selectLocationSource,
    isLocating,
    locationError,
    locationGate,
    isPending: fetchList ? query.isPending : false,
    isError: fetchList ? query.isError : false,
    refetch: () => void query.refetch(),
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    placesWithDistance,
    sortedPlaces,
    meta: query.data?.pages[0]?.meta,
  }
}
