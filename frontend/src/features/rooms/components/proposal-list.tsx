import { useState } from "react"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { formatInitials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Room, RoomProposal } from "../types/room"
import { describeProposal } from "../lib/room"

interface ProposalListProps {
  room: Room
  onApply: (proposalId: string) => void
  onDismiss: (proposalId: string) => void
}

const STATUS_LABEL: Record<RoomProposal["status"], string> = {
  open: "Chờ chốt",
  applied: "Đã áp dụng",
  dismissed: "Đã bỏ qua",
}

function memberName(room: Room, memberId: string): string {
  return room.members.find((member) => member.id === memberId)?.displayName ?? "Thành viên"
}

export function ProposalList({ room, onApply, onDismiss }: ProposalListProps) {
  const [openListRef] = useAutoAnimate<HTMLDivElement>()
  const [showHistory, setShowHistory] = useState(false)
  const open = room.proposals.filter((proposal) => proposal.status === "open")
  const resolved = room.proposals.filter((proposal) => proposal.status !== "open")

  if (room.proposals.length === 0) {
    return (
      <Empty className="border border-dashed border-border py-5">
        <EmptyHeader>
          <EmptyTitle className="text-sm">Chưa có đề xuất nào</EmptyTitle>
          <EmptyDescription className="text-xs">
            Các đề xuất chờ duyệt hoặc nhật ký chốt tiêu chí của nhóm sẽ hiển thị tại đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={openListRef}>
        {open.length > 0 ? (
          <ItemGroup className="gap-2">
            {open.map((proposal) => {
              const name = memberName(room, proposal.memberId)
              return (
                <Item
                  key={proposal.id}
                  variant="outline"
                  className={cn(
                    "rounded-surface bg-card p-3 shadow-(--shadow-soft)",
                    proposal.kind === "exclude"
                      ? "border-l-4 border-l-destructive"
                      : "border-l-4 border-l-primary",
                  )}
                >
                  <ItemMedia>
                    <Avatar size="sm">
                      <AvatarFallback className="bg-secondary text-[11px] font-bold">
                        {formatInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-sm font-semibold">
                      {describeProposal(proposal)}
                    </ItemTitle>
                    <ItemDescription className="text-xs">{name}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button size="xs" onClick={() => onApply(proposal.id)}>
                      <CheckIcon aria-hidden="true" />
                      Chốt
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label="Bỏ qua đề xuất"
                      onClick={() => onDismiss(proposal.id)}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        ) : (
          <p className="rounded-control border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
            Không còn đề xuất nào đang chờ duyệt.
          </p>
        )}
      </div>

      {resolved.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 justify-between px-2 text-xs text-muted-foreground"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            <span>Lịch sử đã xử lý ({resolved.length})</span>
            {showHistory ? (
              <ChevronUpIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDownIcon className="size-3.5" aria-hidden="true" />
            )}
          </Button>
          {showHistory ? (
            <ItemGroup className="gap-1.5">
              {resolved.map((proposal) => (
                <Item key={proposal.id} size="sm" variant="muted" className="rounded-control">
                  <ItemContent>
                    <ItemTitle className="text-xs font-medium">
                      {describeProposal(proposal)}
                    </ItemTitle>
                    <ItemDescription className="text-[11px]">
                      {memberName(room, proposal.memberId)} · {STATUS_LABEL[proposal.status]}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge
                      variant={proposal.status === "applied" ? "secondary" : "outline"}
                      className="text-[11px]"
                    >
                      {STATUS_LABEL[proposal.status]}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
