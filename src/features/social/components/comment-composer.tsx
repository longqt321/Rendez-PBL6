import { useRef, useState } from "react"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { MAX_CAPTION_LENGTH } from "@/lib/constants"
import { toast } from "sonner"
import { useCreateComment } from "../hooks/use-create-comment"
import type { Comment } from "../types/comment"

interface CommentComposerProps {
  postId: string
  /** Bình luận đang được trả lời; null = bình luận gốc. */
  replyTo: Comment | null
  onCancelReply: () => void
}

/**
 * Ô soạn bình luận — `Textarea` tự giãn nhờ `field-sizing-content`.
 *
 * Gửi lỗi: `toast.error()` và giữ nguyên nội dung đã gõ.
 */
export function CommentComposer({ postId, replyTo, onCancelReply }: CommentComposerProps) {
  const [body, setBody] = useState("")
  const createComment = useCreateComment(postId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const text = body.trim()
    if (text.length === 0) return

    createComment.mutate(
      { body: text, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setBody("")
          onCancelReply()
        },
        onError: () => {
          toast.error("Không gửi được bình luận. Thử lại nhé.")
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {replyTo !== null && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          Đang trả lời @{replyTo.author.handle}
          <Button variant="link" size="xs" onClick={onCancelReply}>
            Huỷ
          </Button>
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            replyTo !== null ? `Trả lời @{replyTo.author.handle}…` : "Viết bình luận của bạn…"
          }
          aria-label="Nội dung bình luận"
          maxLength={MAX_CAPTION_LENGTH}
          rows={1}
          className="min-h-9"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              handleSubmit()
            }
          }}
        />

        <Button
          size="icon"
          aria-label="Gửi bình luận"
          disabled={createComment.isPending || body.trim().length === 0}
          onClick={handleSubmit}
        >
          {createComment.isPending ? (
            <Spinner aria-label="Đang gửi bình luận" />
          ) : (
            <SendIcon aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
