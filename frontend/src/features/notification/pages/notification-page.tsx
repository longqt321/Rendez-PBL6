import { Fragment } from "react"
import { StaggerItem, StaggerList } from "@/components/shared/motion-primitives"
import {
  BellIcon,
  CheckCheckIcon,
  HeartIcon,
  InfoIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router"
import { PageContainer, PageHeader } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { SectionHeading } from "@/components/shared/section-heading"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PlaceSuggestionCard } from "../components/place-suggestion-card"
import { useMarkAllNotificationsRead } from "../hooks/use-mark-all-notifications-read"
import { useMarkNotificationRead } from "../hooks/use-mark-notification-read"
import { useNotifications } from "../hooks/use-notifications"
import type {
  ActorNotification,
  AppNotification,
  DirectMessageNotification,
  RoomEventNotification,
  SystemNotification,
} from "../types/notification"

type OtherNotification = Exclude<AppNotification, { kind: "place-suggestion" }>

const ACTOR_META = {
  like: {
    icon: HeartIcon,
    text: "đã thích bài đăng của bạn",
    tone: "bg-destructive/12 text-destructive",
  },
  comment: {
    icon: MessageCircleIcon,
    text: "đã bình luận bài đăng của bạn",
    tone: "bg-primary/12 text-primary",
  },
  follow: {
    icon: UserPlusIcon,
    text: "đã bắt đầu theo dõi bạn",
    tone: "bg-accent text-accent-foreground",
  },
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
          {notification.actorAvatarUrl ? (
            <AvatarImage src={notification.actorAvatarUrl} alt={notification.actorName} />
          ) : null}
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {notification.actorInitials}
          </AvatarFallback>
          {notification.read ? null : <AvatarBadge aria-hidden="true" />}
        </Avatar>
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-sm leading-relaxed">
          <span className="font-semibold">{notification.actorName}</span> {meta.text}
        </ItemTitle>
        {notification.excerpt ? (
          <ItemDescription className="line-clamp-2 border-l-2 border-primary/40 pl-2.5 text-xs italic">
            “{notification.excerpt}”
          </ItemDescription>
        ) : null}
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <span className={cn("grid size-8 place-items-center rounded-full", meta.tone)}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </ItemActions>
    </>
  )

  const className = cn(
    "items-start rounded-surface p-3.5",
    notification.read ? "border-border bg-card" : "border-primary/50 bg-primary/5",
  )

  const targetHref =
    notification.kind === "follow" && notification.actorHandle
      ? `/u/${notification.actorHandle}`
      : notification.postId
        ? `/post/${notification.postId}`
        : null

  if (!targetHref) {
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
      render={<Link to={targetHref} onClick={handleActivate} />}
      className={cn(className, "hover:bg-muted")}
    >
      {body}
    </Item>
  )
}

