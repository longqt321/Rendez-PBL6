import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import {
  ArrowUpDownIcon,
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
  UtensilsIcon,
  WineIcon,
  XIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { RoomJoinDialog } from "@/features/rooms/components/room-join-dialog"
import { cn } from "@/lib/utils"
import { CATEGORY_META } from "../lib/category-meta"
import { DANANG_DISTRICTS } from "../lib/danang-districts"
import { priceLevelLabel } from "../lib/price-level"
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

const SORT_LABELS: Record<"newest" | "rating" | "distance", string> = {
  newest: "Phù hợp / Mới nhất",
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
  const { filters } = view

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
          : "sticky top-[4.05rem] z-10 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur-md lg:-mx-8 lg:px-8",
      )}
    >
      {view.locationGate}

      {/* 1 hàng duy nhất: Dải Danh mục bên trái + Cụm nút Icon-only gọn bên phải */}
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
                  tab.value === "all" ? "all" : filters.category === tab.value ? "all" : tab.value,
                )
              }
              className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
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
                  <ToggleGroupItem value="grid" aria-label="Xem dạng lưới" className="size-8 p-0" />
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

      {/* Hàng phụ: chỉ hiện khi có bộ lọc đang bật */}
      {hasAnyActivePill ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Đang lọc:</span>

          {filters.category !== "all" ? (
            <FilterPill
              label={CATEGORY_META[filters.category].label}
              onRemove={() => filters.setCategory("all")}
            />
          ) : null}

          {filters.district !== "all" ? (
            <FilterPill label={filters.district} onRemove={() => filters.setDistrict("all")} />
          ) : null}

          {filters.priceMax !== "all" ? (
            <FilterPill
              label={`Tối đa ${priceLevelLabel(filters.priceMax)}`}
              onRemove={() => filters.setPriceMax("all")}
            />
          ) : null}

          {filters.isNearbyActive ? (
            <FilterPill
              label="Gần tôi"
              onRemove={() => {
                filters.setIsNearbyActive(false)
                view.clearLocation()
              }}
            />
          ) : null}

          {parsedChips.map((chip) => (
            <FilterPill
              key={chip.id}
              label={chip.label}
              variant={chip.kind}
              onRemove={() => filters.removeParsedChip(chip)}
            />
          ))}

          {filters.parsedQuery.residualQuery ? (
            <Badge variant="outline" className="h-6 rounded-full px-2.5 text-xs text-foreground">
              “{filters.parsedQuery.residualQuery}”
            </Badge>
          ) : null}

          <Badge
            variant="secondary"
            className="ml-auto h-6 rounded-full px-2.5 text-xs font-normal tabular-nums"
          >
            {totalCount} địa điểm
          </Badge>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 rounded-full px-2 text-xs text-muted-foreground"
            onClick={() => {
              filters.resetAll()
              view.clearLocation()
            }}
          >
            Xoá tất cả
          </Button>
        </div>
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

      <RoomJoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onCreate={view.createRoom}
        onJoin={view.joinRoom}
      />
    </div>
  )
}

function FilterPill({
  label,
  variant = "include",
  onRemove,
}: Readonly<{
  label: string
  variant?: "include" | "exclude"
  onRemove: () => void
}>) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1 rounded-full pr-1 pl-2.5 text-xs",
        variant === "exclude"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-primary/40 bg-primary/10 text-primary",
      )}
    >
      <span>{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Gỡ ${label}`}
        className="size-4 rounded-full"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </Button>
    </Badge>
  )
}

function NearbyButtonIcon({
  isLocating,
  isNearbyActive,
}: Readonly<{ isLocating: boolean; isNearbyActive: boolean }>) {
  if (isLocating) {
    return <Spinner className="size-4" aria-label="Đang xác định vị trí" />
  }
  if (isNearbyActive) {
    return <LocateFixedIcon className="size-4" />
  }
  return <NavigationIcon className="size-4 text-primary" />
}
