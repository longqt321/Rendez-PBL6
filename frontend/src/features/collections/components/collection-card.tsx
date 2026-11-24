import { Link } from "react-router"
import { HeartIcon, LockIcon, MapPinIcon } from "lucide-react"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlace } from "@/features/places/hooks/use-place"
import { formatCount, formatRelativeTime } from "@/lib/format"
import type { CollectionSummary } from "../types/collection"

function CollectionPreviewTile({ placeId }: Readonly<{ placeId: string }>) {
  const { data: place } = usePlace(placeId)

  if (!place) {
    return (
      <div className="flex h-24 items-center justify-center bg-muted/80">
        <MapPinIcon className="size-4 text-muted-foreground/50" aria-hidden="true" />
      </div>
    )
  }

  return (
    <CoverImage
      src={place.imageUrl}
      placeholder={place.category}
      name={place.name}
      height={96}
      sizes="140px"
      alt={placeImageAlt(place)}
      className="h-24 w-full"
    />
  )
}

export function CollectionCard({ collection }: Readonly<{ collection: CollectionSummary }>) {
  const previewIds = collection.previewPlaceIds.slice(0, 3)
  const emptySlotCount = Math.max(0, 3 - previewIds.length)

  return (
    <Card className="group relative gap-0 overflow-hidden border-border/80 py-0 shadow-(--shadow-soft) transition-colors hover:border-foreground/20">
      <div className="grid grid-cols-3 gap-0.5 bg-border/60">
        {previewIds.map((placeId) => (
          <CollectionPreviewTile key={placeId} placeId={placeId} />
        ))}
        {Array.from({ length: emptySlotCount }).map((_, index) => (
          <div key={`empty-${index}`} className="flex h-24 items-center justify-center bg-muted/60">
            <MapPinIcon className="size-4 text-muted-foreground/40" aria-hidden="true" />
          </div>
        ))}
      </div>

      <CardHeader className="gap-1.5 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 font-display text-base leading-tight font-bold">
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

      <CardContent className="flex items-center gap-2 px-4 pt-2 pb-4 text-xs text-muted-foreground tabular-nums">
        <span className="font-medium text-foreground">{collection.placeCount} địa điểm</span>
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
        <span>{formatRelativeTime(collection.createdAt)}</span>
      </CardContent>
    </Card>
  )
}
