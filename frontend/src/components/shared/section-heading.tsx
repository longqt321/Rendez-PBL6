import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionHeading({
  children,
  icon,
  className,
  id,
  as: Tag = "h2",
}: Readonly<{
  children: ReactNode
  icon?: ReactNode
  className?: string
  id?: string
  as?: "h2" | "h3" | "p"
}>) {
  return (
    <Tag
      id={id}
      className={cn(
        "flex items-center gap-2 font-heading text-lg font-bold tracking-tight",
        className,
      )}
    >
      {icon}
      {children}
    </Tag>
  )
}
