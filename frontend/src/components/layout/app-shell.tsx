import { Suspense, useEffect, useRef, useState } from "react"
import {
  ArrowRightIcon,
  BookmarkIcon,
  CompassIcon,
  HelpCircleIcon,
  LogInIcon,
  LogOutIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { NavLink, Link, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { useSkin } from "@/app/providers/skin-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MotionPill } from "@/components/shared/motion-primitives"
import { PageLoading } from "@/components/shared/page-loading"
import { useUnreadNotificationCount } from "@/features/notification/hooks/use-notifications"
import { useNotificationStream } from "@/features/notification/hooks/use-notification-stream"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useMe } from "@/features/profile/hooks/use-me"
import { RoomJoinDialog } from "@/features/rooms/components/room-join-dialog"
import { useRooms } from "@/features/rooms/hooks/use-rooms"
import { useSearchQuerySync } from "@/features/search/hooks/use-search-query-sync"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { useMobileGpsAutoSync } from "@/hooks/use-user-location"
import { isUnauthorizedError } from "@/lib/axios"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import { FILTER_SHARED_PATHS, MOBILE_NAV_ITEMS, NAV_ITEMS, type NavItem } from "./nav-items"
import { ThemeToggle } from "./theme-toggle"

const PAGE_TITLES: [RegExp, string][] = [
  [/^\/discover\/[^/]+$/, "Địa điểm"],
  [/^\/post\/[^/]+$/, "Bài đăng"],
  [/^\/collections\/[^/]+$/, "Bộ sưu tập"],
  [/^\/rooms\/[^/]+$/, "Phòng lọc nhóm"],
  [/^\/u\/[^/]+$/, "Hồ sơ"],
  [/^\/discover$/, "Khám phá"],
  [/^\/map$/, "Bản đồ"],
  [/^\/social$/, "Cộng đồng"],
  [/^\/notification$/, "Thông báo"],
  [/^\/search$/, "Tìm kiếm"],
  [/^\/saved$/, "Đã lưu"],
  [/^\/profile$/, "Trang cá nhân"],
  [/^\/settings$/, "Cài đặt"],
  [/^\/admin$/, "Quản trị"],
  [/^\/help$/, "Trợ giúp"],
  [/^\/about$/, "Giới thiệu"],
  [/^\/terms$/, "Điều khoản sử dụng"],
  [/^\/privacy$/, "Chính sách bảo mật"],
  [/^\/system$/, "Số liệu vận hành"],
  [/^.*$/, "Không tìm thấy trang"],
]

const QUICK_SEARCH_SUGGESTIONS = [
  "Mì Quảng",
  "Bánh xèo",
  "Bún chả cá",
  "Cà phê Sơn Trà",
  "Hải sản",
] as const

function titleForPath(pathname: string): string | undefined {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname))
  return match?.[1]
}

function useDocumentTitle(pathname: string) {
  useEffect(() => {
    const title = titleForPath(pathname)
    if (title) document.title = `${title} · Rendez`
  }, [pathname])
}

function useFocusMainOnNavigate(pathname: string, mainRef: React.RefObject<HTMLElement | null>) {
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [pathname, mainRef])
}

interface AppShellProps {
  children?: React.ReactNode
}

export function AppShell({ children }: Readonly<AppShellProps>) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useDocumentTitle(location.pathname)
  useFocusMainOnNavigate(location.pathname, mainRef)
  useNotificationStream()

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Bỏ qua tới nội dung
      </a>
      <SideNav />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <StaffContextBanner />
        <TopBar />
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 pb-20 outline-none lg:pb-0">
          {children ?? (
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
      <BottomNav />
      <ScrollRestoration />
    </div>
  )
}

function StaffContextBanner() {
  const { data: me } = useMe()
  if (!me || (me.role !== "admin" && me.role !== "moderator")) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/25 bg-primary/8 px-4 py-1.5 text-xs text-foreground"
    >
      <span className="flex items-center gap-1.5">
        <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Đang xem trang công khai bằng tài khoản{" "}
          <strong>{me.role === "admin" ? "Quản trị viên" : "Kiểm duyệt viên"}</strong>
        </span>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs"
        render={<Link to="/admin" />}
      >
        Quay lại Trung tâm điều hành
      </Button>
    </div>
  )
}

