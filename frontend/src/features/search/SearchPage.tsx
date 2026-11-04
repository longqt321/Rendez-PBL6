import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import {
  filtersToParams,
  hasActiveFilters,
  paramsToFilters,
  SORT_OPTIONS,
  type DiscoveryFilters,
} from "../../lib/api/types";
import { useAttributes, useCategories, usePlaces } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Input, Select } from "../../components/ui/primitives";
import { PlaceCard } from "../places/PlaceCard";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => paramsToFilters(params), [params]);
  const me = useMe();
  const userId = me.data?.id;

  const [draft, setDraft] = useState(filters.q);
  const [syncedQuery, setSyncedQuery] = useState(filters.q);

  if (filters.q !== syncedQuery) {
    setSyncedQuery(filters.q);
    setDraft(filters.q);
  }

  const query = filtersToParams(filters).toString();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const places = usePlaces(
    query + (page > 1 ? (query ? "&" : "") + "page=" + page : ""),
    userId,
  );
  const categories = useCategories();
  const attributes = useAttributes();

  const update = (next: Partial<DiscoveryFilters>) => {
    const merged = { ...filters, ...next };
    const search = filtersToParams(merged);
    search.delete("page");
    setParams(search);
  };

  const goToPage = (target: number) => {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (draft === current) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set("q", draft.trim());
      else next.delete("q");
      next.delete("page");
      setParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, params, setParams]);

  const toggleAttribute = (code: string) => {
    const next = filters.attributes.includes(code)
      ? filters.attributes.filter((item) => item !== code)
      : [...filters.attributes, code];
    update({ attributes: next });
  };

  const results = places.data?.results ?? [];
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">Tìm địa điểm</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Tìm theo tên, địa chỉ hoặc lọc theo loại không gian và đặc điểm trong ảnh.
        </p>
      </header>

      <form
        className="flex items-center gap-2 p-1.5 pl-4 rounded-full border border-[var(--line)] bg-[var(--surface-card)] shadow-xs focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <label className="sr-only" htmlFor="search-q">
          Tìm tên hoặc địa chỉ
        </label>
        <Search size={18} className="text-[var(--ink-faint)] shrink-0" aria-hidden />
        <Input
          id="search-q"
          name="q"
          type="search"
          value={draft}
          maxLength={100}
          placeholder="Tìm kiếm địa điểm, quán cà phê tại Đà Nẵng..."
          onChange={(event) => setDraft(event.currentTarget.value)}
          autoComplete="off"
          className="border-0 bg-transparent focus:ring-0 p-0 h-9"
        />
        {draft && (
          <button
            type="button"
            className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={() => {
              setDraft("");
              update({ q: "" });
            }}
          >
            <X size={16} aria-hidden />
          </button>
        )}
        <Button type="submit" size="sm">Tìm</Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <aside className="md:col-span-1 p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] flex flex-col gap-5 sticky top-20 text-sm">
          <div className="flex flex-col gap-2">
            <h2 className="group-label flex items-center gap-1.5">
              <SlidersHorizontal size={13} aria-hidden />
              Loại địa điểm
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`chip cursor-pointer text-xs px-2.5 py-1 rounded-full border transition-colors ${!filters.category ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "bg-[var(--surface-muted)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)]"}`}
                aria-pressed={!filters.category}
                onClick={() => update({ category: "" })}
              >
                Tất cả
              </button>
              {categories.data?.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  className={`chip cursor-pointer text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.category === category.slug ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "bg-[var(--surface-muted)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)]"}`}
                  aria-pressed={filters.category === category.slug}
                  onClick={() => update({ category: category.slug })}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="group-label">Nhìn thấy trong ảnh</h2>
            <div className="flex flex-col gap-1.5">
              {attributes.data?.map((attribute) => (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--ink-soft)]" key={attribute.code}>
                  <input
                    type="checkbox"
                    className="rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]"
                    checked={filters.attributes.includes(attribute.code)}
                    onChange={() => toggleAttribute(attribute.code)}
                  />
                  <span>{attribute.display_name_vi}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="group-label">Sắp xếp</span>
            <Select
              value={filters.sort}
              onChange={(event) => update({ sort: event.currentTarget.value })}
              className="h-8 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft("");
                setParams(new URLSearchParams());
              }}
              className="mt-2 text-xs"
            >
              <X size={14} aria-hidden />
              Xóa tất cả bộ lọc
            </Button>
          )}
        </aside>

        <section className="md:col-span-3 flex flex-col gap-5 min-w-0" aria-label="Kết quả tìm kiếm">
          {places.data && (
            <p className="text-xs text-[var(--ink-soft)] font-medium" role="status">
              Tìm thấy {places.data.count} địa điểm
              {filters.q ? ` cho “${filters.q}”` : ""}
            </p>
          )}

          <AsyncState
            pending={places.isPending}
            error={places.data ? null : places.error}
            onRetry={() => void places.refetch()}
            loadingVariant="grid"
          />

          {places.data && results.length === 0 && (
            <EmptyState
              title={
                filters.q
                  ? `Không tìm thấy địa điểm cho “${filters.q}”`
                  : "Không có địa điểm khớp bộ lọc"
              }
              body="Thử từ khóa ngắn hơn, hoặc bỏ một vài bộ lọc."
              icon={<Search size={24} aria-hidden />}
              actions={
                active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft("");
                      setParams(new URLSearchParams());
                    }}
                  >
                    Xóa tất cả bộ lọc
                  </Button>
                )
              }
            />
          )}

          {results.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((place, index) => (
                  <PlaceCard key={place.id} place={place} eager={index < 4} />
                ))}
              </div>

              <div className="flex justify-center mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link to={"/map?" + query}>
                    <MapPin size={15} aria-hidden />
                    Xem {places.data?.count} địa điểm trên bản đồ
                  </Link>
                </Button>
              </div>

              {(places.data?.next || places.data?.previous) && (
                <nav className="flex items-center justify-center gap-3 mt-6 text-xs text-[var(--ink-soft)]" aria-label="Phân trang kết quả">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!places.data?.previous || places.isFetching}
                    onClick={() => goToPage(page - 1)}
                  >
                    Trang trước
                  </Button>
                  <span className="font-semibold text-[var(--ink)]" role="status">
                    Trang {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!places.data?.next || places.isFetching}
                    onClick={() => goToPage(page + 1)}
                  >
                    Trang sau
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
