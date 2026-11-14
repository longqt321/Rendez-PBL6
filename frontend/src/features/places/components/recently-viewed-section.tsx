import { HistoryIcon } from "lucide-react"
import { useRecentlyViewed } from "../hooks/use-recently-viewed"
import { PlaceCard } from "./place-card"

/**
 * Dải "Bạn vừa xem" trên /discover — đọc lịch sử xem cục bộ (localStorage).
 *
 * Chưa xem gì / lỗi / rỗng thì thu gọn hoàn toàn (kể cả heading) để không làm
 * trang chính bị trống. Không phụ thuộc bộ lọc của lưới bên dưới.
 */
export function RecentlyViewedSection() {
  const { data, isPending, isError } = useRecentlyViewed()

  if (isError) return null
  if (isPending) return null
  if (!data || data.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="recently-viewed-heading"
          className="flex items-center gap-2 font-heading text-lg font-bold"
        >
          <HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Bạn vừa xem
        </h2>
      </div>
      <ul className="mt-3 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
        {data.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
    </section>
  )
}
