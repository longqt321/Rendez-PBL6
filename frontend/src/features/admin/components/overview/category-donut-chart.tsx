import { useMemo } from "react"
import type { AdminCategoryBreakdown, PlaceCategory } from "@rendez/schema"
import { Cell, Pie, PieChart } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { formatNumber } from "@/lib/format"
import { ADMIN_UI, CHART_PALETTE } from "../../lib/admin-constants"

export function CategoryDonutChart({
  categories,
  onSelectCategory,
  className,
}: Readonly<{
  categories: readonly AdminCategoryBreakdown[]
  onSelectCategory?: (category: PlaceCategory) => void
  className?: string
}>) {
  const data = useMemo(
    () =>
      categories.map((item, idx) => ({
        ...item,
        label: categoryLabel(item.category),
        fill: CHART_PALETTE[idx % CHART_PALETTE.length],
      })),
    [categories],
  )

  const config = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    for (const item of data) {
      cfg[item.category] = { label: item.label, color: item.fill }
    }
    return cfg
  }, [data])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Danh mục địa điểm</CardTitle>
        <CardDescription>Bấm mục để lọc nhanh</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer config={config} className="mx-auto aspect-square h-48 w-full max-w-52">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="category"
                  formatter={(val, _name, item) => {
                    const rowPayload = item.payload as { label?: string } | undefined
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {String(rowPayload?.label ?? "")}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatNumber(Number(val))} quán
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={ADMIN_UI.PIE_INNER_RADIUS_LG}
              outerRadius={ADMIN_UI.PIE_OUTER_RADIUS_LG}
              paddingAngle={data.length > 1 ? ADMIN_UI.PIE_PADDING_ANGLE : 0}
              onClick={(entry) => {
                const cat = (entry?.payload as { category?: PlaceCategory } | undefined)?.category
                if (cat && onSelectCategory) onSelectCategory(cat)
              }}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-1.5">
          {data.map((item) => (
            <Button
              key={item.category}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 justify-between px-2 text-xs font-normal"
              onClick={() => onSelectCategory?.(item.category)}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: item.fill }}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatNumber(item.total)}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