function Brand() {
  return (
    <Link to="/discover" className="group flex items-center gap-2.5 outline-none">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-control bg-primary text-primary-foreground shadow-(--shadow-soft) transition-transform group-hover:scale-105"
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

function SideNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()
  const { data: me } = useMe()
  const { activeCode, getRoom } = useRooms()
  const activeRoom = activeCode ? getRoom(activeCode) : undefined
  const navTarget = useNavTarget()
  const isStaff = me?.role === "admin" || me?.role === "moderator"

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
                </>
              )}
            </NavLink>
          )
        })}

        {isStaff ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "group relative isolate mt-2 flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <MotionPill layoutId="sidenav-active" /> : null}
                <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">Quản trị</span>
              </>
            )}
          </NavLink>
        ) : null}
      </nav>

      {activeRoom ? (
        <div className="mt-6 rounded-surface border border-primary/35 bg-primary/8 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Phòng đang lọc
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
            Vào bàn chốt quán
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

function TopBar() {
  useMobileGpsAutoSync()
  const isDesktop = useIsDesktop()
  const { draft, setDraft, submit, clear, isFilterPage } = useSearchQuerySync()
  const { activeCode, getRoom, createRoom, joinRoom } = useRooms()
  const location = useLocation()
  const navigate = useNavigate()
  const [commandOpen, setCommandOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const room = activeCode ? getRoom(activeCode) : undefined

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 md:h-auto md:gap-3 md:px-4 md:py-3 lg:px-8">
        {!isDesktop ? (
          <Link
            to="/discover"
            aria-label="Trang chủ Rendez"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs"
          >
            <CompassIcon className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <div className="lg:hidden">
            <Brand />
          </div>
        )}

        <div className="min-w-0 flex-1 lg:max-w-xl">
          <form
            role="search"
            className="flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <InputGroup className="h-9 rounded-full bg-card/90 shadow-xs md:h-10">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                name="q"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  if (event.key === "Enter") {
                    event.preventDefault()
                    submit()
                  }
                }}
                placeholder={
                  !isDesktop
                    ? "Tìm quán…"
                    : isFilterPage
                      ? "Tìm quán, món ăn, quận, mức giá (VD: cà phê Sơn Trà dưới 50k)…"
                      : "Tìm riêng địa điểm, món ăn tại Đà Nẵng…"
                }
                aria-label="Tìm kiếm"
              />
              {draft ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    className="rounded-full text-muted-foreground"
                    onClick={clear}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <XIcon className="size-3.5" aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
              <InputGroupAddon align="inline-end" className="hidden sm:flex">
                <InputGroupButton
                  size="xs"
                  className="rounded-full border border-border/70 px-2 text-xs text-muted-foreground"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Mở bảng tìm nhanh"
                >
                  ⌘K
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {room ? (
            <Button
              variant="outline"
              size="sm"
              className="inline-flex gap-1.5 rounded-full border-primary/40 bg-primary/5 text-xs font-medium"
              render={<Link to={`/rooms/${room.code}`} />}
            >
              <UsersIcon className="size-3.5 text-primary" aria-hidden="true" />
              <span className="max-w-28 truncate">{room.name}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="inline-flex h-9 gap-1.5 rounded-full px-3 text-xs font-medium md:h-8 md:px-2.5"
              onClick={() => setJoinOpen(true)}
            >
              <UsersIcon className="size-3.5 text-primary" aria-hidden="true" />
              <span className="hidden sm:inline">Đi cùng nhóm</span>
              <span className="sm:hidden">Nhóm</span>
            </Button>
          )}
          <UserMenu />
        </div>
      </div>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Tìm nhanh trên Rendez"
        description="Tìm món ăn đặc sản Đà Nẵng hoặc chuyển nhanh tới trang chức năng."
      >
        <CommandInput placeholder="Gõ tên món ăn, quán hoặc trang muốn mở…" />
        <CommandList>
          <CommandEmpty>Không tìm thấy gợi ý phù hợp.</CommandEmpty>
          <CommandGroup heading="Món ngon Đà Nẵng">
            {QUICK_SEARCH_SUGGESTIONS.map((term) => (
              <CommandItem
                key={term}
                value={term}
                onSelect={() => {
                  setCommandOpen(false)
                  setDraft(term)
                  const targetPath = isFilterPage ? location.pathname : "/discover"
                  void navigate(`${targetPath}?q=${encodeURIComponent(term)}`)
                }}
              >
                <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
                <span>Tìm “{term}”</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Điều hướng nhanh">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.to}
                  value={item.label}
                  onSelect={() => {
                    setCommandOpen(false)
                    void navigate(item.to)
                  }}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <RoomJoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onCreate={createRoom}
        onJoin={(code, displayName) => joinRoom(code, displayName || "Khách")}
      />
    </header>
  )
}

function UserMenu() {
  const { skin, setSkin } = useSkin()
  const { data: me, isPending, error, refetch } = useMe()
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success("Đã đăng xuất")
        void navigate("/")
      },
    })
  }

  let menuContent: React.ReactNode
  if (isPending) {
    menuContent = (
      <DropdownMenuItem disabled>
        <Spinner aria-label="Đang tải hồ sơ" />
        Đang tải hồ sơ…
      </DropdownMenuItem>
    )
  } else if (me) {
    menuContent = (
      <>
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-semibold">{me.name}</span>
            <span className="block text-xs font-normal text-muted-foreground">@{me.handle}</span>
            <Link
              to="/profile"
              className="mt-1 block text-xs font-medium text-primary underline underline-offset-2"
            >
              Xem trang cá nhân →
            </Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/profile" />}>
            <UserIcon />
            Trang cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/saved" />}>
            <BookmarkIcon />
            Địa điểm & Bộ sưu tập
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {me.role === "admin" || me.role === "moderator" ? (
          <DropdownMenuItem render={<Link to="/admin" />}>
            <ShieldCheckIcon />
            Quản trị
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem render={<Link to="/settings" />}>
          <SettingsIcon />
          Cài đặt
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon />
            Bảng màu
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={skin}
              onValueChange={(value) => setSkin(value as typeof skin)}
            >
              <DropdownMenuRadioItem value="default">Ấm áp (Terracotta)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="retro">Hiện đại (Cobalt)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem render={<Link to="/help" />}>
          <HelpCircleIcon />
          Trợ giúp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isLoggingOut} onClick={handleLogout}>
          <LogOutIcon />
          {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </DropdownMenuItem>
      </>
    )
  } else if (isUnauthorizedError(error)) {
    menuContent = (
      <>
        <DropdownMenuItem onClick={() => void navigate("/login")}>
          <LogInIcon />
          Đăng nhập
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void navigate("/register")}>
          <UserPlusIcon />
          Đăng ký
        </DropdownMenuItem>
      </>
    )
  } else {
    menuContent = (
      <DropdownMenuItem onClick={() => void refetch()}>
        <UserIcon />
        Không tải được hồ sơ. Nhấn để thử lại
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Mở menu người dùng"
            className="min-h-11 min-w-11 gap-2 rounded-full px-1.5 sm:h-10 sm:min-h-0 sm:min-w-0 md:pr-3"
          />
        }
      >
        <Avatar size="default">
          {me?.avatarUrl ? <AvatarImage src={me.avatarUrl} alt={me.name} /> : null}
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {me?.initials ?? <UserIcon className="size-4" />}
          </AvatarFallback>
        </Avatar>
        {me ? (
          <span className="hidden max-w-28 truncate text-xs font-semibold md:inline">
            {me.name}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {menuContent}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()
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
                      {item.to === "/notification" && unread > 0 ? (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background"
                        />
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
