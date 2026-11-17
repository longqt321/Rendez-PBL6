import { Link } from "react-router"
import { HeartIcon, LockIcon, MapPinIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCount, formatRelativeTime } from "@/lib/format"
import type { CollectionSummary } from "../types/collection"

export function CollectionCard({ collection }: Readonly<{ collection: CollectionSummary }>) {
  return (
    <Card className="relative gap-0 py-0">
      <div className="grid grid-cols-3 gap-px bg-border">
        {(collection.previewPlaceIds.length > 0
          ? collection.previewPlaceIds
          : Array.from({ length: 3 }, (_, index) => `empty-${index}`)
        ).map((key) => (
          <div key={key} className="flex h-22.5 items-center justify-center bg-muted">
            <MapPinIcon className="size-5 text-muted-foreground/50" aria-hidden="true" />
          </div>
        ))}
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
