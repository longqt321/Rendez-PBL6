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
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                    : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
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
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
    >
      <Plus size={18} aria-hidden />
      <span>Đăng ảnh</span>
    </NavLink>
  );
}

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-[var(--surface-card)]/95 border-t border-[var(--line)] flex items-center justify-around z-40 px-2" aria-label="Điều hướng chính">
      {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs font-medium transition-colors",
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--ink-faint)] hover:text-[var(--ink)]",
            )
          }
          title={label}
        >
          <Icon size={20} aria-hidden />
          {/* Nhãn đầy đủ trên mọi bề rộng: 4 tab × ~90px vừa 390px, không
              rút gọn thành một chữ cộc ("Khám", "Tìm") gây khó hiểu. */}
          <span className="truncate max-w-[76px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
