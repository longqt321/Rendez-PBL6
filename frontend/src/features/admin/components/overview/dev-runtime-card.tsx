import type { AdminRuntimeInfo } from "@rendez/schema"
import {
  DatabaseIcon,
  FlaskConicalIcon,
  HardDriveIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"
import { ADMIN_UI } from "../../lib/admin-constants"

export function DevRuntimeCard({
  runtime,
  uptimeMs,
}: Readonly<{ runtime: AdminRuntimeInfo; uptimeMs: number }>) {
  return (
    <Card className="border-dashed border-star/45 bg-star/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FlaskConicalIcon className="size-4 text-star" aria-hidden="true" />
          Chẩn đoán Runtime ({runtime.env.toUpperCase()})
        </CardTitle>
        <CardDescription className="text-xs">
          Chỉ hiện ngoài Production · Uptime{" "}
          {formatNumber(Math.round(uptimeMs / ADMIN_UI.MS_PER_MINUTE))} phút
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant={runtime.redisConnected ? "default" : "outline"} className="gap-1.5">
          <DatabaseIcon className="size-3" aria-hidden="true" />
          Redis: {runtime.redisConnected ? "Kết nối" : "Bộ nhớ đệm cục bộ"}
        </Badge>
        <Badge variant={runtime.mailConfigured ? "default" : "outline"} className="gap-1.5">
          <MailIcon className="size-3" aria-hidden="true" />
          SMTP: {runtime.mailConfigured ? "Sẵn sàng" : "Log cục bộ"}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <HardDriveIcon className="size-3" aria-hidden="true" />
          Lưu trữ: {runtime.mediaStorage === "r2" ? "Cloudflare R2" : "Cục bộ"}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheckIcon className="size-3" aria-hidden="true" />
          Che PII: {runtime.piiMasked ? "Bật" : "Tắt"} · Tự xác thực email:{" "}
          {runtime.demoAutoVerifyEmail ? "Bật" : "Tắt"}
        </Badge>
      </CardContent>
    </Card>
  )
}
