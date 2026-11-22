import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { formatNumber } from "@/lib/format"
import type { AdminObservability } from "../../api/admin-api"
import { ADMIN_UI, WEB_VITAL_META } from "../../lib/admin-constants"

const VITAL_CHART_CONFIG = {
  goodPct: { label: "Mượt (%)", color: "var(--open)" },
  midPct: { label: "Trung bình (%)", color: "var(--star)" },
  poorPct: { label: "Chậm (%)", color: "var(--destructive)" },
} satisfies ChartConfig

function vitalRatingBadge(name: "LCP" | "INP" | "CLS", p75: number | null) {
  if (p75 === null) return { label: "Chưa có dữ liệu", variant: "outline" as const }
  const meta = WEB_VITAL_META[name]
  if (p75 <= meta.good) return { label: "Mượt", variant: "secondary" as const }
  if (p75 <= meta.poor) return { label: "Trung bình", variant: "outline" as const }
  return { label: "Cần tối ưu", variant: "destructive" as const }
}

/** Hiển thị tốc độ & độ mượt trên thiết bị người dùng bằng ngôn ngữ dễ hiểu + Recharts Stacked Bar. */
export function WebVitalsCard({
  webVitals,
  className,
}: Readonly<{
  webVitals: readonly AdminObservability["webVitals"][number][]
  className?: string
}>) {
  const chartData = useMemo(
    () =>
      webVitals
        .filter((v) => v.samples > 0)
        .map((v) => {
          const total = Math.max(1, v.samples)
          const needsImp = Math.max(0, v.samples - v.good - v.poor)
          const goodPct = Math.round((v.good / total) * ADMIN_UI.PERCENT_SCALE)
          const midPct = Math.round((needsImp / total) * ADMIN_UI.PERCENT_SCALE)
          const poorPct = Math.max(0, ADMIN_UI.PERCENT_SCALE - goodPct - midPct)
          return {
            label: WEB_VITAL_META[v.name].label,
            goodPct,
            midPct,
            poorPct,
          }
        }),
    [webVitals],
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trải nghiệm trên thiết bị người dùng</CardTitle>
        <CardDescription>Đo thực tế trên trình duyệt khi người dùng mở ứng dụng</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ItemGroup className="gap-2">
          {webVitals.map((vital) => {
            const meta = WEB_VITAL_META[vital.name]
            const badge = vitalRatingBadge(vital.name, vital.p75)
            return (
              <Item key={vital.name} variant="outline" size="sm">
                <ItemContent className="gap-0.5">
                  <ItemTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {meta.label}
                    <Badge variant={badge.variant} className="text-[11px]">
                      {badge.label}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="text-xs">
                    Mục tiêu: {meta.targetHint} · {formatNumber(vital.samples)} lượt đo
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {vital.p75 === null ? "-" : `${vital.p75}${meta.unit}`}
                  </Badge>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>

        {chartData.length > 0 ? (
          <ChartContainer config={VITAL_CHART_CONFIG} className="aspect-auto h-36 w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, ADMIN_UI.PERCENT_SCALE]} hide />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={132}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="goodPct" stackId="wv" fill="var(--color-goodPct)" barSize={16} />
              <Bar dataKey="midPct" stackId="wv" fill="var(--color-midPct)" barSize={16} />
              <Bar
                dataKey="poorPct"
                stackId="wv"
                fill="var(--color-poorPct)"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ChartContainer>
        ) : null}
      </CardContent>
    </Card>
  )
}
