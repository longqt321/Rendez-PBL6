import type { AdminDistrictBreakdown } from "@rendez/schema"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const DISTRICT_CHART_CONFIG = {
  published: { label: "Hiển thị", color: "var(--chart-2)" },
  unpublished: { label: "Đang ẩn", color: "var(--chart-3)" },
  closed: { label: "Đóng cửa", color: "var(--chart-5)" },
} satisfies ChartConfig

export function DistrictPlacesChart({
  data,
  selectedDistrict,
  onSelectDistrict,
}: Readonly<{
  data: readonly AdminDistrictBreakdown[]
  selectedDistrict: string
  onSelectDistrict: (district: string | null) => void
}>) {
  function handleBarClick(entry: unknown) {
    const payload = (entry as { payload?: { district?: string } } | undefined)?.payload
    const name = payload?.district
    if (name && name !== "Chưa rõ") {
      onSelectDistrict(selectedDistrict === name ? null : name)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Địa điểm theo quận</CardTitle>
          <CardDescription>Bấm cột để lọc bảng theo quận</CardDescription>
        </div>
        {selectedDistrict !== "all" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSelectDistrict(null)}
          >
            Đang lọc: {selectedDistrict} · Bỏ lọc
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <CardDescription className="py-8 text-center">Chưa có dữ liệu địa điểm.</CardDescription>
        ) : (
          <ChartContainer config={DISTRICT_CHART_CONFIG} className="aspect-auto h-56 w-full">
            <BarChart data={[...data]} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="district" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={38} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="published"
                stackId="d"
                fill="var(--color-published)"
                className="cursor-pointer"
                onClick={handleBarClick}
              />
              <Bar
                dataKey="unpublished"
                stackId="d"
                fill="var(--color-unpublished)"
                className="cursor-pointer"
                onClick={handleBarClick}
              />
              <Bar
                dataKey="closed"
                stackId="d"
                fill="var(--color-closed)"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
                onClick={handleBarClick}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
