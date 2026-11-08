import { useMemo, useState } from "react"
import {
  LayoutGridIcon,
  ListFilterIcon,
  LocateFixedIcon,
  MapIcon,
  NavigationIcon,
  SearchXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useUserLocation } from "@/hooks/use-user-location"
import { CATEGORY_META } from "../lib/category-meta"
import { calculateDistanceKm, DANANG_DISTRICTS } from "../lib/danang-districts"
import { useDiscoverPlaces } from "../hooks/use-discover-places"
import { useRooms } from "@/features/rooms/hooks/use-rooms"
import { RoomBanner } from "@/features/rooms/components/room-banner"
import { RoomJoinDialog } from "@/features/rooms/components/room-join-dialog"
import { matchesRoomFilter } from "@/features/rooms/lib/room"
import type { PlaceCategory } from "../types/place"
import { PlaceCard } from "../components/place-card"
import { PlaceCardSkeleton } from "../components/place-card-skeleton"
import { PlacesMap } from "../components/places-map"

const CATEGORY_TABS: { value: PlaceCategory | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(Object.keys(CATEGORY_META) as PlaceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_META[key].label,
  })),
]

/** Chiều cao ảnh cho skeleton — chỉ là hình thức chờ, không phải dữ liệu. */
const SKELETON_HEIGHTS = [320, 400, 280, 360, 440, 300, 380, 340, 420]

