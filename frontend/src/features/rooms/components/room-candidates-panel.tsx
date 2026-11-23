import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { cn } from "@/lib/utils"
import type { ScoredCandidate } from "../lib/room-scoring"
import type { Room } from "../types/room"

interface RoomCandidatesPanelProps {
  readonly room: Room
  readonly scoredCandidates: readonly ScoredCandidate[]
  readonly selectedPlaceId: string | null
  readonly isMember: boolean
  readonly pending: boolean
  readonly onSelectPlace: (placeId: string) => void
  readonly onAddCandidate: (placeId: string) => Promise<unknown>
  readonly onRemoveCandidate: (candidateId: string) => Promise<unknown>
}

export function RoomCandidatesPanel({
  room,
  scoredCandidates,
  selectedPlaceId,
  isMember,
  pending,
  onSelectPlace,
  onAddCandidate,
  onRemoveCandidate,
}: RoomCandidatesPanelProps) {
  const [searchDraft, setSearchDraft] = useState("")
  const debouncedSearch = useDebounce(searchDraft.trim(), 250)

  const searchQuery = useDiscoverPlaces(
    {
      category: "all",
      district: "all",
      query: debouncedSearch,
      sort: "rating",
    },
    { enabled: debouncedSearch.length >= 2 },
  )

  const existingPlaceIds = new Set(room.candidates.map((c) => c.placeId))
  const memberMap = new Map(room.members.map((m) => [m.id, m]))
  const meMember = room.members.find((m) => m.isMe)

  const searchResults = (searchQuery.data?.pages.flatMap((page) => page.items) ?? [])
    .filter((place) => !existingPlaceIds.has(place.id))
    .slice(0, 5)

  async function handlePropose(placeId: string, placeName: string) {
    try {
      await onAddCandidate(placeId)
      setSearchDraft("")
      onSelectPlace(placeId)
      toast.success(`Đã đề xuất “${placeName}” vào phòng`)
    } catch {
      toast.error("Không đề xuất được địa điểm này")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <InputGroup className="bg-card">
          <InputGroupAddon>
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tìm tên quán để đề xuất cho nhóm..."
            disabled={!isMember}
            aria-label="Tìm quán để đề xuất"
          />
          {searchQuery.isPending && debouncedSearch.length >= 2 ? (
            <InputGroupAddon align="inline-end">
              <Spinner className="size-3.5" aria-hidden="true" />
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        {debouncedSearch.length >= 2 ? (
          <Card className="divide-y divide-border p-1.5">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Không tìm thấy quán mới phù hợp với “{debouncedSearch}”.
              </p>
            ) : (
              searchResults.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-2 rounded-control px-2.5 py-2 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{place.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {CATEGORY_META[place.category].label} · {place.district ?? place.address}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    disabled={pending}
                    onClick={() => void handlePropose(place.id, place.name)}
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                    Đề xuất
                  </Button>
                </div>
              ))
            )}
          </Card>
        ) : null}
      </div>

      {scoredCandidates.length === 0 ? (
        <Empty className="border border-dashed border-border py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Chưa có địa điểm nào được đề xuất</EmptyTitle>
            <EmptyDescription>
              Mỗi thành viên hãy tìm và đề xuất địa điểm mình muốn đi để hệ thống tính khoảng cách
              và đối chiếu tiêu chí cả nhóm.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {scoredCandidates.map((item, idx) => {
            const rank = idx + 1
            const place = item.candidate.place
            const proposer = memberMap.get(item.candidate.addedByMemberId)
            const canRemove = isMember && (proposer?.id === meMember?.id || meMember !== undefined)
            const isSelected = selectedPlaceId === place.id

            return (
              <Card
                key={item.candidate.id}
                onClick={() => onSelectPlace(place.id)}
                className={cn(
                  "cursor-pointer gap-2.5 p-3.5 transition-colors hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.conflicts.length === 0 ? "default" : "secondary"}
                        className="font-mono text-xs"
                      >
                        #{rank}
                      </Badge>
                      <h3 className="truncate font-display text-base font-bold">{place.name}</h3>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {CATEGORY_META[place.category].label} · {place.address}
                      {proposer ? ` · Đề xuất bởi ${proposer.displayName}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      nativeButton={false}
                      render={<Link to={`/discover/${place.id}`} />}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Xem chi tiết ${place.name}`}
                    >
                      <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation()
                          void onRemoveCandidate(item.candidate.id)
                        }}
                        aria-label={`Gỡ đề xuất ${place.name}`}
                      >
                        <Trash2Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Điểm đáp ứng tiêu chí & mâu thuẫn */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.totalCriteriaCount > 0 ? (
                    item.conflicts.length === 0 ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-primary/40 bg-primary/10 text-xs text-primary"
                      >
                        <CheckCircle2Icon className="size-3" aria-hidden="true" />
                        Đáp ứng {item.satisfiedCount}/{item.totalCriteriaCount} tiêu chí
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-destructive/40 bg-destructive/10 text-xs text-destructive"
                      >
                        <AlertTriangleIcon className="size-3" aria-hidden="true" />
                        Đáp ứng {item.satisfiedCount}/{item.totalCriteriaCount} ·{" "}
                        {item.conflicts.length} mâu thuẫn
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Chưa có tiêu chí đối chiếu
                    </Badge>
                  )}

                  {item.avgDistanceKm !== null ? (
                    <Badge variant="secondary" className="text-xs">
                      TB {item.avgDistanceKm} km
                      {item.maxDistanceKm !== null ? ` · Xa nhất ${item.maxDistanceKm} km` : ""}
                    </Badge>
                  ) : null}
                </div>

                {/* Chi tiết mâu thuẫn với từng người */}
                {item.conflicts.length > 0 ? (
                  <ul className="space-y-0.5 rounded-control bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
                    {item.conflicts.map((conflict) => (
                      <li key={`${conflict.memberId}-${conflict.proposalId}`}>
                        <strong>{conflict.memberName}:</strong> {conflict.reason}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Khoảng cách tới từng thành viên */}
                {item.distances.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {item.distances.map((d) => (
                      <span key={d.memberId}>
                        {d.displayName}:{" "}
                        <strong className="text-foreground">{d.distanceKm} km</strong>
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
