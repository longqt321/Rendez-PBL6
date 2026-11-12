import { useEffect, useMemo } from "react"
import { toast } from "sonner"
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
  createRoom: (name: string) => Promise<string>
  /** Vào phòng theo mã; trả trạng thái để UI báo đúng nguyên nhân. */
  joinRoom: (code: string, displayName: string) => Promise<JoinRoomStatus>
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
  // `sort` + toạ độ cũng xuống server: sắp xếp khoảng cách là việc của server
  // (đúng trên TOÀN BỘ kết quả phân trang), client chỉ tính `distanceKm` để hiển thị.
  const serverFilters = useMemo(
    () => ({
      category: room ? ("all" as const) : filters.category,
      district: room ? ("all" as const) : filters.district,
      query: room ? "" : filters.query,
      priceMax: room ? undefined : filters.priceMax === "all" ? undefined : filters.priceMax,
      sort: filters.sort,
      // Chỉ gửi toạ độ khi sort là distance; chưa có vị trí thì server tự rơi
      // về newest, khi toạ độ về thì key đổi → fetch lại đúng thứ tự.
      coords:
        filters.sort === "distance" && coordinates
          ? { lat: coordinates.lat, lng: coordinates.lng }
          : undefined,
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
    [
      room,
      filters.category,
      filters.district,
      filters.query,
      filters.priceMax,
      filters.sort,
      coordinates,
    ],
  )

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

  const query = useDiscoverPlaces(serverFilters)

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
