import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CameraIcon, MapPinIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePost } from "@/features/social/hooks/use-create-post"
import { categoryLabel } from "../lib/category-meta"
import { placePostsQueryKey } from "../hooks/use-place-posts"
import type { Place } from "../types/place"

/** Ảnh minh hoạ xoay vòng — người dùng bấm "Đổi ảnh" để chọn ảnh khác. */
const IMAGE_SEEDS = ["checkin-01", "checkin-02", "checkin-03", "checkin-04"]

interface CheckInDialogProps {
  place: Place
  children: React.ReactElement
}

/**
 * Đăng bài check-in tại một địa điểm.
 *
 * Địa điểm được gắn sẵn và không thể bỏ (khác `PostComposer` ở /social) — đây là
 * check-in, nên `placeId` luôn có giá trị. Sau khi đăng, làm mới tab "Bài đăng"
 * của trang địa điểm để bài mới xuất hiện ngay.
 */
export function CheckInDialog({ place, children }: CheckInDialogProps) {
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState("")
  const [seedIndex, setSeedIndex] = useState(0)
  const createPost = useCreatePost()
  const queryClient = useQueryClient()

  const canSubmit = caption.trim().length >= 3 && !createPost.isPending

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setCaption("")
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    createPost.mutate(
      {
        caption: caption.trim(),
        imageSeed: IMAGE_SEEDS[seedIndex % IMAGE_SEEDS.length],
        placeId: place.id,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: placePostsQueryKey(place.id) })
          toast.success(`Đã check-in tại “${place.name}”`)
          setCaption("")
          setOpen(false)
        },
        onError: () => toast.error("Không đăng được bài, thử lại nhé"),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Check-in tại {place.name}</DialogTitle>
            <DialogDescription>
              Bài đăng sẽ gắn sẵn địa điểm này và xuất hiện ở tab “Bài đăng” của quán.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate font-semibold">{place.name}</span>
            <Badge variant="outline" className="h-6 text-sm">
              {categoryLabel(place.category)}
            </Badge>
          </div>

          <Field>
            <FieldLabel htmlFor="checkin-caption">Nội dung bài đăng</FieldLabel>
            <Textarea
              id="checkin-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              placeholder="Bạn vừa ăn gì ở đây? Không khí, giá cả, điểm đáng quay lại…"
              className="min-h-24 resize-none"
              autoFocus
            />
            <FieldDescription>{caption.trim().length}/500 ký tự</FieldDescription>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="sm:mr-auto"
              onClick={() => setSeedIndex((index) => index + 1)}
            >
              <RefreshCwIcon />
              Đổi ảnh
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createPost.isPending ? <Spinner /> : <CameraIcon />}
              Đăng check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
