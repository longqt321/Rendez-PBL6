import { useMemo, useState } from "react"
import { CompassIcon, ListFilterIcon, SearchXIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { CATEGORY_META } from "../lib/category-meta"
import { useDiscoverPlaces } from "../hooks/use-discover-places"
import type { PlaceCategory } from "../types/place"
import { PlaceCard } from "../components/place-card"
import { PlaceCardSkeleton } from "../components/place-card-skeleton"

const CATEGORY_TABS: { value: PlaceCategory | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(Object.keys(CATEGORY_META) as PlaceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_META[key].label,
  })),
]

/** Chiều cao ảnh cho skeleton — chỉ là hình thức chờ, không phải dữ liệu. */
const SKELETON_HEIGHTS = [320, 400, 280, 360, 440, 300, 380, 340, 420]

export function DiscoverPage() {
  const [category, setCategory] = useState<PlaceCategory | "all">("all")
  const [query, setQuery] = useState("")

  const filters = useMemo(() => ({ category, query }), [category, query])
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useDiscoverPlaces(filters)

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  })

  const places = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
          <CompassIcon className="size-6" aria-hidden="true" />
          Khám phá
        </h1>
        <p className="text-sm text-muted-foreground">
          Địa điểm đã được kiểm duyệt và đưa lên bản đồ. Cuộn để tải thêm.
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3">
        {/* Đây là bộ lọc trong trang, không phải ô tìm kiếm toàn cục ở topbar —
            dùng icon + nhãn riêng để không bị nhầm thành thanh search thứ hai. */}
        <div className="max-w-md">
          <label
            htmlFor="discover-filter"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            Lọc địa điểm
          </label>
          <InputGroup>
            <InputGroupAddon>
              <ListFilterIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="discover-filter"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên quán, món, khu vực…"
              aria-label="Lọc địa điểm"
            />
          </InputGroup>
        </div>

        <div
          role="group"
          aria-label="Lọc theo loại hình"
          className="flex flex-wrap items-center gap-1.5"
        >
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={category === tab.value ? "default" : "outline"}
              aria-pressed={category === tab.value}
              onClick={() => setCategory(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{places.length} địa điểm</Badge>
        {isFetchingNextPage ? (
          <span className="flex items-center gap-1">
            <Spinner className="size-3" />
            Đang tải thêm…
          </span>
        ) : null}
      </div>

      {isPending ? (
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={SKELETON_HEIGHTS[index % SKELETON_HEIGHTS.length]} />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <Empty className="mt-10 border-2 border-dashed border-foreground/30">
          <EmptyHeader>
            <EmptyTitle>Không tải được danh sách địa điểm</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : places.length === 0 ? (
        <Empty className="mt-10 border-2 border-dashed border-foreground/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy địa điểm phù hợp</EmptyTitle>
            <EmptyDescription>Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác.</EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCategory("all")
              setQuery("")
            }}
          >
            Xoá bộ lọc
          </Button>
        </Empty>
      ) : (
        <>
          {/* PC: 3 cột đều. Mobile: 2 cột masonry, mỗi thẻ có chiều cao ảnh riêng. */}
          <ul className="mt-5 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
            {places.map((place) => (
              <li key={place.id} className="lg:h-full">
                <PlaceCard place={place} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

          <div className="mt-6 flex justify-center">
            {hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? <Spinner /> : null}
                {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Đã hết địa điểm.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
