import { SparklesIcon } from "lucide-react"
import { useRecommendedPlaces } from "../hooks/use-recommended-places"
import { PlaceCard } from "./place-card"
import { PlaceCardSkeleton } from "./place-card-skeleton"

const RECOMMENDED_LIMIT = 6

export function RecommendedSection() {
  const { data, isPending, isError } = useRecommendedPlaces(RECOMMENDED_LIMIT)

  if (isError) return null
  if (isPending) {
    return (
      <section aria-busy="true" className="mt-6">
        <h2 className="font-heading text-lg font-bold">Gợi ý cho bạn</h2>
        <ul className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: RECOMMENDED_LIMIT }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={200} />
            </li>
          ))}
        </ul>
      </section>
    )
  }
  if (!data || data.length === 0) return null

  return (
    <section aria-labelledby="recommended-heading" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="recommended-heading"
          className="flex items-center gap-1.5 font-heading text-lg font-bold"
        >
          <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
          Gợi ý cho bạn
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Dựa trên lịch sử tương tác
        </span>
      </div>

      {/* Mobile: hàng ngang cuộn được như dải "Gợi ý hôm nay"; desktop: lưới 3 cột. */}
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {data.map((place) => (
          <li key={place.id} className="w-3/4 shrink-0 snap-start sm:w-auto">
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
    </section>
  )
}
