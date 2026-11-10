import { useMemo } from "react"
import { useUserLocation } from "@/hooks/use-user-location"
import { useRooms, type JoinRoomStatus } from "@/features/rooms/hooks/use-rooms"
import type { Room } from "@/features/rooms/types/room"
import { calculateDistanceKm } from "../lib/danang-districts"
import type { Place } from "../types/place"
import { useDiscoverPlaces } from "./use-discover-places"
import type { DiscoverFilters } from "../api/get-places"
import { useDiscoverFilters, type DiscoverFiltersState } from "./use-discover-filters"

export interface DiscoverView {
  filters: DiscoverFiltersState
  /** Phòng lọc nhóm đang hoạt động (nếu có) — mọi trang nhìn cùng một kết quả lọc. */
  room: Room | undefined
  /** Tạo phòng và trả về mã phòng (dùng cho dialog mời). */
  createRoom: (name: string) => string
  /** Vào phòng theo mã; trả về mã nếu thành công. */
  joinRoom: (code: string, displayName: string) => JoinRoomStatus
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
  /**
   * Bộ lọc đã quy về tham số server (gồm ràng buộc phòng). Bản đồ dùng lại đúng
   * bộ này để kết quả hai màn hình không lệch nhau.
   */
  serverFilters: DiscoverFilters
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
  // Phòng lọc nhóm gửi toàn bộ ràng buộc xuống server (server lọc trước khi phân
  // trang) — client không tự lọc lại, tránh hai nguồn sự thật cho cùng một việc.
  const serverFilters = useMemo(
    () => ({
      category: room ? ("all" as const) : filters.category,
      district: room ? ("all" as const) : filters.district,
      query: room ? "" : filters.query,
      room: room
        ? {
            categories: room.filter.categories,
            excludedCategories: room.filter.excludedCategories,
            districts: room.filter.districts,
            excludedDistricts: room.filter.excludedDistricts,
            includeKeywords: room.filter.includeKeywords,
            excludeKeywords: room.filter.excludeKeywords,
            priceMax: room.filter.priceMax,
          }
        : undefined,
    }),
    [room, filters.category, filters.district, filters.query],
  )

  const query = useDiscoverPlaces(serverFilters)

  const rawPlaces = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )

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
    serverFilters,
    filters,
    room,
    createRoom: (name) => createRoom(name).code,
    joinRoom: (code, displayName) => joinRoom(code, displayName || "Khách"),
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