export function DiscoverPage() {
  const [category, setCategory] = useState<PlaceCategory | "all">("all")
  const [district, setDistrict] = useState<string | "all">("all")
  const [query, setQuery] = useState("")
  /** Gõ tới đâu gọi API tới đó sẽ bắn một request mỗi ký tự — chờ 300ms mới lọc. */
  const debouncedQuery = useDebouncedValue(query, 300)
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const [isNearbyActive, setIsNearbyActive] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  // Phòng lọc nhóm: đang trong phòng thì bộ lọc chung của phòng quyết định kết quả.
  const { activeCode, getRoom, createRoom, joinRoom, leaveRoom } = useRooms()
  const room = activeCode ? getRoom(activeCode) : undefined

  // Server mock chỉ nhận category/district/q — lấy đại diện đầu tiên của phòng;
  // các ràng buộc còn lại lọc client-side trên danh sách đã fetch.
  const roomFilters = useMemo(
    () =>
      room
        ? {
            category: room.filter.categories[0] ?? ("all" as const),
            district: room.filter.districts[0] ?? ("all" as const),
            query: "",
          }
        : undefined,
    [room],
  )

  const effectiveCategory = roomFilters?.category ?? category
  const effectiveDistrict = roomFilters?.district ?? district
  const effectiveQuery = roomFilters?.query ?? debouncedQuery

  const { coordinates, isLocating, locationError, requestLocation, clearLocation, locationGate } =
    useUserLocation()

  const filters = useMemo(
    () => ({ category: effectiveCategory, district: effectiveDistrict, query: effectiveQuery }),
    [effectiveCategory, effectiveDistrict, effectiveQuery],
  )
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useDiscoverPlaces(filters)

  const sentinelRef = useInfiniteScroll({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  })

  // Danh sách địa điểm gốc từ API, lọc thêm theo bộ lọc chung của phòng (nếu có)
  const rawPlaces = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? []
    return room ? items.filter((place) => matchesRoomFilter(place, room.filter)) : items
  }, [data, room])

  // Xử lý tính khoảng cách và sắp xếp khi bật chế độ "Gần đây"
  const placesWithDistance = useMemo(() => {
    if (!isNearbyActive || !coordinates) {
      return rawPlaces.map((p) => ({
        place: p,
        distanceKm:
          coordinates && p.lat && p.lng
            ? calculateDistanceKm(coordinates.lat, coordinates.lng, p.lat, p.lng)
            : undefined,
      }))
    }

    return rawPlaces
      .map((p) => ({
        place: p,
        distanceKm:
          p.lat && p.lng
            ? calculateDistanceKm(coordinates.lat, coordinates.lng, p.lat, p.lng)
            : undefined,
      }))
      .sort((a, b) => {
        if (a.distanceKm === undefined) return 1
        if (b.distanceKm === undefined) return -1
        return a.distanceKm - b.distanceKm
      })
  }, [rawPlaces, isNearbyActive, coordinates])

  const sortedPlaces = useMemo(
    () => placesWithDistance.map((item) => item.place),
    [placesWithDistance],
  )

  const activeFilterCount =
    (category === "all" ? 0 : 1) +
    (district === "all" ? 0 : 1) +
    (query.trim() ? 1 : 0) +
    (isNearbyActive ? 1 : 0)

  function handleToggleNearby() {
    if (isNearbyActive) {
      setIsNearbyActive(false)
      clearLocation()
    } else {
      setIsNearbyActive(true)
      requestLocation()
    }
  }

  function handleResetAllFilters() {
    setCategory("all")
    setDistrict("all")
    setQuery("")
    setIsNearbyActive(false)
    clearLocation()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      {locationGate}
      {room ? (
        <RoomBanner
          room={room}
          onLeave={() => {
            leaveRoom(room.code)
          }}
        />
      ) : null}
      {/* =========================================================================
          THANH CHỌN QUẬN ĐÀ NẴNG (Thanh chip cuộn ngang trên cùng)
          — đang trong phòng lọc nhóm thì bộ lọc cá nhân bị ẩn để cả nhóm cùng nhìn 1 kết quả
         ========================================================================= */}
      {!room ? (
        <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-3">
          <span className="mr-1 text-xs font-semibold whitespace-nowrap text-muted-foreground">
            Quận:
          </span>
          <ToggleGroup
            value={[district]}
            onValueChange={(next) => {
              const selected = next[0]
              if (selected) setDistrict(selected)
            }}
            variant="outline"
            size="sm"
            aria-label="Lọc theo quận"
            className="w-max shrink-0"
          >
            <ToggleGroupItem
              value="all"
              className="h-7 shrink-0 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              Tất cả quận
            </ToggleGroupItem>
            {DANANG_DISTRICTS.map((d) => (
              <ToggleGroupItem
                key={d}
                value={d}
                className="h-7 shrink-0 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {/* =========================================================================
          TOOLBAR ĐIỀU KHIỂN: Lọc, Gần đây, Đếm số lượng, Chuyển đổi Lưới / Bản đồ
         ========================================================================= */}
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {!room ? (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <ListFilterIcon className="size-4" />
              Lọc
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <div className="flex flex-col gap-2">
                <Field>
                  <FieldLabel
                    htmlFor="discover-filter"
                    className="text-sm font-semibold text-muted-foreground"
                  >
                    Từ khoá
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <ListFilterIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="discover-filter"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tên quán, món ăn, đường phố…"
                      aria-label="Lọc theo từ khoá"
                    />
                  </InputGroup>
                </Field>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <FieldTitle className="text-sm font-semibold text-muted-foreground">
                  Loại hình
                </FieldTitle>
                <ToggleGroup
                  value={[category]}
                  onValueChange={(next) => {
                    const selected = next[0] as PlaceCategory | "all" | undefined
                    if (selected) setCategory(selected)
                  }}
                  variant="outline"
                  size="sm"
                  aria-label="Lọc theo loại hình"
                  className="flex-wrap"
                >
                  {CATEGORY_TABS.map((tab) => (
                    <ToggleGroupItem
                      key={tab.value}
                      value={tab.value}
                      className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {tab.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {activeFilterCount > 0 ? (
                <Button
                  variant="ghost"
                  className="mt-2 justify-start text-xs text-muted-foreground"
                  onClick={handleResetAllFilters}
                >
                  <XIcon className="mr-1 size-3.5" />
                  Xoá tất cả bộ lọc
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        {/* Nút đi cùng nhóm — tạo phòng lọc chung hoặc vào phòng theo mã */}
        <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
          <UsersIcon className="size-4" />
          Đi cùng nhóm
        </Button>

        {/* Nút bật chế độ "Gần đây" */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                size="sm"
                pressed={isNearbyActive}
                onPressedChange={handleToggleNearby}
                disabled={isLocating}
                className="h-8 gap-1.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              />
            }
          >
            {isLocating ? (
              <Spinner className="size-3.5" aria-label="Đang xác định vị trí" />
            ) : isNearbyActive ? (
              <LocateFixedIcon className="size-3.5" />
            ) : (
              <NavigationIcon className="size-3.5 text-primary" />
            )}
            Gần đây
            {isNearbyActive && coordinates ? (
              <span className="size-1.5 animate-ping rounded-full bg-primary"></span>
            ) : null}
          </TooltipTrigger>
          <TooltipContent>Tìm quán gần vị trí hiện tại của bạn</TooltipContent>
        </Tooltip>

        <Badge variant="outline" className="h-6 px-2 text-xs font-normal text-muted-foreground">
          {sortedPlaces.length} địa điểm tại Đà Nẵng
        </Badge>

        {isFetchingNextPage ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3.5" aria-label="Đang tải thêm địa điểm" />
            Đang tải…
          </span>
        ) : null}

        {/* Nút chuyển đổi Lưới / Bản đồ */}
        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(val) => {
              const next = val[0] as "grid" | "map" | undefined
              if (next) setViewMode(next)
            }}
            variant="outline"
            size="sm"
            aria-label="Chế độ xem"
          >
            <ToggleGroupItem value="grid" aria-label="Xem dạng lưới">
              <LayoutGridIcon className="size-3.5" />
              <span className="ml-1 hidden text-xs sm:inline">Lưới</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Xem trên bản đồ">
              <MapIcon className="size-3.5" />
              <span className="ml-1 hidden text-xs sm:inline">Bản đồ</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Thông báo lỗi vị trí (nếu có) */}
      {locationError && isNearbyActive ? (
        <Alert className="mt-3 flex items-center justify-between gap-2 border-dashed">
          <AlertTitle className="text-xs font-normal">{locationError}</AlertTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-xs"
            onClick={() => setIsNearbyActive(false)}
          >
            Đóng
          </Button>
        </Alert>
      ) : null}

      {/* =========================================================================
          NỘI DUNG CHÍNH: Lưới địa điểm HOẶC Bản đồ tương tác
         ========================================================================= */}
      {isPending ? (
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={SKELETON_HEIGHTS[index % SKELETON_HEIGHTS.length]} />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Không tải được danh sách địa điểm</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : sortedPlaces.length === 0 ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy quán ăn phù hợp</EmptyTitle>
            <EmptyDescription>
              {district !== "all"
                ? `Chưa có địa điểm phù hợp tại Quận ${district}. Thử chọn quận khác hoặc xoá bộ lọc.`
                : "Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác."}
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={handleResetAllFilters}>
            Xoá bộ lọc
          </Button>
        </Empty>
      ) : viewMode === "map" ? (
        <div className="mt-5">
          <PlacesMap
            places={sortedPlaces}
            userCoordinates={coordinates}
            height="h-[calc(100vh-230px)] min-h-[500px]"
          />
        </div>
      ) : (
        <>
          <ul className="mt-5 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
            {placesWithDistance.map(({ place, distanceKm }) => (
              <li key={place.id} className="lg:h-full">
                <PlaceCard place={place} distanceKm={distanceKm} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

          <div className="mt-8 flex justify-center">
            {hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? <Spinner aria-label="Đang tải thêm địa điểm" /> : null}
                {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Đã hiển thị hết địa điểm tại Đà Nẵng.</p>
            )}
          </div>
        </>
      )}

      <RoomJoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onCreate={(name) => createRoom(name).code}
        onJoin={(code, displayName) => joinRoom(code, displayName || "Khách")?.code}
      />
    </div>
  )
}
