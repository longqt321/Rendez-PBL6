import {
  BellIcon,
  CheckCheckIcon,
  HeartIcon,
  InfoIcon,
  MessageCircleIcon,
  UserPlusIcon,
} from "lucide-react"
import { Link } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PlaceSuggestionCard } from "../components/place-suggestion-card"
import { useMarkAllNotificationsRead } from "../hooks/use-mark-all-notifications-read"
import { useMarkNotificationRead } from "../hooks/use-mark-notification-read"
import { useNotifications } from "../hooks/use-notifications"
import type { ActorNotification, AppNotification } from "../types/notification"

/** Thông báo không phải đề xuất địa điểm — tương tác hoặc hệ thống. */
type OtherNotification = Exclude<AppNotification, { kind: "place-suggestion" }>

const ACTOR_META = {
  like: { icon: HeartIcon, text: "đã thích bài đăng của bạn" },
  comment: { icon: MessageCircleIcon, text: "đã bình luận bài đăng của bạn" },
  follow: { icon: UserPlusIcon, text: "đã bắt đầu theo dõi bạn" },
} as const

function ActorRow({ notification }: { notification: ActorNotification }) {
  const markRead = useMarkNotificationRead()
  const meta = ACTOR_META[notification.kind]
  const Icon = meta.icon

  const handleActivate = () => {
    if (!notification.read) markRead.mutate(notification.id)
  }

  const body = (
    <>
      <Avatar>
        <AvatarFallback className="bg-accent text-[0.75rem] font-bold text-accent-foreground">
          {notification.actorInitials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">{notification.actorName}</span> {meta.text}
        </p>
        {notification.excerpt ? (
          <p className="mt-1 line-clamp-2 border-l border-border pl-2 text-[0.78rem] text-muted-foreground italic">
            “{notification.excerpt}”
          </p>
        ) : null}
        <p className="mt-1 text-[0.75rem] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  )

  const className = cn(
    "relative flex items-start gap-2.5 rounded-md border p-2.5 transition-colors",
    notification.read ? "border-border" : "border-primary bg-primary/5",
  )

  // Thông báo `follow` không gắn với bài nào → chỉ đánh dấu đã đọc, không điều hướng.
  if (!notification.postId) {
    return (
      <li>
        <button
          type="button"
          onClick={handleActivate}
          className={cn(className, "w-full text-left hover:bg-muted")}
        >
          {body}
        </button>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={`/post/${notification.postId}`}
        onClick={handleActivate}
        className={cn(className, "hover:bg-muted")}
      >
        {body}
      </Link>
    </li>
  )
}

export function NotificationPage() {
  const { data, isPending, isError, refetch } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.items ?? []
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const suggestions = notifications.filter(
    (notification): notification is Extract<AppNotification, { kind: "place-suggestion" }> =>
      notification.kind === "place-suggestion",
  )
  const others = notifications.filter(
    (notification): notification is OtherNotification => notification.kind !== "place-suggestion",
  )

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
        >
          {markAllRead.isPending ? <Spinner /> : <CheckCheckIcon />}
          Đọc tất cả
        </Button>
      </header>

      {isPending ? (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Đang tải thông báo…
        </p>
      ) : isError ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Không tải được thông báo</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : (
        <Tabs defaultValue="all" className="mt-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả ({notifications.length})</TabsTrigger>
            <TabsTrigger value="suggestions">Đề xuất địa điểm ({suggestions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-3">
            <div className="flex flex-col gap-6">
              <SuggestionSection suggestions={suggestions} />
              <OtherActivitySection notifications={others} />
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-3">
            <SuggestionSection suggestions={suggestions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/** Khối "Đề xuất thêm địa điểm" — dùng chung cho tab Tất cả và tab Đề xuất. */
function SuggestionSection({
  suggestions,
}: {
  suggestions: Extract<AppNotification, { kind: "place-suggestion" }>[]
}) {
  if (suggestions.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InfoIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có đề xuất nào</EmptyTitle>
          <EmptyDescription>
            Khi hệ thống tìm thấy địa điểm phù hợp với một bài đăng chưa gắn địa điểm của bạn, đề
            xuất sẽ xuất hiện ở đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section>
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
  )
}

/** Khối "Hoạt động khác" — thông báo tương tác và thông báo hệ thống. */
function OtherActivitySection({ notifications }: { notifications: OtherNotification[] }) {
  if (notifications.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có hoạt động nào</EmptyTitle>
          <EmptyDescription>
            Lượt thích, bình luận và người theo dõi mới sẽ hiện ở đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section>
      <h2 className="mb-2 font-heading text-sm font-bold tracking-wide uppercase">
        Hoạt động khác
      </h2>
      <ul className="flex flex-col gap-2">
        {notifications.map((notification) =>
          notification.kind === "system" ? (
            <li
              key={notification.id}
              className={cn(
                "rounded-md border p-2.5",
                notification.read ? "border-border" : "border-primary bg-primary/5",
              )}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {notification.title}
              </p>
              <p className="mt-1 text-[0.78rem] text-muted-foreground">{notification.body}</p>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                {formatRelativeTime(notification.createdAt)}
              </p>
            </li>
          ) : (
            <ActorRow key={notification.id} notification={notification} />
          ),
        )}
      </ul>
    </section>
  )
}
