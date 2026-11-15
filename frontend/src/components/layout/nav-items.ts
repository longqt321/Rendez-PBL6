import { BellIcon, CompassIcon, MapIcon, UsersIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon

  sharesFilters?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/discover", label: "Khám phá", icon: CompassIcon, sharesFilters: true },
  { to: "/map", label: "Bản đồ", icon: MapIcon, sharesFilters: true },
  { to: "/social", label: "Cộng đồng", icon: UsersIcon },
  { to: "/notification", label: "Thông báo", icon: BellIcon },
]

export const FILTER_SHARED_PATHS = NAV_ITEMS.filter((item) => item.sharesFilters).map(
  (item) => item.to,
)
