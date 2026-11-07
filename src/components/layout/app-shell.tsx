import {
  BellIcon,
  BookmarkIcon,
  CompassIcon,
  HelpCircleIcon,
  LogOutIcon,
  MapPinIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  TypeIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import { NavLink, Link } from "react-router"
import { useSkin } from "@/app/providers/skin-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { useSearchQuerySync } from "@/features/search/hooks/use-search-query-sync"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"
import { ThemeToggle } from "./theme-toggle"

const ICON_MAP = {
  "/discover": CompassIcon,
  "/social": UsersIcon,
  "/notification": BellIcon,
} as const

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Layout global:
 * - PC: nav dọc bên trái, topbar (search + avatar) trên cùng.
 * - Mobile: topbar trên cùng, nav ngang cố định dưới cùng.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh">
      <SideNav />
      <div className="flex min-h-dvh flex-col lg:pl-56">
        <TopBar />
        {/* pb-20 chừa chỗ cho bottom nav trên mobile */}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
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
        className="grid size-8 place-items-center rounded-[0.2rem] border-2 border-foreground bg-secondary text-sm font-bold text-secondary-foreground"
      >
        S
      </span>
      <span className="font-heading text-lg leading-none font-bold tracking-tight">
        Sài Gòn
        <span className="block text-[0.6rem] font-medium tracking-[0.18em] uppercase opacity-60">
          Ăn &amp; Đi
        </span>
      </span>
    </div>
  )
}

function SideNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r-2 border-foreground/15 bg-sidebar px-4 py-5 lg:flex">
      <Brand />

      <nav aria-label="Điều hướng chính" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.to as keyof typeof ICON_MAP] ?? item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-[0.2rem] border-2 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-transparent hover:border-foreground/25 hover:bg-muted",
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/notification" && unread > 0 ? (
                <Badge variant="secondary" className="min-w-5 px-1 text-[0.65rem] font-bold">
                  {unread}
                </Badge>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t-2 border-dashed border-foreground/20 pt-4">
        <SkinSwitch />
        <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
          Dữ liệu minh hoạ. Chưa kết nối backend.
        </p>
      </div>
    </aside>
  )
}

function SkinSwitch() {
  const { skin, setSkin } = useSkin()
  const isRetro = skin === "retro"

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">Giao diện</span>
      <div className="flex items-center gap-1">
        <Button
          variant={isRetro ? "ghost" : "outline"}
          size="icon-sm"
          aria-label="Dùng giao diện mặc định"
          aria-pressed={!isRetro}
          onClick={() => setSkin("default")}
        >
          <PaletteIcon />
        </Button>
        <Button
          variant={isRetro ? "outline" : "ghost"}
          size="icon-sm"
          aria-label="Dùng giao diện retro"
          aria-pressed={isRetro}
          onClick={() => setSkin("retro")}
        >
          <TypeIcon />
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}

function TopBar() {
  const { draft, setDraft, submit } = useSearchQuerySync()

  return (
    <header className="sticky top-0 z-20 border-b-2 border-foreground/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>

        <form
          role="search"
          className="ml-auto w-full max-w-md lg:ml-0 lg:max-w-lg"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <InputGroup>
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

        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function UserMenu() {
  const { skin, setSkin } = useSkin()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Mở menu người dùng"
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="lg">
              <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                MA
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-semibold">Minh Anh</span>
            <span className="block text-xs font-normal text-muted-foreground">@minhanh.eats</span>
            <Link
              to="/profile"
              className="mt-1 block text-[0.7rem] font-medium text-foreground underline underline-offset-2"
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
        <DropdownMenuItem variant="destructive">
          <LogOutIcon />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav() {
  const { data: unread = 0 } = useUnreadNotificationCount()

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-foreground/15 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.to as keyof typeof ICON_MAP] ?? item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className="size-5" aria-hidden="true" />
                      {item.to === "/notification" && unread > 0 ? (
                        <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
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
