import { useEffect, useId, useRef, useState } from "react"
import { CheckIcon, ImagePlusIcon, MapPinIcon, SparklesIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { SectionHeading } from "@/components/shared/section-heading"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  IMAGE_CONTENT_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_POST_IMAGES,
  PLACE_SUGGESTION_MIN_CHARS,
} from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { usePlaceSuggestions } from "@/features/places/hooks/use-place-suggestions"
import type { PlaceSummary } from "@/features/places/types/place"
import { toast } from "sonner"
import { isMediaUnavailableError, requestMediaUpload } from "../api/request-media-upload"
import { uploadPostImage } from "../api/upload-post-image"
import { useCreatePost } from "../hooks/use-create-post"

interface PostComposerProps {
  onCreated?: () => void
}

/** Ảnh đang chờ tải lên — preview tạo bằng `URL.createObjectURL`. */
interface PendingImage {
  id: string
  file: File
  previewUrl: string
}

/**
 * Ô soạn bài.
 *
 * Khi người dùng gõ, frontend hỏi server (`GET /places/suggestions`) và chỉ hiển
 * thị những gì server trả về. Không có bước xử lý nào chạy trên client.
 *
 * Ảnh (G5b): chọn file → khi bấm "Đăng" mới xin URL PUT đã ký (`POST /media`)
 * và tải từng ảnh lên R2, rồi gửi mảng `publicUrl` kèm bài đăng. Server từ chối
 * URL không thuộc thư mục của chính người đăng.
 */
