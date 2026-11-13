import { MapPinIcon, NavigationIcon, SparklesIcon, StarIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { formatCount, formatDistance, formatRating } from "@/lib/format"
import { emitPlaceClick } from "@/lib/events"
import { isOpenNow } from "../lib/opening-hours"
import { categoryLabel } from "../lib/category-meta"
import { useCategoryImage } from "../lib/category-image"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import type { DailyPick, Place } from "../types/place"

/** "Vì sao gợi ý" do server tính — client chỉ hiển thị, không tự suy ra. */
type PickWhy = NonNullable<DailyPick["why"]>

/** Badge "Mới" chỉ tính trên ngày DUYỆT (publishedAt), không phải createdAt. */
const NEW_PLACE_DAYS = 14

function isRecentlyPublished(publishedAt: string | null): boolean {
  if (publishedAt === null) return false
  const time = Date.parse(publishedAt)
  if (Number.isNaN(time)) return false
  return Date.now() - time < NEW_PLACE_DAYS * 24 * 60 * 60 * 1000
}

interface PlaceCardProps {
  place: Place
  distanceKm?: number
  /**
   * Lý do gợi ý từ `GET /places/daily-picks` — chỉ dải "Gợi ý hôm nay" truyền;
   * vắng mặt (optional) thì chip "Vì sao gợi ý?" tự ẩn.
   */
  why?: PickWhy
}

export function PlaceCard({ place, distanceKm, why }: PlaceCardProps) {
  // `null` = không có dữ liệu giờ mở cửa → không hiện badge.
  const openState = isOpenNow(place.openingHours ?? null)
  const visibleTags = place.tags.slice(0, 3)
  const hiddenTagCount = place.tags.length - visibleTags.length
  // Ảnh minh hoạ theo nhóm loại hình; nhóm chưa có ảnh → undefined (placeholder SVG).
  const illustrationSrc = useCategoryImage(place.category, place.name)
  const isNew = isRecentlyPublished(place.publishedAt)

  return (
    <Card className="group relative gap-0 p-0 shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-raised)">
      {/* Chiều cao ảnh do server trả về (`imageHeight`) → lưới mobile có nhịp masonry. */}
      <CoverImage
        src={place.imageUrl}
        illustrationSrc={illustrationSrc}
        placeholder={place.category}
        height={place.imageHeight}
        alt={placeImageAlt(place)}
        // Card rộng tối đa ~370 CSS px (3 cột × max-w-6xl) → DPR2 = 740: chọn
        // 400w mobile (2 cột), 800w desktop; ảnh gốc chỉ cho hero.
        sizes="(min-width: 768px) 33vw, 50vw"
        className="w-full shrink-0 rounded-t-xl"
      >
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge
            variant="secondary"
            className="h-6 border-border bg-secondary px-2 text-xs text-secondary-foreground"
          >
            {categoryLabel(place.category)}
          </Badge>
          {isNew ? (
            <Badge className="h-6 border-transparent bg-primary px-2 text-xs text-primary-foreground">
              Mới
            </Badge>
          ) : null}
          {place.district ? (
            <Badge
              variant="outline"
              className="h-6 border-border/80 bg-background/80 px-2 text-xs font-medium backdrop-blur"
            >
              {place.district}
            </Badge>
          ) : null}
        </div>

        {place.reviewCount > 0 ? (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-bold">
            <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
            {formatRating(place.rating)}
          </span>
        ) : null}

        {openState !== null ? (
          <Badge
            variant="outline"
            className={
              openState
                ? "absolute top-2 right-2 h-6 border-transparent bg-emerald-600 px-2 text-xs text-white"
                : "absolute top-2 right-2 h-6 border-border/80 bg-background/80 px-2 text-xs font-medium text-muted-foreground backdrop-blur"
            }
          >
            {openState ? "Đang mở cửa" : "Đã đóng cửa"}
          </Badge>
        ) : null}
      </CoverImage>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base leading-tight font-bold">
          <Link
            to={`/discover/${place.id}`}
            onClick={() => emitPlaceClick(place.id)}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {place.name}
          </Link>
        </h3>

        {visibleTags.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label="Thẻ gợi ý">
            {visibleTags.map((tag) => (
              <li key={tag}>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[11px] font-normal text-muted-foreground"
                >
                  #{tag}
                </Badge>
              </li>
            ))}
            {hiddenTagCount > 0 ? (
              <li
                aria-label={`${hiddenTagCount} thẻ khác`}
                className="flex h-5 items-center px-1 text-[11px] text-muted-foreground"
              >
                +{hiddenTagCount}
              </li>
            ) : null}
          </ul>
        ) : null}

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{place.address}</span>
        </p>

        {why ? (
          <div className="flex flex-wrap items-center gap-1" aria-label="Vì sao gợi ý">
            <Badge
              variant="secondary"
              className="h-5 gap-1 px-1.5 text-[11px] font-medium text-secondary-foreground"
            >
              <SparklesIcon className="size-3" aria-hidden="true" />
              {/* matchPercent là điểm chất lượng tuyệt đối (score/maxScore), không
                  phải % khớp sở thích — nhãn phải nói đúng nghĩa. */}
              Điểm gợi ý {why.matchPercent}/100
            </Badge>
            {why.district ? (
              <span className="text-[11px] text-muted-foreground">{why.district}</span>
            ) : null}
            {why.openNow !== null ? (
              <span className="text-[11px] text-muted-foreground">
                · {why.openNow ? "Đang mở" : "Đóng"}
              </span>
            ) : null}
            {why.signals.slice(0, 3).map((signal) => (
              <Badge
                key={signal}
                variant="outline"
                className="h-5 px-1.5 text-[11px] font-normal text-muted-foreground"
              >
                {signal}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {/* 0 đánh giá: không render gì (tránh nhãn "Chưa có đánh giá" lặp trên mọi card). */}
            {place.reviewCount > 0 ? <span>{formatCount(place.reviewCount)} đánh giá</span> : null}
            {distanceKm !== undefined ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                <NavigationIcon className="size-3" />
                {formatDistance(distanceKm)}
              </span>
            ) : null}
          </div>
          <span aria-label={priceLevelAriaLabel(place.priceLevel)} className="font-bold">
            {priceLevelLabel(place.priceLevel)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
