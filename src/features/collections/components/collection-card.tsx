import { Link } from "react-router"
import { HeartIcon, LockIcon, MapPinIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount, formatRelativeTime } from "@/lib/format"
import type { CollectionSummary } from "../types/collection"

/** Thẻ bộ sưu tập trong lưới tab Bộ sưu tập — bấm mở chi tiết. */
export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Card className="relative gap-0 py-0">
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

      <CardHeader className="gap-1.5 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-base leading-tight font-bold">
          <Link
            to={`/collections/${collection.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {collection.name}
          </Link>
        </CardTitle>
        {collection.description ? (
          <CardDescription className="line-clamp-2">{collection.description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex items-center gap-2 px-4 pt-1.5 pb-4 text-sm text-muted-foreground">
        <span>{collection.placeCount} địa điểm</span>
        {collection.isPrivate ? (
          <Badge variant="secondary" className="gap-1 text-xs">
            <LockIcon className="size-3" aria-hidden="true" />
            Riêng tư
          </Badge>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          <HeartIcon
            className={collection.likedByMe ? "size-3.5 fill-current text-destructive" : "size-3.5"}
            aria-hidden="true"
          />
          {formatCount(collection.likeCount)}
        </span>
        <span className="text-xs">{formatRelativeTime(collection.createdAt)}</span>
      </CardContent>
    </Card>
  )
}
