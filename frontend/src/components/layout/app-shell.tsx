import { Suspense, useEffect, useRef } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router"
import { PageLoading } from "@/components/shared/page-loading"
import { useNotificationStream } from "@/features/notification/hooks/use-notification-stream"
import { BottomNav, SideNav } from "./shell-nav"
import { StaffContextBanner } from "./staff-context-banner"
import { TopBar } from "./top-bar"

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
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  )
}
