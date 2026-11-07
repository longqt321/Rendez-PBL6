import { useState } from "react"
import { CheckIcon, MapPinIcon, SparklesIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { usePlaceSuggestions } from "@/features/places/hooks/use-place-suggestions"
import type { PlaceSummary } from "@/features/places/types/place"
import { useCreatePost } from "../hooks/use-create-post"

const IMAGE_SEEDS = ["post-new-01", "post-new-02", "post-new-03", "post-new-04"]

interface PostComposerProps {
  onCreated?: () => void
}

/**
 * Ô soạn bài.
 *
 * Khi người dùng gõ, frontend hỏi server (`GET /places/suggestions`) và chỉ hiển
 * thị những gì server trả về. Không có bước xử lý nào chạy trên client.
 */
export function PostComposer({ onCreated }: PostComposerProps) {
  const [caption, setCaption] = useState("")
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null)
  const [seedIndex, setSeedIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const debouncedCaption = useDebouncedValue(caption, 450)
  const { data: suggestions = [], isFetching } = usePlaceSuggestions(debouncedCaption)
  const createPost = useCreatePost()

  const canSubmit = caption.trim().length >= 3 && !createPost.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    createPost.mutate(
      {
        caption: caption.trim(),
        imageSeed: IMAGE_SEEDS[seedIndex % IMAGE_SEEDS.length],
        placeId: selectedPlace?.id ?? null,
      },
      {
        onSuccess: () => {
          setCaption("")
          setSelectedPlace(null)
          setShowSuggestions(false)
          onCreated?.()
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[0.25rem] border-2 border-foreground bg-card p-3 shadow-[4px_4px_0_0_var(--foreground)]"
    >
      <label htmlFor="post-caption" className="sr-only">
        Nội dung bài đăng
      </label>
      <Textarea
        id="post-caption"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        placeholder="Hôm nay bạn ăn gì? Kể vài dòng về quán, món, không khí…"
        className="min-h-20 resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />

      {selectedPlace ? (
        <div className="mt-2 flex items-center gap-2 rounded-[0.2rem] border-2 border-foreground bg-secondary px-2 py-1.5 text-xs">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1 font-semibold">{selectedPlace.name}</span>
          <Badge variant="outline" className="border-foreground">
            {categoryLabel(selectedPlace.category)}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Bỏ gắn địa điểm"
            onClick={() => setSelectedPlace(null)}
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      {showSuggestions && suggestions.length > 0 ? (
        <div className="mt-2 rounded-[0.2rem] border-2 border-dashed border-foreground/40 bg-muted/60 p-2">
          <p className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-wide uppercase">
            <SparklesIcon className="size-3" aria-hidden="true" />
            Địa điểm có thể bạn đang nói tới
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {suggestions.map(({ place, reason }) => (
              <li key={place.id}>
                <Item
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
                  className="group gap-2 px-1.5 py-1 text-left text-xs hover:bg-accent/15"
                >
                  <ItemMedia variant="icon">
                    <MapPinIcon className="size-3" aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="gap-0">
                    <ItemTitle className="line-clamp-none text-xs font-semibold">
                      {place.name}
                    </ItemTitle>
                    <ItemDescription className="line-clamp-none text-[0.68rem]">
                      {reason}
                    </ItemDescription>
                  </ItemContent>
                  <CheckIcon className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
                </Item>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t-2 border-dashed border-foreground/15 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowSuggestions((value) => !value)}
          aria-expanded={showSuggestions}
          disabled={caption.trim().length < 8}
        >
          {isFetching ? <Spinner /> : <MapPinIcon />}
          Gắn địa điểm
          {suggestions.length > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {suggestions.length}
            </Badge>
          ) : null}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSeedIndex((index) => index + 1)}
          aria-label="Đổi ảnh minh hoạ"
        >
          Đổi ảnh
        </Button>

        <span className="ml-auto text-[0.7rem] text-muted-foreground">
          {caption.trim().length}/500
        </span>

        <Button type="submit" size="sm" disabled={!canSubmit}>
          {createPost.isPending ? <Spinner /> : null}
          Đăng
        </Button>
      </div>
    </form>
  )
}
