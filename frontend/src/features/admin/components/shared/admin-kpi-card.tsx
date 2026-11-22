import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ADMIN_UI } from "../../lib/admin-constants"

interface AdminKpiCardProps {
  readonly label: string
  readonly value: ReactNode
  readonly subtitle: ReactNode
  readonly icon: LucideIcon
  readonly badge?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" }
  readonly progress?: { value: number; label: string }
  readonly tone?: "default" | "warning" | "danger" | "success"
  readonly onClick?: () => void
  readonly actionLabel?: string
}

/** Sử dụng 100% semantic token của Rendez (`--primary`, `--star`, `--destructive`, `--open`). */
const TONE_ICON_STYLES: Record<NonNullable<AdminKpiCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-star/15 text-star",
  danger: "bg-destructive/12 text-destructive",
  success: "bg-open/12 text-open",
}

export function AdminKpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  badge,
  progress,
  tone = "default",
  onClick,
  actionLabel,
}: AdminKpiCardProps) {
  return (
    <Card
      className={cn("h-full gap-2.5 py-4 transition-colors", onClick && "hover:border-primary/40")}
    >
      <CardHeader className="px-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-control",
                TONE_ICON_STYLES[tone],
              )}
              aria-hidden="true"
            >
              <Icon className="size-3.5" />
            </span>
            {label}
          </CardDescription>
          <div className="flex items-center gap-1">
            {badge ? (
              <Badge variant={badge.variant ?? "secondary"} className="text-xs tabular-nums">
                {badge.label}
              </Badge>
            ) : null}
            {onClick ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onClick}
                aria-label={actionLabel ?? `Mở ${label}`}
                title={actionLabel ?? `Mở ${label}`}
              >
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
        <CardTitle className="mt-1 font-display text-2xl tracking-tight tabular-nums sm:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 text-xs text-muted-foreground">
        <CardDescription className="text-xs leading-normal">{subtitle}</CardDescription>
        {progress ? (
          <Progress
            value={Math.max(0, Math.min(ADMIN_UI.PERCENT_SCALE, progress.value))}
            aria-label={progress.label}
            className="h-1.5"
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
