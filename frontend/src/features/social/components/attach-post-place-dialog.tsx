import { useState } from "react"
import { CheckIcon, MapPinIcon, MapPinOffIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useUpdatePostPlace } from "../hooks/use-update-post-place"

interface AttachPostPlaceDialogProps {
  readonly postId: string
  readonly currentPlaceId?: string | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

/** Hộp thoại chọn và gắn (hoặc đổi / gỡ) địa điểm cho bài viết đã đăng. */
export function AttachPostPlaceDialog({
  postId,
  currentPlaceId,
  open,
  onOpenChange,
}: AttachPostPlaceDialogProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 200)
  const placeLookup = useDiscoverPlaces(
    { category: "all", query: debouncedQuery.trim() },
    { enabled: open },
  )
  const updatePostPlace = useUpdatePostPlace()

  const places = placeLookup.data?.pages[0]?.items ?? []

  function handleSelectPlace(placeId: string, placeName: string) {
    if (updatePostPlace.isPending) return
    updatePostPlace.mutate(
      { postId, placeId },
      {
        onSuccess: () => {
          toast.success(`Đã gắn địa điểm "${placeName}"`)
          setQuery("")
          onOpenChange(false)
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Không thể gắn địa điểm")
        },
      },
    )
  }

  function handleDetachPlace() {
    if (updatePostPlace.isPending || !currentPlaceId) return
    updatePostPlace.mutate(
      { postId, placeId: null },
      {
        onSuccess: () => {
          toast.success("Đã gỡ địa điểm khỏi bài viết")
          setQuery("")
          onOpenChange(false)
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Không thể gỡ địa điểm")
        },
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={currentPlaceId ? "Đổi địa điểm" : "Gắn địa điểm"}
      description="Tìm và chọn quán ăn hoặc địa điểm tại Đà Nẵng để gắn vào bài viết."
    >
      <div className="space-y-3">
        <Command shouldFilter={false} className="rounded-surface border border-border">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Tìm tên quán, địa chỉ tại Đà Nẵng…"
          />
          <CommandList className="max-h-72">
            {placeLookup.isFetching || updatePostPlace.isPending ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Spinner className="mr-2 size-4" aria-label="Đang xử lý" />
                {updatePostPlace.isPending ? "Đang cập nhật địa điểm…" : "Đang tìm quán…"}
              </div>
            ) : places.length === 0 ? (
              <CommandEmpty>Không tìm thấy địa điểm nào.</CommandEmpty>
            ) : (
              <CommandGroup heading="Địa điểm tại Đà Nẵng">
                {places.slice(0, 10).map((place) => {
                  const isCurrent = place.id === currentPlaceId
                  return (
                    <CommandItem
                      key={place.id}
                      value={place.id}
                      onSelect={() => handleSelectPlace(place.id, place.name)}
                    >
                      <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{place.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{place.address}</p>
                      </div>
                      {isCurrent ? (
                        <CheckIcon
                          className="size-4 shrink-0 text-primary"
                          aria-label="Đang chọn"
                        />
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        {currentPlaceId ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updatePostPlace.isPending}
              onClick={handleDetachPlace}
            >
              <MapPinOffIcon data-icon="inline-start" />
              Gỡ địa điểm hiện tại
            </Button>
          </div>
        ) : null}
      </div>
    </ResponsiveModal>
  )
}
