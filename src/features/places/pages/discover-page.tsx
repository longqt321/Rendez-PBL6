import { useMemo, useState } from "react"
import { ListFilterIcon, SearchXIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  const activeFilterCount = (category === "all" ? 0 : 1) + (query.trim() ? 1 : 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            <ListFilterIcon />
            Lọc
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="ml-0.5">
                {activeFilterCount}
              </Badge>
            ) : null}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="discover-filter"
                className="text-xs font-semibold text-muted-foreground"
              >
                Từ khoá
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
                  aria-label="Lọc theo từ khoá"
                />
              </InputGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Loại hình</span>
              <div
                role="group"
                aria-label="Lọc theo loại hình"
                className="flex flex-wrap items-center gap-1.5"
              >
                {CATEGORY_TABS.map((tab) => (
                  <Button
                    key={tab.value}
                    size="xs"
                    variant={category === tab.value ? "default" : "outline"}
                    aria-pressed={category === tab.value}
                    onClick={() => setCategory(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  setCategory("all")
                  setQuery("")
                }}
              >
                <XIcon />
                Xoá bộ lọc
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>

        <Badge variant="outline">{places.length} địa điểm</Badge>
        {isFetchingNextPage ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Không tải được danh sách địa điểm</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : places.length === 0 ? (
        <Empty className="mt-10 border border-dashed border-border">
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
