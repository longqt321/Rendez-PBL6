import { useEffect, useState } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import {
  BellIcon,
  BookmarkIcon,
  ClockIcon,
  CompassIcon,
  FileTextIcon,
  LogInIcon,
  LogOutIcon,
  MapPinIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useMarkAllNotificationsRead } from "@/features/notification/hooks/use-mark-all-notifications-read"
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notification/hooks/use-notifications"
import { useMe } from "@/features/profile/hooks/use-me"
import { useSearchQuerySync } from "@/features/search/hooks/use-search-query-sync"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { useMobileGpsAutoSync } from "@/hooks/use-user-location"
import { isUnauthorizedError } from "@/lib/axios"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"
import { Brand } from "./shell-nav"

const QUICK_SEARCH_SUGGESTIONS = [
  "Mì Quảng",
  "Bánh xèo",
  "Bún chả cá",
  "Cà phê Sơn Trà",
  "Hải sản",
] as const

export function TopBar() {
  useMobileGpsAutoSync()
  const isDesktop = useIsDesktop()
  const { draft, setDraft, submit, clear, isFilterPage } = useSearchQuerySync()
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>("recent-searches", [])
  const location = useLocation()
  const navigate = useNavigate()
  const [commandOpen, setCommandOpen] = useState(false)

  const addRecentSearch = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    setRecentSearches((prev = []) =>
      [clean, ...prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 8),
    )
  }

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
              if (draft.trim()) {
                addRecentSearch(draft)
                submit()
              }
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
                    if (draft.trim()) {
                      addRecentSearch(draft)
                      submit()
                    }
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
          <NotificationBellButton />
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
          {recentSearches && recentSearches.length > 0 ? (
            <>
              <CommandGroup heading="Tìm kiếm gần đây">
                {recentSearches.map((term) => (
                  <CommandItem
                    key={`recent-${term}`}
                    value={`recent-${term}`}
                    onSelect={() => {
                      setCommandOpen(false)
                      setDraft(term)
                      addRecentSearch(term)
                      const targetPath = isFilterPage ? location.pathname : "/discover"
                      void navigate(`${targetPath}?q=${encodeURIComponent(term)}`)
                    }}
                  >
                    <ClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}
          <CommandGroup heading="Địa danh & Khu vực nổi bật">
            {["Cầu Rồng", "Bãi biển Mỹ Khê", "Cầu Sông Hàn", "Chợ Hàn", "Chợ Cồn", "Sơn Trà"].map(
              (landmark) => (
                <CommandItem
                  key={`landmark-${landmark}`}
                  value={`landmark-${landmark}`}
                  onSelect={() => {
                    setCommandOpen(false)
                    setDraft(`Gần ${landmark}`)
                    addRecentSearch(`Gần ${landmark}`)
                    const targetPath = isFilterPage ? location.pathname : "/discover"
                    void navigate(`${targetPath}?q=${encodeURIComponent(`Gần ${landmark}`)}`)
                  }}
                >
                  <MapPinIcon className="size-4 text-primary" aria-hidden="true" />
                  <span>Gần {landmark}</span>
                </CommandItem>
              ),
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Món ngon Đà Nẵng">
            {QUICK_SEARCH_SUGGESTIONS.map((term) => (
              <CommandItem
                key={term}
                value={term}
                onSelect={() => {
                  setCommandOpen(false)
                  setDraft(term)
                  addRecentSearch(term)
                  const targetPath = isFilterPage ? location.pathname : "/discover"
                  void navigate(`${targetPath}?q=${encodeURIComponent(term)}`)
                }}
              >
                <SearchIcon className="size-4 text-primary" aria-hidden="true" />
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
    </header>
  )
}

function NotificationBellButton() {
  const { data: me } = useMe()
  const { data: unread = 0 } = useUnreadNotificationCount()
  const { notifications, isPending } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)

  if (!me) return null

  const recent = notifications.slice(0, 5)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={unread > 0 ? `Thông báo (${unread} chưa đọc)` : "Thông báo"}
            className="relative min-h-11 min-w-11 rounded-full sm:size-10 sm:min-h-0 sm:min-w-0"
          />
        }
      >
        <BellIcon className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <Badge
            variant="destructive"
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-xs font-bold tabular-nums ring-2 ring-background"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm font-bold">Thông báo</span>
            {unread > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {unread} mới
              </Badge>
            ) : null}
          </div>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Đọc tất cả
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 divide-y divide-border/60 overflow-y-auto p-1">
          {isPending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-4" aria-label="Đang tải thông báo" />
            </div>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Chưa có thông báo nào</p>
          ) : (
            recent.map((n) => {
              const href =
                n.kind === "place-suggestion"
                  ? "/notification"
                  : n.kind === "direct-message"
                    ? n.actorHandle
                      ? `/messages/${n.actorHandle}`
                      : "/messages"
                    : n.kind === "room-event"
                      ? `/rooms/${n.roomCode}`
                      : n.kind === "follow" && n.actorHandle
                        ? `/u/${n.actorHandle}`
                        : "postId" in n && n.postId
                          ? `/post/${n.postId}`
                          : "/notification"

              const text =
                n.kind === "place-suggestion"
                  ? `Gợi ý quán cho bài đăng của bạn: ${n.suggestions[0]?.place.name ?? ""}`
                  : n.kind === "system"
                    ? n.title
                    : n.kind === "direct-message"
                      ? `${n.actorName} đã gửi tin nhắn cho bạn`
                      : n.kind === "room-event"
                        ? `Phòng ${n.roomName}: ${n.eventType === "room_finalized" ? "Đã chốt quán" : "Mở bình chọn"}`
                        : `${n.actorName} ${n.kind === "like" ? "đã thích bài đăng" : n.kind === "comment" ? "đã bình luận" : "đã theo dõi bạn"}`

              return (
                <Link
                  key={n.id}
                  to={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-control p-2 text-xs transition-colors hover:bg-muted/60",
                    !n.read && "bg-primary/5 font-medium",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-foreground">{text}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read ? (
                    <span
                      className="mt-1 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              )
            })
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button
            size="xs"
            variant="outline"
            className="w-full justify-center"
            nativeButton={false}
            render={<Link to="/notification" onClick={() => setOpen(false)} />}
          >
            Xem tất cả thông báo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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
        <DropdownMenuItem render={<Link to="/terms" />}>
          <FileTextIcon />
          Điều khoản sử dụng
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
