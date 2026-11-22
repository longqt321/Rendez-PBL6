import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { GaugeIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { AdminObservability, ObservabilityEventItem } from "../../api/admin-api"
import {
  ADMIN_UI,
  TIMING_STAGE_LABELS,
  describeApiRoute,
  describeBehaviorEvent,
  findDominantTimingStage,
  type TimingSnapshot,
} from "../../lib/admin-constants"

const ENDPOINT_CHART_CONFIG = {
  avgMs: { label: "Trung bình (ms)", color: "var(--chart-2)" },
  p95Ms: { label: "Mức chậm 95% (ms)", color: "var(--chart-1)" },
} satisfies ChartConfig

const TIMING_BREAKDOWN_CONFIG = {
  dbMs: { label: TIMING_STAGE_LABELS.dbMs, color: "var(--chart-1)" },
  embedMs: { label: TIMING_STAGE_LABELS.embedMs, color: "var(--chart-5)" },
  redisMs: { label: TIMING_STAGE_LABELS.redisMs, color: "var(--chart-2)" },
  externalMs: { label: TIMING_STAGE_LABELS.externalMs, color: "var(--chart-3)" },
  appMs: { label: TIMING_STAGE_LABELS.appMs, color: "var(--chart-4)" },
} satisfies ChartConfig

const BEHAVIOR_CHART_CONFIG = {
  count: { label: "Lượt tương tác", color: "var(--chart-1)" },
} satisfies ChartConfig

export function EndpointLatencyChart({
  endpoints,
  className,
}: Readonly<{
  endpoints: readonly AdminObservability["latency"]["byEndpoint"][number][]
  className?: string
}>) {
  const data = useMemo(
    () =>
      [...endpoints]
        .sort((a, b) => b.p95Ms - a.p95Ms)
        .slice(0, ADMIN_UI.OBSERVABILITY_TOP_ENDPOINTS)
        .map((ep) => ({
          ...ep,
          featureLabel: describeApiRoute(ep.route),
        })),
    [endpoints],
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chức năng &amp; API phản hồi chậm nhất</CardTitle>
        <CardDescription>So sánh tốc độ trung bình và mức chậm của 95% lượt gọi</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <CardDescription className="py-12 text-center">Chưa có dữ liệu lượt gọi.</CardDescription>
        ) : (
          <ChartContainer config={ENDPOINT_CHART_CONFIG} className="aspect-auto h-72 w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} unit="ms" />
              <YAxis
                dataKey="featureLabel"
                type="category"
                tickLine={false}
                axisLine={false}
                width={150}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="avgMs" fill="var(--color-avgMs)" radius={[0, 3, 3, 0]} />
              <Bar dataKey="p95Ms" fill="var(--color-p95Ms)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function TimingWaterfallChart({
  events,
  className,
}: Readonly<{ events: readonly ObservabilityEventItem[]; className?: string }>) {
  const { rows, dominant } = useMemo(() => {
    const timed = events
      .filter((ev) => ev.timing && ev.route)
      .slice(0, ADMIN_UI.OBSERVABILITY_TOP_WATERFALL)

    const totals = timed.reduce<TimingSnapshot>(
      (acc, ev) => ({
        dbMs: acc.dbMs + (ev.timing?.dbMs ?? 0),
        redisMs: acc.redisMs + (ev.timing?.redisMs ?? 0),
        embedMs: acc.embedMs + (ev.timing?.embedMs ?? 0),
        externalMs: acc.externalMs + (ev.timing?.externalMs ?? 0),
        appMs: acc.appMs + (ev.timing?.appMs ?? 0),
      }),
      { dbMs: 0, redisMs: 0, embedMs: 0, externalMs: 0, appMs: 0 },
    )

    return {
      rows: timed.map((ev, idx) => ({
        label: `${idx + 1}. ${describeApiRoute(ev.route)}`,
        dbMs: ev.timing?.dbMs ?? 0,
        redisMs: ev.timing?.redisMs ?? 0,
        embedMs: ev.timing?.embedMs ?? 0,
        externalMs: ev.timing?.externalMs ?? 0,
        appMs: ev.timing?.appMs ?? 0,
      })),
      dominant: findDominantTimingStage(totals),
    }
  }, [events])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bước nào đang làm chậm?</CardTitle>
        <CardDescription>
          {dominant
            ? `Điểm nghẽn lớn nhất: ${dominant.label} (${dominant.percent}%)`
            : "Tỷ trọng thời gian ở từng bước lấy dữ liệu"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty className="border py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GaugeIcon />
              </EmptyMedia>
              <EmptyTitle>Chưa có phản hồi chậm</EmptyTitle>
              <EmptyDescription>
                Biểu đồ xuất hiện khi có yêu cầu vượt ngưỡng chậm.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={TIMING_BREAKDOWN_CONFIG} className="aspect-auto h-72 w-full">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} unit="ms" />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={150}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="dbMs" stackId="t" fill="var(--color-dbMs)" />
              <Bar dataKey="embedMs" stackId="t" fill="var(--color-embedMs)" />
              <Bar dataKey="redisMs" stackId="t" fill="var(--color-redisMs)" />
              <Bar dataKey="externalMs" stackId="t" fill="var(--color-externalMs)" />
              <Bar dataKey="appMs" stackId="t" fill="var(--color-appMs)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function BehaviorChart({
  behavior24h,
  className,
}: Readonly<{
  behavior24h: readonly AdminObservability["behavior24h"][number][]
  className?: string
}>) {
  const data = useMemo(
    () =>
      behavior24h.map((item) => ({
        ...item,
        label: describeBehaviorEvent(item.eventType),
      })),
    [behavior24h],
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hoạt động người dùng (24 giờ)</CardTitle>
        <CardDescription>Các thao tác phổ biến nhất trên ứng dụng</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <CardDescription className="py-12 text-center">
            Chưa có tương tác trong 24 giờ qua.
          </CardDescription>
        ) : (
          <ChartContainer config={BEHAVIOR_CHART_CONFIG} className="aspect-auto h-64 w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={140}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
