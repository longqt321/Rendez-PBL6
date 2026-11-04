import { useLocation, useNavigate } from "react-router";
import { Search } from "lucide-react";
import { discoveryQuery } from "../../lib/api/client";

export function SearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  return (
    <form
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/60 focus-within:ring-2 focus-within:ring-neutral-900 dark:focus-within:ring-neutral-100 focus-within:bg-white dark:focus-within:bg-neutral-900 transition-all w-full"
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
      <button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
        <Search size={16} aria-hidden />
      </button>
      <input
        id="global-query"
        name="q"
        type="search"
        defaultValue={params.get("q") || ""}
        placeholder="Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng..."
        autoComplete="off"
        className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
      />
    </form>
  );
}
