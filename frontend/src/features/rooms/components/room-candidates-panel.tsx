import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CrownIcon,
  ExternalLinkIcon,
  MapPinIcon,
  NavigationIcon,
  PlusIcon,
  SearchIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Trash2Icon,
  VoteIcon,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import type { CastRoomVoteInput, RoomVotingMode } from "@rendez/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemActions, ItemContent, ItemDescription } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { formatDistance } from "@/lib/format"
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
  readonly onStartVoting?: (mode: RoomVotingMode) => Promise<unknown>
  readonly onCastVote?: (input: CastRoomVoteInput) => Promise<unknown>
  readonly onFinalizeVoting?: (winnerPlaceId?: string) => Promise<unknown>
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
  onStartVoting,
  onCastVote,
  onFinalizeVoting,
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
  const voteByCandidateId = new Map(room.voteSummaries.map((v) => [v.candidateId, v]))
  const meMember = room.members.find((m) => m.isMe)
  const isOwner = Boolean(meMember?.isOwner)

  const winnerCandidate = room.winnerPlaceId
    ? room.candidates.find((c) => c.placeId === room.winnerPlaceId)
    : undefined

  const searchResults = (searchQuery.data?.pages.flatMap((page) => page.items) ?? [])
    .filter((place) => !existingPlaceIds.has(place.id))
    .slice(0, 5)

  async function handlePropose(placeId: string, placeName: string) {
    try {
      await onAddCandidate(placeId)
      setSearchDraft("")
      onSelectPlace(placeId)
      toast.success(`Đã đề xuất “${placeName}” vào phòng`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không đề xuất được địa điểm này")
    }
  }

  async function handleRemove(candidateId: string, placeName: string) {
    try {
      await onRemoveCandidate(candidateId)
      toast.success(`Đã gỡ “${placeName}” khỏi danh sách đề xuất`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gỡ được địa điểm này")
    }
  }

  async function handleStartVoting(mode: RoomVotingMode) {
    if (!onStartVoting) return
    try {
      await onStartVoting(mode)
      toast.success(
        mode === "random_wheel"
          ? "Đã chọn ngẫu nhiên điểm hẹn cho nhóm!"
          : "Đã mở phiên bình chọn cho cả nhóm",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không bắt đầu được bình chọn")
    }
  }

  async function handleSwipeVote(candidateId: string, decision: "like" | "pass") {
    if (!onCastVote) return
    try {
      await onCastVote({ mode: "swipe_match", candidateId, decision })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không ghi nhận được phiếu bầu")
    }
  }

  async function handleFinalize(winnerPlaceId?: string) {
    if (!onFinalizeVoting) return
    try {
      await onFinalizeVoting(winnerPlaceId)
      toast.success("Đã chốt địa điểm hẹn cho cả nhóm!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không chốt được địa điểm")
    }
  }

  const canPropose =
    isMember && (room.phase === "filtering" || (room.phase === "locked" && isOwner))

  return (
    <div className="space-y-4">
      {/* Banner đã chốt điểm hẹn */}
      {room.phase === "locked" && winnerCandidate ? (
        <Card className="border-primary/40 bg-primary/10 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CrownIcon className="size-3.5" aria-hidden="true" />
                Đã chốt điểm hẹn
              </div>
              <p className="mt-1 truncate font-display text-base font-bold">
                {winnerCandidate.place.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {winnerCandidate.place.address}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {winnerCandidate.place.lat != null && winnerCandidate.place.lng != null ? (
              <Button
                size="xs"
                nativeButton={false}
                render={
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${winnerCandidate.place.lat},${winnerCandidate.place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <NavigationIcon className="size-3.5" aria-hidden="true" />
                Mở chỉ đường Google Maps
              </Button>
            ) : null}
            <Button
              size="xs"
              variant="outline"
              nativeButton={false}
              render={<Link to={`/discover/${winnerCandidate.place.id}`} />}
            >
              Xem chi tiết quán
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Thanh điều khiển Bình chọn / Chốt quán gọn */}
      {isMember && room.candidates.length >= 2 && room.phase === "filtering" && isOwner ? (
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemDescription className="text-xs">
              Chủ phòng có thể mở bình chọn để cả nhóm chốt nhanh.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              type="button"
              size="xs"
              disabled={pending}
              onClick={() => void handleStartVoting("swipe_match")}
            >
              <VoteIcon className="size-3.5" aria-hidden="true" />
              Mở bình chọn
            </Button>
          </ItemActions>
        </Item>
      ) : null}

      {room.phase === "voting" ? (
        <Item variant="outline" size="sm" className="border-primary/30 bg-primary/5">
          <ItemContent>
            <ItemDescription className="text-xs font-medium text-foreground">
              Đang bình chọn ({room.votingProgress.votedMemberIds.length}/
              {room.votingProgress.totalActiveMembers} người đã bầu)
            </ItemDescription>
          </ItemContent>
          {isOwner ? (
            <ItemActions>
              <Button
                type="button"
                size="xs"
                disabled={pending}
                onClick={() => void handleFinalize()}
              >
                <CrownIcon className="size-3.5" aria-hidden="true" />
                Chốt theo số phiếu
              </Button>
            </ItemActions>
          ) : null}
        </Item>
      ) : null}

      <div className="space-y-2">
        <InputGroup className="bg-card">
          <InputGroupAddon>
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={
              room.phase === "voting"
                ? "Đang bình chọn, tạm khoá thêm quán mới"
                : "Tìm tên quán để đề xuất cho nhóm..."
            }
            disabled={!canPropose}
            aria-label="Tìm quán để đề xuất"
          />
          {searchQuery.isPending && debouncedSearch.length >= 2 ? (
            <InputGroupAddon align="inline-end">
              <Spinner className="size-3.5" aria-label="Đang tìm quán" />
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
                    disabled={pending || !canPropose}
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
            const canRemove =
              isMember &&
              room.phase === "filtering" &&
              (item.candidate.addedByMemberId === meMember?.id || isOwner)
            const isSelected = selectedPlaceId === place.id
            const isWinner = room.winnerPlaceId === place.id
            const vote = voteByCandidateId.get(item.candidate.id)

            return (
              <Card
                key={item.candidate.id}
                onClick={() => onSelectPlace(place.id)}
                className={cn(
                  "cursor-pointer gap-2.5 p-3.5 transition-colors hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-primary/30",
                  isWinner && "border-primary ring-2 ring-primary/40",
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
                      {isWinner ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CrownIcon className="size-3" aria-hidden="true" />
                          Đã chốt
                        </Badge>
                      ) : null}
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
                          void handleRemove(item.candidate.id, place.name)
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
                      TB {formatDistance(item.avgDistanceKm)}
                      {item.maxDistanceKm !== null
                        ? ` · Xa nhất ${formatDistance(item.maxDistanceKm)}`
                        : ""}
                    </Badge>
                  ) : null}
                </div>

                {/* Hành động bình chọn / chốt trực tiếp khi đang voting */}
                {room.phase === "voting" && isMember ? (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="xs"
                        variant={vote?.myDecision === "like" ? "default" : "outline"}
                        disabled={pending}
                        onClick={() => void handleSwipeVote(item.candidate.id, "like")}
                      >
                        <ThumbsUpIcon className="size-3" aria-hidden="true" />
                        Thích ({vote?.likeCount ?? 0})
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={vote?.myDecision === "pass" ? "destructive" : "outline"}
                        disabled={pending}
                        onClick={() => void handleSwipeVote(item.candidate.id, "pass")}
                      >
                        <ThumbsDownIcon className="size-3" aria-hidden="true" />
                        Bỏ qua ({vote?.passCount ?? 0})
                      </Button>
                    </div>
                    {isOwner ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => void handleFinalize(place.id)}
                      >
                        <CrownIcon className="size-3" aria-hidden="true" />
                        Chốt quán này
                      </Button>
                    ) : null}
                  </div>
                ) : null}

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
                        <strong className="text-foreground">{formatDistance(d.distanceKm)}</strong>
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
