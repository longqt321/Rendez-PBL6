import { isAfter, isValid, parseISO, subDays } from "date-fns"
import { MapPinIcon, NavigationIcon, SparklesIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { formatCount, formatDistance } from "@/lib/format"
import { emitPlaceClick } from "@/lib/events"
import { cn } from "@/lib/utils"
import { isOpenNow } from "../lib/opening-hours"
import { categoryLabel } from "../lib/category-meta"
import { formatPlaceTrustLabel } from "../lib/review-tier-meta"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import type { DailyPickWhy, Place } from "../types/place"

const NEW_PLACE_DAYS = 14

function isRecentlyPublished(publishedAt: string | null): boolean {
  if (publishedAt === null) return false
  const date = parseISO(publishedAt)
  if (!isValid(date)) return false
  return isAfter(date, subDays(new Date(), NEW_PLACE_DAYS))
}

interface PlaceCardProps {
  readonly place: Place
  readonly distanceKm?: number
  readonly why?: DailyPickWhy
  readonly variant?: "default" | "horizontal" | "featured"
  readonly rankBadge?: string
  readonly subtitleNote?: string
}

interface PlaceCardBadgesProps {
  readonly place: Place
  readonly isNew: boolean
  readonly openState: boolean | null
  readonly rankBadge?: string
}

function PlaceCardBadges({ place, isNew, openState, rankBadge }: PlaceCardBadgesProps) {
  return (
    <>
      {/* Lớp phủ mờ nhẹ chân ảnh giúp điểm đánh giá luôn sắc nét */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/45 to-transparent"
      />

      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
        {rankBadge ? (
          <span className="grid h-7 min-w-7 place-items-center rounded-control bg-primary px-2 font-display text-sm font-bold text-primary-foreground shadow-sm">
            {rankBadge}
          </span>
        ) : null}
        <Badge
          variant="secondary"
          className="h-6 border-border/70 bg-background/90 px-2 text-xs font-medium text-foreground backdrop-blur-sm"
        >
          {categoryLabel(place.category)}
        </Badge>
        {isNew ? (
          <Badge className="h-6 border-transparent bg-primary px-2 text-xs text-primary-foreground">
            Mới
          </Badge>
        ) : null}
      </div>

      {openState !== null ? (
        <Badge
          variant="outline"
          className={
            openState
              ? "absolute top-2.5 right-2.5 h-6 gap-1.5 border-transparent bg-open px-2 text-xs font-medium text-open-foreground shadow-xs"
              : "absolute top-2.5 right-2.5 h-6 border-border/70 bg-background/85 px-2 text-xs font-medium text-muted-foreground backdrop-blur-sm"
          }
        >
          {openState ? (
            <span className="size-1.5 rounded-full bg-open-foreground" aria-hidden="true" />
          ) : null}
          {openState ? "Đang mở" : "Đã đóng"}
        </Badge>
      ) : null}

      <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-center justify-between gap-2">
        {place.district ? (
          <Badge
            variant="outline"
            className="h-6 border-border/50 bg-background/85 px-2 text-xs font-medium text-foreground backdrop-blur-sm"
          >
            {place.district}
          </Badge>
        ) : (
          <span />
        )}

        {place.reviewCount > 0 ? (
          <span className="flex items-center gap-1 rounded-control border border-border/50 bg-background/92 px-2 py-0.5 text-xs font-bold text-foreground tabular-nums shadow-xs backdrop-blur-sm">
            {formatPlaceTrustLabel(place.mustTryCount, place.reviewCount)}
          </span>
        ) : null}
      </div>
    </>
  )
}

function PlaceCardTags({ tags }: Readonly<{ tags: string[] }>) {
  const visibleTags = tags.slice(0, 3)
  const hiddenTagCount = tags.length - visibleTags.length
  if (visibleTags.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1" aria-label="Thẻ gợi ý">
      {visibleTags.map((tag) => (
        <li key={tag}>
          <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal text-muted-foreground">
            #{tag}
          </Badge>
        </li>
      ))}
      {hiddenTagCount > 0 ? (
        <li
          aria-label={`${hiddenTagCount} thẻ khác`}
          className="flex h-5 items-center px-1 text-xs text-muted-foreground"
        >
          +{hiddenTagCount}
        </li>
      ) : null}
    </ul>
  )
}

function PlaceCardWhyBlock({ why }: Readonly<{ why: DailyPickWhy }>) {
  const signals = why.signals.slice(0, 3)
  if (signals.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Vì sao gợi ý">
      {signals.map((signal, index) => (
        <Badge
          key={signal}
          variant={index === 0 ? "secondary" : "outline"}
          className={
            index === 0
              ? "h-5 gap-1 px-1.5 text-xs font-medium text-secondary-foreground"
              : "h-5 px-1.5 text-xs font-normal text-muted-foreground"
          }
        >
          {index === 0 ? <SparklesIcon className="size-3 text-primary" aria-hidden="true" /> : null}
          {signal}
        </Badge>
      ))}
    </div>
  )
}

export function PlaceCard({
  place,
  distanceKm,
  why,
  variant = "default",
  rankBadge,
  subtitleNote,
}: PlaceCardProps) {
  const openState = isOpenNow(place.openingHours ?? null)
  const isNew = isRecentlyPublished(place.publishedAt)

  if (variant === "horizontal") {
    return (
      <Card className="group relative flex-row items-stretch gap-0 overflow-hidden border-border/80 p-0 shadow-(--shadow-soft) transition-all duration-300 hover:-translate-y-0.5 hover:shadow-(--shadow-raised)">
        <CoverImage
          src={place.imageUrl}
          placeholder={place.category}
          name={place.name}
          alt={placeImageAlt(place)}
          sizes="(min-width: 768px) 220px, 140px"
          className="w-32 shrink-0 sm:w-40"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        >
          {rankBadge ? (
            <span className="absolute top-2 left-2 grid h-6 min-w-6 place-items-center rounded-control bg-primary px-1.5 font-display text-xs font-bold text-primary-foreground shadow-sm">
              {rankBadge}
            </span>
          ) : null}
        </CoverImage>

        <CardContent className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate font-medium text-primary">
              {categoryLabel(place.category)}
              {place.district ? ` · ${place.district}` : ""}
            </span>
            {place.reviewCount > 0 ? (
              <span className="flex shrink-0 items-center gap-1 font-bold text-foreground tabular-nums">
                {formatPlaceTrustLabel(place.mustTryCount, place.reviewCount)}
              </span>
            ) : null}
          </div>

          <h3 className="font-display text-base leading-snug font-bold tracking-tight">
            <Link
              to={`/discover/${place.id}`}
              viewTransition
              onClick={() => emitPlaceClick(place.id)}
              className="line-clamp-1 outline-none after:absolute after:inset-0 focus-visible:underline"
            >
              {place.name}
            </Link>
          </h3>

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </p>

          {subtitleNote ? (
            <p className="line-clamp-1 text-xs font-medium text-foreground/80">{subtitleNote}</p>
          ) : null}

          {why ? <PlaceCardWhyBlock why={why} /> : null}
        </CardContent>
      </Card>
    )
  }

  const imageHeight = variant === "featured" ? 300 : place.imageHeight

  return (
    <Card className="group relative gap-0 overflow-hidden border-border/80 p-0 shadow-(--shadow-soft) transition-all duration-300 hover:-translate-y-0.5 hover:shadow-(--shadow-raised)">
      <CoverImage
        src={place.imageUrl}
        placeholder={place.category}
        name={place.name}
        height={imageHeight}
        alt={placeImageAlt(place)}
        sizes={
          variant === "featured"
            ? "(min-width: 1024px) 60vw, 100vw"
            : "(min-width: 768px) 33vw, 50vw"
        }
        className="w-full shrink-0"
        imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
      >
        <PlaceCardBadges place={place} isNew={isNew} openState={openState} rankBadge={rankBadge} />
      </CoverImage>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3
          className={cn(
            "font-display leading-snug font-bold tracking-tight",
            variant === "featured" ? "text-xl" : "text-base",
          )}
        >
          <Link
            to={`/discover/${place.id}`}
            viewTransition
            onClick={() => emitPlaceClick(place.id)}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {place.name}
          </Link>
        </h3>

        {subtitleNote ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85">{subtitleNote}</p>
        ) : null}

        <PlaceCardTags tags={place.tags} />

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{place.address}</span>
        </p>

        {why ? <PlaceCardWhyBlock why={why} /> : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 tabular-nums">
            {place.reviewCount > 0 ? (
              <span>{formatCount(place.reviewCount)} đánh giá</span>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
            {distanceKm !== undefined ? (
              <span className="flex items-center gap-0.5 font-semibold text-primary">
                <NavigationIcon className="size-3" aria-hidden="true" />
                {formatDistance(distanceKm)}
              </span>
            ) : null}
          </div>
          <span
            aria-label={priceLevelAriaLabel(place.priceLevel)}
            className="font-semibold text-foreground"
          >
            {priceLevelLabel(place.priceLevel)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
