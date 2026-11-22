import { useMemo } from "react"
import type { AdminDailyTrend } from "@rendez/schema"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatAdminShortDate } from "../../lib/admin-constants"

const AUDIT_CHART_CONFIG = {
  auditLogs: { label: "Thao tác", color: "var(--chart-1)" },
} satisfies ChartConfig

export function AuditFrequencyChart({ trends }: Readonly<{ trends: readonly AdminDailyTrend[] }>) {
  const data = useMemo(
    () =>
      trends.map((item) => ({
        shortDate: formatAdminShortDate(item.date),
        auditLogs: item.auditLogs,
      })),
    [trends],
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tần suất kiểm toán (14 ngày)</CardTitle>
        <CardDescription>Bấm vào dòng trong bảng để xem chi tiết</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={AUDIT_CHART_CONFIG} className="aspect-auto h-44 w-full">
          <BarChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="auditLogs" fill="var(--color-auditLogs)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