function SystemRow({ notification }: Readonly<{ notification: SystemNotification }>) {
  return (
    <Item
      variant="outline"
      size="sm"
      className={cn(
        "items-start rounded-surface p-3.5",
        notification.read ? "border-border bg-card" : "border-primary/50 bg-primary/5",
      )}
    >
      <ItemMedia variant="icon">
        <InfoIcon className="text-primary" aria-hidden="true" />
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-sm font-semibold">
          {notification.title}
        </ItemTitle>
        <ItemDescription className="text-xs leading-relaxed">{notification.body}</ItemDescription>
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

function DirectMessageRow({ notification }: Readonly<{ notification: DirectMessageNotification }>) {
  const markRead = useMarkNotificationRead()
  const handleActivate = () => {
    if (!notification.read) markRead.mutate(notification.id)
  }
  const targetHref = notification.actorHandle
    ? `/messages/${notification.actorHandle}`
    : "/messages"

  return (
    <Item
      variant="outline"
      size="sm"
      render={<Link to={targetHref} onClick={handleActivate} />}
      className={cn(
        "items-start rounded-surface p-3.5",
        notification.read ? "border-border bg-card" : "border-primary/50 bg-primary/5",
      )}
    >
      <ItemMedia>
        <Avatar>
          {notification.actorAvatarUrl ? (
            <AvatarImage src={notification.actorAvatarUrl} alt={notification.actorName} />
          ) : null}
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {notification.actorInitials}
          </AvatarFallback>
          {notification.read ? null : <AvatarBadge aria-hidden="true" />}
        </Avatar>
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-sm leading-relaxed">
          <span className="font-semibold">{notification.actorName}</span> đã gửi tin nhắn trực tiếp
          cho bạn
        </ItemTitle>
        {notification.messageExcerpt ? (
          <ItemDescription className="line-clamp-2 border-l-2 border-primary/40 pl-2.5 text-xs italic">
            “{notification.messageExcerpt}”
          </ItemDescription>
        ) : null}
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <span className="grid size-8 place-items-center rounded-full bg-primary/12 text-primary">
          <MessageSquareIcon className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </ItemActions>
    </Item>
  )
}

function RoomEventRow({ notification }: Readonly<{ notification: RoomEventNotification }>) {
  const markRead = useMarkNotificationRead()
  const handleActivate = () => {
    if (!notification.read) markRead.mutate(notification.id)
  }
  const isFinalized = notification.eventType === "room_finalized"

  return (
    <Item
      variant="outline"
      size="sm"
      render={<Link to={`/rooms/${notification.roomCode}`} onClick={handleActivate} />}
      className={cn(
        "items-start rounded-surface p-3.5",
        notification.read ? "border-border bg-card" : "border-primary/50 bg-primary/5",
      )}
    >
      <ItemMedia>
        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <UsersIcon className="size-4" aria-hidden="true" />
        </span>
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="line-clamp-none block w-full text-sm leading-relaxed">
          Phòng hẹn <span className="font-semibold">“{notification.roomName}”</span>{" "}
          {isFinalized
            ? `đã chốt điểm hẹn: ${notification.winnerPlaceName ?? "Xem chi tiết"}`
            : "đã bắt đầu phiên bình chọn"}
        </ItemTitle>
        <ItemDescription className="text-xs">
          {formatRelativeTime(notification.createdAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant={isFinalized ? "default" : "secondary"} className="text-xs">
          {isFinalized ? "Đã chốt" : "Đang vote"}
        </Badge>
      </ItemActions>
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
          <Skeleton key={`skel-notif-${index}`} className="h-18 w-full rounded-surface" />
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

      <TabsContent value="all" className="mt-4">
        {notifications.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>Chưa có thông báo nào</EmptyTitle>
              <EmptyDescription>
                Đề xuất địa điểm, lượt thích, bình luận và người theo dõi mới sẽ hiện ở đây.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {suggestions.length > 0 ? <SuggestionSection suggestions={suggestions} /> : null}
            {others.length > 0 ? <OtherActivitySection notifications={others} /> : null}
          </div>
        )}
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
        {hasNextPage ? (
          <p className="mt-6 flex justify-center text-xs text-muted-foreground">
            <Spinner aria-label="Đang tải thêm thông báo" className="size-3" />
            <span className="ml-1.5">Đang tải thêm…</span>
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="suggestions" className="mt-4">
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
    <PageContainer size="narrow">
      <PageHeader
        title="Thông báo"
        description={
          unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo."
        }
        actions={
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
        }
      />

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
    </PageContainer>
  )
}

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
      <SectionHeading className="mb-2.5">Đề xuất thêm địa điểm</SectionHeading>
      <StaggerList className="flex flex-col gap-3">
        {suggestions.map((notification) => (
          <StaggerItem key={notification.id}>
            <PlaceSuggestionCard notification={notification} />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  )
}

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
      <SectionHeading className="mb-2.5">Hoạt động khác</SectionHeading>
      <div>
        <ItemGroup className="gap-2">
          {notifications.map((notification, index) => (
            <Fragment key={notification.id}>
              {index > 0 ? <ItemSeparator className="hidden" /> : null}
              {notification.kind === "system" ? (
                <SystemRow notification={notification} />
              ) : notification.kind === "direct-message" ? (
                <DirectMessageRow notification={notification} />
              ) : notification.kind === "room-event" ? (
                <RoomEventRow notification={notification} />
              ) : (
                <NotificationRow notification={notification} />
              )}
            </Fragment>
          ))}
        </ItemGroup>
      </div>
    </section>
  )
}
