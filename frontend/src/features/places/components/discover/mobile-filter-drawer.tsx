import { SlidersHorizontalIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Toggle } from "@/components/ui/toggle"
import { LocationSwitcher } from "@/features/location/components/location-switcher"
import { DANANG_DISTRICTS } from "../../lib/danang-districts"
import { priceLevelLabel } from "../../lib/price-level"
import type { DiscoverView } from "../../hooks/use-discover-view"
import { NearbyButtonIcon } from "./toolbar-primitives"

interface MobileFilterDrawerProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly activeFilterCount: number
  readonly view: DiscoverView
  readonly onToggleNearby: () => void
  readonly onSortChange: (value: string) => void
}

export function MobileFilterDrawer({
  open,
  onOpenChange,
  activeFilterCount,
  view,
  onToggleNearby,
  onSortChange,
}: MobileFilterDrawerProps) {
  const { filters } = view

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant={activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            className="h-7 shrink-0 gap-1 rounded-full px-2.5 text-xs"
            aria-label="Mở bộ lọc"
          />
        }
      >
        <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
        <span>Lọc</span>
        {activeFilterCount > 0 ? (
          <Badge variant="default" className="h-4 min-w-4 px-1 text-xs">
            {activeFilterCount}
          </Badge>
        ) : null}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Bộ lọc & Vị trí</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <Toggle
              size="sm"
              variant="outline"
              pressed={filters.isNearbyActive}
              onPressedChange={onToggleNearby}
              disabled={view.isLocating}
              className="h-8 gap-1.5 rounded-full px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              <NearbyButtonIcon
                isLocating={view.isLocating}
                isNearbyActive={filters.isNearbyActive}
              />
              <span>Gần tôi</span>
            </Toggle>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Khu vực</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={filters.district === "all" ? "default" : "outline"}
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => filters.setDistrict("all")}
              >
                Tất cả
              </Button>
              {DANANG_DISTRICTS.map((district) => (
                <Button
                  key={district}
                  type="button"
                  size="sm"
                  variant={filters.district === district ? "default" : "outline"}
                  className="h-7 rounded-full px-2.5 text-xs"
                  onClick={() => filters.setDistrict(district)}
                >
                  {district}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Mức giá</p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", 1, 2, 3] as const).map((lvl) => (
                <Button
                  key={String(lvl)}
                  type="button"
                  size="sm"
                  variant={filters.priceMax === lvl ? "default" : "outline"}
                  className="h-7 rounded-full px-2.5 text-xs"
                  onClick={() => filters.setPriceMax(lvl)}
                >
                  {lvl === "all" ? "Mọi mức giá" : `${priceLevelLabel(lvl)} trở xuống`}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Sắp xếp</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={filters.sort === "newest" ? "default" : "outline"}
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => onSortChange("newest")}
              >
                Phù hợp / Mới nhất
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filters.sort === "rating" ? "default" : "outline"}
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => onSortChange("rating")}
              >
                Đánh giá cao
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
