import { useId, useState } from "react"
import { CheckIcon, MapPinIcon, SparklesIcon, XIcon } from "lucide-react"
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
import { MAX_CAPTION_LENGTH, PLACE_SUGGESTION_MIN_CHARS } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
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
  const captionId = useId()
  const suggestionsPanelId = useId()

  const debouncedCaption = useDebouncedValue(caption, 450)
  const { data: suggestions = [], isFetching } = usePlaceSuggestions(debouncedCaption)
  const createPost = useCreatePost()

  const canSubmit = caption.trim().length >= 3 && !createPost.isPending
  const canSuggest = caption.trim().length >= PLACE_SUGGESTION_MIN_CHARS

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

          <Button
            type="button"
            variant="ghost"
            onClick={() => setSeedIndex((index) => index + 1)}
            aria-label="Đổi ảnh minh hoạ"
          >
            Đổi ảnh
          </Button>

          <span className="ml-auto text-sm text-muted-foreground">
            {formatNumber(caption.trim().length)}/{formatNumber(MAX_CAPTION_LENGTH)}
          </span>

          <Button type="submit" disabled={!canSubmit}>
            {createPost.isPending ? <Spinner aria-label="Đang đăng bài" /> : null}
            Đăng
          </Button>
        </div>
      </Collapsible>
    </form>
  )
}
