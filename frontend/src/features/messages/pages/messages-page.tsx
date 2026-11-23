import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  CheckCheckIcon,
  ExternalLinkIcon,
  MessageCircleIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { sendDirectMessageInputSchema, type SendDirectMessageInput } from "@rendez/schema"
import { PageContainer, SurfaceCard } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/features/profile/hooks/use-me"
import { useUserSuggestions } from "@/features/search/hooks/use-user-suggestions"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  useConversations,
  useConversationThread,
  useSendDirectMessage,
} from "../hooks/use-messages"

function ConversationThreadPane({ handle }: { readonly handle: string }) {
  const { data: me } = useMe()
  const { data, isPending, isError, refetch } = useConversationThread(handle)
  const sendMessage = useSendDirectMessage(handle)
  const bottomRef = useRef<HTMLDivElement>(null)

  const form = useForm<SendDirectMessageInput>({
    resolver: zodResolver(sendDirectMessageInputSchema),
    defaultValues: { body: "" },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [data?.items.length, handle])

  useEffect(() => {
    form.reset({ body: "" })
  }, [handle, form])

  if (isPending) {
    return (
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-12 w-2/3 rounded-surface" />
          <Skeleton className="ml-auto h-12 w-1/2 rounded-surface" />
          <Skeleton className="h-12 w-3/5 rounded-surface" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState
          variant="plain"
          title="Không mở được cuộc trò chuyện"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  function onSubmit(values: SendDirectMessageInput) {
    sendMessage.mutate(values.body, {
      onSuccess: () => form.reset({ body: "" }),
      onError: () => toast.error("Không gửi được tin nhắn, thử lại nhé"),
    })
  }

  const lastOutgoingIndex = data.items.reduce(
    (lastIdx, item, idx) => (item.senderId === me?.id ? idx : lastIdx),
    -1,
  )

  return (
    <div className="flex h-full flex-col bg-background/40">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Về danh sách tin nhắn"
            render={<Link to="/messages" />}
          >
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
          <Link to={`/u/${data.peer.handle}`} className="group flex min-w-0 items-center gap-2.5">
            <Avatar size="default">
              <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                {data.peer.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold group-hover:underline">
                {data.peer.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">@{data.peer.handle}</p>
            </div>
          </Link>
        </div>

        <Button
          variant="outline"
          size="xs"
          nativeButton={false}
          render={<Link to={`/u/${data.peer.handle}`} />}
        >
          <span>Hồ sơ</span>
          <ExternalLinkIcon className="size-3" aria-hidden="true" />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-4">
          {data.items.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparklesIcon />
                </EmptyMedia>
                <EmptyTitle>Bắt đầu trò chuyện với {data.peer.name}</EmptyTitle>
                <EmptyDescription>
                  Hỏi thăm quán ruột hoặc rủ nhau lập phòng chọn điểm hẹn cuối tuần.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            data.items.map((msg, idx) => {
              const isMine = msg.senderId === me?.id
              const prevSameSender = idx > 0 && data.items[idx - 1]?.senderId === msg.senderId
              const nextSameSender =
                idx < data.items.length - 1 && data.items[idx + 1]?.senderId === msg.senderId
              const showTime = !nextSameSender
              const showReadReceipt = isMine && idx === lastOutgoingIndex && msg.readAt !== null

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    isMine ? "items-end" : "items-start",
                    prevSameSender ? "mt-0.5" : "mt-3",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words shadow-xs",
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground",
                      isMine && nextSameSender && "rounded-br-md",
                      isMine && prevSameSender && "rounded-tr-md",
                      !isMine && nextSameSender && "rounded-bl-md",
                      !isMine && prevSameSender && "rounded-tl-md",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  {showTime ? (
                    <div className="mt-1 flex items-center gap-1 px-1 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(msg.createdAt)}</span>
                      {showReadReceipt ? (
                        <span className="inline-flex items-center gap-0.5 text-primary">
                          · <CheckCheckIcon className="size-3.5" aria-hidden="true" /> Đã xem
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="border-t border-border bg-card/90 p-3 backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Nhắn tin cho ${data.peer.name}...`}
            aria-label="Nội dung tin nhắn"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.body)}
            aria-describedby={form.formState.errors.body ? "dm-body-error" : undefined}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void form.handleSubmit(onSubmit)()
              }
            }}
            {...form.register("body")}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={sendMessage.isPending}
            aria-label="Gửi tin nhắn"
          >
            {sendMessage.isPending ? (
              <Spinner aria-label="Đang gửi tin nhắn" />
            ) : (
              <SendIcon className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <FieldError id="dm-body-error" errors={[form.formState.errors.body]} className="mt-1" />
      </form>
    </div>
  )
}

export function MessagesPage() {
  const { handle } = useParams<{ handle?: string }>()
  const [search, setSearch] = useState("")
  const { data: me } = useMe()
  const { data: conversations, isPending, isError, refetch } = useConversations()
  const { data: userSuggestions } = useUserSuggestions()

  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) => c.peer.name.toLowerCase().includes(q) || c.peer.handle.toLowerCase().includes(q),
    )
  }, [conversations, search])

  const quickStartPeers = useMemo(() => {
    const existingIds = new Set((conversations ?? []).map((c) => c.peer.id))
    return (userSuggestions ?? [])
      .map((s) => s.user)
      .filter((u) => u.id !== me?.id && !existingIds.has(u.id))
      .slice(0, 5)
  }, [userSuggestions, conversations, me?.id])

  const totalUnread = useMemo(
    () => (conversations ?? []).reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  )

  return (
    <PageContainer size="wide" padded="compact">
      <SurfaceCard
        padding="none"
        className="overflow-hidden border-border/80 shadow-(--shadow-soft)"
      >
        <div className="grid h-[calc(100dvh-7.5rem)] min-h-[520px] grid-cols-1 md:grid-cols-[320px_1fr]">
          <div
            aria-label="Danh sách cuộc trò chuyện"
            className={cn(
              "flex min-h-0 flex-col border-b border-border bg-card md:border-r md:border-b-0",
              handle ? "hidden md:flex" : "flex",
            )}
          >
            <div className="space-y-3 border-b border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h1 className="font-display text-xl font-bold tracking-tight">Tin nhắn</h1>
                {totalUnread > 0 ? (
                  <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">
                    {totalUnread} chưa đọc
                  </Badge>
                ) : null}
              </div>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc @handle..."
                  aria-label="Tìm cuộc trò chuyện"
                />
              </InputGroup>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {isPending ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skel-conv-${i}`} className="flex items-center gap-3 p-2">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="p-4">
                  <ErrorState
                    variant="plain"
                    title="Không tải được tin nhắn"
                    onRetry={() => void refetch()}
                  />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "Không tìm thấy cuộc trò chuyện phù hợp."
                    : "Chưa có cuộc trò chuyện nào."}
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filteredConversations.map((conv) => {
                    const active = conv.peer.handle === handle
                    return (
                      <li key={conv.peer.id}>
                        <Link
                          to={`/messages/${conv.peer.handle}`}
                          className={cn(
                            "flex items-center gap-3 border-l-2 border-transparent px-4 py-3 transition-colors hover:bg-muted/50",
                            active && "border-l-primary bg-primary/8",
                          )}
                        >
                          <Avatar size="default">
                            <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                              {conv.peer.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{conv.peer.name}</p>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelativeTime(conv.lastMessage.createdAt)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  "truncate text-xs",
                                  conv.unreadCount > 0
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {conv.lastMessage.senderId === me?.id ? "Bạn: " : ""}
                                {conv.lastMessage.body}
                              </p>
                              {conv.unreadCount > 0 ? (
                                <Badge
                                  variant="default"
                                  className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 py-0 text-xs"
                                >
                                  {conv.unreadCount}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              {quickStartPeers.length > 0 ? (
                <div className="border-t border-border/70 p-4">
                  <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Gợi ý bắt đầu trò chuyện
                  </p>
                  <ul className="space-y-1.5">
                    {quickStartPeers.map((user) => (
                      <li key={user.id}>
                        <Link
                          to={`/messages/${user.handle}`}
                          className="flex items-center gap-2.5 rounded-control px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                        >
                          <Avatar size="sm">
                            <AvatarFallback className="bg-secondary text-xs font-semibold">
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">@{user.handle}</p>
                          </div>
                          <MessageCircleIcon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ScrollArea>
          </div>

          <section
            className={cn(
              "min-h-0",
              !handle ? "hidden md:flex md:items-center md:justify-center" : "flex flex-col",
            )}
          >
            {handle ? (
              <ConversationThreadPane handle={handle} />
            ) : (
              <Empty className="border-0 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>Chọn một cuộc trò chuyện</EmptyTitle>
                  <EmptyDescription>
                    Chọn từ danh sách bên trái hoặc bấm vào người bạn gợi ý để nhắn tin ngay.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </div>
      </SurfaceCard>
    </PageContainer>
  )
}
