import { CompassIcon, UsersIcon, BellIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/discover", label: "Khám phá", icon: CompassIcon },
  { to: "/social", label: "Cộng đồng", icon: UsersIcon },
  { to: "/notification", label: "Thông báo", icon: BellIcon },
]
