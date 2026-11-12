import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import {
  ArrowUpDownIcon,
  LayoutGridIcon,
  ListFilterIcon,
  LocateFixedIcon,
  MapIcon,
  NavigationIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RoomBanner } from "@/features/rooms/components/room-banner"
import { RoomJoinDialog } from "@/features/rooms/components/room-join-dialog"
import { CATEGORY_META } from "../lib/category-meta"
import { DANANG_DISTRICTS } from "../lib/danang-districts"
import type { PlaceCategory } from "../types/place"
import type { DiscoverView } from "../hooks/use-discover-view"

const CATEGORY_TABS: { value: PlaceCategory | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(Object.keys(CATEGORY_META) as PlaceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_META[key].label,
  })),
]

/** Nhóm "Mức giá" — nghĩa là TỐI ĐA (khớp `priceMax <=` của backend). */
const PRICE_TABS: { value: "all" | "1" | "2" | "3"; label: string; aria: string }[] = [
  { value: "all", label: "Tất cả", aria: "Không lọc mức giá" },
  { value: "1", label: "₫", aria: "Mức giá tối đa 1 (bình dân)" },
  { value: "2", label: "₫₫", aria: "Mức giá tối đa 2 (trung bình)" },
  { value: "3", label: "₫₫₫", aria: "Mức giá tối đa 3 (cao cấp)" },
]

/** Nhãn ngắn của kiểu sắp xếp — hiện trên nút Select. */
const SORT_LABELS: Record<"newest" | "rating" | "distance", string> = {
  newest: "Mới nhất",
  rating: "Đánh giá cao",
  distance: "Gần tôi",
}

interface DiscoverToolbarProps {
  view: DiscoverView
  /** Chế độ đang xem — quyết định nút nào sáng trong cụm chuyển Lưới/Bản đồ. */
  mode: "grid" | "map"
}

/**
 * Thanh lọc dùng chung cho `/discover` và `/map`.
 *
 * Hai trang là hai cách nhìn của cùng một bộ lọc: bộ lọc nằm trên URL nên
 * chuyển qua lại (nút Lưới/Bản đồ, hoặc nav) không mất search/filter. Đang ở
 * trong phòng lọc nhóm thì bộ lọc cá nhân bị ẩn — cả nhóm cùng nhìn một kết quả.
 */
