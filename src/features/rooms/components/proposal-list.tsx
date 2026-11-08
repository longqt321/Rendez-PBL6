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
import type { Room, RoomProposal } from "../types/room"
import { describeProposal } from "../lib/room"

interface ProposalListProps {
  room: Room
  onApply: (proposalId: string) => void
  onDismiss: (proposalId: string) => void
}

const STATUS_LABEL: Record<RoomProposal["status"], string> = {
  open: "Chờ áp dụng",
  applied: "Đã áp dụng",
  dismissed: "Đã bỏ qua",
}

/** Tên thành viên đã đề xuất — "Bạn" cho chính người dùng. */
function memberName(room: Room, memberId: string): string {
  return room.members.find((member) => member.id === memberId)?.displayName ?? "Thành viên"
}

/**
 * Danh sách đề xuất của cả phòng.
 *
 * Ai cũng bấm được "Áp dụng" — nhóm bạn 4–8 người không cần phân quyền
 * (cùng lý do với nghiên cứu DX-9.4: host offline vẫn phải chốt được).
 */
export function ProposalList({ room, onApply, onDismiss }: ProposalListProps) {
  const open = room.proposals.filter((proposal) => proposal.status === "open")
  const resolved = room.proposals.filter((proposal) => proposal.status !== "open")

  if (room.proposals.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyTitle>Chưa có đề xuất nào</EmptyTitle>
          <EmptyDescription>
            Mỗi người gửi điều mình muốn có hoặc muốn loại bỏ, cả nhóm cùng xem ở đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ItemGroup className="gap-2">
        {open.map((proposal) => (
          <Item key={proposal.id} variant="outline">
            <ItemContent>
              <ItemTitle>{describeProposal(proposal)}</ItemTitle>
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

      {resolved.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Đã xử lý</h3>
          <ItemGroup className="gap-1.5">
            {resolved.map((proposal) => (
              <Item key={proposal.id} size="sm">
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
      ) : null}
    </div>
  )
}
