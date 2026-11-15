import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CameraIcon, MapPinIcon } from "lucide-react"
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
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { MAX_CAPTION_LENGTH } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { categoryLabel } from "../lib/category-meta"
import { placePostsQueryKey } from "../hooks/use-place-posts"
import type { Place } from "../types/place"

interface CheckInDialogProps {
  place: Place
  children: React.ReactElement
}

export function CheckInDialog({ place, children }: CheckInDialogProps) {
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState("")
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

          <Item variant="muted" size="sm" className="bg-secondary">
            <ItemMedia variant="icon">
              <MapPinIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="font-semibold">{place.name}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Badge variant="outline" className="h-6 text-sm">
                {categoryLabel(place.category)}
              </Badge>
            </ItemActions>
          </Item>

          <Field>
            <FieldLabel htmlFor="checkin-caption">Nội dung bài đăng</FieldLabel>
            <Textarea
              id="checkin-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))}
              maxLength={MAX_CAPTION_LENGTH}
              rows={4}
              placeholder="Bạn vừa ăn gì ở đây? Không khí, giá cả, điểm đáng quay lại…"
              className="min-h-24 resize-none"
              autoFocus
            />
            <FieldDescription>
              {formatNumber(caption.trim().length)}/{formatNumber(MAX_CAPTION_LENGTH)} ký tự
            </FieldDescription>
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createPost.isPending ? <Spinner aria-label="Đang đăng check-in" /> : <CameraIcon />}
              Đăng check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
