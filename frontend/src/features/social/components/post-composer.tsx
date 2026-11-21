import { useEffect, useId, useRef, useState } from "react"
import { CheckIcon, ImagePlusIcon, MapPinIcon, SparklesIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { SectionHeading } from "@/components/shared/section-heading"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { usePlaceSuggestions } from "@/features/places/hooks/use-place-suggestions"
import { categoryLabel } from "@/features/places/lib/category-meta"
import type { PlaceSummary } from "@/features/places/types/place"
import { useMe } from "@/features/profile/hooks/use-me"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  IMAGE_CONTENT_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_POST_IMAGES,
  PLACE_SUGGESTION_MIN_CHARS,
} from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { isMediaUnavailableError, requestMediaUpload, uploadMediaFile } from "@/lib/media-upload"
import { useCreatePost } from "../hooks/use-create-post"

interface PostComposerProps {
  onCreated?: () => void
}

interface PendingImage {
  id: string
  file: File
  previewUrl: string
}

export function PostComposer({ onCreated }: PostComposerProps) {
  const { data: me } = useMe()
  const [caption, setCaption] = useState("")
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [placeQuery, setPlaceQuery] = useState("")
  const [images, setImages] = useState<PendingImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [mediaUnavailable, setMediaUnavailable] = useState(false)

  const captionId = useId()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageSeq = useRef(0)
  const submittingRef = useRef(false)

  const debouncedCaption = useDebouncedValue(caption, 450)
  const debouncedPlaceQuery = useDebouncedValue(placeQuery, 250)
  const { data: suggestions = [], isFetching } = usePlaceSuggestions(debouncedCaption)
  const placeLookup = useDiscoverPlaces(
    { category: "all", district: "all", query: debouncedPlaceQuery, sort: "rating" },
    { enabled: pickerOpen },
  )
  const searchedPlaces = placeLookup.data?.pages[0]?.items ?? []

  const createPost = useCreatePost()

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
    event.target.value = ""
    if (files.length === 0) return

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
  const showAutoSuggestions =
    !selectedPlace && caption.trim().length >= PLACE_SUGGESTION_MIN_CHARS && suggestions.length > 0

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
    if (submittingRef.current || !canSubmit) return
    submittingRef.current = true
    try {
      const uploaded = await uploadImages()
      if (uploaded === null) return

      await createPost.mutateAsync({
        caption: caption.trim(),
        placeId: selectedPlace?.id ?? null,
        ...(uploaded.length > 0 ? { images: uploaded } : {}),
      })

      setCaption("")
      setSelectedPlace(null)
      setPlaceQuery("")
      clearImages()
      onCreated?.()
    } catch {
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
      className="rounded-surface border border-border/80 bg-card p-4 shadow-(--shadow-soft) sm:p-5"
    >
      <div className="flex items-start gap-3">
        {me ? (
          <Avatar size="default" className="mt-1 hidden sm:flex">
            {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt={me.name} /> : null}
            <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
              {me.initials}
            </AvatarFallback>
          </Avatar>
        ) : null}

        <div className="min-w-0 flex-1">
          <Field className="gap-0">
            <FieldLabel htmlFor={captionId} className="sr-only">
              Nội dung bài đăng
            </FieldLabel>
            <Textarea
              id={captionId}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={MAX_CAPTION_LENGTH}
              placeholder="Viết bài..."
              className="min-h-24 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
          </Field>

          {selectedPlace ? (
            <div className="mt-3 flex items-center gap-2.5 rounded-control border border-primary/30 bg-primary/8 px-3 py-2 text-sm">
              <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-semibold">{selectedPlace.name}</span>
              <Badge variant="outline" className="h-6 shrink-0 text-xs">
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

          {showAutoSuggestions ? (
            <div className="mt-3 rounded-control border border-dashed border-border bg-muted/50 p-3">
              <SectionHeading
                icon={<SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />}
              >
                Gợi ý địa điểm từ nội dung
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
                        }}
                      />
                    }
                    className="group gap-2 rounded-control px-2 py-1.5 text-left hover:bg-accent/40"
                  >
                    <ItemMedia variant="icon">
                      <MapPinIcon className="size-3.5 text-primary" aria-hidden="true" />
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

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {/* Bộ chọn địa điểm chủ động luôn mở được bằng Command Combobox */}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                {isFetching ? (
                  <Spinner aria-label="Đang tìm gợi ý địa điểm" />
                ) : (
                  <MapPinIcon className="text-primary" />
                )}
                Gắn địa điểm
                {suggestions.length > 0 && !selectedPlace ? (
                  <Badge variant="secondary" className="ml-1">
                    {suggestions.length}
                  </Badge>
                ) : null}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    value={placeQuery}
                    onValueChange={setPlaceQuery}
                    placeholder="Tìm tên quán tại Đà Nẵng…"
                  />
                  <CommandList>
                    {placeLookup.isFetching ? (
                      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                        <Spinner className="mr-2 size-4" aria-label="Đang tìm địa điểm" />
                        Đang tìm quán…
                      </div>
                    ) : searchedPlaces.length === 0 ? (
                      <CommandEmpty>Không tìm thấy địa điểm nào.</CommandEmpty>
                    ) : (
                      <CommandGroup heading="Địa điểm tại Đà Nẵng">
                        {searchedPlaces.slice(0, 8).map((place) => (
                          <CommandItem
                            key={place.id}
                            value={place.id}
                            onSelect={() => {
                              setSelectedPlace({
                                id: place.id,
                                name: place.name,
                                address: place.address,
                                category: place.category,
                                isPublished: place.publishedAt !== null,
                              })
                              setPickerOpen(false)
                            }}
                          >
                            <MapPinIcon
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{place.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {place.address}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {mediaUnavailable ? (
              <span className="text-xs text-muted-foreground">Tính năng ảnh chưa cấu hình</span>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  aria-label="Chọn ảnh đính kèm"
                  accept={IMAGE_CONTENT_TYPES.join(",")}
                  multiple
                  className="sr-only"
                  onChange={handleFilesSelected}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 sm:min-h-0"
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

            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {formatNumber(caption.trim().length)}/{formatNumber(MAX_CAPTION_LENGTH)}
            </span>

            <Button type="submit" size="sm" disabled={!canSubmit}>
              {createPost.isPending || uploading ? <Spinner aria-label="Đang đăng bài" /> : null}
              Đăng bài
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
