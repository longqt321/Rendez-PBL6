import { Compass, Map as MapIcon, Search, User, Plus } from "lucide-react";
import { NavLink } from "react-router";
import { clsx } from "clsx";

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
    <nav className="flex flex-col gap-1 w-full" aria-label="Điều hướng chính">
      <ul role="list" className="flex flex-col gap-1 m-0 p-0 list-none">
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                )
              }
            >
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CreateAction({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink
      to="/create"
      onClick={onNavigate}
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
    >
      <Plus size={18} aria-hidden />
      <span>Đăng ảnh</span>
    </NavLink>
  );
}

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around z-40 px-2" aria-label="Điều hướng chính">
      {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs font-medium transition-colors",
              isActive
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )
          }
          title={label}
        >
          <Icon size={20} aria-hidden />
          <span className="truncate max-w-[64px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
