import { useDailyPicks } from "../hooks/use-daily-picks"
import { PlaceCard } from "./place-card"
import { PlaceCardSkeleton } from "./place-card-skeleton"

/** Nhãn ngày kiểu Việt Nam từ `YYYY-MM-DD`: `Thứ Tư, 12/11`. */
// `Intl.DateTimeFormat` tạo 1 lần ở module scope — không dựng lại mỗi render.
const PICK_DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
})

function formatPickDate(date: string): string {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) return ""
  return PICK_DATE_FORMAT.format(time)
}

/**
 * Dải "Gợi ý hôm nay" trên /discover — 3 quán server chọn mỗi ngày.
 *
 * Tính năng "thêm": rỗng hoặc lỗi thì thu gọn im lặng (kể cả heading) để không
 * làm hỏng trang chính; bộ lọc của lưới bên dưới không tác động dải này.
 */
export function DailyPicksSection() {
  const { data, isPending, isError } = useDailyPicks()

  if (isError) return null
  if (isPending) {
    return (
      <section aria-busy="true" className="mt-6">
        <h2 className="font-heading text-lg font-bold">Gợi ý hôm nay</h2>
        <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={200} />
            </li>
          ))}
        </ul>
      </section>
    )
  }
  if (!data || data.items.length === 0) return null

  const dateLabel = formatPickDate(data.date)

  return (
    <section aria-labelledby="daily-picks-heading" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="daily-picks-heading" className="font-heading text-lg font-bold">
          Gợi ý hôm nay
          {dateLabel ? <span className="text-muted-foreground"> · {dateLabel}</span> : null}
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Chọn độc lập với bộ lọc
        </span>
      </div>

      {/* Mobile: hàng ngang cuộn được — không đẩy lưới kết quả xuống quá xa.
          Desktop: lưới 3 cột khớp nhịp lưới bên dưới. */}
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {data.items.map(({ place, reason, why }) => (
          <li key={place.id} className="w-3/4 shrink-0 snap-start sm:w-auto">
            {/* Đo hiệu quả gợi ý (tim-nguoi.md §chỉ số) cần hạ tầng analytics
                thật — ghi BACKLOG, không dùng console.log chạy prod. */}
            <PlaceCard place={place} why={why} />
            <p className="mt-1 px-1 text-xs text-muted-foreground">{reason}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
