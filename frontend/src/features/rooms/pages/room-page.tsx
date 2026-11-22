import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { CheckIcon, CopyIcon, LogOutIcon, RotateCcwIcon, UsersIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import { ShareButton } from "@/components/shared/share-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { MAX_MEMBER_NAME_LENGTH } from "@/lib/constants"
import { formatInitials } from "@/lib/format"
import { ProposalForm } from "../components/proposal-form"
import { RoomMatchingPlaces } from "../components/room-matching-places"
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import { roomFilterChips, type ParsedRoomProposalInput, type RoomFilterChip } from "../lib/room"
import type { RoomProposalField } from "../types/room"

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const [joinName, setJoinName] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    }
  }, [])
  const {
    getRoom,
    getRoomStatus,
    storeRoom,
    retryRoom,
    activeCode,
    joinRoom,
    addMyProposals,
    updateRoomFilter,
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
        toast.error("Tên này đã có người dùng trong phòng, vui lòng chọn tên khác")
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
      toast.success("Đã vào phòng, bộ lọc sẽ đồng bộ trực tiếp cho cả nhóm")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không vào được phòng")
    }
  }

  function handleCopyCode(roomCode: string) {
    void copyToClipboard(roomCode).then(() => {
      setCopiedCode(true)
      toast.success(`Đã sao chép mã phòng ${roomCode}`)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  if (status === "loading") {
    return (
      <PageContainer size="wide">
        <h1 className="sr-only">Đang tải phòng lọc nhóm</h1>
        <output className="mt-8 block text-sm text-muted-foreground">Đang tải phòng…</output>
      </PageContainer>
    )
  }

  if (status === "error") {
    return (
      <PageContainer size="narrow">
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
      </PageContainer>
    )
  }

  if (!room) {
    return (
      <PageContainer size="narrow">
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
      </PageContainer>
    )
  }

  const isMember = activeCode === room.code || room.members.some((m) => m.isMe)
  const activeChips = roomFilterChips(room)

  async function handleSubmitProposals(
    items: ParsedRoomProposalInput[],
    options: { autoApply: boolean; mode: "append" | "replace" },
  ) {
    if (!room) return
    try {
      await addMyProposals(room.code, items, options)
      toast.success(
        options.mode === "replace"
          ? "Đã ghi đè bộ lọc nhóm bằng tiêu chí mới"
          : "Đã cộng nối tiếp tiêu chí vào bộ lọc nhóm",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gửi được tiêu chí")
    }
  }

  async function handleQuickToggle(target: {
    kind: "include" | "exclude"
    field: RoomProposalField
    value: string
  }) {
    if (!room) return
    try {
      await updateRoomFilter(room.code, { action: "toggle", ...target })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không cập nhật được bộ lọc")
    }
  }

  async function handleRemoveChip(chip: RoomFilterChip) {
    if (!room) return
    try {
      await updateRoomFilter(room.code, {
        action: "remove",
        kind: chip.kind,
        field: chip.field,
        value: chip.value,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gỡ được điều kiện")
    }
  }

  async function handleResetFilters() {
    if (!room) return
    try {
      await updateRoomFilter(room.code, { action: "reset" })
      toast.success("Đã đặt lại toàn bộ bộ lọc phòng")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không đặt lại được bộ lọc")
    }
  }

  return (
    <PageContainer
      size="wide"
      padded="compact"
      className="lg:flex lg:h-[calc(100dvh-4.05rem)] lg:flex-col lg:overflow-hidden"
    >
      {/* Banner Phòng cố định ở đỉnh trang (shrink-0, không bị cuộn trôi) */}
      <SurfaceCard variant="accent" padding="sm" className="mb-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {room.name}
            </h1>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => handleCopyCode(room.code)}
              className="h-6 gap-1 font-mono text-xs"
              aria-label={`Sao chép mã phòng ${room.code}`}
            >
              <span>{room.code}</span>
              {copiedCode ? (
                <CheckIcon className="size-3 text-primary" aria-hidden="true" />
              ) : (
                <CopyIcon className="size-3 opacity-70" aria-hidden="true" />
              )}
            </Button>
            {isMember ? <Badge>Đang đồng bộ</Badge> : null}

            <div className="flex items-center gap-2 pl-1">
              <AvatarGroup>
                {room.members.map((member) => (
                  <Avatar key={member.id} size="sm" title={member.displayName}>
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {formatInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="text-xs font-medium text-muted-foreground">
                {room.members.length} thành viên
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ShareButton
              title={`Vào phòng lọc “${room.name}”`}
              url={`/rooms/${room.code}`}
              label="Mời bạn bè"
            />
            {isMember ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  void leaveRoom(room.code)
                    .then(() => toast.success("Đã rời phòng"))
                    .catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : "Không rời được phòng"),
                    )
                }}
              >
                <LogOutIcon className="size-3.5" aria-hidden="true" />
                Rời phòng
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Nhập tên bạn"
                  maxLength={MAX_MEMBER_NAME_LENGTH}
                  autoComplete="off"
                  className="h-7 w-28 bg-card text-xs"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || event.keyCode === 229) return
                    if (event.key === "Enter" && joinName.trim()) void handleJoin()
                  }}
                  aria-label="Tên hiển thị của bạn"
                />
                <Button size="xs" disabled={!joinName.trim()} onClick={() => void handleJoin()}>
                  <UsersIcon className="size-3.5" aria-hidden="true" />
                  Tham gia
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-2.5" />

        {/* Thanh điều kiện đang áp dụng cho phép gỡ từng thẻ hoặc đặt lại */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">
            Bộ lọc nhóm hiện tại:
          </span>
          {activeChips.length > 0 ? (
            <>
              {activeChips.map((chip) => (
                <Badge
                  key={`${chip.kind}-${chip.field}-${chip.value}`}
                  variant="outline"
                  className={
                    chip.kind === "exclude"
                      ? "h-6 gap-1 border-destructive/40 bg-destructive/10 pr-1 text-xs text-destructive"
                      : "h-6 gap-1 border-primary/40 bg-primary/10 pr-1 text-xs text-primary"
                  }
                >
                  <span>{chip.label}</span>
                  {isMember ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Gỡ tiêu chí ${chip.label}`}
                      onClick={() => void handleRemoveChip(chip)}
                      className="size-4 rounded-full"
                    >
                      <XIcon className="size-3" aria-hidden="true" />
                    </Button>
                  ) : null}
                </Badge>
              ))}
              {isMember ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => void handleResetFilters()}
                  className="h-6 px-2 text-xs text-muted-foreground"
                >
                  <RotateCcwIcon className="size-3" aria-hidden="true" />
                  Đặt lại
                </Button>
              ) : null}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Chưa đặt tiêu chí. Nhập yêu cầu hoặc chạm nhanh ở khung bên trái để lọc quán.
            </span>
          )}
        </div>
      </SurfaceCard>

      {/* Workspace 2 cột bằng SplitLayout: Cột trái đứng yên, Cột phải chỉ cuộn danh sách quán */}
      <SplitLayout
        ratio="5-7"
        gap="md"
        className="lg:min-h-0 lg:flex-1 lg:items-stretch lg:overflow-hidden"
      >
        <StickyAside
          span={5}
          sticky={false}
          className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
        >
          <SurfaceCard padding="md" className="flex-none">
            <SectionHeading className="mb-2.5">Thêm tiêu chí cho nhóm</SectionHeading>
            {!isMember ? (
              <Alert className="mb-3 border-dashed border-primary/40 bg-primary/5 py-2">
                <AlertDescription className="text-xs text-foreground">
                  Nhập tên ở góc trên để tham gia phòng trước khi thêm hoặc chỉnh sửa bộ lọc nhóm.
                </AlertDescription>
              </Alert>
            ) : null}
            <ProposalForm
              room={room}
              disabled={!isMember}
              onSubmitProposals={handleSubmitProposals}
              onQuickToggle={handleQuickToggle}
            />
          </SurfaceCard>
        </StickyAside>

        <SplitMain span={7} className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <RoomMatchingPlaces
            room={room}
            canReset={isMember && activeChips.length > 0}
            onResetFilters={handleResetFilters}
            onRoomUpdated={storeRoom}
          />
        </SplitMain>
      </SplitLayout>
    </PageContainer>
  )
}
