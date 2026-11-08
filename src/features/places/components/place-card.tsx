import { MapPinIcon, NavigationIcon, StarIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount, formatDistance, formatRating } from "@/lib/format"
import { categoryLabel } from "../lib/category-meta"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import type { Place } from "../types/place"

interface PlaceCardProps {
  place: Place
  distanceKm?: number
}

export function PlaceCard({ place, distanceKm }: PlaceCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-raised)">
      {/* Chiều cao ảnh do server trả về (`imageHeight`) → lưới mobile có nhịp masonry. */}
      <SeedImage
        seed={place.imageSeed}
        height={place.imageHeight}
        alt={`Ảnh minh hoạ ${place.name}`}
        className="w-full shrink-0"
      >
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge
            variant="secondary"
            className="h-6 border-border bg-secondary px-2 text-xs text-secondary-foreground"
          >
            {categoryLabel(place.category)}
          </Badge>
          {place.district ? (
            <Badge
              variant="outline"
              className="h-6 border-border/80 bg-background/80 px-2 text-xs font-medium backdrop-blur"
            >
              {place.district}
            </Badge>
          ) : null}
        </div>

        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-bold">
          <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
          {formatRating(place.rating)}
        </span>
      </SeedImage>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base leading-tight font-bold">
          <Link
            to={`/discover/${place.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {place.name}
          </Link>
        </h3>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{place.address}</span>
        </p>

        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{formatCount(place.reviewCount)} đánh giá</span>
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
      </div>
    </article>
  )
}
