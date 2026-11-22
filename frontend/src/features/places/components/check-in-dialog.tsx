import { useEffect, useId, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CameraIcon, ImagePlusIcon, MapPinIcon, XIcon } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePost } from "@/features/social/hooks/use-create-post"
import { IMAGE_CONTENT_TYPES, MAX_CAPTION_LENGTH, MAX_POST_IMAGES } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { isMediaUnavailableError, requestMediaUpload, uploadMediaFile } from "@/lib/media-upload"
import { placePostsQueryKey } from "../hooks/use-place-posts"
import { categoryLabel } from "../lib/category-meta"
import type { Place } from "../types/place"

interface CheckInDialogProps {
  place: Place
  children: React.ReactElement
}

interface PendingImage {
  id: string
  file: File
  previewUrl: string
}

const ACCEPTED_IMAGE_TYPES = Object.fromEntries(
  IMAGE_CONTENT_TYPES.map((type) => [type, [] as string[]]),
)

export function CheckInDialog({ place, children }: CheckInDialogProps) {
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState("")
  const [images, setImages] = useState<PendingImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [mediaUnavailable, setMediaUnavailable] = useState(false)
  const fileInputId = useId()
  const imageSeq = useRef(0)
  const imagesRef = useRef(images)
  const createPost = useCreatePost()
  const queryClient = useQueryClient()

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl)
    }
  }, [])

  const canSubmit = caption.trim().length >= 3 && !createPost.isPending && !uploading

  function removeImage(id: string) {
    const target = imagesRef.current.find((image) => image.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    setImages((current) => current.filter((image) => image.id !== id))
  }

  function clearImages() {
    for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl)
    setImages([])
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setCaption("")
      clearImages()
    }
  }

  function handleFilesDropped(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return

    const accepted = acceptedFiles.slice(0, MAX_POST_IMAGES - imagesRef.current.length)
    if (accepted.length === 0) {
      toast.error(`Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`)
      return
    }
    if (accepted.length < acceptedFiles.length) {
      toast.error(`Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`)
    }

    const added: PendingImage[] = accepted.map((file) => {
      imageSeq.current += 1
      return {
        id: `checkin-img-${imageSeq.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }
    })
    setImages((current) => [...current, ...added])
  }

  const { getInputProps, open: openFilePicker } = useDropzone({
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: true,
    noClick: true,
    noDrag: true,
    disabled: images.length >= MAX_POST_IMAGES || uploading || mediaUnavailable,
    onDropAccepted: handleFilesDropped,
  })

  async function uploadImages(): Promise<string[] | null> {
    if (imagesRef.current.length === 0) return []
    setUploading(true)
    try {
      const urls: string[] = []
      for (const image of imagesRef.current) {
        const ticket = await requestMediaUpload("posts", image.file.type)
        urls.push(await uploadMediaFile(image.file, ticket))
      }
      return urls
    } catch (error) {
      if (isMediaUnavailableError(error)) {
        setMediaUnavailable(true)
        toast.error("Tính năng ảnh chưa được cấu hình")
      } else {
        toast.error(error instanceof Error ? error.message : "Không tải được ảnh. Thử lại nhé.")
      }
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    const uploaded = await uploadImages()
    if (uploaded === null) return

    createPost.mutate(
      {
        caption: caption.trim(),
        placeId: place.id,
        ...(uploaded.length > 0 ? { images: uploaded } : {}),
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: placePostsQueryKey(place.id) })
          toast.success(`Đã check-in tại “${place.name}”`)
          setCaption("")
          clearImages()
          setOpen(false)
        },
        onError: () => toast.error("Không đăng được bài, thử lại nhé"),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      trigger={children}
      title={`Check-in tại ${place.name}`}
      description="Chia sẻ cảm nhận và hình ảnh món ăn của bạn tại địa điểm này."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
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

        {images.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <li key={image.id} className="relative">
                <img
                  src={image.previewUrl}
                  alt={`Ảnh check-in ${index + 1}`}
                  className="size-20 rounded-control border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label={`Xoá ảnh ${index + 1}`}
                  className="absolute -top-1.5 -right-1.5 size-6 rounded-full shadow"
                  onClick={() => removeImage(image.id)}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {!mediaUnavailable ? (
          <div className="flex items-center justify-between gap-2">
            <input {...getInputProps({ id: fileInputId, className: "sr-only" })} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={images.length >= MAX_POST_IMAGES || uploading}
              onClick={openFilePicker}
            >
              {uploading ? <Spinner aria-label="Đang tải ảnh lên" /> : <ImagePlusIcon />}
              Thêm ảnh món ăn
              {images.length > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {images.length}/{MAX_POST_IMAGES}
                </Badge>
              ) : null}
            </Button>
            <span className="text-xs text-muted-foreground">Tối đa {MAX_POST_IMAGES} ảnh</span>
          </div>
        ) : null}

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Huỷ
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {createPost.isPending || uploading ? (
              <Spinner aria-label="Đang đăng check-in" />
            ) : (
              <CameraIcon />
            )}
            Đăng check-in
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
