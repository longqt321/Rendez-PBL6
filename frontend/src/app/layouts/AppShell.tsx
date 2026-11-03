import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { ErrorText } from "../../components/ui/error-text";
import { useMe, useLogout } from "../../lib/session";
import { SearchBar } from "./search-bar";
import { useOptionalTheme } from "../../lib/theme";
import { Avatar, IconButton } from "../../components/ui/primitives";
import { CreateAction, MobileNav, SidebarNav } from "./nav";

/**
 * Document titles.
 *
 * Every route owns a title so history entries, tabs and screen-reader page
 * announcements are distinguishable. Detail routes fall back to their section
 * name because the entity name arrives asynchronously.
 */
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

/**
 * Application shell.
 *
 * One component owns the frame for every screen: persistent navigation, a
 * search affordance that is always reachable, the theme switch, and the account
 * menu. The mobile bottom bar is CSS-driven from the same markup so navigation
 * never forks into two implementations.
 */
export function AppShell() {
  const location = useLocation();
  const me = useMe();
  const previousPath = useRef(location.pathname);

  // The map is the only surface that owns the full viewport.
  const fullBleed = location.pathname === "/map";

  // Move focus to the main region on route change so screen-reader and
  // keyboard users are not stranded at the end of the previous page.
  useEffect(() => {
    document.title = titleFor(location.pathname) + " · Rendez";
    if (previousPath.current !== location.pathname) {
      document.getElementById("main")?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div className={fullBleed ? "app-shell app-shell--map" : "app-shell"}>
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>

      <aside className="app-shell__sidebar">
        <Link
          className="shell-brand"
          to="/discover"
          aria-label="Rendez — Khám phá"
        >
          <span aria-hidden>r</span>
          <span className="shell-brand__dot" aria-hidden>
            .
          </span>
          <span className="shell-brand__word">rendez</span>
        </Link>

        <SidebarNav showSettings={Boolean(me.data)} />

        <div className="shell-sidebar__foot">
          <CreateAction />
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <SearchBar />
          <div className="shell-topbar__actions">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main id="main" className="app-shell__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

/**
 * Light/dark shortcut.
 *
 * Settings owns the full choice (light, dark, follow the system). The topbar
 * is a shortcut for the common case and only toggles the two explicit themes.
 */
function ThemeToggle() {
  const theme = useOptionalTheme();
  // Tests mount the shell without a ThemeProvider; there is nothing to toggle.
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
  if (me.isPending)
    return <span className="shell-account-skeleton" aria-hidden />;
  if (!me.data) {
    return (
      <Link to="/login" className="btn btn--outline btn--sm">
        <LogIn size={16} aria-hidden />
        Đăng nhập
      </Link>
    );
  }
  return (
    <AccountMenuAuthenticated
      key="authenticated"
      displayName={me.data.display_name}
    />
  );
}

function AccountMenuAuthenticated({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      className="shell-account"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="shell-account__trigger"
        aria-label={"Tài khoản của " + (displayName || "bạn")}
        title="Tài khoản"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-dropdown"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={displayName} size="sm" />
      </button>
      {open && (
        <div className="shell-account__menu" id="account-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut size={17} aria-hidden />
            {logout.isPending ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
          <ErrorText error={logout.error} />
        </div>
      )}
    </div>
  );
}
