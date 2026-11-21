import { ShieldCheckIcon } from "lucide-react"
import { useSearchParams } from "react-router"
import { PageContainer, PageHeader } from "@/components/layout/page-primitives"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMe } from "@/features/profile/hooks/use-me"
import { AuditLogsTab } from "../components/audit-logs-tab"
import { OverviewTab, type AdminTabKey } from "../components/overview-tab"
import { PlacesTab } from "../components/places-tab"
import { ReportsTab } from "../components/reports-tab"
import { UsersTab } from "../components/users-tab"

const VALID_TABS: ReadonlySet<AdminTabKey> = new Set([
  "overview",
  "reports",
  "places",
  "users",
  "logs",
])

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: me } = useMe()
  const isAdmin = me?.role === "admin"

  const rawTab = searchParams.get("tab") as AdminTabKey | null
  let activeTab: AdminTabKey = rawTab && VALID_TABS.has(rawTab) ? rawTab : "overview"
  if (activeTab === "users" && !isAdmin) {
    activeTab = "overview"
  }

  function handleTabChange(next: string) {
    if (!VALID_TABS.has(next as AdminTabKey)) return
    if (next === "users" && !isAdmin) return
    const updated = new URLSearchParams(searchParams)
    if (next === "overview") updated.delete("tab")
    else updated.set("tab", next)
    setSearchParams(updated, { replace: true })
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <ShieldCheckIcon className="size-6 text-primary" aria-hidden="true" />
            Quản trị
          </span>
        }
        actions={
          me?.role ? (
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Quản trị viên" : "Kiểm duyệt viên"}
            </Badge>
          ) : null
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          {isAdmin ? <TabsTrigger value="users">Người dùng</TabsTrigger> : null}
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab onSelectTab={handleTabChange} />
        </TabsContent>

        <TabsContent value="reports" className="mt-5">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="places" className="mt-5">
          <PlacesTab />
        </TabsContent>

        {isAdmin && me ? (
          <TabsContent value="users" className="mt-5">
            <UsersTab currentUserId={me.id} />
          </TabsContent>
        ) : null}

        <TabsContent value="logs" className="mt-5">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
