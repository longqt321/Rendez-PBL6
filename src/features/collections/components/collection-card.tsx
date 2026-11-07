import { Link } from "react-router"
import { HeartIcon, LockIcon, MapPinIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount, formatRelativeTime } from "@/lib/format"
import type { CollectionSummary } from "../types/collection"

/** Thẻ bộ sưu tập trong lưới tab Bộ sưu tập — bấm mở chi tiết. */
export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <article className="relative overflow-hidden rounded-md border bg-card">
      <div className="grid grid-cols-3 gap-px bg-border">
        {collection.previewPlaceIds.map((placeId) => (
          <SeedImage key={placeId} seed={placeId} height={90} alt="" className="w-full" />
        ))}
        {collection.previewPlaceIds.length === 0
          ? Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex h-[90px] items-center justify-center bg-muted">
                <MapPinIcon className="size-5 text-muted-foreground/50" aria-hidden="true" />
              </div>
            ))
          : null}
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="flex items-center gap-2 font-heading text-base leading-tight font-bold">
          <Link
            to={`/collections/${collection.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {collection.name}
          </Link>
        </h3>
        {collection.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
        ) : null}
        <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
          <span>{collection.placeCount} địa điểm</span>
          {collection.isPrivate ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <LockIcon className="size-3" aria-hidden="true" />
              Riêng tư
            </Badge>
          ) : null}
          <span className="ml-auto flex items-center gap-1">
            <HeartIcon
              className={
                collection.likedByMe ? "size-3.5 fill-current text-destructive" : "size-3.5"
              }
              aria-hidden="true"
            />
            {formatCount(collection.likeCount)}
          </span>
          <span className="text-xs">{formatRelativeTime(collection.createdAt)}</span>
        </div>
      </div>
    </article>
  )
}
