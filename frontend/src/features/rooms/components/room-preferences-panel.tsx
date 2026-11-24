import { useMemo, useState } from "react"
import { PlusIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"
import {
  describeProposal,
  naturalQueryToProposalInputs,
  type ParsedRoomProposalInput,
} from "../lib/room"
import type { Room, RoomProposal, RoomProposalField } from "../types/room"

interface RoomPreferencesPanelProps {
  readonly room: Room
  readonly isMember: boolean
  readonly onAddProposals: (items: ParsedRoomProposalInput[]) => Promise<void>
  readonly onDeleteProposal: (proposalId: string) => Promise<void>
}

export function RoomPreferencesPanel({
  room,
  isMember,
  onAddProposals,
  onDeleteProposal,
}: RoomPreferencesPanelProps) {
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [chipMode, setChipMode] = useState<"include" | "exclude">("include")

  const meMember = room.members.find((m) => m.isMe)
  const parsedItems = useMemo(() => naturalQueryToProposalInputs(text), [text])

  const activeProposals = useMemo(
    () => room.proposals.filter((p) => p.status !== "dismissed"),
    [room.proposals],
  )

  const myProposals = useMemo(
    () => (meMember ? activeProposals.filter((p) => p.memberId === meMember.id) : []),
    [activeProposals, meMember],
  )

  const proposalsByMember = useMemo(() => {
    const grouped = new Map<string, RoomProposal[]>()
    for (const p of activeProposals) {
      const list = grouped.get(p.memberId) ?? []
      list.push(p)
      grouped.set(p.memberId, list)
    }
    return grouped
  }, [activeProposals])

  async function handleSubmitText() {
    if (parsedItems.length === 0 || submitting || !isMember) return
    setSubmitting(true)
    try {
      await onAddProposals(parsedItems)
      setText("")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleMyChip(
    field: RoomProposalField,
    value: string,
    kind: "include" | "exclude" = chipMode,
  ) {
    if (!isMember || submitting) return
    const existing = myProposals.find(
      (p) => p.kind === kind && p.field === field && p.value === value,
    )
    const opposite =
      field !== "priceMax"
        ? myProposals.find((p) => p.kind !== kind && p.field === field && p.value === value)
        : undefined
    setSubmitting(true)
    try {
      if (existing) {
        await onDeleteProposal(existing.id)
      } else {
        if (opposite) {
          await onDeleteProposal(opposite.id)
        }
        await onAddProposals([{ kind, field, value }])
      }
    } finally {
      setSubmitting(false)
    }
  }

  function hasMyChip(
    field: RoomProposalField,
    value: string,
    kind: "include" | "exclude" = chipMode,
  ): boolean {
    return myProposals.some((p) => p.kind === kind && p.field === field && p.value === value)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Mỗi người tự chọn tiêu chí riêng. Hệ thống sẽ xếp hạng và chỉ ra mâu thuẫn trên các địa điểm
        được đề xuất, không ẩn quán của người khác.
      </p>

      <div className="flex items-center gap-2">
        <InputGroup className="h-9 flex-1 bg-card">
          <InputGroupAddon>
            <SlidersHorizontalIcon className="size-3.5 text-primary" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="VD: cà phê Sơn Trà dưới 50k, không hải sản…"
            autoComplete="off"
            value={text}
            disabled={!isMember || submitting}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === "Enter" && parsedItems.length > 0) {
                e.preventDefault()
                void handleSubmitText()
              }
            }}
            aria-label="Nhập tiêu chí cá nhân"
          />
        </InputGroup>
        <Button
          type="button"
          size="sm"
          disabled={!isMember || submitting || parsedItems.length === 0}
          onClick={() => void handleSubmitText()}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          Thêm
        </Button>
      </div>

      {parsedItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-control border border-border/70 bg-muted/40 p-2">
          <span className="text-xs text-muted-foreground">Sẽ thêm cho bạn:</span>
          {parsedItems.map((item) => (
            <Badge key={`${item.kind}-${item.field}-${item.value}`} variant="outline">
              {describeProposal(item)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Chọn nhanh tiêu chí:</span>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[chipMode]}
            onValueChange={(values) => {
              const next = values[0]
              if (next === "include" || next === "exclude") setChipMode(next)
            }}
            aria-label="Chế độ chọn tiêu chí"
          >
            <ToggleGroupItem
              value="include"
              className="h-7 px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              Muốn đi
            </ToggleGroupItem>
            <ToggleGroupItem
              value="exclude"
              className="aria-pressed:text-destructive-foreground h-7 px-2.5 text-xs aria-pressed:bg-destructive"
            >
              Muốn tránh
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {chipMode === "include" ? "Loại hình bạn muốn" : "Loại hình bạn muốn tránh"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_META) as PlaceCategory[]).map((cat) => (
              <Toggle
                key={cat}
                size="sm"
                variant="outline"
                disabled={!isMember || submitting}
                pressed={hasMyChip("category", cat, chipMode)}
                onPressedChange={() => void handleToggleMyChip("category", cat, chipMode)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-xs",
                  chipMode === "exclude"
                    ? "aria-pressed:text-destructive-foreground aria-pressed:border-destructive aria-pressed:bg-destructive"
                    : "aria-pressed:bg-primary aria-pressed:text-primary-foreground",
                )}
              >
                {CATEGORY_META[cat].label}
              </Toggle>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {chipMode === "include" ? "Quận ưu tiên" : "Quận muốn tránh"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DANANG_DISTRICTS.map((district) => (
              <Toggle
                key={district}
                size="sm"
                variant="outline"
                disabled={!isMember || submitting}
                pressed={hasMyChip("district", district, chipMode)}
                onPressedChange={() => void handleToggleMyChip("district", district, chipMode)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-xs",
                  chipMode === "exclude"
                    ? "aria-pressed:text-destructive-foreground aria-pressed:border-destructive aria-pressed:bg-destructive"
                    : "aria-pressed:bg-primary aria-pressed:text-primary-foreground",
                )}
              >
                {district}
              </Toggle>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ngân sách tối đa</p>
          <div className="flex flex-wrap gap-1.5">
            {([1, 2, 3] as const).map((level) => (
              <Toggle
                key={level}
                size="sm"
                variant="outline"
                disabled={!isMember || submitting}
                pressed={hasMyChip("priceMax", String(level), "include")}
                onPressedChange={() =>
                  void handleToggleMyChip("priceMax", String(level), "include")
                }
                className="h-7 rounded-full px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {level < 3 ? `${priceLevelLabel(level)} trở xuống` : priceLevelLabel(level)}
              </Toggle>
            ))}
          </div>
        </div>
      </div>

      {activeProposals.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Tiêu chí của cả nhóm ({activeProposals.length})
          </p>
          <div className="space-y-2">
            {room.members.map((member) => {
              const items = proposalsByMember.get(member.id) ?? []
              if (items.length === 0) return null
              return (
                <div key={member.id} className="space-y-1">
                  <p className="text-xs font-medium">
                    {member.displayName} {member.isMe ? "(Bạn)" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((p) => (
                      <Badge
                        key={p.id}
                        variant="outline"
                        className={cn(
                          "gap-1 rounded-full text-xs",
                          p.kind === "exclude"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-primary/40 bg-primary/10 text-primary",
                        )}
                      >
                        <span>
                          {describeProposal({ kind: p.kind, field: p.field, value: p.value })}
                        </span>
                        {member.isMe ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="size-4 rounded-full"
                            aria-label="Xóa tiêu chí của bạn"
                            onClick={() => void onDeleteProposal(p.id)}
                          >
                            <XIcon className="size-3" aria-hidden="true" />
                          </Button>
                        ) : null}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
