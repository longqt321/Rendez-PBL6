import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Bookmark,
  ImageOff,
  Search,
  X,
  WifiOff,
  Coffee,
  Zap,
  Wind,
  Trees,
  Building,
  Moon,
  Sparkles,
  Layers,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  api,
  ApiError,
  discoveryQuery,
  type Category,
} from "../lib/api/client";
import type { Attribute, VisualPlace } from "../lib/api/visual";
import { Button } from "../components/ui/button";

/*
 * Session helpers live in `lib/session` so the new feature modules and these
 * legacy screens share one implementation. They are re-exported here because
 * this module is still the import site for the screens that predate the
 * `lib/` layer.
 */
import { useMe, useLogout, sanitizeReturnTo } from "../lib/session";
export { useMe, useLogout, sanitizeReturnTo };

export function googleMapsDirectionsUrl(place: {
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  if (place.name && place.address) {
    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(`${place.name}, ${place.address}`)
    );
  }
  if (
    place.latitude !== null &&
    place.longitude !== null &&
    place.latitude !== undefined &&
    place.longitude !== undefined
  ) {
    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      place.latitude +
      "," +
      place.longitude
    );
  }
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(place.name || place.address || "Đà Nẵng")
  );
}

export function State({
  pending,
  error,
  empty,
  onRetry,
}: {
  pending?: boolean;
  error?: Error | null;
  empty?: string;
  onRetry?: () => void;
}) {
  if (pending)
    return (
      <div role="status" aria-label="Đang tải" className="skeletons">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div className={`skeleton skeleton-${i}`} key={i} />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="state" role="alert">
        <WifiOff size={28} aria-hidden />
        <h2>
          {error instanceof ApiError && error.status === 404
            ? "Nội dung không còn khả dụng"
            : error instanceof ApiError && error.status === 403
              ? "Không có quyền truy cập"
              : error instanceof ApiError && error.status === 401
                ? "Phiên đăng nhập đã hết hạn"
                : "Không thể tải trang"}
        </h2>
        <p className="state-description">
          {error instanceof ApiError && error.status === 404
            ? "Nội dung này đã bị xóa hoặc đường dẫn không đúng."
            : error instanceof ApiError && error.status === 403
              ? "Bạn không có quyền xem hoặc thực hiện thao tác này."
              : error instanceof ApiError && error.status === 401
                ? "Vui lòng đăng nhập lại để tiếp tục sử dụng."
                : error instanceof ApiError && error.status >= 500
                  ? "Máy chủ hiện không phản hồi. Bạn có thể thử lại sau."
                  : error instanceof ApiError
                    ? error.message
                    : "Không kết nối được. Kiểm tra kết nối mạng rồi thử lại."}
        </p>
        {error instanceof ApiError &&
          error.status < 500 &&
          Object.entries(error.fields).map(([field, value]) => (
            <p className="error" key={field}>
              {errorMessage(value)}
            </p>
          ))}
        {error instanceof ApiError && error.status === 401 ? (
          <Button asChild>
            <Link to="/login">Đăng nhập lại</Link>
          </Button>
        ) : (
          onRetry && <Button onClick={onRetry}>Thử lại</Button>
        )}
      </div>
    );
  if (empty) {
    const search =
      typeof window !== "undefined" ? window.location?.search || "" : "";
    const hasActiveFilters = Boolean(
      search &&
      (search.includes("category=") ||
        search.includes("attributes=") ||
        search.includes("q=")),
    );
    return (
      <div className="state empty-state-card">
        <div className="empty-icon-wrap">
          {empty.toLowerCase().includes("lưu") ? (
            <Bookmark size={32} aria-hidden />
          ) : (
            <Coffee size={32} aria-hidden />
          )}
        </div>
        <h2>{empty}</h2>
        <p className="empty-description">
          {empty.toLowerCase().includes("lưu")
            ? "Khám phá các địa điểm tại Đà Nẵng và bấm biểu tượng Lưu để gom vào danh sách yêu thích của bạn."
            : "Thử chọn các đặc điểm khác hoặc xóa bớt tiêu chí lọc để xem thêm địa điểm."}
        </p>
        {empty.toLowerCase().includes("lưu") ? (
          <Button asChild>
            <Link to="/discover">Khám phá địa điểm ngay</Link>
          </Button>
        ) : hasActiveFilters ? (
          <Button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                const next = new URLSearchParams(window.location.search);
                for (const k of [
                  "q",
                  "category",
                  "attributes",
                  "sort",
                  "page",
                  "selected",
                ]) {
                  next.delete(k);
                }
                window.location.search = next.toString();
              }
            }}
          >
            Xóa tất cả bộ lọc
          </Button>
        ) : (
          <Button asChild>
            <Link to="/discover">Khám phá địa điểm ngay</Link>
          </Button>
        )}
      </div>
    );
  }
  return null;
}
function errorMessage(value: unknown): string {
  if (Array.isArray(value)) return value.map(errorMessage).join(" ");
  if (value !== null && typeof value === "object")
    return Object.values(value).map(errorMessage).join(" ");
  return String(value ?? "");
}
export function ErrorText({ error }: { error: Error | null }) {
  if (!error) return null;
  const isServerInternal = error instanceof ApiError && error.status >= 500;
  const safeMessage = isServerInternal
    ? "Máy chủ hiện không phản hồi. Vui lòng thử lại sau."
    : error instanceof ApiError
      ? error.message
      : "Không kết nối được. Kiểm tra kết nối mạng rồi thử lại.";

  return (
    <div role="alert" className="error">
      <p>{safeMessage}</p>
      {error instanceof ApiError &&
        error.status < 500 &&
        Object.entries(error.fields).map(([key, value]) => (
          <p key={key}>{errorMessage(value)}</p>
        ))}
    </div>
  );
}
export function Cover({
  place,
  className = "",
}: {
  place: {
    cover_media_url?: string | null;
    cover_image_url: string | null;
    name: string;
  };
  className?: string;
}) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  // PostMedia cover (unified protected media endpoint) wins; the legacy
  // photo cover is the fallback when the PostMedia one is missing or fails.
  const candidates = [place.cover_media_url, place.cover_image_url].filter(
    (url): url is string => Boolean(url),
  );
  const url = candidates.find((candidate) => !failedUrls.includes(candidate));
  return url ? (
    <img
      className={className}
      src={url}
      alt={place.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrls((failed) => [...failed, url])}
    />
  ) : (
    <div className={"placeholder " + className}>
      <ImageOff aria-hidden />
      <span>Chưa có ảnh</span>
    </div>
  );
}
export function SaveButton({
  place,
  compact = false,
}: {
  place: Pick<VisualPlace, "id" | "name" | "is_saved">;
  compact?: boolean;
}) {
  const me = useMe(),
    navigate = useNavigate(),
    location = useLocation(),
    cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api<void>("favorites/" + place.id + "/", {
        method: place.is_saved ? "DELETE" : "PUT",
      }),
    onSuccess: async () => {
      await cache.invalidateQueries();
    },
  });
  return (
    <div className={"save-control" + (compact ? " compact" : "")}>
      <Button
        variant="outline"
        aria-label={(place.is_saved ? "Bỏ lưu " : "Lưu ") + place.name}
        aria-pressed={place.is_saved}
        disabled={mutation.isPending || me.isPending || me.isError}
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: {
                returnTo: location.pathname + location.search,
                savePlace: place.id,
              },
            });
            return;
          }
          mutation.mutate();
        }}
      >
        <Bookmark
          size={18}
          fill={place.is_saved ? "currentColor" : "none"}
          aria-hidden
        />
        {!compact && (place.is_saved ? "Đã lưu" : "Lưu địa điểm")}
      </Button>
      <ErrorText error={mutation.error || me.error} />
    </div>
  );
}
export function PlaceCard({ place }: { place: VisualPlace }) {
  return (
    <article className="place-card saved-card">
      <Link to={"/places/" + place.id}>
        <Cover place={place} className="card-image" />
        <div className="card-copy">
          <span className="eyebrow">{place.category.name}</span>
          <h2>{place.name}</h2>
          <p className="muted">{place.address}</p>
        </div>
      </Link>
      <SaveButton place={place} compact />
    </article>
  );
}
export function AttributeIcon({
  code,
  size = 13,
}: {
  code: string;
  size?: number;
}) {
  switch (code) {
    case "study":
      return <Zap size={size} aria-hidden />;
    case "interior":
      return <Wind size={size} aria-hidden />;
    case "plants":
      return <Trees size={size} aria-hidden />;
    case "architecture":
      return <Building size={size} aria-hidden />;
    case "night":
      return <Moon size={size} aria-hidden />;
    case "food":
      return <Coffee size={size} aria-hidden />;
    case "wood":
      return <Sparkles size={size} aria-hidden />;
    default:
      return <Layers size={size} aria-hidden />;
  }
}

