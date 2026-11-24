import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import {
  ArrowUpDownIcon,
  CoffeeIcon,
  CookieIcon,
  CroissantIcon,
  IceCreamBowlIcon,
  LayoutGridIcon,
  MapIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
  UtensilsIcon,
  WineIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LocationSwitcher } from "@/features/location/components/location-switcher"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { cn } from "@/lib/utils"
import { CATEGORY_META } from "../lib/category-meta"
import { DANANG_DISTRICTS } from "../lib/danang-districts"
import { priceLevelLabel } from "../lib/price-level"
import type { Place, PlaceCategory } from "../types/place"
import type { DiscoverView } from "../hooks/use-discover-view"
import { ActiveFilterPills } from "./discover/active-filter-pills"
import { MobileFilterDrawer } from "./discover/mobile-filter-drawer"
import { NearbyButtonIcon } from "./discover/toolbar-primitives"

const CATEGORY_ICON_MAP: Record<PlaceCategory | "all", LucideIcon> = {
  all: LayoutGridIcon,
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

const SORT_LABELS: Record<"newest" | "rating" | "distance", string> = {
  newest: "Phù hợp / Mới nhất",
  rating: "Đánh giá cao",
  distance: "Gần tôi",
}

interface DiscoverToolbarProps {
  readonly view: DiscoverView
  readonly mode: "grid" | "map"
  readonly floating?: boolean
  readonly className?: string
  readonly totalOverride?: number
  readonly placesOverride?: Place[]
  readonly isLoadingOverride?: boolean
}

export function DiscoverToolbar({
  view,
  mode,
  floating = false,
  className,
  totalOverride,
  placesOverride,
  isLoadingOverride,
}: DiscoverToolbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sortOpen, setSortOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const { filters } = view
  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.district !== "all" ? 1 : 0) +
    (filters.priceMax !== "all" ? 1 : 0) +
    (filters.sort === "rating" ? 1 : 0) +
    (filters.isNearbyActive ? 1 : 0)

  const sourcePlaces = placesOverride ?? view.sortedPlaces
  const totalCount = totalOverride ?? view.meta?.totalResults ?? sourcePlaces.length

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
    filters.setSort(value === "rating" ? "rating" : "newest")
    if (filters.isNearbyActive) view.clearLocation()
  }

  const parsedChips = filters.parsedQuery.chips.filter((chip) => {
    if (chip.field === "category" && chip.kind === "include" && filters.category === chip.value) {
      return false
    }
    if (chip.field === "district" && chip.kind === "include" && filters.district === chip.value) {
      return false
    }
    if (
      chip.field === "priceMax" &&
      filters.priceMax !== "all" &&
      String(filters.priceMax) === chip.value
    ) {
      return false
    }
    if (chip.field === "nearMe" && filters.isNearbyActive) {
      return false
    }
    return true
  })

  const hasAnyActivePill =
    filters.category !== "all" ||
    filters.district !== "all" ||
    filters.priceMax !== "all" ||
    filters.isNearbyActive ||
    parsedChips.length > 0 ||
    filters.parsedQuery.residualQuery.length > 0

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        floating
          ? "rounded-surface border border-border/80 bg-background/95 px-3 py-2 shadow-(--shadow-raised) backdrop-blur-md"
          : "sticky top-14 z-10 -mx-4 border-b border-border/60 bg-background/95 px-3 py-1.5 backdrop-blur-md md:top-[4.05rem] md:px-4 md:py-2 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      {view.locationGate}

      {!isDesktop ? (
        /* Mobile (< md): 1 dòng cực gọn: danh mục cuộn ngang + nút Bộ lọc (Drawer) + chuyển chế độ */
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 scrollbar-none items-center gap-1 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const Icon = CATEGORY_ICON_MAP[tab.value]
              const active =
                filters.category === tab.value ||
                (tab.value !== "all" && filters.parsedQuery.categories.includes(tab.value))
              return (
                <Toggle
                  key={tab.value}
                  size="sm"
                  variant="outline"
                  pressed={active}
                  onPressedChange={() =>
                    filters.setCategory(
                      tab.value === "all"
                        ? "all"
                        : filters.category === tab.value
                          ? "all"
                          : tab.value,
                    )
                  }
                  className="h-7 shrink-0 gap-1 rounded-full px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  <Icon className="size-3 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </Toggle>
              )
            })}
          </div>

          <MobileFilterDrawer
            open={mobileFilterOpen}
            onOpenChange={setMobileFilterOpen}
            activeFilterCount={activeFilterCount}
            view={view}
            onToggleNearby={handleToggleNearby}
            onSortChange={handleSortChange}
          />

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-7 shrink-0 rounded-full"
            aria-label={mode === "grid" ? "Xem trên bản đồ" : "Xem dạng lưới"}
            onClick={() => switchMode(mode === "grid" ? "map" : "grid")}
          >
            {mode === "grid" ? (
              <MapIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <LayoutGridIcon className="size-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      ) : (
        /* Desktop (>= md): 1 hàng đầy đủ Dải Danh mục bên trái + Cụm nút Icon-only gọn bên phải */
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map((tab) => {
            const Icon = CATEGORY_ICON_MAP[tab.value]
            const active =
              filters.category === tab.value ||
              (tab.value !== "all" && filters.parsedQuery.categories.includes(tab.value))
            return (
              <Toggle
                key={tab.value}
                size="sm"
                variant="outline"
                pressed={active}
                onPressedChange={() =>
                  filters.setCategory(
                    tab.value === "all"
                      ? "all"
                      : filters.category === tab.value
                        ? "all"
                        : tab.value,
                  )
                }
                className="min-h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:h-8 sm:min-h-0"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </Toggle>
            )
          })}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {view.isFetchingNextPage || isLoadingOverride ? (
              <Spinner
                className="size-3.5 text-muted-foreground"
                aria-label="Đang tải thêm địa điểm"
              />
            ) : null}

            {/* Icon Dropdown: Chọn Quận */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant={filters.district !== "all" ? "secondary" : "outline"}
                          size="icon-sm"
                          className="relative rounded-full"
                          aria-label={
                            filters.district === "all"
                              ? "Lọc theo khu vực"
                              : `Khu vực: ${filters.district}`
                          }
                        />
                      }
                    />
                  }
                >
                  <MapPinIcon className="size-4 text-primary" aria-hidden="true" />
                  {filters.district !== "all" ? (
                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>
                  {filters.district === "all" ? "Lọc theo quận" : `Quận: ${filters.district}`}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={filters.district}
                  onValueChange={(value: string) => filters.setDistrict(value)}
                >
                  <DropdownMenuRadioItem value="all">Tất cả quận</DropdownMenuRadioItem>
                  {DANANG_DISTRICTS.map((district) => (
                    <DropdownMenuRadioItem key={district} value={district}>
                      {district}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Icon Dropdown: Chọn Mức giá */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant={filters.priceMax !== "all" ? "secondary" : "outline"}
                          size="icon-sm"
                          className="relative rounded-full"
                          aria-label={
                            filters.priceMax === "all"
                              ? "Lọc theo mức giá"
                              : `Mức giá: ${priceLevelLabel(filters.priceMax)}`
                          }
                        />
                      }
                    />
                  }
                >
                  <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden="true" />
                  {filters.priceMax !== "all" ? (
                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>
                  {filters.priceMax === "all"
                    ? "Lọc theo mức giá"
                    : `Tối đa ${priceLevelLabel(filters.priceMax)}`}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={String(filters.priceMax)}
                  onValueChange={(value: string) =>
                    filters.setPriceMax(value === "all" ? "all" : (Number(value) as 1 | 2 | 3))
                  }
                >
                  <DropdownMenuRadioItem value="all">Mọi mức giá</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="1">₫ (Bình dân)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="2">₫₫ trở xuống</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="3">₫₫₫ trở xuống</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Icon Toggle: Gần tôi */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Toggle
                    size="sm"
                    variant="outline"
                    pressed={filters.isNearbyActive}
                    onPressedChange={handleToggleNearby}
                    disabled={view.isLocating}
                    aria-label="Tìm quán gần tôi"
                    className="size-8 rounded-full p-0 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  />
                }
              >
                <NearbyButtonIcon
                  isLocating={view.isLocating}
                  isNearbyActive={filters.isNearbyActive}
                />
              </TooltipTrigger>
              <TooltipContent>
                {filters.isNearbyActive ? "Đang lọc gần tôi" : "Tìm quán gần tôi"}
              </TooltipContent>
            </Tooltip>

            <LocationSwitcher
              locationSource={view.locationSource}
              selectedSourceKey={view.selectedSourceKey}
              onSelectSource={(key) => {
                view.selectLocationSource(key)
                if (key !== null && filters.sort !== "distance") {
                  filters.setSort("distance")
                }
              }}
            />

            {/* Icon Dropdown: Sắp xếp */}
            <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant={filters.sort === "rating" ? "secondary" : "outline"}
                          size="icon-sm"
                          className="relative rounded-full"
                          aria-label={`Sắp xếp: ${SORT_LABELS[filters.sort]}`}
                        />
                      }
                    />
                  }
                >
                  <ArrowUpDownIcon className="size-4" aria-hidden="true" />
                  {filters.sort === "rating" ? (
                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>Sắp xếp: {SORT_LABELS[filters.sort]}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={filters.sort === "distance" ? "newest" : filters.sort}
                  onValueChange={handleSortChange}
                >
                  <DropdownMenuRadioItem value="newest">Phù hợp / Mới nhất</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="rating">Đánh giá cao</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="mx-0.5 h-5" />

            {/* Icon ToggleGroup: Lưới / Bản đồ */}
            <ToggleGroup
              value={[mode]}
              onValueChange={(value) => {
                const next = value[0] as "grid" | "map" | undefined
                if (next) switchMode(next)
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Chế độ xem"
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="grid"
                      aria-label="Xem dạng lưới"
                      className="size-8 p-0"
                    />
                  }
                >
                  <LayoutGridIcon className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Xem dạng lưới</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="map"
                      aria-label="Xem trên bản đồ"
                      className="size-8 p-0"
                    />
                  }
                >
                  <MapIcon className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Xem trên bản đồ</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </div>
        </div>
      )}

      {/* Hàng phụ: chỉ hiện khi có bộ lọc đang bật */}
      {hasAnyActivePill ? (
        <ActiveFilterPills view={view} parsedChips={parsedChips} totalCount={totalCount} />
      ) : null}

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
    </div>
  )
}
