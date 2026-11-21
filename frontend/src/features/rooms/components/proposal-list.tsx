import { useAutoAnimate } from "@formkit/auto-animate/react"
import { CheckIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { SectionHeading } from "@/components/shared/section-heading"
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
  const [resolvedListRef] = useAutoAnimate<HTMLDivElement>()
  const open = room.proposals.filter((proposal) => proposal.status === "open")
  const resolved = room.proposals.filter((proposal) => proposal.status !== "open")

  if (room.proposals.length === 0) {
    return (
      <Empty className="border border-dashed border-border py-6">
        <EmptyHeader>
          <EmptyTitle>Chưa có đề xuất nào</EmptyTitle>
          <EmptyDescription>
            Mỗi người gửi điều mình muốn có hoặc muốn tránh, cả nhóm cùng xem ở đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div ref={openListRef}>
        {open.length > 0 ? (
          <ItemGroup className="gap-2.5">
            {open.map((proposal) => (
              <Item
                key={proposal.id}
                variant="outline"
                className={cn(
                  "rounded-surface bg-card p-3.5 shadow-(--shadow-soft)",
                  proposal.kind === "exclude"
                    ? "border-l-4 border-l-destructive"
                    : "border-l-4 border-l-primary",
                )}
              >
                <ItemContent>
                  <ItemTitle className="font-semibold">{describeProposal(proposal)}</ItemTitle>
                  <ItemDescription>
                    {memberName(room, proposal.memberId)} · {STATUS_LABEL[proposal.status]}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button size="sm" onClick={() => onApply(proposal.id)}>
                    <CheckIcon aria-hidden="true" />
                    Áp dụng
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDismiss(proposal.id)}>
                    <XIcon aria-hidden="true" />
                    Bỏ qua
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="rounded-surface border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            Tất cả đề xuất đã được xử lý. Gửi thêm đề xuất mới bên trên nếu muốn tinh chỉnh tiếp.
          </p>
        )}
      </div>

      {resolved.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SectionHeading as="h3" className="text-muted-foreground">
            Lịch sử xử lý ({resolved.length})
          </SectionHeading>
          <div ref={resolvedListRef}>
            <ItemGroup className="gap-1.5">
              {resolved.map((proposal) => (
                <Item key={proposal.id} size="sm" variant="muted" className="rounded-control">
                  <ItemContent>
                    <ItemTitle className="text-sm">{describeProposal(proposal)}</ItemTitle>
                    <ItemDescription>
                      {memberName(room, proposal.memberId)} · {STATUS_LABEL[proposal.status]}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={proposal.status === "applied" ? "secondary" : "outline"}>
                      {STATUS_LABEL[proposal.status]}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </div>
        </div>
      ) : null}
    </div>
  )
}
