import { ArrowRightIcon, CompassIcon, PaletteIcon, UsersIcon } from "lucide-react"
import { Link, NavLink, useLocation } from "react-router"
import { useSkin } from "@/app/providers/skin-context"
import { MotionPill } from "@/components/shared/motion-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUnreadMessagesCount } from "@/features/messages/hooks/use-messages"
import { useUnreadNotificationCount } from "@/features/notification/hooks/use-notifications"
import { useMe } from "@/features/profile/hooks/use-me"
import { useRooms } from "@/features/rooms/hooks/use-rooms"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import { FILTER_SHARED_PATHS, MOBILE_NAV_ITEMS, NAV_ITEMS, type NavItem } from "./nav-items"
import { ThemeToggle } from "./theme-toggle"

export function Brand() {
  return (
    <Link to="/discover" className="group flex items-center gap-2.5 outline-none">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-control bg-primary text-primary-foreground shadow-(--shadow-soft)"
      >
        <CompassIcon className="size-4.5" />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-lg leading-none font-bold tracking-tight text-foreground">
          Rendez
        </span>
        <span className="text-xs leading-tight font-medium text-muted-foreground">
          Đà Nẵng Guide
        </span>
      </span>
    </Link>
  )
}

function useNavTarget() {
  const location = useLocation()
  const carrySearch = FILTER_SHARED_PATHS.includes(location.pathname) ? location.search : ""
  return (item: NavItem) => (item.sharesFilters ? item.to + carrySearch : item.to)
}

export function SideNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()
  const { data: me } = useMe()
  const unreadMessages = useUnreadMessagesCount(Boolean(me))
  const { activeCode, getRoom } = useRooms()
  const activeRoom = activeCode ? getRoom(activeCode) : undefined
  const navTarget = useNavTarget()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/80 bg-sidebar/95 px-4 py-5 backdrop-blur-md lg:flex">
      <div className="px-1">
        <Brand />
      </div>

      <nav aria-label="Điều hướng chính" className="mt-7 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={navTarget(item)}
              className={({ isActive }) =>
                cn(
                  "group relative isolate flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <MotionPill layoutId="sidenav-active" /> : null}
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/notification" && unread > 0 ? (
                    <Badge
                      variant={isActive ? "secondary" : "default"}
                      className="min-w-5 px-1.5 text-xs font-bold tabular-nums"
                    >
                      {unread}
                    </Badge>
                  ) : null}
                  {item.to === "/messages" && unreadMessages > 0 ? (
                    <Badge
                      variant={isActive ? "secondary" : "default"}
                      className="min-w-5 px-1.5 text-xs font-bold tabular-nums"
                    >
                      {unreadMessages}
                    </Badge>
                  ) : null}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {activeRoom ? (
        <div className="mt-6 rounded-surface border border-primary/35 bg-primary/8 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Phòng nhóm đang mở
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {activeRoom.code}
            </Badge>
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold">{activeRoom.name}</p>
          <p className="text-xs text-muted-foreground">{activeRoom.members.length} thành viên</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 w-full justify-between text-xs"
            render={<Link to={`/rooms/${activeRoom.code}`} />}
          >
            Mở phòng nhóm
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 border-t border-border/70 pt-4">
        <SkinSwitch />
        {env.enableMocks ? (
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger
                render={<Badge variant="outline" className="cursor-help text-xs font-normal" />}
              >
                Chế độ Demo
              </TooltipTrigger>
              <TooltipContent side="right">
                Đang sử dụng dữ liệu minh hoạ cục bộ tại Đà Nẵng.
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function SkinSwitch() {
  const { skin, setSkin } = useSkin()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Ánh sáng</span>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Bảng màu</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => setSkin(skin === "default" ? "retro" : "default")}
        >
          <PaletteIcon className="size-3.5" aria-hidden="true" />
          {skin === "default" ? "Ấm áp" : "Hiện đại"}
        </Button>
      </div>
    </div>
  )
}

export function BottomNav() {
  const { data: me } = useMe()
  const unreadMessages = useUnreadMessagesCount(Boolean(me))
  const navTarget = useNavTarget()

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="min-w-0 flex-1">
              <NavLink
                to={navTarget(item)}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-xs font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className="size-5" aria-hidden="true" />
                      {item.to === "/messages" && unreadMessages > 0 ? (
                        <Badge
                          variant="destructive"
                          aria-hidden="true"
                          className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-xs font-bold tabular-nums ring-2 ring-background"
                        >
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                    {isActive ? (
                      <MotionPill
                        layoutId="mobile-nav-pill"
                        className="inset-x-3 top-0 bottom-auto h-0.5 rounded-full"
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
