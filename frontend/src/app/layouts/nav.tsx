import {
  BarChart2,
  Bookmark,
  Compass,
  Heart,
  ImagePlus,
  Map as MapIcon,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { NavLink } from "react-router";
import { clsx } from "clsx";

/**
 * Primary navigation — Threads style.
 *
 * Information architecture:
 *   Khám phá            home feed (Dành cho bạn)
 *   Tìm kiếm            search feed
 *   Bản đồ              spatial map
 *   Hoạt động           notifications/activity
 *   Trang cá nhân       profile
 *   Thông tin chi tiết  insights/analytics
 */
export const PRIMARY_NAV = [
  { to: "/discover", label: "Dành cho bạn", icon: Compass },
  { to: "/search", label: "Tìm kiếm", icon: Search },
  { to: "/map", label: "Bản đồ", icon: MapIcon },
  { to: "/activity", label: "Hoạt động", icon: Heart },
  { to: "/profile", label: "Trang cá nhân", icon: User },
  { to: "/insights", label: "Thông tin chi tiết", icon: BarChart2 },
] as const;

export const SECONDARY_NAV = [
  { to: "/saved", label: "Đã lưu", icon: Bookmark },
  { to: "/settings", label: "Cài đặt", icon: Settings },
] as const;

export function SidebarNav({
  onNavigate,
  showSettings = false,
}: {
  onNavigate?: () => void;
  showSettings?: boolean;
}) {
  return (
    <nav className="shell-nav" aria-label="Điều hướng chính">
      <ul role="list" className="shell-nav__list">
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx("shell-nav__link", isActive && "is-active")
              }
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span className="shell-nav__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Phân vùng phụ Threads style: Đã lưu, Cài đặt */}
      <div className="shell-nav__section-divider" />
      <ul role="list" className="shell-nav__list shell-nav__list--secondary">
        {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx("shell-nav__link", isActive && "is-active")
              }
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span className="shell-nav__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The single, prominent create action. Threads style button */
export function CreateAction({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink to="/create" onClick={onNavigate} className="shell-create">
      <span className="shell-create__plus" aria-hidden>+</span>
      <span className="shell-create__text">Đăng ảnh</span>
    </NavLink>
  );
}

/** Mobile bottom bar: same destinations, icon-first. */
export function MobileNav({
  showSettings = false,
}: {
  showSettings?: boolean;
}) {
  return (
    <nav className="shell-mobile" aria-label="Điều hướng chính">
      {PRIMARY_NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx("shell-mobile__link", isActive && "is-active")
          }
          title={label}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
