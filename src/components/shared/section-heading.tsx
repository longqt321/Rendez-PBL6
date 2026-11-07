import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Tiêu đề nhóm nội dung — dùng chung cho mọi khu vực có nhiều nhóm.
 *
 * Trước đây khối class này bị copy ở `notification-page` (2 lần) và
 * `post-composer` (1 lần, biến thể có icon).
 */
export function SectionHeading({
  children,
  icon,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
  as?: "h2" | "h3" | "p"
}) {
  return (
    <Tag
      className={cn(
        "flex items-center gap-1.5 font-heading text-sm font-bold tracking-wide uppercase",
        className,
      )}
    >
      {icon}
      {children}
    </Tag>
  )
}
