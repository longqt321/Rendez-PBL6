import { useLocation, useNavigate } from "react-router";
import { Search } from "lucide-react";
import { discoveryQuery } from "../../lib/api/client";

export function SearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  return (
    <form
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-muted)]/70 focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:bg-[var(--surface-card)] transition-all w-full"
      role="search"
      key={params.get("q") || ""}
      onSubmit={(event) => {
        event.preventDefault();
        const query = discoveryQuery(new URLSearchParams(location.search));
        const value = String(
          new FormData(event.currentTarget).get("q") || "",
        ).trim();
        if (value) query.set("q", value);
        else query.delete("q");
        query.delete("page");
        if (location.pathname === "/map")
          for (const key of ["lat", "lng", "zoom"]) {
            const value = params.get(key);
            if (value) query.set(key, value);
          }
        navigate(
          (location.pathname === "/map" ? "/map" : "/discover") +
            (query.size ? "?" + query : ""),
        );
      }}
    >
      <label className="sr-only" htmlFor="global-query">
        Tìm tên hoặc địa chỉ
      </label>
      <button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm" className="text-[var(--ink-faint)] hover:text-[var(--ink)]">
        <Search size={16} aria-hidden />
      </button>
      <input
        id="global-query"
        name="q"
        type="search"
        defaultValue={params.get("q") || ""}
        placeholder="Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng..."
        autoComplete="off"
        className="w-full bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
      />
    </form>
  );
}
