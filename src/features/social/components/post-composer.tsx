import { useMemo, useState } from "react"
import { CheckIcon, MapPinIcon, SparklesIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getPlace, MOCK_PLACES } from "@/features/places/api/mock-places"
import { rankPlaceSuggestions } from "@/features/places/lib/rank-suggestions"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { useAppStore } from "@/stores/app-store"

const IMAGE_SEEDS = ["post-new-01", "post-new-02", "post-new-03", "post-new-04"]

interface PostComposerProps {
  onCreated?: () => void
}

/**
 * Ô soạn bài. Khi người dùng gõ nội dung, thuật toán gợi ý chạy ngay trên
 * client và hiện tối đa 3 địa điểm khớp nhất để gắn vào bài.
 */
export function PostComposer({ onCreated }: PostComposerProps) {
  const [caption, setCaption] = useState("")
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [seedIndex, setSeedIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const createPost = useAppStore((state) => state.createPost)
  const publishedPlaceIds = useAppStore((state) => state.publishedPlaceIds)

  const suggestions = useMemo(() => {
    if (caption.trim().length < 8) return []
    const candidates = MOCK_PLACES.filter(
      (place) => publishedPlaceIds.includes(place.id) && place.id !== placeId,
    )
    return rankPlaceSuggestions(caption, candidates, 3)
  }, [caption, placeId, publishedPlaceIds])

  const selectedPlace = placeId ? getPlace(placeId) : undefined
  const canSubmit = caption.trim().length >= 3

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    createPost({
      caption: caption.trim(),
      imageSeed: IMAGE_SEEDS[seedIndex % IMAGE_SEEDS.length],
      placeId,
    })
    setCaption("")
    setPlaceId(null)
    setShowSuggestions(false)
    onCreated?.()
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
            onClick={() => setPlaceId(null)}
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
                <button
                  type="button"
                  onClick={() => {
                    setPlaceId(place.id)
                    setShowSuggestions(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-[0.15rem] px-1.5 py-1 text-left text-xs hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <MapPinIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-semibold">{place.name}</span>
                    <span className="block text-[0.68rem] text-muted-foreground">{reason}</span>
                  </span>
                  <CheckIcon className="mt-0.5 size-3 shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
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
          <MapPinIcon />
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
          Đăng
        </Button>
      </div>
    </form>
  )
}
