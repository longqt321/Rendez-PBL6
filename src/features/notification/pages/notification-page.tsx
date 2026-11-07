import {
  BellIcon,
  CheckCheckIcon,
  HeartIcon,
  InfoIcon,
  MessageCircleIcon,
  UserPlusIcon,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatRelativeTime } from "@/lib/format"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { PlaceSuggestionCard } from "../components/place-suggestion-card"
import type { ActorNotification, AppNotification } from "../types/notification"

function ActorRow({ notification }: { notification: ActorNotification }) {
  const meta = {
    like: { icon: HeartIcon, text: "đã thích bài đăng của bạn" },
    comment: { icon: MessageCircleIcon, text: "đã bình luận bài đăng của bạn" },
    follow: { icon: UserPlusIcon, text: "đã bắt đầu theo dõi bạn" },
  }[notification.kind]

  const Icon = meta.icon

  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-[0.2rem] border-2 p-2.5",
        notification.read ? "border-foreground/15" : "border-primary bg-primary/5",
      )}
    >
      <Avatar>
        <AvatarFallback className="bg-accent text-[0.65rem] font-bold text-accent-foreground">
          {notification.actorInitials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">{notification.actorName}</span> {meta.text}
        </p>
        {notification.excerpt ? (
          <p className="mt-1 line-clamp-2 border-l-2 border-foreground/25 pl-2 text-[0.7rem] text-muted-foreground italic">
            “{notification.excerpt}”
          </p>
        ) : null}
        <p className="mt-1 text-[0.65rem] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </li>
  )
}

export function NotificationPage() {
  const notifications = useAppStore((state) => state.notifications)
  const markAllRead = useAppStore((state) => state.markAllNotificationsRead)

  const unreadCount = notifications.filter((n) => !n.read).length
  const suggestions = notifications.filter(
    (n): n is Extract<AppNotification, { kind: "place-suggestion" }> =>
      n.kind === "place-suggestion",
  )
  const others = notifications.filter((n) => n.kind !== "place-suggestion")

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <BellIcon className="size-6" aria-hidden="true" />
            Thông báo
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheckIcon />
          Đọc tất cả
        </Button>
      </header>

      <div className="mt-4">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tất cả ({notifications.length})</TabsTrigger>
            <TabsTrigger value="suggestions">Đề xuất địa điểm ({suggestions.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {suggestions.length > 0 ? (
        <section className="mt-5">
          <h2 className="mb-2 font-heading text-sm font-bold tracking-wide uppercase">
            Đề xuất thêm địa điểm
          </h2>
          <ul className="flex flex-col gap-3">
            {suggestions.map((notification) => (
              <li key={notification.id}>
                <PlaceSuggestionCard notification={notification} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-6 flex items-start gap-2 rounded-[0.2rem] border-2 border-dashed border-foreground/30 p-3 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Chưa có đề xuất nào. Vào Cộng đồng, đăng một bài không gắn địa điểm rồi bấm “Chạy gợi ý
          địa điểm” để mô phỏng thuật toán.
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-bold tracking-wide uppercase">
          Hoạt động khác
        </h2>
        <ul className="flex flex-col gap-2">
          {others.map((notification) =>
            notification.kind === "system" ? (
              <li
                key={notification.id}
                className={cn(
                  "rounded-[0.2rem] border-2 p-2.5",
                  notification.read ? "border-foreground/15" : "border-primary bg-primary/5",
                )}
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  {notification.title}
                </p>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">{notification.body}</p>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </li>
            ) : (
              <ActorRow key={notification.id} notification={notification} />
            ),
          )}
        </ul>
      </section>
    </div>
  )
}
