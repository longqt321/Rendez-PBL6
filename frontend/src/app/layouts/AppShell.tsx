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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:shadow-lg focus:rounded-md"
      >
        Đến nội dung chính
      </a>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shrink-0 justify-between h-screen sticky top-0">
        <div className="flex flex-col gap-6">
          <Link
            className="flex items-center gap-1.5 px-3 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
            to="/discover"
            aria-label="Rendez — Khám phá"
          >
            <span>r</span>
            <span className="text-blue-600">.</span>
            <span>rendez</span>
          </Link>

          <SidebarNav showSettings={Boolean(me.data)} />
        </div>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <CreateAction />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between gap-3">
          <div className="flex-1 max-w-lg">
            <SearchBar />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main
          id="main"
          className={fullBleed ? "flex-1 flex flex-col h-[calc(100vh-3.5rem)]" : "flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full"}
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
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
        className="flex items-center justify-center p-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 hover:ring-2 hover:ring-neutral-400 cursor-pointer"
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
          className="absolute right-0 mt-2 w-48 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-1.5 flex flex-col gap-1 z-50 text-sm"
        >
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
          >
            Trang cá nhân
          </Link>
          <Link
            role="menuitem"
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
          >
            Cài đặt
          </Link>
          <div className="h-px bg-neutral-200 dark:border-neutral-800 my-1" />
          <button
            role="menuitem"
            type="button"
            disabled={logout.isPending}
            onClick={() => {
              setOpen(false);
              logout.mutate();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer w-full text-left"
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
