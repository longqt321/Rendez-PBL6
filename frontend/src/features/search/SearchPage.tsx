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
import { PlaceCard, PlaceRow } from "../places/PlaceCard";

/**
 * Search.
 *
 * Intent-driven discovery. The URL is the single source of truth: every filter
 * lives in the query string, so results survive reloads, back/forward and
 * sharing. Typing is debounced into the URL rather than kept in local state,
 * which keeps the two in sync by construction.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => paramsToFilters(params), [params]);
  const me = useMe();
  const userId = me.data?.id;

  const [draft, setDraft] = useState(filters.q);
  const [syncedQuery, setSyncedQuery] = useState(filters.q);

  // Keep the input in step when the URL changes from outside (chip removal,
  // back navigation, a link from the homepage). Adjusting state during render
  // is React's documented pattern for "derive state from props" and avoids the
  // extra render pass an effect would cost.
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
    // Any filter change invalidates the current page number.
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

  // Debounce typing so a keystroke does not fire a request per character.
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
    <div className="search-page">
      <header className="search-head">
        <h1 className="search-head__title">Tìm địa điểm</h1>
        <p className="lede">
          Tìm theo tên, địa chỉ hoặc lọc theo loại không gian và những gì có
          trong ảnh.
        </p>
      </header>

      <form
        className="search-bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <label className="sr-only" htmlFor="search-q">
          Tìm tên hoặc địa chỉ
        </label>
        <Search size={19} aria-hidden />
        <Input
          id="search-q"
          name="q"
          type="search"
          value={draft}
          maxLength={100}
          placeholder="Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng..."
          onChange={(event) => setDraft(event.currentTarget.value)}
          autoComplete="off"
        />
        {draft && (
          <button
            type="button"
            className="search-bar__clear"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={() => {
              setDraft("");
              update({ q: "" });
            }}
          >
            <X size={16} aria-hidden />
          </button>
        )}
        <Button type="submit">Tìm</Button>
      </form>

      <div className="search-layout">
        <aside className="search-filters" aria-label="Bộ lọc">
          <div className="search-filters__group">
            <h2 className="search-filters__title">
              <SlidersHorizontal size={15} aria-hidden />
              Loại địa điểm
            </h2>
            <div className="search-filters__options">
              <button
                type="button"
                className="chip"
                aria-pressed={!filters.category}
                onClick={() => update({ category: "" })}
              >
                Tất cả
              </button>
              {categories.data?.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  className="chip"
                  aria-pressed={filters.category === category.slug}
                  onClick={() => update({ category: category.slug })}
                >
                  {category.name}
                </button>
              ))}
            </div>
            {categories.isError && (
              <p className="field__hint">
                Chưa tải được danh mục.{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void categories.refetch()}
                >
                  Thử lại
                </button>
              </p>
            )}
          </div>

          <div className="search-filters__group">
            <h2 className="search-filters__title">Nhìn thấy trong ảnh</h2>
            <p className="field__hint">
              Ảnh phải có tất cả đặc điểm được chọn.
            </p>
            <div className="search-filters__checks">
              {attributes.data?.map((attribute) => (
                <label className="check" key={attribute.code}>
                  <input
                    type="checkbox"
                    checked={filters.attributes.includes(attribute.code)}
                    onChange={() => toggleAttribute(attribute.code)}
                  />
                  <span className="check__text">
                    {attribute.display_name_vi}
                  </span>
                </label>
              ))}
            </div>
            {attributes.isError && (
              <p className="field__hint">
                Chưa tải được bộ lọc đặc điểm.{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void attributes.refetch()}
                >
                  Thử lại
                </button>
              </p>
            )}
          </div>

          <div className="search-filters__group">
            <label className="field">
              <span className="field__label">Sắp xếp</span>
              <Select
                value={filters.sort}
                onChange={(event) =>
                  update({ sort: event.currentTarget.value })
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft("");
                setParams(new URLSearchParams());
              }}
            >
              <X size={15} aria-hidden />
              Xóa tất cả bộ lọc
            </Button>
          )}
        </aside>

        <section className="search-results" aria-label="Kết quả tìm kiếm">
          {active && (
            <div
              className="active-filters"
              role="group"
              aria-label="Bộ lọc đã áp dụng"
            >
              {filters.q && (
                <button
                  type="button"
                  className="chip chip--active"
                  aria-label={"Bỏ lọc: " + filters.q}
                  onClick={() => update({ q: "" })}
                >
                  “{filters.q}”
                  <X size={13} aria-hidden />
                </button>
              )}
              {filters.category && (
                <button
                  type="button"
                  className="chip chip--active"
                  aria-label={"Bỏ lọc: " + filters.category}
                  onClick={() => update({ category: "" })}
                >
                  {categories.data?.find((c) => c.slug === filters.category)
                    ?.name ?? filters.category}
                  <X size={13} aria-hidden />
                </button>
              )}
              {filters.attributes.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="chip chip--active"
                  aria-label={"Bỏ lọc: " + code}
                  onClick={() => toggleAttribute(code)}
                >
                  {attributes.data?.find((a) => a.code === code)
                    ?.display_name_vi ?? code}
                  <X size={13} aria-hidden />
                </button>
              ))}
            </div>
          )}

          {places.data && (
            <p className="search-count" role="status">
              {places.data.count}{" "}
              {places.data.count === 1 ? "địa điểm" : "địa điểm"}
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
              body={
                filters.attributes.length > 0
                  ? "Thử bỏ bớt đặc điểm trong ảnh — mỗi đặc điểm thêm vào đều thu hẹp kết quả."
                  : "Thử từ khóa ngắn hơn, hoặc bỏ một vài bộ lọc."
              }
              icon={<Search size={24} aria-hidden />}
              actions={
                active && (
                  <Button
                    variant="outline"
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
              <div className="card-grid card-grid--wide">
                {results.map((place, index) => (
                  <PlaceCard key={place.id} place={place} eager={index < 4} />
                ))}
              </div>
              <div className="search-map-link">
                <Button asChild variant="outline">
                  <Link to={"/map?" + query}>
                    <MapPin size={16} aria-hidden />
                    Xem {places.data?.count} địa điểm trên bản đồ
                  </Link>
                </Button>
              </div>

              {(places.data?.next || places.data?.previous) && (
                <nav className="pagination" aria-label="Phân trang kết quả">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!places.data?.previous || places.isFetching}
                    onClick={() => goToPage(page - 1)}
                  >
                    Trang trước
                  </Button>
                  <span className="pagination__status tabular" role="status">
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

/** Compact list rendering, kept for the map sidebar and future reuse. */
export function SearchResultList({
  places,
}: {
  places: Parameters<typeof PlaceRow>[0]["place"][];
}) {
  return (
    <ul className="result-list" role="list">
      {places.map((place) => (
        <li key={place.id}>
          <PlaceRow place={place} />
        </li>
      ))}
    </ul>
  );
}
