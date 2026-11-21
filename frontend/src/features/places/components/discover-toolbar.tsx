import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import {
  ArrowUpDownIcon,
  CheckIcon,
  ChevronDownIcon,
  CoffeeIcon,
  CookieIcon,
  CroissantIcon,
  IceCreamBowlIcon,
  LayoutGridIcon,
  LocateFixedIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
  WineIcon,
  XIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FieldTitle } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MotionPill } from "@/components/shared/motion-primitives"
import { RoomBanner } from "@/features/rooms/components/room-banner"
import { RoomJoinDialog } from "@/features/rooms/components/room-join-dialog"
import { cn } from "@/lib/utils"
import { CATEGORY_META } from "../lib/category-meta"
import { DANANG_DISTRICTS } from "../lib/danang-districts"
import type { Place, PlaceCategory } from "../types/place"
import type { DiscoverView } from "../hooks/use-discover-view"

const CATEGORY_ICON_MAP: Record<PlaceCategory | "all", LucideIcon> = {
  all: SparklesIcon,
  restaurant: UtensilsIcon,
  cafe: CoffeeIcon,
  "street-food": CookieIcon,
  bakery: CroissantIcon,
  dessert: IceCreamBowlIcon,
  bar: WineIcon,
}

const CATEGORY_TABS: { value: PlaceCategory | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(Object.keys(CATEGORY_META) as PlaceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_META[key].label,
  })),
]

const FEATURED_DISTRICTS = ["Hải Châu", "Sơn Trà", "Ngũ Hành Sơn", "Thanh Khê"] as const

const PRICE_TABS: { value: "all" | "1" | "2" | "3"; label: string; aria: string }[] = [
  { value: "all", label: "Tất cả", aria: "Không lọc mức giá" },
  { value: "1", label: "₫", aria: "Mức giá tối đa 1 (bình dân)" },
  { value: "2", label: "₫₫", aria: "Mức giá tối đa 2 (trung bình)" },
  { value: "3", label: "₫₫₫", aria: "Mức giá tối đa 3 (cao cấp)" },
]

const SORT_LABELS: Record<"newest" | "rating" | "distance", string> = {
  newest: "Mới nhất",
  rating: "Đánh giá cao",
  distance: "Gần tôi",
}

interface DiscoverToolbarProps {
  readonly view: DiscoverView
  readonly mode: "grid" | "map"
  readonly floating?: boolean
  readonly totalOverride?: number
  readonly placesOverride?: Place[]
  readonly isLoadingOverride?: boolean
}

