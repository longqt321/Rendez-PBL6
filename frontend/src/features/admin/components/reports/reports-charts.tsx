import { useMemo } from "react"
import type { AdminOverview } from "@rendez/schema"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatNumber } from "@/lib/format"
import { ADMIN_UI } from "../../lib/admin-constants"

const REASON_CHART_CONFIG = {
  pending: { label: "Chờ xử lý", color: "var(--chart-5)" },
  resolved: { label: "Đã đóng", color: "var(--chart-2)" },
} satisfies ChartConfig

const STATUS_PIE_CONFIG = {
  pending: { label: "Chờ xử lý", color: "var(--chart-5)" },
  reviewed: { label: "Đã xử lý", color: "var(--chart-2)" },
  dismissed: { label: "Bỏ qua", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ReportsCharts({ overview }: Readonly<{ overview: AdminOverview | undefined }>) {
  const reasonData = useMemo(
    () =>
      (overview?.reportsByReason ?? []).map((item) => ({
        reason: item.reason,
        label: REPORT_REASON_META[item.reason].label,
        pending: item.pending,
        resolved: Math.max(0, item.total - item.pending),
      })),
    [overview?.reportsByReason],
  )

  const statusPieData = useMemo(() => {
    const r = overview?.reports
    if (!r) return []
    return [
      { key: "pending", label: "Chờ xử lý", value: r.pending, fill: "var(--chart-5)" },
      { key: "reviewed", label: "Đã xử lý", value: r.reviewed, fill: "var(--chart-2)" },
      { key: "dismissed", label: "Bỏ qua", value: r.dismissed, fill: "var(--chart-3)" },
    ].filter((d) => d.value > 0)
  }, [overview?.reports])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Báo cáo theo lý do</CardTitle>
          <CardDescription>Đang chờ và đã đóng theo từng nhóm phản ánh</CardDescription>
        </CardHeader>
        <CardContent>
          {reasonData.length === 0 ? (
            <CardDescription className="py-8 text-center">Chưa có báo cáo.</CardDescription>
          ) : (
            <ChartContainer config={REASON_CHART_CONFIG} className="aspect-auto h-52 w-full">
              <BarChart
                data={reasonData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
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
                <Bar dataKey="pending" stackId="r" fill="var(--color-pending)" />
                <Bar
                  dataKey="resolved"
                  stackId="r"
                  fill="var(--color-resolved)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tỷ lệ xử lý</CardTitle>
          <CardDescription>
            Tổng {formatNumber(overview?.reports.total ?? 0)} báo cáo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2">
          {statusPieData.length === 0 ? (
            <CardDescription className="py-10">Chưa có báo cáo.</CardDescription>
          ) : (
            <ChartContainer
              config={STATUS_PIE_CONFIG}
              className="mx-auto aspect-square h-44 w-full max-w-48"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={ADMIN_UI.PIE_INNER_RADIUS_SM}
                  outerRadius={ADMIN_UI.PIE_OUTER_RADIUS_SM}
                  paddingAngle={statusPieData.length > 1 ? ADMIN_UI.PIE_PADDING_ANGLE : 0}
                >
                  {statusPieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
