import { Fragment } from "react"
import {
  BellIcon,
  CheckCheckIcon,
  HeartIcon,
  InfoIcon,
  MessageCircleIcon,
  UserPlusIcon,
} from "lucide-react"
import { Link } from "react-router"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { SectionHeading } from "@/components/shared/section-heading"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PlaceSuggestionCard } from "../components/place-suggestion-card"
import { useMarkAllNotificationsRead } from "../hooks/use-mark-all-notifications-read"
import { useMarkNotificationRead } from "../hooks/use-mark-notification-read"
import { useNotifications } from "../hooks/use-notifications"
import type { ActorNotification, AppNotification, SystemNotification } from "../types/notification"

type OtherNotification = Exclude<AppNotification, { kind: "place-suggestion" }>

const ACTOR_META = {
  like: { icon: HeartIcon, text: "đã thích bài đăng của bạn" },
  comment: { icon: MessageCircleIcon, text: "đã bình luận bài đăng của bạn" },
  follow: { icon: UserPlusIcon, text: "đã bắt đầu theo dõi bạn" },
} as const

function NotificationRow({ notification }: Readonly<{ notification: ActorNotification }>) {
  const markRead = useMarkNotificationRead()
  const meta = ACTOR_META[notification.kind]
  const Icon = meta.icon

  const handleActivate = () => {
    if (!notification.read) markRead.mutate(notification.id)
  }

  const body = (
    <>
      <ItemMedia>
        <Avatar>
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {notification.actorInitials}
          </AvatarFallback>
          {notification.read ? null : <AvatarBadge aria-hidden="true" />}
        </Avatar>
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-xs leading-relaxed">
          <span className="font-semibold">{notification.actorName}</span> {meta.text}
        </ItemTitle>
        {notification.excerpt ? (
          <ItemDescription className="line-clamp-2 border-l border-border pl-2 text-xs italic">
            “{notification.excerpt}”
          </ItemDescription>
        ) : null}
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </ItemActions>
    </>
  )

  const className = cn(
    "items-start",
    notification.read ? "border-border" : "border-primary bg-primary/5",
  )

  // Thông báo `follow` không gắn với bài nào → chỉ đánh dấu đã đọc, không điều hướng.
  if (!notification.postId) {
    return (
      <Item
        variant="outline"
        size="sm"
        render={<button type="button" onClick={handleActivate} />}
        className={cn(className, "w-full text-left hover:bg-muted")}
      >
        {body}
      </Item>
    )
  }

  return (
    <Item
      variant="outline"
      size="sm"
      render={<Link to={`/post/${notification.postId}`} onClick={handleActivate} />}
      className={cn(className, "hover:bg-muted")}
    >
      {body}
    </Item>
  )
}

/** Một hàng thông báo hệ thống — không bấm được, chỉ đọc. */
function SystemRow({ notification }: Readonly<{ notification: SystemNotification }>) {
  return (
    <Item
      variant="outline"
      size="sm"
      className={cn(
        "items-start",
        notification.read ? "border-border" : "border-primary bg-primary/5",
      )}
    >
      <ItemMedia variant="icon">
        <InfoIcon aria-hidden="true" />
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-xs font-semibold">
          {notification.title}
        </ItemTitle>
        <ItemDescription className="text-xs">{notification.body}</ItemDescription>
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

interface NotificationContentProps {
  readonly isPending: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly notifications: AppNotification[]
  readonly suggestions: Extract<AppNotification, { kind: "place-suggestion" }>[]
  readonly others: OtherNotification[]
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
}

function NotificationContent({
  isPending,
  isError,
  onRetry,
  notifications,
  suggestions,
  others,
  sentinelRef,
  hasNextPage,
}: NotificationContentProps) {
  if (isPending) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={`skel-notif-${index}`} className="h-16 w-full rounded-surface" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <ErrorState className="mt-10" title="Không tải được thông báo" size="sm" onRetry={onRetry} />
    )
  }
  return (
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
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
        {hasNextPage ? (
          <p className="mt-6 flex justify-center text-xs text-muted-foreground">
            <Spinner aria-label="Đang tải thêm thông báo" className="size-3" />
            <span className="ml-1.5">Đang tải thêm…</span>
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="suggestions" className="mt-3">
        <SuggestionSection suggestions={suggestions} />
      </TabsContent>
    </Tabs>
  )
}

export function NotificationPage() {
  const {
    notifications,
    isPending,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()

  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

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
      <h1 className="sr-only">Thông báo</h1>
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
          {markAllRead.isPending ? (
            <Spinner aria-label="Đang đánh dấu đã đọc" />
          ) : (
            <CheckCheckIcon />
          )}
          Đọc tất cả
        </Button>
      </header>

      <NotificationContent
        isPending={isPending}
        isError={isError}
        onRetry={() => {
          refetch().catch(() => {})
        }}
        notifications={notifications}
        suggestions={suggestions}
        others={others}
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
      />
    </div>
  )
}

/** Khối "Đề xuất thêm địa điểm" — dùng chung cho tab Tất cả và tab Đề xuất. */
function SuggestionSection({
  suggestions,
}: Readonly<{
  suggestions: Extract<AppNotification, { kind: "place-suggestion" }>[]
}>) {
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
      <SectionHeading className="mb-2">Đề xuất thêm địa điểm</SectionHeading>
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
function OtherActivitySection({ notifications }: Readonly<{ notifications: OtherNotification[] }>) {
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
      <SectionHeading className="mb-2">Hoạt động khác</SectionHeading>
      <ItemGroup className="gap-0">
        {notifications.map((notification, index) => (
          <Fragment key={notification.id}>
            {index > 0 ? <ItemSeparator /> : null}
            {notification.kind === "system" ? (
              <SystemRow notification={notification} />
            ) : (
              <NotificationRow notification={notification} />
            )}
          </Fragment>
        ))}
      </ItemGroup>
    </section>
  )
}
