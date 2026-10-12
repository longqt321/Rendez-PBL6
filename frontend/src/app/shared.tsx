import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Bookmark, ImageOff, Search, X, WifiOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  api,
  ApiError,
  discoveryQuery,
  type Category,
  type Profile,
} from "../lib/api/client";
import type { Attribute, VisualPlace } from "../lib/api/visual";
import { Button } from "../components/ui/button";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<Profile>("auth/me/");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
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
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton" key={i} />
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
            : "Không thể tải trang"}
        </h2>
        <p className="state-description">
          {error instanceof ApiError && error.status === 404
            ? "Nội dung này đã bị xóa hoặc đường dẫn không đúng."
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
        {onRetry && <Button onClick={onRetry}>Thử lại</Button>}
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <ImageOff size={36} aria-hidden />
        <h2>{empty}</h2>
        <Link to="/discover">Về Khám phá</Link>
      </div>
    );
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
  return (
    <div role="alert" className="error">
      <p>
        {error instanceof ApiError
          ? error.message
          : "Không tải được nội dung. Thử lại."}
      </p>
      {error instanceof ApiError &&
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
  place: { cover_image_url: string | null; name: string };
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return place.cover_image_url && failedUrl !== place.cover_image_url ? (
    <img
      className={className}
      src={place.cover_image_url}
      alt={place.name}
      loading="lazy"
      onError={() => setFailedUrl(place.cover_image_url)}
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
      await cache.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "me",
      });
    },
  });
  return (
    <div className={"save-control" + (compact ? " compact" : "")}>
      <Button
        variant="outline"
        aria-label={(place.is_saved ? "Bỏ lưu " : "Lưu ") + place.name}
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
        {!compact && (place.is_saved ? "Đã lưu" : "Lưu quán")}
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
      <Search size={21} aria-hidden />
      <label className="sr-only" htmlFor="global-query">
        Tìm tên hoặc địa chỉ
      </label>
      <input
        id="global-query"
        name="q"
        type="search"
        placeholder="Tìm quán hoặc địa chỉ"
        defaultValue={params.get("q") || ""}
        maxLength={100}
      />
      <button type="submit" aria-label="Tìm kiếm">
        Tìm
      </button>
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
          <nav className="category-tabs" aria-label="Loại quán">
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
            placeholder="Tìm tên quán hoặc địa chỉ"
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
                Loại quán
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
              <select name="sort" defaultValue={params.get("sort") ?? "recent"}>
                <option value="recent">Mới đăng</option>
                <option value="name">Tên quán</option>
              </select>
            </label>
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
          {attributes.data && attributes.data.length > 0 && (
            <details className="attribute-filter-panel">
              <summary>
                Lọc đặc điểm trong ảnh{" "}
                {selected.length > 0 && (
                  <span className="filter-number">{selected.length}</span>
                )}
              </summary>
              <fieldset className="attribute-filters">
                <legend>Chọn đặc điểm</legend>
                <p className="muted small">
                  Ảnh phải có tất cả đặc điểm bạn chọn.
                </p>
                {attributes.data.map((a) => (
                  <label className="check-label" key={a.code}>
                    <input
                      type="checkbox"
                      name="attributes"
                      value={a.code}
                      defaultChecked={selected.includes(a.code)}
                    />
                    <span>
                      {a.display_name_vi}
                      <small>{a.description}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            </details>
          )}
          {attributes.data?.length === 0 && (
            <p className="muted small">Chưa có bộ lọc đặc điểm trong ảnh.</p>
          )}
        </div>
      </details>
      {selected.length > 0 && (
        <div className="attribute-chips" aria-label="Bộ lọc đã áp dụng">
          {selected.map((code) => (
            <button
              type="button"
              className="attribute-chip matched"
              key={code}
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
              {" "}
              {attributes.data?.find((a) => a.code === code)?.display_name_vi ??
                code}{" "}
              <X size={14} aria-label="Gỡ bộ lọc" />
            </button>
          ))}
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
        <p>Đăng nhập để lưu quán hoặc gửi ảnh.</p>
        <Button asChild>
          <Link to="/login" state={{ returnTo }}>
            Đăng nhập
          </Link>
        </Button>
      </section>
    );
  return children;
}
