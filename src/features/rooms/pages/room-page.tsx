import { useState } from "react"
import { Link, useParams } from "react-router"
import { LogOutIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SectionHeading } from "@/components/shared/section-heading"
import { formatInitials } from "@/lib/format"
import { ShareButton } from "@/components/shared/share-button"
import { MAX_MEMBER_NAME_LENGTH } from "@/lib/constants"
import { useRooms } from "../hooks/use-rooms"
import { ProposalForm } from "../components/proposal-form"
import { ProposalList } from "../components/proposal-list"
import { describeProposal } from "../lib/room"

/** Trang phòng lọc nhóm — `/rooms/:code`. */
export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const [joinName, setJoinName] = useState("")
  const {
    getRoom,
    activeCode,
    joinRoom,
    addMyProposal,
    applyProposal,
    dismissProposal,
    leaveRoom,
  } = useRooms()
  const room = getRoom(code)

  /** Tham gia bằng tên nhập tay — báo đúng nguyên nhân khi không vào được. */
  function handleJoin() {
    const status = joinRoom(code, joinName)
    if (status === "duplicate") {
      toast.error("Tên này đã có người dùng trong phòng — chọn tên khác")
      return
    }
    if (status === "not-found") {
      toast.error("Không tìm thấy phòng này")
      return
    }
    toast.success("Đã vào phòng — kết quả lọc dùng chung")
  }

  if (!room) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyTitle>Không tìm thấy phòng</EmptyTitle>
            <EmptyDescription>
              Mã phòng không đúng, hoặc phòng được tạo ở trình duyệt khác. Dữ liệu phòng chỉ lưu
              trên máy này.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" render={<Link to="/discover" />}>
            Về trang khám phá
          </Button>
        </Empty>
      </div>
    )
  }

  const isActive = activeCode === room.code

  function handleApply(proposalId: string) {
    const proposal = room?.proposals.find((item) => item.id === proposalId)
    if (!room || !proposal) return
    applyProposal(room.code, proposalId)
    toast.success(`Đã áp dụng: ${describeProposal(proposal)}`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Phòng lọc nhóm {room.name}</h1>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/discover" />}>Khám phá</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{room.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            {room.name}
            <Badge variant="secondary" className="font-mono">
              {room.code}
            </Badge>
            {isActive ? <Badge variant="outline">Đang lọc</Badge> : null}
          </CardTitle>
          <CardDescription>
            Mỗi người đề xuất điều mình muốn hoặc không muốn; cả nhóm cùng xem một kết quả lọc.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {room.members.map((member) => (
              <Avatar key={member.id} size="sm" title={member.displayName}>
                <AvatarFallback>{formatInitials(member.displayName)}</AvatarFallback>
              </Avatar>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {room.members.length} thành viên
            </span>
          </div>

          <div className="ml-auto flex flex-wrap gap-1.5">
            <ShareButton
              title={`Vào phòng lọc “${room.name}”`}
              url={`/rooms/${room.code}`}
              label="Mời bạn bè"
            />
            {isActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  leaveRoom(room.code)
                  toast.success("Đã rời phòng")
                }}
              >
                <LogOutIcon aria-hidden="true" />
                Rời phòng
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Tên bạn"
                  maxLength={MAX_MEMBER_NAME_LENGTH}
                  autoComplete="off"
                  className="h-8 w-28 text-xs"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && joinName.trim()) handleJoin()
                  }}
                  aria-label="Tên hiển thị của bạn"
                />
                <Button size="sm" disabled={!joinName.trim()} onClick={handleJoin}>
                  <UsersIcon aria-hidden="true" />
                  Tham gia
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Đề xuất của bạn</CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalForm
            onSubmit={(input) => {
              addMyProposal(room.code, input)
              toast.success("Đã gửi đề xuất cho cả nhóm")
            }}
          />
        </CardContent>
      </Card>

      <section className="mt-6">
        <SectionHeading>Đề xuất của cả nhóm</SectionHeading>
        <Separator className="my-3" />
        <ProposalList
          room={room}
          onApply={handleApply}
          onDismiss={(id) => dismissProposal(room.code, id)}
        />
      </section>
    </div>
  )
}
