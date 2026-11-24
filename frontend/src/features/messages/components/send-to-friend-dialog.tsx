import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { MessageCircleIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import type { MessageAttachment } from "@rendez/schema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { useConversations } from "../hooks/use-messages"
import { sendDirectMessage } from "../api/messages"
import { cn } from "@/lib/utils"

interface SendToFriendDialogProps {
  readonly attachment: MessageAttachment
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function SendToFriendDialog({ attachment, open, onOpenChange }: SendToFriendDialogProps) {
  const { data: conversations, isLoading } = useConversations("primary", open)
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const sendMutation = useMutation({
    mutationFn: () =>
      sendDirectMessage(selectedHandle!, {
        body: note.trim() || `Chia sẻ ${attachment.title}`,
        attachment,
      }),
    onSuccess: () => {
      toast.success(`Đã gửi tới @${selectedHandle}`)
      onOpenChange(false)
      setSelectedHandle(null)
      setNote("")
    },
    onError: () => {
      toast.error("Không thể gửi tin nhắn, vui lòng thử lại sau")
    },
  })

  const handleSend = () => {
    if (!selectedHandle) return
    sendMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chia sẻ với bạn bè</DialogTitle>
          <DialogDescription>Gửi thẻ {attachment.title} trực tiếp qua tin nhắn.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Chọn người nhận</p>
          <ScrollArea className="h-48 rounded-surface border border-border/70 p-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner aria-label="Đang tải danh sách bạn bè" className="size-5" />
              </div>
            ) : !conversations?.length ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <MessageCircleIcon className="mb-2 size-6 opacity-40" />
                Chưa có hội thoại nào gần đây
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => {
                  const isSelected = selectedHandle === c.peer.handle
                  return (
                    <Button
                      key={c.peer.id}
                      type="button"
                      variant={isSelected ? "default" : "ghost"}
                      onClick={() => setSelectedHandle(c.peer.handle)}
                      className={cn(
                        "h-auto w-full justify-start gap-2.5 px-2.5 py-2 text-left font-normal",
                        isSelected ? "text-primary-foreground" : "text-foreground",
                      )}
                    >
                      <Avatar size="sm">
                        {c.peer.avatarUrl ? (
                          <AvatarImage src={c.peer.avatarUrl} alt={c.peer.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">{c.peer.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-semibold">{c.peer.name}</p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          @{c.peer.handle}
                        </p>
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <Field>
            <FieldLabel
              htmlFor="share-note-input"
              className="text-xs font-medium text-muted-foreground"
            >
              Lời nhắn kèm theo (tuỳ chọn)
            </FieldLabel>
            <Input
              id="share-note-input"
              placeholder="Thêm lời nhắn (không bắt buộc)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={!selectedHandle || sendMutation.isPending} onClick={handleSend}>
            {sendMutation.isPending ? (
              <Spinner aria-label="Đang gửi tin nhắn" className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Gửi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
