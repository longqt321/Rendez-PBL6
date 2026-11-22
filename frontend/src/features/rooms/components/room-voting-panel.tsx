import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  CrownIcon,
  DicesIcon,
  HeartIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { SafeImage } from "@/components/shared/safe-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Room, RoomCandidate, RoomVotingMode } from "@rendez/schema"
import { formatPlaceTrustLabel } from "@/features/places/lib/review-tier-meta"
import { useRoomVoting } from "../hooks/use-room-voting"

interface RoomVotingPanelProps {
  room: Room
  isOwner: boolean
  onRoomUpdated: (room: Room) => void
}

export function RoomVotingPanel({ room, isOwner, onRoomUpdated }: RoomVotingPanelProps) {
  const voting = useRoomVoting(room.code, onRoomUpdated)
  const [selectedMode, setSelectedMode] = useState<RoomVotingMode>(room.votingMode)
  const [undoHistory, setUndoHistory] = useState<string[]>([])
  const [ranks, setRanks] = useState<Record<string, 1 | 2 | 3>>({})

  const candidates = room.candidates
  const summaryByCandidate = useMemo(
    () => new Map(room.voteSummaries.map((s) => [s.candidateId, s])),
    [room.voteSummaries],
  )

  const unvotedCandidates = useMemo(
    () => candidates.filter((c) => !summaryByCandidate.get(c.id)?.myDecision),
    [candidates, summaryByCandidate],
  )
  const currentCard = unvotedCandidates[0] ?? null

  // Keyboard support for SwipeDeck (WCAG 2.5.1)
  useEffect(() => {
    if (room.phase !== "voting" || room.votingMode !== "swipe_match" || !currentCard) return
    const card = currentCard
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        void handleSwipe(card, "pass")
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        void handleSwipe(card, "like")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  async function handleSwipe(candidate: RoomCandidate, decision: "like" | "pass") {
    try {
      await voting.castVote({ mode: "swipe_match", candidateId: candidate.id, decision })
      setUndoHistory((prev) => [...prev, candidate.id])
    } catch {
      toast.error("Không gửi được lựa chọn, thử lại nhé")
    }
  }

  async function handleUndo() {
    const lastId = undoHistory.at(-1)
    if (!lastId) return
    // Re-open by flipping or letting user re-vote; in Clean Break we cast opposite or let user pick again
    const prevDecision = summaryByCandidate.get(lastId)?.myDecision
    const flipped = prevDecision === "like" ? "pass" : "like"
    try {
      await voting.castVote({ mode: "swipe_match", candidateId: lastId, decision: flipped })
      setUndoHistory((prev) => prev.slice(0, -1))
      toast.info(`Đã đổi lựa chọn sang "${flipped === "like" ? "Chọn" : "Bỏ qua"}"`)
    } catch {
      toast.error("Không hoàn tác được")
    }
  }

  async function handleStartVoting(mode: RoomVotingMode) {
    try {
      await voting.startVoting(mode)
      toast.success("Đã bắt đầu phiên bình chọn!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể bắt đầu bình chọn")
    }
  }

  async function handleSubmitRanks() {
    const entries = Object.entries(ranks)
      .map(([candidateId, rank]) => ({ candidateId, rank }))
      .sort((a, b) => a.rank - b.rank)
    if (entries.length === 0) {
      toast.error("Chọn ít nhất 1 quán bạn thích")
      return
    }
    try {
      await voting.castVote({ mode: "ranked_choice", rankings: entries })
      toast.success("Đã gửi xếp hạng Top lựa chọn của bạn!")
    } catch {
      toast.error("Không gửi được xếp hạng")
    }
  }

  async function handleFinalize(winnerPlaceId?: string) {
    try {
      await voting.finalizeVoting(winnerPlaceId)
      toast.success("Đã chốt quán cho cả nhóm!")
    } catch {
      toast.error("Không chốt được quán")
    }
  }

  // Pha 3: Đã chốt quán
  if (room.phase === "locked" && room.winnerPlaceId) {
    const winner = candidates.find((c) => c.placeId === room.winnerPlaceId)
    if (!winner) return null
    return (
      <Card className="border-primary/40 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {winner.place.imageUrl ? (
            <SafeImage
              src={winner.place.imageUrl}
              alt={winner.place.name}
              className="h-32 w-full rounded-surface object-cover sm:w-44"
            />
          ) : null}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge className="gap-1">
                <CrownIcon className="size-3.5" />
                Đã chốt kèo
              </Badge>
              {winner.place.district ? (
                <Badge variant="outline">{winner.place.district}</Badge>
              ) : null}
            </div>
            <h3 className="font-display text-xl font-bold">{winner.place.name}</h3>
            <p className="text-sm text-muted-foreground">{winner.place.address}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button render={<Link to={`/discover/${winner.place.id}`} />}>
                Xem chi tiết & Chỉ đường
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Pha 1: Lọc & Shortlist ứng viên (gọn 1 dòng khi chưa có ứng viên)
  if (room.phase === "filtering") {
    if (candidates.length === 0) {
      return (
        <div className="flex items-center justify-between rounded-control border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Chọn ít nhất 2 quán bên dưới để mở bình chọn nhóm (Quẹt chọn / Top 3 / Quay ngẫu nhiên).
          </span>
        </div>
      )
    }
    return (
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold">
              Danh sách ứng viên ({candidates.length}/15)
            </h3>
            <p className="text-xs text-muted-foreground">
              Thêm ít nhất 2 quán từ danh sách bên dưới để mở bình chọn nhóm.
            </p>
          </div>
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              {(["swipe_match", "ranked_choice", "random_wheel"] as RoomVotingMode[]).map(
                (mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={selectedMode === mode ? "default" : "outline"}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {mode === "swipe_match"
                      ? "Quẹt chọn"
                      : mode === "ranked_choice"
                        ? "Xếp hạng Top 3"
                        : "Quay ngẫu nhiên"}
                  </Button>
                ),
              )}
              <Button
                type="button"
                disabled={
                  voting.pending || candidates.length < (selectedMode === "random_wheel" ? 1 : 2)
                }
                onClick={() => void handleStartVoting(selectedMode)}
              >
                {selectedMode === "random_wheel" ? (
                  <DicesIcon className="size-4" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                {selectedMode === "random_wheel" ? "Quay chốt ngay" : "Bắt đầu bình chọn"}
              </Button>
            </div>
          ) : null}
        </div>

        {candidates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {candidates.map((cand) => (
              <Badge key={cand.id} variant="secondary" className="gap-1.5 py-1 pr-1.5 pl-2.5">
                <span>{cand.place.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 rounded-full"
                  aria-label={`Bỏ ${cand.place.name}`}
                  onClick={() => void voting.removeCandidate(cand.id)}
                >
                  <XIcon className="size-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>
    )
  }

  // Pha 2: Đang bình chọn (Swipe Match hoặc Ranked Choice)
  const progressPct =
    room.votingProgress.totalActiveMembers > 0
      ? Math.round(
          (100 * room.votingProgress.votedMemberIds.length) /
            room.votingProgress.totalActiveMembers,
        )
      : 0

  const top3Liked = [...candidates]
    .sort(
      (a, b) =>
        (summaryByCandidate.get(b.id)?.likeCount ?? 0) -
        (summaryByCandidate.get(a.id)?.likeCount ?? 0),
    )
    .slice(0, 3)

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {room.votingMode === "swipe_match" ? "Quẹt chọn" : "Xếp hạng Top 3"}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {room.votingProgress.votedMemberIds.length}/{room.votingProgress.totalActiveMembers}{" "}
            người đã chọn
          </span>
        </div>
        {isOwner ? (
          <Button type="button" size="sm" onClick={() => void handleFinalize()}>
            <TrophyIcon className="size-4" />
            Chốt kết quả ngay
          </Button>
        ) : null}
      </div>

      <Progress value={progressPct} className="h-2" />

      {room.votingMode === "swipe_match" ? (
        currentCard ? (
          <div className="mx-auto flex w-full max-w-md flex-col gap-3">
            <Card className="overflow-hidden border-border/80">
              {currentCard.place.imageUrl ? (
                <SafeImage
                  src={currentCard.place.imageUrl}
                  alt={currentCard.place.name}
                  className="h-52 w-full object-cover"
                />
              ) : null}
              <div className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display text-lg font-bold">{currentCard.place.name}</h4>
                  {currentCard.place.reviewCount > 0 ? (
                    <Badge variant="secondary">
                      {formatPlaceTrustLabel(
                        currentCard.place.mustTryCount,
                        currentCard.place.reviewCount,
                      )}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentCard.place.district ?? currentCard.place.address}
                </p>
              </div>
            </Card>

            {/* Thumb Zone buttons >= 48px (WCAG 2.5.1 & 2.5.8) */}
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSwipe(currentCard, "pass")}
                disabled={voting.pending}
                className="min-h-12 flex-1 gap-2"
                aria-label="Bỏ qua quán này"
              >
                <XIcon className="size-5" />
                Bỏ qua
              </Button>
              {undoHistory.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleUndo()}
                  className="size-12"
                  aria-label="Hoàn tác lựa chọn trước"
                >
                  <RotateCcwIcon className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleSwipe(currentCard, "like")}
                disabled={voting.pending}
                className="min-h-12 flex-1 gap-2"
                aria-label="Chọn quán này"
              >
                <HeartIcon className="size-5" />
                Chọn
              </Button>
            </div>
          </div>
        ) : (
          /* Màn hình chờ tích cực + Fallback Top 3 khi không match 100% */
          <div className="flex flex-col gap-3 rounded-surface bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2Icon className="size-4 text-primary" />
              <span>Bạn đã bình chọn xong! Đang tổng hợp kết quả nhóm:</span>
            </div>
            <div className="flex flex-col gap-2">
              {top3Liked.map((cand) => {
                const likes = summaryByCandidate.get(cand.id)?.likeCount ?? 0
                return (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between rounded-control bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{cand.place.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{likes} lượt thích</Badge>
                      {isOwner ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleFinalize(cand.placeId)}
                        >
                          Chốt quán này
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      ) : (
        /* Ranked-Choice Top 3 */
        <div className="flex flex-col gap-3">
          {candidates.map((cand) => {
            const currentRank = ranks[cand.id]
            return (
              <div
                key={cand.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border/60 p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{cand.place.name}</p>
                  <p className="text-xs text-muted-foreground">{cand.place.district}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {([1, 2, 3] as const).map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={currentRank === r ? "default" : "outline"}
                      onClick={() =>
                        setRanks((prev) => {
                          const next = { ...prev }
                          for (const [k, v] of Object.entries(next)) {
                            if (v === r) delete next[k]
                          }
                          if (currentRank === r) delete next[cand.id]
                          else next[cand.id] = r
                          return next
                        })
                      }
                      className="min-h-10 min-w-10"
                    >
                      #{r}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
          <Button type="button" onClick={() => void handleSubmitRanks()} disabled={voting.pending}>
            Gửi xếp hạng Top 3
          </Button>
        </div>
      )}
    </Card>
  )
}
