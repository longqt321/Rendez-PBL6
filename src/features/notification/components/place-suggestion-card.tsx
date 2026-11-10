import { CheckIcon, MapPinIcon, SparklesIcon } from "lucide-react"
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
import type { PlaceSuggestionNotification } from "../types/notification"

interface PlaceSuggestionCardProps {
  notification: PlaceSuggestionNotification
}

/**
 * Thẻ "Đề xuất thêm địa điểm".
 *
 * Danh sách đề xuất (đã xếp hạng) và trạng thái địa điểm hiện tại của bài đều do
 * server cung cấp. Component chỉ render và gửi lựa chọn của người dùng lên server.
 */
export function PlaceSuggestionCard({ notification }: PlaceSuggestionCardProps) {
  const updatePlace = useUpdatePostPlace()

  return (
    <Card className={cn(!notification.read && "ring-primary")}>
      <CardContent className="flex flex-col gap-2">
        <header className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-control border border-border bg-secondary text-secondary-foreground"
          >
            <SparklesIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Đề xuất thêm địa điểm</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
              {!notification.read ? " · chưa đọc" : ""}
            </p>
          </div>
          {!notification.read ? <Badge variant="destructive">Mới</Badge> : null}
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
          Bài đăng của bạn chưa gắn địa điểm. Hệ thống tìm thấy {notification.suggestions.length}{" "}
          địa điểm phù hợp — chọn đúng quán để đưa lên Khám phá.
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
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
