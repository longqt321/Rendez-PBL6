import { BellIcon, BookmarkIcon, CompassIcon, MapIcon, UserIcon, UsersIcon } from "lucide-react"
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
  { to: "/saved", label: "Đã lưu", icon: BookmarkIcon },
  { to: "/notification", label: "Thông báo", icon: BellIcon },
  { to: "/profile", label: "Hồ sơ", icon: UserIcon },
]

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: "/discover", label: "Khám phá", icon: CompassIcon, sharesFilters: true },
  { to: "/map", label: "Bản đồ", icon: MapIcon, sharesFilters: true },
  { to: "/social", label: "Cộng đồng", icon: UsersIcon },
  { to: "/saved", label: "Đã lưu", icon: BookmarkIcon },
  { to: "/notification", label: "Thông báo", icon: BellIcon },
]

export const FILTER_SHARED_PATHS = NAV_ITEMS.filter((item) => item.sharesFilters).map(
  (item) => item.to,
)
