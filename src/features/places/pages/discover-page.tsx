import { useMemo, useState } from "react"
import { CompassIcon, Loader2Icon, SearchXIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

/** Chiều cao ảnh lệch nhau để lưới mobile có nhịp điệu masonry. */
const HEIGHT_PATTERN = [320, 400, 280, 360, 440, 300, 380, 340, 420]

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
        <div className="relative max-w-md">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lọc theo tên quán, món, khu vực…"
            aria-label="Lọc địa điểm"
          />
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
            <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />
            Đang tải thêm…
          </span>
        ) : null}
      </div>

      {isPending ? (
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={HEIGHT_PATTERN[index % HEIGHT_PATTERN.length]} />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Không tải được danh sách địa điểm.</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      ) : places.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <SearchXIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Không tìm thấy địa điểm phù hợp</p>
          <p className="text-xs text-muted-foreground">Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => {
              setCategory("all")
              setQuery("")
            }}
          >
            Xoá bộ lọc
          </Button>
        </div>
      ) : (
        <>
          {/* PC: 3 cột đều. Mobile: 2 cột masonry, mỗi thẻ có chiều cao ảnh riêng. */}
          <ul className="mt-5 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
            {places.map((place, index) => (
              <li key={place.id} className="lg:h-full">
                <PlaceCard
                  place={place}
                  imageHeight={HEIGHT_PATTERN[index % HEIGHT_PATTERN.length]}
                />
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
                {isFetchingNextPage ? <Loader2Icon className="animate-spin" /> : null}
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