export function DiscoverToolbar({
  view,
  mode,
  floating = false,
  totalOverride,
  placesOverride,
  isLoadingOverride,
}: DiscoverToolbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [joinOpen, setJoinOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [districtOpen, setDistrictOpen] = useState(false)
  const { filters, room } = view

  const sourcePlaces = placesOverride ?? view.sortedPlaces
  const hasPriceVariety = sourcePlaces.some((place) => place.priceLevel > 1)
  const extraSelectedDistrict =
    filters.district !== "all" &&
    !(FEATURED_DISTRICTS as readonly string[]).includes(filters.district)

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
      view.requestLocation()
    }
  }

  function handleSortChange(value: string) {
    setSortOpen(false)
    if (value === "distance") {
      if (filters.isNearbyActive) return
      filters.setSort("distance")
      view.requestLocation()
      return
    }
    filters.setSort(value === "rating" ? "rating" : "newest")
    if (filters.isNearbyActive) view.clearLocation()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5",
        floating
          ? "rounded-surface border border-border/80 bg-background/88 p-3 shadow-(--shadow-raised) backdrop-blur-md"
          : "sticky top-[4.05rem] z-10 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8",
      )}
    >
      {view.locationGate}

      {room ? <RoomBanner room={room} onLeave={view.leaveRoom} /> : null}

      {/* Hàng 1: Dải Loại hình đưa ra mặt tiền */}
      {!room ? (
        <div
          role="tablist"
          aria-label="Lọc theo loại hình"
          className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-0.5"
        >
          {CATEGORY_TABS.map((tab) => {
            const Icon = CATEGORY_ICON_MAP[tab.value]
            const active = filters.category === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => filters.setCategory(tab.value)}
                className={cn(
                  "relative isolate flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-primary-foreground"
                    : "border border-border/70 bg-card/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <MotionPill layoutId={`category-pill-${mode}`} className="rounded-full" />
                ) : null}
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Hàng 2: Chọn Quận thông minh + Bộ lọc giá + Gần đây + Sắp xếp + Chế độ xem */}
      <div className="flex flex-wrap items-center gap-2">
        {!room ? (
          <>
            {/* Top quận phổ biến trên màn hình vừa/rộng */}
            <div className="hidden items-center gap-1 xl:flex">
              <Button
                type="button"
                size="sm"
                variant={filters.district === "all" ? "secondary" : "ghost"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => filters.setDistrict("all")}
              >
                Tất cả quận
              </Button>
              {FEATURED_DISTRICTS.map((district) => (
                <Button
                  key={district}
                  type="button"
                  size="sm"
                  variant={filters.district === district ? "secondary" : "ghost"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => filters.setDistrict(district)}
                >
                  {district}
                </Button>
              ))}
            </div>

            {/* Searchable District Combobox (cmdk) */}
            <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant={extraSelectedDistrict ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs"
                  />
                }
              >
                <MapPinIcon className="size-3.5 text-primary" aria-hidden="true" />
                <span className="xl:hidden">
                  {filters.district === "all" ? "Khu vực" : filters.district}
                </span>
                <span className="hidden xl:inline">
                  {extraSelectedDistrict ? filters.district : "Quận khác"}
                </span>
                <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-60 p-0">
                <Command>
                  <CommandInput placeholder="Tìm quận tại Đà Nẵng…" />
                  <CommandList>
                    <CommandEmpty>Không thấy khu vực này.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Tất cả quận"
                        onSelect={() => {
                          filters.setDistrict("all")
                          setDistrictOpen(false)
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4",
                            filters.district === "all" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span>Tất cả quận</span>
                      </CommandItem>
                      {DANANG_DISTRICTS.map((district) => (
                        <CommandItem
                          key={district}
                          value={district}
                          onSelect={() => {
                            filters.setDistrict(district)
                            setDistrictOpen(false)
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "size-4",
                              filters.district === district ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span>{district}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Popover Lọc Mức giá (không lặp ô Từ khoá) */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs"
                  />
                }
              >
                <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
                Mức giá
                {filters.priceMax !== "all" ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {PRICE_TABS.find((t) => t.value === String(filters.priceMax))?.label}
                  </Badge>
                ) : null}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="flex flex-col gap-2">
                  <FieldTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Mức giá tối đa
                  </FieldTitle>
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
                        className="h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        {tab.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {!hasPriceVariety ? (
                    <p id="discover-price-empty-note" className="text-xs text-muted-foreground">
                      Chưa có dữ liệu phân mức giá, mục này sẽ bật khi quán được cập nhật.
                    </p>
                  ) : null}
                  {filters.activeFilterCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 justify-start text-xs text-muted-foreground"
                      onClick={() => {
                        filters.resetAll()
                        view.clearLocation()
                      }}
                    >
                      <XIcon className="size-3.5" />
                      Xoá tất cả bộ lọc
                    </Button>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-full text-xs lg:hidden"
              onClick={() => setJoinOpen(true)}
            >
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Nhóm
            </Button>
          </>
        ) : null}

        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                size="sm"
                pressed={filters.isNearbyActive}
                onPressedChange={handleToggleNearby}
                disabled={view.isLocating}
                className="h-8 gap-1.5 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              />
            }
          >
            <NearbyButtonIcon
              isLocating={view.isLocating}
              isNearbyActive={filters.isNearbyActive}
            />
            Gần đây
            {filters.isNearbyActive && view.coordinates ? (
              <span className="size-1.5 animate-ping rounded-full bg-primary-foreground" />
            ) : null}
          </TooltipTrigger>
          <TooltipContent>Tìm quán gần vị trí hiện tại của bạn</TooltipContent>
        </Tooltip>

        <Badge
          variant="outline"
          className="h-7 rounded-full px-2.5 text-xs font-normal text-muted-foreground tabular-nums"
        >
          {totalOverride ?? view.meta?.totalResults ?? sourcePlaces.length} địa điểm{" "}
          {mode === "map"
            ? "trong vùng xem"
            : !room && filters.district !== "all"
              ? `tại ${filters.district}`
              : ""}
        </Badge>

        {view.isFetchingNextPage || isLoadingOverride ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3.5" aria-label="Đang tải thêm địa điểm" />
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                  aria-label="Sắp xếp kết quả"
                />
              }
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span className="hidden sm:inline">Sắp xếp:</span>
              <span>{SORT_LABELS[filters.sort]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup value={filters.sort} onValueChange={handleSortChange}>
                <DropdownMenuRadioItem value="newest">Mới nhất</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating">Đánh giá cao</DropdownMenuRadioItem>
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
            <ToggleGroupItem value="grid" aria-label="Xem dạng lưới" className="h-8 px-2.5">
              <LayoutGridIcon className="size-3.5" />
              <span className="ml-1 hidden text-xs sm:inline">Lưới</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Xem trên bản đồ" className="h-8 px-2.5">
              <MapIcon className="size-3.5" />
              <span className="ml-1 hidden text-xs sm:inline">Bản đồ</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {view.locationError && filters.isNearbyActive ? (
        <Alert className="flex items-center justify-between gap-2 border-dashed">
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
    </div>
  )
}

function NearbyButtonIcon({
  isLocating,
  isNearbyActive,
}: Readonly<{ isLocating: boolean; isNearbyActive: boolean }>) {
  if (isLocating) {
    return <Spinner className="size-3.5" aria-label="Đang xác định vị trí" />
  }
  if (isNearbyActive) {
    return <LocateFixedIcon className="size-3.5" />
  }
  return <NavigationIcon className="size-3.5 text-primary" />
}
