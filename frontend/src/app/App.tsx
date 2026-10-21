import {
  Compass,
  Map as MapIcon,
  Bookmark,
  User,
  ImagePlus,
  MapPin,
  Camera,
  LogOut,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { discoveryQuery } from "../lib/api/client";
import { SearchBar, State, useMe, useLogout, ErrorText } from "./shared";
import { Auth, ProfilePage } from "./auth";
import { Discover, PlaceDetailPage, PhotoDetailPage } from "./discovery";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
const MapPage = lazy(() =>
  import("./map").then((module) => ({ default: module.MapPage })),
);
import {
  NewContribution,
  ContributionDetailPage,
  ContributionHistory,
} from "./contributions";

export function RequireLogin() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <State pending />;
  if (me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search + location.hash,
        }}
      />
    );
  return <Outlet />;
}

function AccountMenu() {
  const me = useMe(),
    logout = useLogout();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
      className="account-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="topbar-account"
        ref={trigger}
        aria-label={"Tài khoản của " + (me.data?.display_name || "bạn")}
        title="Tài khoản"
        aria-expanded={open}
        aria-controls="account-dropdown"
        onClick={() => setOpen(!open)}
      >
        <span className="avatar" aria-hidden>
          {me.data?.display_name?.slice(0, 1).toUpperCase() || (
            <User size={21} />
          )}
        </span>
      </button>
      {open && (
        <div className="account-dropdown" id="account-dropdown">
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut size={18} aria-hidden />
            {logout.isPending ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
          <ErrorText error={logout.error} />
        </div>
      )}
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const title =
      location.pathname === "/discover"
        ? "Khám phá Đà Nẵng"
        : location.pathname === "/map"
          ? "Bản đồ Đà Nẵng"
          : location.pathname === "/saved"
            ? "Địa điểm đã lưu"
            : location.pathname === "/profile"
              ? "Tài khoản"
              : location.pathname.startsWith("/submissions")
                ? "Ảnh của tôi"
                : "Địa điểm & ảnh";
    document.title = title + " · Rendez";
    if (previousPath.current !== location.pathname) {
      document.getElementById("main")?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  const shared = discoveryQuery(new URLSearchParams(location.search));
  shared.delete("page");
  const params = new URLSearchParams(location.search);
  for (const key of ["lat", "lng", "zoom", "selected"]) {
    const value = params.get(key);
    if (value) shared.set(key, value);
  }
  const suffix = shared.toString() ? "?" + shared : "";
  const nav = [
    ["/discover" + suffix, "Khám phá", Compass],
    ["/map" + suffix, "Bản đồ", MapIcon],
    ["/submissions/new", "Đăng ảnh", ImagePlus],
    ["/saved", "Đã lưu", Bookmark],
    ["/profile", "Cá nhân", User],
  ] as const;
  return (
    <div
      className={
        "app-shell pin-shell" +
        (location.pathname === "/map" ? " map-shell" : "")
      }
    >
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      <aside className="sidebar">
        <Link
          className="brand rail-brand"
          to="/discover"
          aria-label="Rendez — Khám phá"
          title="Rendez"
        >
          r<span className="brand-dot">.</span>
          <span className="brand-word">rendez</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              to={to}
              key={label}
              title={label}
              aria-label={label}
              className={label === "Đăng ảnh" ? "rail-upload" : undefined}
            >
              <Icon size={23} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-footer">
          <MapPin size={15} aria-hidden /> Đà Nẵng
        </div>
      </aside>
      <main id="main" className="main-content" tabIndex={-1}>
        <header className="workspace-topbar pin-topbar">
          <SearchBar />
          <Link
            to="/submissions/new"
            className="topbar-post"
            aria-label="Đăng ảnh"
            title="Đăng ảnh"
          >
            <Camera size={20} aria-hidden />
          </Link>
          <AccountMenu key={location.pathname + location.search} />
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/discover" replace />} />
      <Route element={<RequireLogin />}>
        <Route element={<Shell />}>
          <Route path="discover" element={<Discover />} />
          <Route
            path="map"
            element={
              <Suspense fallback={<p role="status">Đang tải bản đồ…</p>}>
                <MapPage />
              </Suspense>
            }
          />
          <Route path="saved" element={<Discover saved />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="places/:id" element={<PlaceDetailPage />} />
          <Route path="photos/:id" element={<PhotoDetailPage />} />
          <Route path="submissions/new" element={<NewContribution />} />
          <Route path="submissions" element={<ContributionHistory />} />
          <Route path="submissions/:id" element={<ContributionDetailPage />} />
          <Route path="contributions/new" element={<NewContribution />} />
          <Route path="contributions" element={<ContributionHistory />} />
          <Route
            path="contributions/:id"
            element={<ContributionDetailPage />}
          />
          <Route
            path="*"
            element={
              <section className="state">
                <h1>Không tìm thấy trang</h1>
                <Link to="/discover">Về Khám phá</Link>
              </section>
            }
          />
        </Route>
      </Route>
      <Route path="login" element={<Auth key="login" />} />
      <Route path="register" element={<Auth key="register" register />} />
    </Routes>
  );
}