export function DiscoverToolbar({ view, mode }: DiscoverToolbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [joinOpen, setJoinOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const { filters, room } = view

  // Heuristic client trên dữ liệu ĐÃ TẢI (không cần API mới): dữ liệu thật hiện
  // toàn `priceLevel = 1` và ~0 review, nên nhóm giá / option rating phải
  // disabled + chú thích thay vì "giả vờ" có tác dụng. Tự bật khi corpus được
  // làm giàu (V2-03).
  const hasPriceVariety = view.placesWithDistance.some(({ place }) => place.priceLevel > 1)
  const hasRatings = view.placesWithDistance.some(({ place }) => place.reviewCount > 0)

  function switchMode(next: "grid" | "map") {
    if (next === mode) return
    void navigate({ pathname: next === "grid" ? "/discover" : "/map", search: location.search })
  }

  function handleToggleNearby() {
    if (filters.isNearbyActive) {
      filters.setIsNearbyActive(false)
      view.clearLocation()
    } else {
      filters.setIsNearbyActive(true)
      void view.requestLocation()
    }
  }

  /**
   * Đổi sort từ Select. Chọn "Gần tôi" = bật chế độ "Gần đây" (xin quyền vị
   * trí) — CÙNG một đường ghi `setSort` với toggle, không có state song song
   * (thiết kế mục 2.2.1: `sort` là nguồn sự thật duy nhất).
   */
  function handleSortChange(value: string) {
    // Base UI không tự đóng menu khi chọn radio item → đóng thủ công để menu
    // không che toolbar sau khi đổi sort.
    setSortOpen(false)
    if (value === "distance") {
      if (filters.isNearbyActive) return
      filters.setSort("distance")
      void view.requestLocation()
      return
    }
    filters.setSort(value === "rating" ? "rating" : "newest")
    if (filters.isNearbyActive) view.clearLocation()
  }

  return (
    <>
      {view.locationGate}

      {room ? <RoomBanner room={room} onLeave={view.leaveRoom} /> : null}

      {/* Thanh chọn quận — ẩn khi phòng lọc nhóm đang quyết định kết quả */}
      {!room ? (
        <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-3">
          <span className="mr-1 text-xs font-semibold whitespace-nowrap text-muted-foreground">
            Quận:
          </span>
          <ToggleGroup
            value={[filters.district]}
            onValueChange={(next) => {
              const selected = next[0]
              if (selected) filters.setDistrict(selected)
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
            {DANANG_DISTRICTS.map((district) => (
              <ToggleGroupItem
                key={district}
                value={district}
                className="h-7 shrink-0 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {district}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {!room ? (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <ListFilterIcon className="size-4" />
              Lọc
              {filters.activeFilterCount > 0 ? (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-xs">
                  {filters.activeFilterCount}
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
                      value={filters.draftQuery}
                      onChange={(event) => filters.setDraftQuery(event.target.value)}
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
                  value={[filters.category]}
                  onValueChange={(next) => {
                    const selected = next[0] as PlaceCategory | "all" | undefined
                    if (selected) filters.setCategory(selected)
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

              <div className="flex flex-col gap-2 pt-2">
                <FieldTitle className="text-sm font-semibold text-muted-foreground">
                  Mức giá
                </FieldTitle>
                {/* "Tối đa" chứ không phải "đúng mức" — khớp `priceMax <=` của backend. */}
                <ToggleGroup
                  value={[String(filters.priceMax)]}
                  onValueChange={(next) => {
                    const selected = next[0] as "all" | "1" | "2" | "3" | undefined
                    if (selected) {
                      filters.setPriceMax(
                        selected === "all" ? "all" : (Number(selected) as 1 | 2 | 3),
                      )
                    }
                  }}
                  variant="outline"
                  size="sm"
                  aria-label="Lọc theo mức giá"
                  disabled={!hasPriceVariety}
                  aria-describedby={hasPriceVariety ? undefined : "discover-price-empty-note"}
                  className="flex-wrap"
                >
                  {PRICE_TABS.map((tab) => (
                    <ToggleGroupItem
                      key={tab.value}
                      value={tab.value}
                      aria-label={tab.aria}
                      className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {tab.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {!hasPriceVariety ? (
                  <p id="discover-price-empty-note" className="text-xs text-muted-foreground">
                    Chưa có dữ liệu phân mức giá — sẽ bật khi quán được cập nhật giá.
                  </p>
                ) : null}
              </div>

              {filters.activeFilterCount > 0 ? (
                <Button
                  variant="ghost"
                  className="mt-2 justify-start text-xs text-muted-foreground"
                  onClick={() => {
                    filters.resetAll()
                    view.clearLocation()
                  }}
                >
                  <XIcon className="mr-1 size-3.5" />
                  Xoá tất cả bộ lọc
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}

        {!room ? (
          <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
            <UsersIcon className="size-4" />
            Đi cùng nhóm
          </Button>
        ) : null}

        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                size="sm"
                pressed={filters.isNearbyActive}
                onPressedChange={handleToggleNearby}
                disabled={view.isLocating}
                className="h-8 gap-1.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              />
            }
          >
            {view.isLocating ? (
              <Spinner className="size-3.5" aria-label="Đang xác định vị trí" />
            ) : filters.isNearbyActive ? (
              <LocateFixedIcon className="size-3.5" />
            ) : (
              <NavigationIcon className="size-3.5 text-primary" />
            )}
            Gần đây
            {filters.isNearbyActive && view.coordinates ? (
              <span className="size-1.5 animate-ping rounded-full bg-primary"></span>
            ) : null}
          </TooltipTrigger>
          <TooltipContent>Tìm quán gần vị trí hiện tại của bạn</TooltipContent>
        </Tooltip>

        <Badge variant="outline" className="h-6 px-2 text-xs font-normal text-muted-foreground">
          {view.sortedPlaces.length} địa điểm tại Đà Nẵng
        </Badge>

        {view.isFetchingNextPage ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3.5" aria-label="Đang tải thêm địa điểm" />
            Đang tải…
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {/* Sắp xếp: giá trị đọc/ghi URL qua useDiscoverFilters (`sort`). */}
          <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" aria-label="Sắp xếp kết quả" />}
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span className="hidden text-xs sm:inline">Sắp xếp:</span>
              <span className="text-xs">{SORT_LABELS[filters.sort]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup value={filters.sort} onValueChange={handleSortChange}>
                <DropdownMenuRadioItem value="newest">Mới nhất</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating" disabled={!hasRatings}>
                  Đánh giá cao
                  {!hasRatings ? (
                    <span className="ml-auto text-xs text-muted-foreground">Chưa có đánh giá</span>
                  ) : null}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="distance">Gần tôi</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToggleGroup
            value={[mode]}
            onValueChange={(value) => {
              const next = value[0] as "grid" | "map" | undefined
              if (next) switchMode(next)
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

      {view.locationError && filters.isNearbyActive ? (
        <Alert className="mt-3 flex items-center justify-between gap-2 border-dashed">
          <AlertTitle className="text-xs font-normal">{view.locationError}</AlertTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-xs"
            onClick={() => filters.setIsNearbyActive(false)}
          >
            Đóng
          </Button>
        </Alert>
      ) : null}

      <RoomJoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onCreate={view.createRoom}
        onJoin={view.joinRoom}
      />
    </>
  )
}