export function PostComposer({ onCreated }: PostComposerProps) {
  const [caption, setCaption] = useState("")
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [images, setImages] = useState<PendingImage[]>([])
  const [uploading, setUploading] = useState(false)
  /** `POST /media` trả 503 — môi trường chưa có R2, ẩn nút upload. */
  const [mediaUnavailable, setMediaUnavailable] = useState(false)
  const captionId = useId()
  const suggestionsPanelId = useId()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageSeq = useRef(0)
  /** Chặn submit lặp khi upload ảnh còn đang chạy (trước cả `isPending`). */
  const submittingRef = useRef(false)

  const debouncedCaption = useDebouncedValue(caption, 450)
  const { data: suggestions = [], isFetching } = usePlaceSuggestions(debouncedCaption)
  const createPost = useCreatePost()

  // Preview là object URL — thu hồi khi composer unmount để không rò rỉ bộ nhớ.
  // Preview rời từng ảnh được thu hồi ngay ở `removeImage`/submit thành công.
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])
  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl)
    }
  }, [])

  function removeImage(id: string) {
    const target = imagesRef.current.find((image) => image.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    setImages((current) => current.filter((image) => image.id !== id))
  }

  function clearImages() {
    for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl)
    setImages([])
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      (IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type),
    )
    event.target.value = "" // chọn lại cùng file vẫn kích hoạt onChange
    if (files.length === 0) return

    // Mọi side effect (đếm slot, tạo blob URL, toast) chạy TRƯỚC khi dispatch:
    // updater của `setImages` phải thuần vì StrictMode gọi nó hai lần — tạo
    // objectURL trong updater sẽ rò rỉ blob và lặp toast.
    const accepted = files.slice(0, MAX_POST_IMAGES - imagesRef.current.length)
    if (accepted.length === 0) {
      toast.error(`Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`)
      return
    }
    if (accepted.length < files.length) {
      toast.error(`Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`)
    }

    const added: PendingImage[] = accepted.map((file) => {
      imageSeq.current += 1
      return {
        id: `img-${imageSeq.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }
    })

    setImages((current) => [...current, ...added])
  }

  const canSubmit = caption.trim().length >= 3 && !createPost.isPending && !uploading
  const canSuggest = caption.trim().length >= PLACE_SUGGESTION_MIN_CHARS

  /** Tải ảnh lên R2 qua presigned URL — trả mảng URL công khai theo thứ tự chọn. */
  async function uploadImages(): Promise<string[] | null> {
    if (imagesRef.current.length === 0) return []
    setUploading(true)
    try {
      const urls: string[] = []
      for (const image of imagesRef.current) {
        const ticket = await requestMediaUpload("posts", image.file.type)
        urls.push(await uploadPostImage(image.file, ticket))
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
    // `isPending` chỉ bật khi mutation chạy — upload ảnh diễn ra TRƯỚC đó, nên
    // cần cờ riêng để bấm Đăng hai lần liên tiếp không tạo hai bài. Cờ chỉ được
    // nhả sau khi mutation xong (`await mutateAsync`), không phải ngay sau khi
    // gọi — nếu không vẫn còn khe double-submit trong lúc request đang bay.
    if (submittingRef.current || !canSubmit) return
    submittingRef.current = true
    try {
      const uploaded = await uploadImages()
      if (uploaded === null) return // lỗi ảnh — giữ nguyên nội dung để người dùng thử lại

      await createPost.mutateAsync({
        caption: caption.trim(),
        placeId: selectedPlace?.id ?? null,
        ...(uploaded.length > 0 ? { images: uploaded } : {}),
      })

      setCaption("")
      setSelectedPlace(null)
      setShowSuggestions(false)
      clearImages()
      onCreated?.()
    } catch {
      // Lỗi tạo bài: giữ nguyên nội dung + ảnh để người dùng thử lại.
      toast.error("Không đăng được bài. Thử lại nhé.")
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
      className="rounded-md border border-border bg-card p-4 shadow-(--shadow-soft)"
    >
      <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
        <Field className="gap-0">
          <FieldLabel htmlFor={captionId} className="sr-only">
            Nội dung bài đăng
          </FieldLabel>
          <Textarea
            id={captionId}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={MAX_CAPTION_LENGTH}
            placeholder="Hôm nay bạn ăn gì? Kể vài dòng về quán, món, không khí…"
            className="min-h-28 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
          />
        </Field>

        {selectedPlace ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 font-semibold">{selectedPlace.name}</span>
            <Badge variant="outline" className="h-6 text-sm">
              {categoryLabel(selectedPlace.category)}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Bỏ gắn địa điểm"
              onClick={() => setSelectedPlace(null)}
            >
              <XIcon />
            </Button>
          </div>
        ) : null}

        {images.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {images.map((image, index) => (
              <li key={image.id} className="relative">
                <img
                  src={image.previewUrl}
                  alt={`Ảnh sẽ đính kèm ${index + 1}`}
                  className="size-20 rounded-md object-cover"
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

        <CollapsibleContent id={suggestionsPanelId}>
          {suggestions.length > 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border bg-muted/60 p-3">
              <SectionHeading icon={<SparklesIcon className="size-3.5" aria-hidden="true" />}>
                Địa điểm có thể bạn đang nói tới
              </SectionHeading>
              <ItemGroup className="mt-2 gap-1">
                {suggestions.map(({ place, reason }) => (
                  <Item
                    key={place.id}
                    variant="default"
                    render={
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlace(place)
                          setShowSuggestions(false)
                        }}
                      />
                    }
                    className="group gap-2 px-2 py-1.5 text-left hover:bg-accent/15"
                  >
                    <ItemMedia variant="icon">
                      <MapPinIcon className="size-3.5" aria-hidden="true" />
                    </ItemMedia>
                    <ItemContent className="gap-0">
                      <ItemTitle className="line-clamp-none font-semibold">{place.name}</ItemTitle>
                      <ItemDescription className="line-clamp-none">{reason}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <CheckIcon
                        className="size-3.5 shrink-0 opacity-0 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </div>
          ) : null}
        </CollapsibleContent>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
          <CollapsibleTrigger
            render={<Button type="button" variant="ghost" />}
            disabled={!canSuggest}
          >
            {isFetching ? <Spinner aria-label="Đang tìm gợi ý địa điểm" /> : <MapPinIcon />}
            Gắn địa điểm
            {suggestions.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {suggestions.length}
              </Badge>
            ) : null}
          </CollapsibleTrigger>

          {/* 503 từ `POST /media` → ẩn nút upload, bài chữ vẫn đăng bình thường. */}
          {mediaUnavailable ? (
            <span className="text-sm text-muted-foreground">Tính năng ảnh chưa được cấu hình</span>
          ) : (
            <>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept={IMAGE_CONTENT_TYPES.join(",")}
                multiple
                className="sr-only"
                onChange={handleFilesSelected}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={images.length >= MAX_POST_IMAGES || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Spinner aria-label="Đang tải ảnh lên" /> : <ImagePlusIcon />}
                Thêm ảnh
                {images.length > 0 ? (
                  <Badge variant="secondary" className="ml-1">
                    {images.length}/{MAX_POST_IMAGES}
                  </Badge>
                ) : null}
              </Button>
            </>
          )}

          <span className="ml-auto text-sm text-muted-foreground">
            {formatNumber(caption.trim().length)}/{formatNumber(MAX_CAPTION_LENGTH)}
          </span>

          <Button type="submit" disabled={!canSubmit}>
            {createPost.isPending || uploading ? <Spinner aria-label="Đang đăng bài" /> : null}
            Đăng
          </Button>
        </div>
      </Collapsible>
    </form>
  )
}
