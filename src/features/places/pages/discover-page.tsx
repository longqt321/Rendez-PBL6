import { useMemo, useState } from "react"
import {
  LayoutGridIcon,
  ListFilterIcon,
  LocateFixedIcon,
  MapIcon,
  NavigationIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useUserLocation } from "@/hooks/use-user-location"
import { CATEGORY_META } from "../lib/category-meta"
import { calculateDistanceKm, DANANG_DISTRICTS } from "../lib/danang-districts"
import { useDiscoverPlaces } from "../hooks/use-discover-places"
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
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const [isNearbyActive, setIsNearbyActive] = useState(false)

  const { coordinates, isLocating, locationError, requestLocation, clearLocation } =
    useUserLocation()

  const filters = useMemo(() => ({ category, district, query }), [category, district, query])
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useDiscoverPlaces(filters)

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  })

  // Danh sách địa điểm gốc từ API
  const rawPlaces = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])

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
      {/* =========================================================================
          THANH CHỌN QUẬN ĐÀ NẴNG (Thanh chip cuộn ngang trên cùng)
         ========================================================================= */}
      <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-3">
        <span className="mr-1 text-xs font-semibold whitespace-nowrap text-muted-foreground">
          Quận:
        </span>
        <Button
          size="sm"
          variant={district === "all" ? "default" : "outline"}
          className="h-7 shrink-0 rounded-full px-3 text-xs"
          onClick={() => setDistrict("all")}
        >
          Tất cả quận
        </Button>
        {DANANG_DISTRICTS.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={district === d ? "default" : "outline"}
            className="h-7 shrink-0 rounded-full px-3 text-xs"
            onClick={() => setDistrict(d)}
          >
            {d}
          </Button>
        ))}
      </div>

      {/* =========================================================================
          TOOLBAR ĐIỀU KHIỂN: Lọc, Gần đây, Đếm số lượng, Chuyển đổi Lưới / Bản đồ
         ========================================================================= */}
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
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
              <label
                htmlFor="discover-filter"
                className="text-sm font-semibold text-muted-foreground"
              >
                Từ khoá
              </label>
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
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <span className="text-sm font-semibold text-muted-foreground">Loại hình</span>
              <div
                role="group"
                aria-label="Lọc theo loại hình"
                className="flex flex-wrap items-center gap-1.5"
              >
                {CATEGORY_TABS.map((tab) => (
                  <Button
                    key={tab.value}
                    size="sm"
                    className="h-7 text-xs"
                    variant={category === tab.value ? "default" : "outline"}
                    aria-pressed={category === tab.value}
                    onClick={() => setCategory(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
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

        {/* Nút bật chế độ "Gần đây" */}
        <Button
          size="sm"
          variant={isNearbyActive ? "default" : "outline"}
          className="h-8 gap-1.5 text-xs"
          onClick={handleToggleNearby}
          disabled={isLocating}
          title="Tìm quán gần vị trí hiện tại của bạn"
        >
          {isLocating ? (
            <Spinner className="size-3.5" />
          ) : isNearbyActive ? (
            <LocateFixedIcon className="size-3.5 text-primary-foreground" />
          ) : (
            <NavigationIcon className="size-3.5 text-primary" />
          )}
          Gần đây
          {isNearbyActive && coordinates ? (
            <span className="size-1.5 animate-ping rounded-full bg-emerald-400"></span>
          ) : null}
        </Button>

        <Badge variant="outline" className="h-6 px-2 text-xs font-normal text-muted-foreground">
          {sortedPlaces.length} địa điểm tại Đà Nẵng
        </Badge>

        {isFetchingNextPage ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3.5" />
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
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span>{locationError}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-xs"
            onClick={() => setIsNearbyActive(false)}
          >
            Đóng
          </Button>
        </div>
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
                {isFetchingNextPage ? <Spinner /> : null}
                {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Đã hiển thị hết địa điểm tại Đà Nẵng.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
