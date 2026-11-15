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
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import { ProposalForm } from "../components/proposal-form"
import { ProposalList } from "../components/proposal-list"

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const [joinName, setJoinName] = useState("")
  const {
    getRoom,
    getRoomStatus,
    retryRoom,
    activeCode,
    joinRoom,
    addMyProposal,
    applyProposal,
    dismissProposal,
    leaveRoom,
  } = useRooms()
  const room = getRoom(code)
  const status: RoomStatus = room ? "ready" : getRoomStatus(code)

  async function handleJoin() {
    const name = joinName.trim()
    if (!name) return
    try {
      const result = await joinRoom(code, name)
      if (result === "duplicate") {
        toast.error("Tên này đã có người dùng trong phòng — chọn tên khác")
        return
      }
      if (result === "not-found") {
        toast.error("Không tìm thấy phòng này")
        return
      }
      if (result === "already") {
        toast.success("Bạn đã ở trong phòng này")
        return
      }
      toast.success("Đã vào phòng — kết quả lọc dùng chung")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không vào được phòng")
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Đang tải phòng lọc nhóm</h1>
        <p className="mt-8 text-sm text-muted-foreground" role="status">
          Đang tải phòng…
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Không tải được phòng lọc nhóm</h1>
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyTitle>Không tải được phòng</EmptyTitle>
            <EmptyDescription>
              Kết nối tới máy chủ đang gián đoạn. Kiểm tra mạng rồi thử lại.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => retryRoom(code)}>
            Thử lại
          </Button>
        </Empty>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Không tìm thấy phòng lọc nhóm</h1>
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyTitle>Không tìm thấy phòng</EmptyTitle>
            <EmptyDescription>
              Mã phòng không đúng, hoặc phòng đã bị xoá. Hỏi lại bạn bè để nhận mã phòng mới.
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

  async function handleApply(proposalId: string) {
    if (!room) return
    try {
      const summary = await applyProposal(room.code, proposalId)
      toast.success(`Đã áp dụng: ${summary}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không áp dụng được đề xuất")
    }
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
                  void leaveRoom(room.code)
                    .then(() => toast.success("Đã rời phòng"))
                    .catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : "Không rời được phòng"),
                    )
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
                    if (event.key === "Enter" && joinName.trim()) void handleJoin()
                  }}
                  aria-label="Tên hiển thị của bạn"
                />
                <Button size="sm" disabled={!joinName.trim()} onClick={() => void handleJoin()}>
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
              void addMyProposal(room.code, input)
                .then(() => toast.success("Đã gửi đề xuất cho cả nhóm"))
                .catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Không gửi được đề xuất"),
                )
            }}
          />
        </CardContent>
      </Card>

      <section className="mt-6">
        <SectionHeading>Đề xuất của cả nhóm</SectionHeading>
        <Separator className="my-3" />
        <ProposalList
          room={room}
          onApply={(id) => void handleApply(id)}
          onDismiss={(id) => {
            void dismissProposal(room.code, id).catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "Không bỏ qua được đề xuất"),
            )
          }}
        />
      </section>
    </div>
  )
}
