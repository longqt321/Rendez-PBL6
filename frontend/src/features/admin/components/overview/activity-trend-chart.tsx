import { useMemo, useState } from "react"
import type { AdminDailyTrend } from "@rendez/schema"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ADMIN_UI, formatAdminShortDate } from "../../lib/admin-constants"

const TREND_CHART_CONFIG = {
  interactions: { label: "Tương tác", color: "var(--chart-1)" },
  reviews: { label: "Đánh giá", color: "var(--chart-2)" },
  reports: { label: "Báo cáo", color: "var(--chart-5)" },
} satisfies ChartConfig

export function ActivityTrendChart({
  trends,
  className,
}: Readonly<{ trends: readonly AdminDailyTrend[]; className?: string }>) {
  const [range, setRange] = useState<"7d" | "14d">("14d")

  const series = useMemo(() => {
    const sliced = range === "7d" ? trends.slice(-ADMIN_UI.OVERVIEW_SHORT_RANGE_DAYS) : trends
    return sliced.map((item) => ({
      ...item,
      shortDate: formatAdminShortDate(item.date),
    }))
  }, [trends, range])

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Nhịp hoạt động</CardTitle>
          <CardDescription>Tương tác, đánh giá và báo cáo theo ngày</CardDescription>
        </div>
        <ToggleGroup
          value={[range]}
          onValueChange={(next) => {
            const selected = next[0] as "7d" | "14d" | undefined
            if (selected) setRange(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Chọn khung ngày"
        >
          <ToggleGroupItem value="7d" className="h-7 px-2.5 text-xs">
            7 ngày
          </ToggleGroupItem>
          <ToggleGroupItem value="14d" className="h-7 px-2.5 text-xs">
            14 ngày
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ChartContainer config={TREND_CHART_CONFIG} className="aspect-auto h-64 w-full">
          <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillInteractions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-interactions)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="var(--color-interactions)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillReviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-reviews)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="var(--color-reviews)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="interactions"
              type="monotone"
              fill="url(#fillInteractions)"
              stroke="var(--color-interactions)"
              strokeWidth={2}
            />
            <Area
              dataKey="reviews"
              type="monotone"
              fill="url(#fillReviews)"
              stroke="var(--color-reviews)"
              strokeWidth={2}
            />
            <Area
              dataKey="reports"
              type="monotone"
              fill="var(--color-reports)"
              fillOpacity={0.18}
              stroke="var(--color-reports)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
