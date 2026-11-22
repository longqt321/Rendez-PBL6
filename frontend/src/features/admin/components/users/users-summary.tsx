import { useMemo } from "react"
import type { AdminOverview, UserRole } from "@rendez/schema"
import { LockIcon, ShieldIcon, UsersIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/format"
import { AdminKpiCard } from "../shared/admin-kpi-card"

const ROLE_CHART_CONFIG = {
  count: { label: "Tài khoản", color: "var(--chart-1)" },
} satisfies ChartConfig

export function UsersSummary({
  stats,
  piiMasked,
  selectedRole,
  onSelectRole,
}: Readonly<{
  stats: AdminOverview["users"]
  piiMasked: boolean
  selectedRole: string
  onSelectRole: (role: UserRole | null) => void
}>) {
  const roleDistribution = useMemo(() => {
    const regularCount = Math.max(0, stats.total - stats.admins - stats.moderators)
    return [
      { key: "user" as const, label: "Thành viên", count: regularCount },
      { key: "moderator" as const, label: "Kiểm duyệt", count: stats.moderators },
      { key: "admin" as const, label: "Quản trị", count: stats.admins },
    ]
  }, [stats])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:col-span-7">
        <AdminKpiCard
          label="Tổng tài khoản"
          value={formatNumber(stats.total)}
          icon={UsersIcon}
          subtitle={`${formatNumber(stats.active)} đang hoạt động`}
        />
        <AdminKpiCard
          label="Vận hành"
          value={formatNumber(stats.admins + stats.moderators)}
          icon={ShieldIcon}
          subtitle={`${formatNumber(stats.admins)} quản trị · ${formatNumber(stats.moderators)} kiểm duyệt`}
        />
        <AdminKpiCard
          label="Đã khoá"
          value={formatNumber(stats.banned)}
          icon={LockIcon}
          tone={stats.banned > 0 ? "danger" : "success"}
          subtitle={piiMasked ? "Đang che PII email" : "Hiển thị email đầy đủ"}
        />
      </div>

      <Card className="xl:col-span-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cơ cấu vai trò</CardTitle>
          <CardDescription className="text-xs">Bấm cột để lọc nhanh</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ROLE_CHART_CONFIG} className="aspect-auto h-32 w-full">
            <BarChart
              data={roleDistribution}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={84}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[0, 4, 4, 0]}
                barSize={18}
                className="cursor-pointer"
                onClick={(entry) => {
                  const nextRole = (entry?.payload as { key?: UserRole } | undefined)?.key
                  if (nextRole) onSelectRole(selectedRole === nextRole ? null : nextRole)
                }}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
