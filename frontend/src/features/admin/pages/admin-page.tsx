import { useQueryClient } from "@tanstack/react-query"
import type { PlaceCategory } from "@rendez/schema"
import {
  ActivityIcon,
  FlagIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  ScrollTextIcon,
  UsersIcon,
} from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useSearchParams } from "react-router"
import { useMe } from "@/features/profile/hooks/use-me"
import { AuditLogsTab } from "../components/audit-logs-tab"
import { ObservabilityTab } from "../components/observability-tab"
import { OverviewTab, type AdminTabKey } from "../components/overview-tab"
import { PlacesTab } from "../components/places-tab"
import { ReportsTab } from "../components/reports-tab"
import { AdminEnvProvider } from "../components/shared/admin-env-context"
import { AdminShell, type AdminNavItem } from "../components/shared/admin-shell"
import { UsersTab } from "../components/users-tab"
import { ADMIN_KEYS, useAdminOverview } from "../hooks/use-admin"

const TAB_KEYS = ["overview", "reports", "places", "users", "observability", "logs"] as const

const BASE_NAV_ITEMS: Omit<AdminNavItem<AdminTabKey>, "badgeCount">[] = [
  { key: "overview", label: "Tổng quan", group: "ops", icon: LayoutDashboardIcon },
  { key: "reports", label: "Báo cáo", group: "ops", icon: FlagIcon },
  { key: "places", label: "Địa điểm", group: "ops", icon: MapPinIcon },
  { key: "users", label: "Người dùng", group: "ops", adminOnly: true, icon: UsersIcon },
  {
    key: "observability",
    label: "Hiệu suất & Quan sát",
    group: "system",
    adminOnly: true,
    icon: ActivityIcon,
  },
  { key: "logs", label: "Nhật ký kiểm toán", group: "system", icon: ScrollTextIcon },
]

export function AdminPage() {
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const overviewQuery = useAdminOverview()
  const isAdmin = me?.role === "admin"
  const [, setSearchParams] = useSearchParams()

  const [tabParam, setTabParam] = useQueryState(
    "tab",
    parseAsStringLiteral(TAB_KEYS).withDefault("overview").withOptions({ history: "replace" }),
  )

  const pendingReportsCount = overviewQuery.data?.reports.pending ?? 0

  const visibleNavItems: AdminNavItem<AdminTabKey>[] = BASE_NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin,
  ).map((item) => ({
    ...item,
    badgeCount: item.key === "reports" ? pendingReportsCount : undefined,
  }))

  const activeNavItem = visibleNavItems.find((item) => item.key === tabParam) ??
    visibleNavItems[0] ?? {
      key: "overview" as const,
      label: "Tổng quan",
      group: "ops" as const,
      icon: LayoutDashboardIcon,
    }
  const activeTab: AdminTabKey = activeNavItem.key

  function handleSelectTab(next: AdminTabKey) {
    if (!visibleNavItems.some((item) => item.key === next)) return
    void setTabParam(next === "overview" ? null : next)
  }

  function handleNavigateToPlaces(filters?: {
    category?: PlaceCategory
    district?: string
    visibility?: "published" | "unpublished" | "closed"
  }) {
    const next = new URLSearchParams()
    next.set("tab", "places")
    if (filters?.category) next.set("pCat", filters.category)
    if (filters?.district) next.set("pDistrict", filters.district)
    if (filters?.visibility) next.set("pVis", filters.visibility)
    setSearchParams(next, { replace: true })
  }

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all })
  }

  return (
    <AdminEnvProvider runtime={overviewQuery.data?.runtime} activeTabLabel={activeNavItem.label}>
      <AdminShell
        navItems={visibleNavItems}
        activeTab={activeTab}
        activeTabLabel={activeNavItem.label}
        onSelectTab={handleSelectTab}
        onRefresh={handleRefresh}
        isRefreshing={overviewQuery.isFetching}
      >
        {activeTab === "overview" ? (
          <OverviewTab
            onSelectTab={handleSelectTab}
            onNavigateToPlaces={handleNavigateToPlaces}
            isAdmin={isAdmin}
          />
        ) : null}
        {activeTab === "reports" ? <ReportsTab /> : null}
        {activeTab === "places" ? <PlacesTab /> : null}
        {activeTab === "users" && isAdmin && me ? <UsersTab currentUserId={me.id} /> : null}
        {activeTab === "observability" && isAdmin ? <ObservabilityTab /> : null}
        {activeTab === "logs" ? <AuditLogsTab /> : null}
      </AdminShell>
    </AdminEnvProvider>
  )
}
