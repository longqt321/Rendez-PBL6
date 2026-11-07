import { CheckIcon, MapPinIcon, SparklesIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SeedImage } from "@/components/shared/seed-image"
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
    <article
      className={cn(
        "rounded-[0.25rem] border border-border bg-card p-3 shadow-(--shadow-soft)",
        !notification.read && "border-primary",
      )}
    >
      <header className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-[0.2rem] border border-border bg-secondary text-secondary-foreground"
        >
          <SparklesIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Đề xuất thêm địa điểm</p>
          <p className="text-[0.78rem] text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
            {!notification.read ? " · chưa đọc" : ""}
          </p>
        </div>
        {!notification.read ? <Badge variant="destructive">Mới</Badge> : null}
      </header>

      <p className="mt-2 line-clamp-2 border-l border-border pl-2 text-xs text-muted-foreground italic">
        <Link
          to={`/post/${notification.postId}`}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          “{notification.postCaption}”
        </Link>
      </p>

      <p className="mt-2 text-xs">
        Bài đăng của bạn chưa gắn địa điểm. Hệ thống tìm thấy {notification.suggestions.length} địa
        điểm phù hợp — chọn đúng quán để đưa lên Khám phá.
      </p>

      <ul className="mt-2 flex flex-col gap-2">
        {notification.suggestions.map((suggestion, index) => {
          const place = suggestion.place
          const isChosen = notification.postPlaceId === place.id
          const isPending = updatePlace.isPending && updatePlace.variables?.placeId === place.id

          return (
            <li key={place.id}>
              <div className="flex items-center gap-2.5 rounded-[0.2rem] border border-border p-1.5 transition-colors hover:border-primary/50">
                <SeedImage
                  seed={place.imageSeed}
                  className="size-12 shrink-0 rounded-[0.15rem]"
                  alt={`Ảnh minh hoạ ${place.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-xs font-semibold">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[0.72rem] text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate">{place.name}</span>
                  </p>
                  <p className="truncate text-[0.75rem] text-muted-foreground">{place.address}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-muted-foreground">
                    <MapPinIcon className="size-2.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{suggestion.reason}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[0.72rem]">
                    {categoryLabel(place.category)}
                  </Badge>
                  <Button
                    size="xs"
                    variant={isChosen ? "secondary" : "default"}
                    disabled={isChosen || isPending}
                    onClick={() =>
                      updatePlace.mutate({ postId: notification.postId, placeId: place.id })
                    }
                  >
                    {isPending ? <Spinner /> : <CheckIcon />}
                    {isChosen ? "Đã gắn" : "Chọn"}
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}