export function AttributeChips({
  attributes,
  matched = [],
}: {
  attributes: Attribute[];
  matched?: string[];
}) {
  return (
    <div className="attribute-chips">
      {attributes.map((a) => (
        <span
          key={a.code}
          className={
            "attribute-chip " + (matched.includes(a.code) ? "matched" : "")
          }
          title={a.description}
        >
          <AttributeIcon code={a.code} size={12} />
          {a.display_name_vi}
        </span>
      ))}
    </div>
  );
}
export function SearchBar() {
  const location = useLocation(),
    navigate = useNavigate();
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
        // A map search keeps camera context; a search elsewhere opens discovery.
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
export function Filters({ compact = false }: { compact?: boolean }) {
  const [params, setParams] = useSearchParams();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("categories/"),
  });
  const attributes = useQuery({
    queryKey: ["attributes"],
    queryFn: () => api<Attribute[]>("attributes/"),
  });
  const selected = (params.get("attributes") || "").split(",").filter(Boolean);
  const apply = (form: HTMLFormElement) => {
    const next = new URLSearchParams(params),
      data = new FormData(form);
    for (const key of ["q", "category", "sort"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A failed taxonomy request must never silently relax the current query.
    if (attributes.data) {
      const codes = data.getAll("attributes").map(String).sort();
      if (codes.length) next.set("attributes", codes.join(","));
      else next.delete("attributes");
    }
    next.delete("page");
    next.delete("selected");
    setParams(next);
  };
  return (
    <form
      key={discoveryQuery(params).toString() + attributes.data?.length}
      className={"filters" + (compact ? " pin-filters" : "")}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      {compact ? (
        <>
          <input type="hidden" name="q" value={params.get("q") || ""} />
          <nav className="category-tabs" aria-label="Loại địa điểm">
            {[{ slug: "", name: "Tất cả" }, ...(categories.data || [])].map(
              (category) => (
                <button
                  type="button"
                  key={category.slug}
                  aria-pressed={
                    (params.get("category") || "") === category.slug
                  }
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    if (category.slug) next.set("category", category.slug);
                    else next.delete("category");
                    next.delete("page");
                    next.delete("selected");
                    setParams(next);
                  }}
                >
                  {category.name}
                </button>
              ),
            )}
          </nav>
        </>
      ) : (
        <label className="search-field">
          <Search size={20} aria-hidden />
          <span className="sr-only">Tìm tên hoặc địa chỉ</span>
          <input
            name="q"
            placeholder="Tìm tên hoặc địa chỉ"
            maxLength={100}
            defaultValue={params.get("q") ?? ""}
          />
        </label>
      )}
      <details className="filter-drawer" open={compact ? undefined : true}>
        <summary>
          Bộ lọc
          {selected.length > 0 && (
            <span className="filter-number">{selected.length}</span>
          )}
        </summary>
        <div className="filter-drawer-content">
          <div className="filter-fields">
            {compact ? (
              <input
                type="hidden"
                name="category"
                value={params.get("category") || ""}
              />
            ) : (
              <label>
                Loại địa điểm
                <select
                  name="category"
                  defaultValue={params.get("category") ?? ""}
                >
                  <option value="">Tất cả</option>
                  {categories.data?.map((c) => (
                    <option value={c.slug} key={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Sắp xếp
              <select
                name="sort"
                defaultValue={params.get("sort") ?? "recent"}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  const val = e.currentTarget.value;
                  if (val && val !== "recent") next.set("sort", val);
                  else next.delete("sort");
                  next.delete("page");
                  next.delete("selected");
                  setParams(next);
                }}
              >
                <option value="recent">Mới đăng</option>
                <option value="name">Tên địa điểm</option>
              </select>
            </label>
          </div>
          {attributes.data && attributes.data.length > 0 && (
            <fieldset className="attribute-filters">
              <legend>Nhìn thấy trong ảnh</legend>
              <p className="muted small">
                Ảnh phải có tất cả đặc điểm đã chọn.
              </p>
              <div className="attribute-checkboxes">
                {attributes.data.map((a) => (
                  <label className="check-label" key={a.code}>
                    <input
                      type="checkbox"
                      name="attributes"
                      value={a.code}
                      checked={selected.includes(a.code)}
                      onChange={(e) => {
                        const code = a.code;
                        const isChecked = e.currentTarget.checked;
                        const next = new URLSearchParams(params);
                        let codes = [...selected];
                        if (isChecked) {
                          if (!codes.includes(code)) codes.push(code);
                        } else {
                          codes = codes.filter((c) => c !== code);
                        }
                        codes.sort();
                        if (codes.length)
                          next.set("attributes", codes.join(","));
                        else next.delete("attributes");
                        next.delete("page");
                        next.delete("selected");
                        setParams(next);
                      }}
                    />
                    <span className="check-text">
                      <AttributeIcon code={a.code} size={14} />
                      {a.display_name_vi}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {attributes.data?.length === 0 && (
            <p className="muted small">Chưa có bộ lọc đặc điểm trong ảnh.</p>
          )}
          <div className="filter-actions">
            <Button type="submit">Áp dụng</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const next = new URLSearchParams(params);
                for (const key of [
                  "q",
                  "category",
                  "attributes",
                  "sort",
                  "page",
                  "selected",
                ])
                  next.delete(key);
                setParams(next);
              }}
            >
              <X size={16} aria-hidden />
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      </details>
      {selected.length > 0 && (
        <div
          className="selected-attributes"
          role="group"
          aria-label="Bộ lọc đã áp dụng"
        >
          {selected.map((code) => {
            const label =
              attributes.data?.find((a) => a.code === code)?.display_name_vi ??
              code;
            return (
              <button
                type="button"
                className="attribute-chip matched"
                key={code}
                aria-label={"Bỏ lọc: " + label}
                onClick={() => {
                  const next = new URLSearchParams(params),
                    codes = selected.filter((c) => c !== code);
                  if (codes.length) next.set("attributes", codes.join(","));
                  else next.delete("attributes");
                  next.delete("page");
                  next.delete("selected");
                  setParams(next);
                }}
              >
                <AttributeIcon code={code} size={12} />
                <span>{label}</span>
                <X size={14} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
      {(categories.isError || attributes.isError) && (
        <div className="filter-warning" role="status">
          <span>Chưa tải được bộ lọc.</span>
          <button
            type="button"
            onClick={() => {
              if (categories.isError) void categories.refetch();
              if (attributes.isError) void attributes.refetch();
            }}
          >
            Thử lại
          </button>
        </div>
      )}
    </form>
  );
}
export function Pager({
  next,
  previous,
}: {
  next: string | null;
  previous: string | null;
}) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page") || 1));
  const move = (value: number) => {
    const n = new URLSearchParams(params);
    n.set("page", String(value));
    setParams(n);
    window.scrollTo(0, 0);
  };
  return (
    <div className="pager">
      <Button
        variant="outline"
        disabled={!previous}
        onClick={() => move(page - 1)}
      >
        Trang trước
      </Button>
      <span>Trang {page}</span>
      <Button variant="outline" disabled={!next} onClick={() => move(page + 1)}>
        Trang sau
      </Button>
    </div>
  );
}
export function AuthGate({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo: string;
}) {
  const me = useMe();
  if (me.isPending) return <State pending />;
  if (me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data)
    return (
      <section className="state">
        <h1>Cần đăng nhập</h1>
        <p>Đăng nhập để lưu địa điểm hoặc gửi ảnh.</p>
        <Button asChild>
          <Link to="/login" state={{ returnTo }}>
            Đăng nhập
          </Link>
        </Button>
      </section>
    );
  return children;
}
