import {
  Bookmark,
  Compass,
  ImagePlus,
  Map as MapIcon,
  Search,
  Settings,
  User,
} from "lucide-react";
import { NavLink } from "react-router";
import { clsx } from "clsx";

/**
 * Primary navigation.
 *
 * Information architecture:
 *   Khám phá   open-ended discovery (home)
 *   Tìm kiếm   intent-driven search
 *   Bản đồ     spatial exploration
 *   Đã lưu     the member's own collection
 *   Hồ sơ      identity and settings
 *
 * "Đăng trải nghiệm" is an action, not a destination, so it is rendered as a
 * distinct primary button instead of competing with the navigation entries.
 */
export const PRIMARY_NAV = [
  { to: "/discover", label: "Khám phá", icon: Compass },
  { to: "/search", label: "Tìm kiếm", icon: Search },
  { to: "/map", label: "Bản đồ", icon: MapIcon },
  { to: "/saved", label: "Đã lưu", icon: Bookmark },
  { to: "/profile", label: "Hồ sơ", icon: User },
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
              <Icon size={20} aria-hidden />
              <span className="shell-nav__label">{label}</span>
            </NavLink>
          </li>
        ))}
        {showSettings && (
          <li>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx("shell-nav__link", isActive && "is-active")
              }
            >
              <Settings size={20} aria-hidden />
              <span className="shell-nav__label">Cài đặt</span>
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}

/** The single, prominent create action. */
export function CreateAction({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink to="/create" onClick={onNavigate} className="shell-create">
      <ImagePlus size={19} aria-hidden />
      <span className="shell-nav__label">Đăng trải nghiệm</span>
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
      {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx("shell-mobile__link", isActive && "is-active")
          }
        >
          <Icon size={21} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
      {showSettings && (
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx("shell-mobile__link", isActive && "is-active")
          }
        >
          <Settings size={21} aria-hidden />
          <span>Cài đặt</span>
        </NavLink>
      )}
    </nav>
  );
}
