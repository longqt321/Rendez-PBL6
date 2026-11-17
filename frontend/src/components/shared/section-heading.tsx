import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionHeading({
  children,
  icon,
  className,
  as: Tag = "h2",
}: Readonly<{
  children: ReactNode
  icon?: ReactNode
  className?: string
  as?: "h2" | "h3" | "p"
}>) {
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
