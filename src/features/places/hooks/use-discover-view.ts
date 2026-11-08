import { useMemo } from "react"
import { useUserLocation } from "@/hooks/use-user-location"
import { useRooms } from "@/features/rooms/hooks/use-rooms"
import { matchesRoomFilter } from "@/features/rooms/lib/room"
import type { Room } from "@/features/rooms/types/room"
import { calculateDistanceKm } from "../lib/danang-districts"
import type { Place } from "../types/place"
import { useDiscoverPlaces } from "./use-discover-places"
import { useDiscoverFilters, type DiscoverFiltersState } from "./use-discover-filters"

export interface DiscoverView {
  filters: DiscoverFiltersState
  /** Phòng lọc nhóm đang hoạt động (nếu có) — mọi trang nhìn cùng một kết quả lọc. */
  room: Room | undefined
  /** Tạo phòng và trả về mã phòng (dùng cho dialog mời). */
  createRoom: (name: string) => string
  /** Vào phòng theo mã; trả về mã nếu thành công. */
  joinRoom: (code: string, displayName: string) => string | undefined
  leaveRoom: () => void
  coordinates: { lat: number; lng: number } | null
  isLocating: boolean
  locationError: string | null
  locationGate: React.ReactNode
  /** Tắt "Gần đây" cũng phải dọn vị trí đã xin quyền — tránh giữ GPS chạy nền. */
  clearLocation: () => void
  requestLocation: () => void
  isPending: boolean
  isError: boolean
  refetch: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  /** Danh sách đã lọc (kể cả bộ lọc phòng) + khoảng cách, sắp xếp khi bật "Gần đây". */
  placesWithDistance: { place: Place; distanceKm?: number }[]
  sortedPlaces: Place[]
}

/**
 * Toàn bộ trạng thái và dữ liệu của màn hình khám phá — dùng chung cho
 * `/discover` (lưới) và `/map` (bản đồ): hai cách nhìn của cùng một bộ lọc,
 * nên logic lọc chỉ tồn tại một chỗ duy nhất.
 */
export function useDiscoverView(): DiscoverView {
  const filters = useDiscoverFilters()
  const { activeCode, getRoom, createRoom, joinRoom, leaveRoom } = useRooms()
  const room = activeCode ? getRoom(activeCode) : undefined
  const { coordinates, isLocating, locationError, requestLocation, clearLocation, locationGate } =
    useUserLocation()
  // Server mock chỉ nhận category/district/q — lấy đại diện đầu tiên của phòng;
  // các ràng buộc còn lại lọc client-side trên danh sách đã fetch.
  const serverFilters = useMemo(
    () => ({
      category: room ? (room.filter.categories[0] ?? ("all" as const)) : filters.category,
      district: room ? (room.filter.districts[0] ?? ("all" as const)) : filters.district,
      query: room ? "" : filters.query,
    }),
    [room, filters.category, filters.district, filters.query],
  )

  const query = useDiscoverPlaces(serverFilters)

  const rawPlaces = useMemo(() => {
    const items = query.data?.pages.flatMap((page) => page.items) ?? []
    return room ? items.filter((place) => matchesRoomFilter(place, room.filter)) : items
  }, [query.data, room])

  // Xử lý tính khoảng cách và sắp xếp khi bật chế độ "Gần đây"
  const placesWithDistance = useMemo(() => {
    if (!filters.isNearbyActive || !coordinates) {
      return rawPlaces.map((place) => ({
        place,
        distanceKm:
          coordinates && place.lat && place.lng
            ? calculateDistanceKm(coordinates.lat, coordinates.lng, place.lat, place.lng)
            : undefined,
      }))
    }

    return rawPlaces
      .map((place) => ({
        place,
        distanceKm:
          place.lat && place.lng
            ? calculateDistanceKm(coordinates.lat, coordinates.lng, place.lat, place.lng)
            : undefined,
      }))
      .sort((a, b) => {
        if (a.distanceKm === undefined) return 1
        if (b.distanceKm === undefined) return -1
        return a.distanceKm - b.distanceKm
      })
  }, [rawPlaces, filters.isNearbyActive, coordinates])

  const sortedPlaces = useMemo(
    () => placesWithDistance.map((item) => item.place),
    [placesWithDistance],
  )

  return {
    filters,
    room,
    createRoom: (name) => createRoom(name).code,
    joinRoom: (code, displayName) => joinRoom(code, displayName || "Khách")?.code,
    leaveRoom: () => {
      if (room) leaveRoom(room.code)
    },
    clearLocation,
    requestLocation,
    coordinates,
    isLocating,
    locationError,
    locationGate,
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    placesWithDistance,
    sortedPlaces,
  }
}
