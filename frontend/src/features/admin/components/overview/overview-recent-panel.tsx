import type { AdminReport, AuditLogEntry } from "@rendez/schema"
import { ArrowRightIcon, FlagIcon, ScrollTextIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import type { AdminTabKey } from "../overview-tab"

export function OverviewRecentPanel({
  pendingCount,
  pendingReports,
  recentLogs,
  onSelectTab,
  className,
}: Readonly<{
  pendingCount: number
  pendingReports: readonly AdminReport[]
  recentLogs: readonly AuditLogEntry[]
  onSelectTab: (tab: AdminTabKey) => void
  className?: string
}>) {
  return (
    <Card className={className}>
      <Tabs defaultValue="reports" className="gap-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Gần đây</CardTitle>
            <CardDescription>Hàng đợi báo cáo và nhật ký mới nhất</CardDescription>
          </div>
          <TabsList>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <FlagIcon className="size-3.5" aria-hidden="true" />
              Báo cáo ({formatNumber(pendingCount)})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <ScrollTextIcon className="size-3.5" aria-hidden="true" />
              Nhật ký
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="pt-0">
          <TabsContent value="reports" className="mt-0 space-y-3">
            {pendingReports.length === 0 ? (
              <CardDescription className="py-8 text-center">
                Không có báo cáo chờ xử lý.
              </CardDescription>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table aria-label="Báo cáo chờ xử lý gần nhất">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Địa điểm</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Người báo cáo</TableHead>
                      <TableHead className="text-right">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.map((report) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer"
                        onClick={() => onSelectTab("reports")}
                      >
                        <TableCell className="max-w-44 truncate font-medium">
                          {report.placeName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {REPORT_REASON_META[report.reason].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          @{report.reporterHandle}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {formatRelativeTime(report.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectTab("reports")}
              >
                Tất cả báo cáo
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-0 space-y-3">
            {recentLogs.length === 0 ? (
              <CardDescription className="py-8 text-center">
                Chưa có nhật ký kiểm toán.
              </CardDescription>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table aria-label="Nhật ký kiểm toán gần nhất">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Đối tượng</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead className="text-right">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer"
                        onClick={() => onSelectTab("logs")}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {entry.action}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px]">
                            {entry.entity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.actor ? `@${entry.actor.handle}` : "Hệ thống"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {formatRelativeTime(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => onSelectTab("logs")}>
                Tất cả nhật ký
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
