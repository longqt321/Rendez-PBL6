import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ExternalLinkIcon,
  FlaskConicalIcon,
  LogOutIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { Link } from "react-router"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useMe } from "@/features/profile/hooks/use-me"
import { formatInitials, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAdminRuntime } from "./admin-env-store"

export interface AdminNavItem<TTab extends string = string> {
  readonly key: TTab
  readonly label: string
  readonly group: "ops" | "system"
  readonly adminOnly?: boolean
  readonly icon: LucideIcon
  readonly badgeCount?: number
}

interface AdminShellProps<TTab extends string> {
  readonly navItems: readonly AdminNavItem<TTab>[]
  readonly activeTab: TTab
  readonly activeTabLabel: string
  readonly onSelectTab: (tab: TTab) => void
  readonly onRefresh: () => void
  readonly isRefreshing?: boolean
  readonly children: ReactNode
}

const NAV_GROUPS = [
  { id: "ops", title: "Vận hành" },
  { id: "system", title: "Hệ thống" },
] as const

export function AdminShell<TTab extends string>({
  navItems,
  activeTab,
  activeTabLabel,
  onSelectTab,
  onRefresh,
  isRefreshing = false,
  children,
}: AdminShellProps<TTab>) {
  const { data: me } = useMe()
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const { env, isProd, isStaging } = useAdminRuntime()
  const isAdmin = me?.role === "admin"

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  onClick={() => onSelectTab(navItems[0]?.key ?? activeTab)}
                  tooltip="Trung tâm điều hành"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-control text-primary-foreground",
                      isProd ? "bg-destructive" : "bg-primary",
                    )}
                  >
                    <ShieldCheckIcon className="size-4" />
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-display font-bold">Rendez Admin</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {isAdmin ? "Quản trị viên" : "Kiểm duyệt viên"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {NAV_GROUPS.map((section) => {
              const items = navItems.filter((item) => item.group === section.id)
              if (items.length === 0) return null
              return (
                <SidebarGroup key={section.id}>
                  <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => {
                        const Icon = item.icon
                        const active = activeTab === item.key
                        return (
                          <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton
                              isActive={active}
                              tooltip={item.label}
                              onClick={() => onSelectTab(item.key)}
                            >
                              <Icon aria-hidden="true" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                            {item.badgeCount && item.badgeCount > 0 ? (
                              <SidebarMenuBadge className="bg-destructive/15 font-semibold text-destructive tabular-nums">
                                {formatNumber(item.badgeCount)}
                              </SidebarMenuBadge>
                            ) : null}
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            })}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Mở trang công khai"
                  render={<Link to="/discover" target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLinkIcon aria-hidden="true" />
                  <span>Trang công khai</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0">
          {isProd ? (
            <Alert
              variant="destructive"
              className="rounded-none border-x-0 border-t-0 bg-destructive/10 px-4 py-2"
            >
              <ShieldAlertIcon className="size-4" aria-hidden="true" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  <strong>PRODUCTION</strong> · Dữ liệu người dùng thật · Đã bật xác nhận kép và che
                  PII.
                </span>
                <Badge variant="destructive" className="font-mono text-[10px]">
                  PROD
                </Badge>
              </AlertDescription>
            </Alert>
          ) : (
            <Separator
              className={cn("h-0.5", isStaging ? "bg-primary/70" : "bg-star/80")}
              aria-hidden="true"
            />
          )}

          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" aria-label="Đóng hoặc mở menu quản trị" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden sm:inline-flex">
                    <span className="text-muted-foreground">Trung tâm điều hành</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline-flex" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">{activeTabLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={isProd ? "destructive" : "outline"}
                className={cn(
                  "hidden gap-1 font-mono text-[11px] uppercase sm:inline-flex",
                  !isProd && !isStaging && "border-star/50 bg-star/12 text-foreground",
                  isStaging && "border-primary/50 bg-primary/10 text-primary",
                )}
              >
                {isProd ? (
                  <ShieldAlertIcon className="size-3" aria-hidden="true" />
                ) : (
                  <FlaskConicalIcon className="size-3" aria-hidden="true" />
                )}
                {isProd ? "PROD" : isStaging ? "STAGING" : "DEV · Sandbox"}
              </Badge>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 gap-1.5"
              >
                <RefreshCwIcon
                  className={cn("size-3.5", isRefreshing && "animate-spin")}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 gap-1.5 md:inline-flex"
                render={<Link to="/discover" target="_blank" rel="noopener noreferrer" />}
              >
                <span>Trang công khai</span>
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </Button>

              <ThemeToggle />

              {me ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 px-1.5"
                        aria-label={`Tài khoản ${me.name}`}
                      />
                    }
                  >
                    <Avatar className="size-6">
                      <AvatarImage src={me.avatarUrl ?? undefined} alt={me.name} />
                      <AvatarFallback className="text-[10px]">
                        {formatInitials(me.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-28 truncate text-xs font-medium lg:inline">
                      {me.name}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{me.name}</span>
                          <span className="text-xs text-muted-foreground">
                            @{me.handle} · {isAdmin ? "Quản trị viên" : "Kiểm duyệt viên"}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground uppercase">
                            Môi trường: {env}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      render={<Link to="/discover" target="_blank" rel="noopener noreferrer" />}
                    >
                      <ExternalLinkIcon className="size-4" aria-hidden="true" />
                      Trang công khai
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isLoggingOut}
                      onClick={() => logout()}
                    >
                      <LogOutIcon className="size-4" aria-hidden="true" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </header>

          <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-6 lg:py-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
