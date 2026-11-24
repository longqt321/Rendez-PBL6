import { CheckIcon, ExternalLinkIcon, MapPinIcon, XIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { useUpdatePostPlace } from "@/features/social/hooks/use-update-post-place"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useMarkNotificationRead } from "../hooks/use-mark-notification-read"
import type { PlaceSuggestionNotification } from "../types/notification"

interface PlaceSuggestionCardProps {
  notification: PlaceSuggestionNotification
}

export function PlaceSuggestionCard({ notification }: PlaceSuggestionCardProps) {
  const updatePlace = useUpdatePostPlace()
  const markRead = useMarkNotificationRead()

  return (
    <Card className={cn(!notification.read && "ring-primary")}>
      <CardContent className="flex flex-col gap-2">
        <header className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-control border border-border bg-secondary text-secondary-foreground"
          >
            <MapPinIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Đề xuất thêm địa điểm</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
              {!notification.read ? " · chưa đọc" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!notification.read ? <Badge variant="destructive">Mới</Badge> : null}
            {!notification.read ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={markRead.isPending}
                onClick={() => markRead.mutate(notification.id)}
              >
                <XIcon className="size-3.5" aria-hidden="true" />
                Bỏ qua
              </Button>
            ) : null}
          </div>
        </header>

        <p className="line-clamp-2 border-l border-border pl-2 text-xs text-muted-foreground italic">
          <Link
            to={`/post/${notification.postId}`}
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            “{notification.postCaption}”
          </Link>
        </p>

        <p className="text-xs">
          Bạn có muốn gắn một trong {notification.suggestions.length} quán gợi ý dưới đây vào bài
          viết này không?
        </p>

        <ItemGroup className="gap-2">
          {notification.suggestions.map((suggestion, index) => {
            const place = suggestion.place
            const isChosen = notification.postPlaceId === place.id
            const isPending = updatePlace.isPending && updatePlace.variables?.placeId === place.id

            return (
              <Item
                key={place.id}
                variant="outline"
                size="sm"
                className="gap-2.5 rounded-control p-1.5 transition-colors hover:border-primary/50"
              >
                <ItemMedia variant="image">
                  <CoverImage
                    src={place.imageUrl}
                    placeholder={place.category}
                    name={place.name}
                    sizes="56px"
                    className="size-full"
                    alt={placeImageAlt(place)}
                  />
                </ItemMedia>
                <ItemContent className="gap-0.5">
                  <ItemTitle className="text-xs font-semibold">
                    <span
                      aria-hidden="true"
                      className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-xs text-primary-foreground"
                    >
                      {index + 1}
                    </span>
                    <span className="truncate">{place.name}</span>
                  </ItemTitle>
                  <ItemDescription className="truncate text-xs">{place.address}</ItemDescription>
                  <ItemDescription className="flex items-center gap-1 text-xs">
                    <MapPinIcon className="size-2.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{suggestion.reason}</span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs">
                    {categoryLabel(place.category)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      nativeButton={false}
                      render={<Link to={`/discover/${place.id}`} />}
                      aria-label={`Xem quán ${place.name}`}
                    >
                      <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="xs"
                      variant={isChosen ? "secondary" : "default"}
                      disabled={isChosen || isPending}
                      aria-label={
                        isChosen
                          ? `Đã gắn ${place.name} cho bài đăng`
                          : `Chọn ${place.name} làm địa điểm của bài đăng`
                      }
                      onClick={() =>
                        updatePlace.mutate({ postId: notification.postId, placeId: place.id })
                      }
                    >
                      {isPending ? <Spinner aria-label="Đang gắn địa điểm" /> : <CheckIcon />}
                      {isChosen ? "Đã gắn" : "Chọn"}
                    </Button>
                  </div>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
