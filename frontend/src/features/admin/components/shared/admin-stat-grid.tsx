import type { ReactNode } from "react"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { cn } from "@/lib/utils"

export interface AdminStatItem {
  readonly label: string
  readonly value: ReactNode
  readonly mono?: boolean
  readonly fullWidth?: boolean
}

/** Lưới chỉ số thống nhất dùng primitive `Item` của Rendez (thay các khối `div` tự ghép border). */
export function AdminStatGrid({
  items,
  columns = 2,
  className,
}: Readonly<{
  items: readonly AdminStatItem[]
  columns?: 2 | 3
  className?: string
}>) {
  return (
    <ItemGroup
      className={cn(
        "grid gap-2",
        columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <Item
          key={item.label}
          variant="outline"
          size="sm"
          className={cn("bg-muted/30", item.fullWidth && "col-span-2")}
        >
          <ItemContent className="gap-0.5">
            <ItemDescription className="text-xs">{item.label}</ItemDescription>
            <ItemTitle
              className={cn(
                "text-sm font-semibold text-foreground tabular-nums",
                item.mono && "font-mono text-xs break-all",
              )}
            >
              {item.value}
            </ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}
