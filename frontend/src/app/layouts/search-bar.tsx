import { useLocation, useNavigate } from "react-router";
import { Search } from "lucide-react";
import { discoveryQuery } from "../../lib/api/client";

/**
 * Global search field.
 *
 * Submitting keeps the current camera when the map is open, because a map
 * search is about the same area; anywhere else it opens discovery.
 */
export function SearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  return (
    <form
      className="global-search"
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
      <button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm">
        <Search size={21} aria-hidden />
      </button>
      <input
        id="global-query"
        name="q"
        type="search"
        placeholder="Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng..."
        defaultValue={params.get("q") || ""}
        maxLength={100}
      />
    </form>
  );
}
