import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useMe, useLogout } from "../../lib/session";
import { SearchBar } from "./search-bar";
import { useOptionalTheme } from "../../lib/theme";
import { Avatar, IconButton } from "../../components/ui/primitives";
import { CreateAction, MobileNav, SidebarNav } from "./nav";

const TITLES: [matcher: (path: string) => boolean, title: string][] = [
  [(path) => path === "/discover", "Khám phá"],
  [(path) => path === "/search", "Tìm kiếm"],
  [(path) => path === "/map", "Bản đồ"],
  [(path) => path === "/settings", "Cài đặt"],
  [(path) => path === "/profile", "Trang cá nhân"],
  [(path) => path === "/create", "Đăng ảnh"],
  [(path) => path.startsWith("/places/"), "Địa điểm"],
  [(path) => path.startsWith("/posts/"), "Ảnh cộng đồng"],
  [(path) => path.startsWith("/photos/"), "Ảnh cộng đồng"],
  [(path) => path.startsWith("/submissions/"), "Ảnh đã gửi"],
  [(path) => path === "/terms", "Điều khoản sử dụng"],
];

function titleFor(pathname: string): string {
  return TITLES.find(([matches]) => matches(pathname))?.[1] ?? "Địa điểm";
}

export function AppShell() {
  const location = useLocation();
  const me = useMe();
  const previousPath = useRef(location.pathname);
  const fullBleed = location.pathname === "/map";

  useEffect(() => {
    document.title = titleFor(location.pathname) + " · Rendez";
    if (previousPath.current !== location.pathname) {
      document.getElementById("main")?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:shadow-lg focus:rounded-md"
      >
        Đến nội dung chính
      </a>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--line)] bg-[var(--surface-card)] p-4 shrink-0 justify-between h-screen sticky top-0">
        <div className="flex flex-col gap-7">
          <Link
            className="flex items-baseline gap-0.5 px-3 pt-2 text-2xl font-bold tracking-tight text-[var(--ink)]"
            to="/discover"
            aria-label="Rendez — Khám phá"
          >
            <span>r</span>
            <span className="text-[var(--accent)]">.</span>
            <span>rendez</span>
          </Link>

          <SidebarNav showSettings={Boolean(me.data)} />
        </div>

        <div className="pt-4 border-t border-[var(--line)]">
          <CreateAction />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 border-b border-[var(--line)] bg-[var(--surface-card)]/85 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between gap-3">
          {/* UX_RULES mục 2: một màn hình một ô tìm kiếm — trang /search có ô
              riêng đồng bộ bộ lọc, nên ẩn thanh tìm kiếm toàn cục ở đó. */}
          <div className="flex-1 max-w-lg">
            {location.pathname !== "/search" && <SearchBar />}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main
          id="main"
          className={fullBleed ? "flex-1 flex flex-col h-[calc(100vh-3.5rem)]" : "flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full"}
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function ThemeToggle() {
  const theme = useOptionalTheme();
  if (!theme) return null;
  const { resolved, setPreference } = theme;
  const next = resolved === "dark" ? "light" : "dark";
  const label =
    resolved === "dark"
      ? "Chuyển sang giao diện sáng."
      : "Chuyển sang giao diện tối.";
  return (
    <IconButton label={label} onClick={() => setPreference(next)}>
      {resolved === "dark" ? (
        <Moon size={18} aria-hidden />
      ) : (
        <Sun size={18} aria-hidden />
      )}
    </IconButton>
  );
}

function AccountMenu() {
  const me = useMe();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (me.isPending) {
    return <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
  }

  if (!me.data) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 transition-opacity"
      >
        <LogIn size={14} aria-hidden />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center justify-center p-0.5 rounded-full border border-[var(--line)] hover:ring-2 hover:ring-[var(--accent-soft)] cursor-pointer"
        aria-label={`Tài khoản của ${me.data.display_name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Avatar name={me.data.display_name} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--line)] bg-[var(--surface-card)] shadow-lg p-1.5 flex flex-col gap-1 z-50 text-sm"
        >
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink)]"
          >
            Trang cá nhân
          </Link>
          <Link
            role="menuitem"
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--ink)]"
          >
            Cài đặt
          </Link>
          <div className="h-px bg-[var(--line)] my-1" />
          <button
            role="menuitem"
            type="button"
            disabled={logout.isPending}
            onClick={() => {
              setOpen(false);
              logout.mutate();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer w-full text-left"
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
