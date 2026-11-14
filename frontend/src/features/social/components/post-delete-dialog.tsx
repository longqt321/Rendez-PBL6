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
import { Spinner } from "@/components/ui/spinner"
import { useDeletePost } from "../hooks/use-delete-post"

interface PostDeleteDialogProps {
  postId: string
  open: boolean
  onClose: () => void
}

/** Xác nhận xoá bài đăng — `AlertDialog` có sẵn, không tự dựng. */
export function PostDeleteDialog({ postId, open, onClose }: PostDeleteDialogProps) {
  const deletePost = useDeletePost()

  return (
    <AlertDialog
      open={open}
      onOpenChange={(dialogOpen) => {
        if (!dialogOpen) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bài đăng này?</AlertDialogTitle>
          <AlertDialogDescription>
            Bài đăng sẽ bị xoá vĩnh viễn, không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deletePost.isPending}
            onClick={() => {
              deletePost.mutate(postId, { onSettled: onClose })
            }}
          >
            {deletePost.isPending ? (
              <>
                <Spinner aria-label="Đang xoá bài đăng" className="size-4" />
                Đang xoá…
              </>
            ) : (
              "Xoá"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
