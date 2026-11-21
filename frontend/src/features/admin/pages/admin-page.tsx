import { useQueryClient } from "@tanstack/react-query"
import {
  ActivityIcon,
  FlagIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { useSearchParams } from "react-router"
import { PageContainer, PageHeader, StickyAside } from "@/components/layout/page-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMe } from "@/features/profile/hooks/use-me"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AuditLogsTab } from "../components/audit-logs-tab"
import { ObservabilityTab } from "../components/observability-tab"
import { OverviewTab, type AdminTabKey } from "../components/overview-tab"
import { PlacesTab } from "../components/places-tab"
import { ReportsTab } from "../components/reports-tab"
import { UsersTab } from "../components/users-tab"
import { ADMIN_KEYS, useAdminOverview } from "../hooks/use-admin"

interface NavItem {
  key: AdminTabKey
  label: string
  group: "ops" | "system"
  adminOnly?: boolean
  icon: typeof LayoutDashboardIcon
}

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Tổng quan", group: "ops", icon: LayoutDashboardIcon },
  { key: "reports", label: "Báo cáo", group: "ops", icon: FlagIcon },
  { key: "places", label: "Địa điểm", group: "ops", icon: MapPinIcon },
  { key: "users", label: "Người dùng", group: "ops", adminOnly: true, icon: UsersIcon },
  {
    key: "observability",
    label: "Hiệu suất & Log",
    group: "system",
    adminOnly: true,
    icon: ActivityIcon,
  },
  { key: "logs", label: "Nhật ký kiểm toán", group: "system", icon: ScrollTextIcon },
]

const VALID_TABS: ReadonlySet<AdminTabKey> = new Set(NAV_ITEMS.map((item) => item.key))

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const overviewQuery = useAdminOverview()
  const isAdmin = me?.role === "admin"

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const rawTab = searchParams.get("tab") as AdminTabKey | null
  const requestedItem = visibleNavItems.find((item) => item.key === rawTab)
  const activeTab: AdminTabKey =
    rawTab && VALID_TABS.has(rawTab) && requestedItem ? rawTab : "overview"

  function handleTabChange(next: AdminTabKey) {
    if (!visibleNavItems.some((item) => item.key === next)) return
    const updated = new URLSearchParams(searchParams)
    if (next === "overview") updated.delete("tab")
    else updated.set("tab", next)
    setSearchParams(updated, { replace: true })
  }

  const pendingReportsCount = overviewQuery.data?.reports.pending ?? 0

  return (
    <PageContainer size="wide">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <ShieldCheckIcon className="size-6 text-primary" aria-hidden="true" />
            Trung tâm điều hành
          </span>
        }
        description="Kiểm duyệt nội dung, quản trị người dùng và giám sát hiệu suất hệ thống theo thời gian thực."
        actions={
          <div className="flex items-center gap-2">
            {me?.role ? (
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Quản trị viên" : "Kiểm duyệt viên"}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all })}
            >
              <RefreshCwIcon className="size-3.5" aria-hidden="true" />
              Làm mới
            </Button>
          </div>
        }
      />

      {/* Mobile horizontal navigation */}
      <nav
        aria-label="Điều hướng quản trị"
        className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden"
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.key
          return (
            <Button
              key={item.key}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(item.key)}
              className="min-h-11 shrink-0 gap-1.5"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {item.label}
              {item.key === "reports" && pendingReportsCount > 0 ? (
                <Badge
                  variant={active ? "secondary" : "destructive"}
                  className="px-1.5 py-0 text-xs"
                >
                  {formatNumber(pendingReportsCount)}
                </Badge>
              ) : null}
            </Button>
          )
        })}
      </nav>

      {/* Desktop workbench layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <StickyAside className="hidden lg:block">
          <nav aria-label="Menu quản trị" className="space-y-5">
            {(
              [
                { id: "ops", title: "Vận hành & Kiểm duyệt" },
                { id: "system", title: "Hệ thống & Quan sát" },
              ] as const
            ).map((section) => {
              const items = visibleNavItems.filter((item) => item.group === section.id)
              if (items.length === 0) return null
              return (
                <div key={section.id} className="space-y-1">
                  <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {section.title}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = activeTab === item.key
                    return (
                      <Button
                        key={item.key}
                        type="button"
                        variant={active ? "default" : "ghost"}
                        onClick={() => handleTabChange(item.key)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "w-full justify-between px-3 font-medium",
                          !active && "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4" aria-hidden="true" />
                          {item.label}
                        </span>
                        {item.key === "reports" && pendingReportsCount > 0 ? (
                          <Badge
                            variant={active ? "secondary" : "destructive"}
                            className="px-1.5 py-0 text-xs tabular-nums"
                          >
                            {formatNumber(pendingReportsCount)}
                          </Badge>
                        ) : null}
                      </Button>
                    )
                  })}
                </div>
              )
            })}
          </nav>
        </StickyAside>

        <main className="min-w-0">
          {activeTab === "overview" ? <OverviewTab onSelectTab={handleTabChange} /> : null}
          {activeTab === "reports" ? <ReportsTab /> : null}
          {activeTab === "places" ? <PlacesTab /> : null}
          {activeTab === "users" && isAdmin && me ? <UsersTab currentUserId={me.id} /> : null}
          {activeTab === "observability" && isAdmin ? <ObservabilityTab /> : null}
          {activeTab === "logs" ? <AuditLogsTab /> : null}
        </main>
      </div>
    </PageContainer>
  )
}
