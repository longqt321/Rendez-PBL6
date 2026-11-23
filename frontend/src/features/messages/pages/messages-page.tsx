import { useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, MessageCircleIcon, SendIcon } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/features/profile/hooks/use-me"
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
  }, [data?.items.length])

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
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

  return (
    <div className="flex h-[min(70vh,620px)] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Về danh sách tin nhắn"
          render={<Link to="/messages" />}
        >
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
        <Link to={`/u/${data.peer.handle}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
              {data.peer.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{data.peer.name}</p>
            <p className="truncate text-xs text-muted-foreground">@{data.peer.handle}</p>
          </div>
        </Link>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện với {data.peer.name}!
          </p>
        ) : (
          data.items.map((msg) => {
            const isMine = msg.senderId === me?.id
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-surface px-3.5 py-2 text-sm leading-relaxed break-words",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/60 text-foreground",
                  )}
                >
                  <p>{msg.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isMine ? "text-primary-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {formatRelativeTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="border-t border-border bg-background/80 p-3"
      >
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Nhắn tin cho ${data.peer.name}...`}
            aria-label="Nội dung tin nhắn"
            aria-invalid={Boolean(form.formState.errors.body)}
            aria-describedby={form.formState.errors.body ? "dm-body-error" : undefined}
            {...form.register("body")}
          />
          <Button type="submit" disabled={sendMessage.isPending} aria-label="Gửi tin nhắn">
            {sendMessage.isPending ? (
              <Spinner aria-label="Đang gửi tin nhắn" />
            ) : (
              <SendIcon aria-hidden="true" />
            )}
            Gửi
          </Button>
        </div>
        <FieldError id="dm-body-error" errors={[form.formState.errors.body]} className="mt-1" />
      </form>
    </div>
  )
}

export function MessagesPage() {
  const { handle } = useParams<{ handle?: string }>()
  const { data: conversations, isPending, isError, refetch } = useConversations()

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Tin nhắn</h1>
          <p className="text-sm text-muted-foreground">Trao đổi trực tiếp với bạn bè trên Rendez</p>
        </div>
      </div>

      <SurfaceCard padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">
          <div
            aria-label="Danh sách cuộc trò chuyện"
            className={cn(
              "border-b border-border md:border-r md:border-b-0",
              handle ? "hidden md:block" : "block",
            )}
          >
            <div className="border-b border-border px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Cuộc trò chuyện
            </div>
            {isPending ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <ErrorState
                  variant="plain"
                  title="Không tải được tin nhắn"
                  onRetry={() => void refetch()}
                />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Chưa có cuộc trò chuyện nào. Vào trang cá nhân một người bạn và bấm “Nhắn tin”.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((conv) => {
                  const active = conv.peer.handle === handle
                  return (
                    <li key={conv.peer.id}>
                      <Link
                        to={`/messages/${conv.peer.handle}`}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                          active && "bg-muted",
                        )}
                      >
                        <Avatar size="sm">
                          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                            {conv.peer.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{conv.peer.name}</p>
                            {conv.unreadCount > 0 ? (
                              <Badge variant="default" className="px-1.5 py-0 text-xs">
                                {conv.unreadCount}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {conv.lastMessage.body}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <section
            className={cn(!handle ? "hidden md:flex md:items-center md:justify-center" : "")}
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
                    Chọn từ danh sách bên trái hoặc mở trang hồ sơ bạn bè để bắt đầu nhắn tin.
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
