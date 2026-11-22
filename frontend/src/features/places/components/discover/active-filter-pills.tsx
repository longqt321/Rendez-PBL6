import type { ParsedFilterChip } from "@rendez/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_META } from "../../lib/category-meta"
import { priceLevelLabel } from "../../lib/price-level"
import type { DiscoverView } from "../../hooks/use-discover-view"
import { FilterPill } from "./toolbar-primitives"

interface ActiveFilterPillsProps {
  readonly view: DiscoverView
  readonly parsedChips: ParsedFilterChip[]
  readonly totalCount: number
}

export function ActiveFilterPills({ view, parsedChips, totalCount }: ActiveFilterPillsProps) {
  const { filters } = view

  return (
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
  )
}
