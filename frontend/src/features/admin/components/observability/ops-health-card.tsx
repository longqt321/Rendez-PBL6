import { DatabaseIcon, SearchXIcon, ShieldAlertIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatNumber } from "@/lib/format"
import type { AdminObservability } from "../../api/admin-api"
import { ADMIN_UI } from "../../lib/admin-constants"

export function OpsHealthCard({ data }: Readonly<{ data: AdminObservability }>) {
  const { latency, security, infrastructure, searchQuality24h } = data
  const errorRate5xxPct = Math.round((latency.errorRate5xx ?? 0) * ADMIN_UI.PERCENT_SCALE * 10) / 10
  const dbPool = infrastructure?.dbPool
  const activeConns = dbPool ? Math.max(0, dbPool.total - dbPool.idle) : 0
  const poolUsagePct = dbPool && dbPool.max > 0 ? Math.round((activeConns / dbPool.max) * 100) : 0
  const zeroRatePct = Math.round((searchQuality24h?.zeroResultRate ?? 0) * ADMIN_UI.PERCENT_SCALE)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DatabaseIcon className="size-4 text-primary" aria-hidden="true" />
            Tải hạ tầng &amp; Độ ổn định
          </CardTitle>
          <CardDescription>Kết nối cơ sở dữ liệu, bộ nhớ máy chủ và tỷ lệ lỗi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tỷ lệ lỗi máy chủ (5xx)</span>
            <Badge variant={errorRate5xxPct >= 1 ? "destructive" : "secondary"}>
              {errorRate5xxPct}% ({formatNumber(latency.errors5xx ?? 0)} lượt)
            </Badge>
          </div>
          {dbPool ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kết nối dữ liệu đang bận</span>
                <span className="font-medium tabular-nums">
                  {activeConns}/{dbPool.max}
                  {dbPool.waiting > 0 ? ` · ${dbPool.waiting} đang chờ` : ""}
                </span>
              </div>
              <Progress value={poolUsagePct} aria-label="Tỷ lệ sử dụng kết nối dữ liệu" />
            </div>
          ) : null}
          {infrastructure ? (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Bộ nhớ máy chủ đang dùng</span>
              <span className="font-mono tabular-nums">
                {infrastructure.heapUsedMb} MB / {infrastructure.memoryRssMb} MB RSS
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlertIcon className="size-4 text-star" aria-hidden="true" />
            Tín hiệu bảo mật &amp; Chống quá tải
          </CardTitle>
          <CardDescription>Lượt bị từ chối quyền hoặc chạm giới hạn tốc độ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Chưa đăng nhập / Hết phiên (401)</span>
            <span className="font-medium tabular-nums">
              {formatNumber(security?.unauthorized401 ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Không đủ quyền truy cập (403)</span>
            <span className="font-medium tabular-nums">
              {formatNumber(security?.forbidden403 ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bị chặn do gọi quá nhanh (429)</span>
            <Badge variant={(security?.rateLimited429 ?? 0) > 0 ? "outline" : "secondary"}>
              {formatNumber(security?.rateLimited429 ?? 0)} lượt
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <SearchXIcon className="size-4 text-primary" aria-hidden="true" />
            Chất lượng tìm kiếm (24 giờ)
          </CardTitle>
          <CardDescription>Tỷ lệ tìm kiếm không ra quán để bổ sung dữ liệu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Không tìm thấy kết quả</span>
            <Badge variant={zeroRatePct >= 25 ? "destructive" : "secondary"}>
              {zeroRatePct}% ({formatNumber(searchQuality24h?.zeroResultSearches ?? 0)}/
              {formatNumber(searchQuality24h?.totalSearches ?? 0)})
            </Badge>
          </div>
          {searchQuality24h && searchQuality24h.topZeroQueries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {searchQuality24h.topZeroQueries.map((item) => (
                <Badge key={item.query} variant="outline" className="text-[11px] font-normal">
                  {item.query} ({item.count})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Chưa ghi nhận từ khoá nào trả về 0 quán trong 24 giờ qua.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
