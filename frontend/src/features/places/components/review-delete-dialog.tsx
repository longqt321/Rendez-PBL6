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
import { useDeleteReview } from "../hooks/use-delete-review"

interface ReviewDeleteDialogProps {
  placeId: string
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}

/** Hộp thoại xác nhận xoá đánh giá của chính mình. */
export function ReviewDeleteDialog({ placeId, open, onClose, onDeleted }: ReviewDeleteDialogProps) {
  const deleteReviewMutation = useDeleteReview(placeId)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá đánh giá này?</AlertDialogTitle>
          <AlertDialogDescription>
            Đánh giá của bạn tại địa điểm này sẽ bị xoá và không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={deleteReviewMutation.isPending}>
            Giữ lại
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteReviewMutation.isPending}
            onClick={() => {
              deleteReviewMutation.mutate(undefined, {
                onSuccess: () => {
                  onClose()
                  onDeleted?.()
                },
              })
            }}
          >
            {deleteReviewMutation.isPending ? "Đang xoá…" : "Xoá"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
