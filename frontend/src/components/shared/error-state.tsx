import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

interface ErrorStateProps {
  title: string

  description?: string

  onRetry?: () => void
  retryLabel?: string

  size?: "sm" | "default"

  icon?: ReactNode

  variant?: "bordered" | "plain"
  className?: string

  children?: ReactNode
}

export function ErrorState({
  title,
  description = "Kiểm tra kết nối rồi thử lại.",
  onRetry,
  retryLabel = "Thử lại",
  size,
  icon,
  variant = "bordered",
  className,
  children,
}: ErrorStateProps) {
  return (
    <Empty
      className={cn(variant === "bordered" && "border border-dashed border-border", className)}
    >
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ??
        (onRetry ? (
          <Button variant="outline" size={size} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null)}
    </Empty>
  )
}
