import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteComment } from "../hooks/use-delete-comment"
import type { Comment } from "../types/comment"

interface CommentDeleteDialogProps {
  postId: string
  comment: Comment | null
  onClose: () => void
}

export function CommentDeleteDialog({ postId, comment, onClose }: CommentDeleteDialogProps) {
  const deleteComment = useDeleteComment(postId)

  return (
    <AlertDialog
      open={comment !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bình luận này?</AlertDialogTitle>
          <AlertDialogDescription>
            Bình luận sẽ bị xoá vĩnh viễn, bao gồm cả các trả lời bên dưới.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteComment.isPending}
            onClick={() => {
              if (comment === null) return
              deleteComment.mutate(comment.id, {
                onSettled: onClose,
              })
            }}
          >
            {deleteComment.isPending ? "Đang xoá…" : "Xoá"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
