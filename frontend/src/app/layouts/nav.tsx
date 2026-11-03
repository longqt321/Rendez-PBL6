import { Compass, Map as MapIcon, Search, User } from "lucide-react";
import { NavLink } from "react-router";
import { clsx } from "clsx";

/**
 * Primary navigation.
 *
 * Four destinations. Saved places live inside the profile screen as a tab, so
 * they do not need their own entry; the create action is the shell's single
 * prominent button, not a nav item.
 */
const PRIMARY_NAV = [
  { to: "/discover", label: "Khám phá", icon: Compass },
  { to: "/search", label: "Tìm kiếm", icon: Search },
  { to: "/map", label: "Bản đồ", icon: MapIcon },
  { to: "/profile", label: "Trang cá nhân", icon: User },
] as const;

export function SidebarNav({
  onNavigate,
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
    </nav>
  );
}

/** The single, prominent create action. */
export function CreateAction({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink to="/create" onClick={onNavigate} className="shell-create">
      <span className="shell-create__plus" aria-hidden>
        +
      </span>
      <span className="shell-create__text">Đăng ảnh</span>
    </NavLink>
  );
}

/** Mobile bottom bar: same destinations, icon-first. */
export function MobileNav() {
  return (
    <nav className="shell-mobile" aria-label="Điều hướng chính">
      {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
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
