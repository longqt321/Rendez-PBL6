import { useMemo } from "react"
import type { AdminOverview } from "@rendez/schema"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/format"
import { ADMIN_UI } from "../../lib/admin-constants"

const QUALITY_CHART_CONFIG = {
  percent: { label: "Độ phủ (%)", color: "var(--chart-2)" },
} satisfies ChartConfig

export function VenueQualityChart({
  venues,
  className,
}: Readonly<{ venues: AdminOverview["venues"]; className?: string }>) {
  const data = useMemo(() => {
    const total = Math.max(1, venues.total)
    const pct = (count: number) => Math.round((count / total) * ADMIN_UI.PERCENT_SCALE)
    return [
      {
        key: "published",
        label: "Đang hiển thị",
        count: venues.published,
        percent: pct(venues.published),
      },
      {
        key: "withImages",
        label: "Có hình ảnh",
        count: venues.withImages,
        percent: pct(venues.withImages),
      },
      { key: "withTags", label: "Có thẻ", count: venues.withTags, percent: pct(venues.withTags) },
      {
        key: "withHours",
        label: "Có giờ mở cửa",
        count: venues.withHours,
        percent: pct(venues.withHours),
      },
    ]
  }, [venues])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chất lượng dữ liệu</CardTitle>
        <CardDescription>Độ phủ trên {formatNumber(venues.total)} địa điểm</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={QUALITY_CHART_CONFIG} className="aspect-auto h-56 w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, ADMIN_UI.PERCENT_SCALE]} hide />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={108}
              className="text-xs"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const rowPayload = item.payload as
                      { label?: string; count?: number } | undefined
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {String(rowPayload?.label ?? "")}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatNumber(Number(rowPayload?.count ?? 0))} ({String(value)}%)
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Bar dataKey="percent" fill="var(--color-percent)" radius={[0, 6, 6, 0]} barSize={22}>
              <LabelList
                dataKey="percent"
                position="right"
                formatter={(v) => `${String(v ?? 0)}%`}
                className="fill-foreground text-xs font-semibold tabular-nums"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
