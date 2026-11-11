import { Suspense, useEffect, useRef } from "react"
import {
  BookmarkIcon,
  HelpCircleIcon,
  LogInIcon,
  LogOutIcon,
  MapPinIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react"
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router"
import { useSkin } from "@/app/providers/skin-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageLoading } from "@/components/shared/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useUnreadNotificationCount } from "@/features/notification/hooks/use-notifications"
import { useNotificationStream } from "@/features/notification/hooks/use-notification-stream"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useMe } from "@/features/profile/hooks/use-me"
import { isUnauthorizedError } from "@/lib/axios"
import { Spinner } from "@/components/ui/spinner"
import { useRooms } from "@/features/rooms/hooks/use-rooms"
import { useSearchQuerySync } from "@/features/search/hooks/use-search-query-sync"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import { FILTER_SHARED_PATHS, NAV_ITEMS, type NavItem } from "./nav-items"

/** Tiêu đề theo path — một nguồn duy nhất, khớp các route ở `routes.tsx`. */
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
  // Catch-all cuối cùng: mọi path còn lại là route 404.
  [/^.*$/, "Không tìm thấy trang"],
]

/** Tiêu đề tab trình duyệt cho path hiện tại; `undefined` → giữ tiêu đề mặc định. */
function titleForPath(pathname: string): string | undefined {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname))
  return match?.[1]
}

/**
 * Gắn tiêu đề tab trình duyệt theo trang — gọi một lần ở `AppShell` (một nghiệp
 * vụ một chỗ); trang động (địa điểm, bài đăng) dùng tiêu đề chung của nhóm.
 */
function useDocumentTitle(pathname: string) {
  useEffect(() => {
    const title = titleForPath(pathname)
    if (title) document.title = `${title} · Đà Nẵng Ăn & Đi`
  }, [pathname])
}

/**
 * Chuyển route thì đưa focus về đầu nội dung — điều hướng bàn phím/screen
 * reader không bị "mất vị trí" sau khi trang mới render.
 */
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
import { ThemeToggle } from "./theme-toggle"

interface AppShellProps {
  children?: React.ReactNode
}

/**
 * Layout global:
 * - PC: nav dọc bên trái, topbar (search + avatar) trên cùng.
 * - Mobile: topbar trên cùng, nav ngang cố định dưới cùng.
 *
 * Dùng làm layout route: không truyền `children` thì render `<Outlet />`.
 */
export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useDocumentTitle(location.pathname)
  useFocusMainOnNavigate(location.pathname, mainRef)
  // Một kết nối SSE cho toàn app: badge + danh sách cập nhật ngay (G6.3).
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
      <div className="flex min-h-dvh flex-col lg:pl-56">
        <TopBar />
        {/* pb-20 chừa chỗ cho bottom nav trên mobile */}
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 pb-20 outline-none lg:pb-0">
          {children ?? (
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-control border border-border bg-secondary text-sm font-bold text-secondary-foreground"
      >
        Đ
      </span>
      <span className="font-heading text-lg leading-none font-bold tracking-tight">
        Đà Nẵng
        <span className="block text-xs font-medium tracking-[0.18em] uppercase opacity-60">
          Ăn &amp; Đi
        </span>
      </span>
    </div>
  )
}

/**
 * Trả về hàm dựng `to` cho một mục nav.
 *
 * Đứng ở `/discover` hoặc `/map` thì mang theo `?category=&district=&q=&nearby=`
 * khi bấm mục còn lại — bộ lọc của hai trang là một, đổi cách nhìn không mất
 * search/filter. Ở trang khác thì không mang gì.
 */
function useNavTarget() {
  const location = useLocation()
  const carrySearch = FILTER_SHARED_PATHS.includes(location.pathname) ? location.search : ""

  return (item: NavItem) => (item.sharesFilters ? item.to + carrySearch : item.to)
}

function SideNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()
  const navTarget = useNavTarget()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-sidebar px-4 py-5 lg:flex">
      <Brand />

      <nav aria-label="Điều hướng chính" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={navTarget(item)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent hover:border-border hover:bg-muted",
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/notification" && unread > 0 ? (
                <Badge variant="secondary" className="min-w-5 px-1 text-xs font-bold">
                  {unread}
                </Badge>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-dashed border-border pt-4">
        <SkinSwitch />
        {/* Chỉ hiện khi mock server đang phục dữ liệu — prod gọi backend thật. */}
        {env.enableMocks ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Dữ liệu minh hoạ. Chưa kết nối backend.
          </p>
        ) : null}
      </div>
    </aside>
  )
}

function SkinSwitch() {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">Giao diện</span>
      <ThemeToggle />
    </div>
  )
}

function TopBar() {
  const { draft, setDraft, submit } = useSearchQuerySync()
  const { activeCode, getRoom } = useRooms()
  const location = useLocation()
  const room = activeCode ? getRoom(activeCode) : undefined
  /**
   * Đang trong phòng lọc nhóm trên trang lọc: kết quả do `RoomFilter` của phòng
   * quyết định nên tìm kiếm cá nhân không có tác dụng — ẩn ô tìm kiếm, đồng bộ
   * với việc ẩn chips quận + popover Lọc trong `DiscoverToolbar`.
   */
  const isSearchBlocked = room !== undefined && FILTER_SHARED_PATHS.includes(location.pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>

        {isSearchBlocked ? (
          <p className="ml-auto text-xs text-muted-foreground">
            Đang lọc theo phòng — tìm kiếm cá nhân tạm tắt
          </p>
        ) : (
          <form
            role="search"
            className="ml-auto w-full max-w-lg lg:ml-0 lg:max-w-xl"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <InputGroup className="h-10">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                name="q"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tìm quán ăn, địa điểm, bài viết…"
                aria-label="Tìm kiếm"
              />
            </InputGroup>
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function UserMenu() {
  const { skin, setSkin } = useSkin()
  const { data: me, isPending, error, refetch } = useMe()
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const navigate = useNavigate()

  /** Đăng xuất: gọi server, xoá cache rồi về trang chủ (nơi hiển thị trạng thái khách). */
  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        void navigate("/")
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mở menu người dùng"
            className="size-10 rounded-full"
          />
        }
      >
        <Avatar size="lg">
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {me?.initials ?? <UserIcon className="size-4" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isPending ? (
          <DropdownMenuItem disabled>
            <Spinner />
            Đang tải hồ sơ…
          </DropdownMenuItem>
        ) : me ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold">{me.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  @{me.handle}
                </span>
                <Link
                  to="/profile"
                  className="mt-1 block text-xs font-medium text-foreground underline underline-offset-2"
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
                Bài đăng đã lưu
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/profile?tab=pinned" />}>
                <MapPinIcon />
                Địa điểm đã ghim
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/settings" />}>
              <SettingsIcon />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PaletteIcon />
                Giao diện
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={skin}
                  onValueChange={(value) => setSkin(value as typeof skin)}
                >
                  <DropdownMenuRadioItem value="default">Mặc định</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="retro">Retro</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <HelpCircleIcon />
              Trợ giúp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={isLoggingOut} onClick={handleLogout}>
              <LogOutIcon />
              {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
            </DropdownMenuItem>
          </>
        ) : isUnauthorizedError(error) ? (
          // Chưa đăng nhập: về trang đăng nhập (form email + password thật).
          <DropdownMenuItem onClick={() => void navigate("/login")}>
            <LogInIcon />
            Đăng nhập
          </DropdownMenuItem>
        ) : (
          // Lỗi khác 401 (mạng, 5xx): người dùng vẫn có thể đã đăng nhập — không
          // được hiện "Đăng nhập" như thể phiên đã mất.
          <DropdownMenuItem onClick={() => void refetch()}>
            <UserIcon />
            Không tải được hồ sơ — thử lại
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()
  const navTarget = useNavTarget()

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={navTarget(item)}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
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
                    <span>{item.label}</span>
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-4 top-0 h-0.5 bg-primary"
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
