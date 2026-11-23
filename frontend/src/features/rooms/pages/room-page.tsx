import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { SlidersHorizontalIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { formatInitials } from "@/lib/format"
import { ProposalForm } from "../components/proposal-form"
import { RoomHeader } from "../components/room-header"
import { RoomMatchingPlaces } from "../components/room-matching-places"
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import { roomFilterChips, type ParsedRoomProposalInput, type RoomFilterChip } from "../lib/room"
import type { RoomProposalField } from "../types/room"

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const isDesktop = useIsDesktop()
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

  async function handleJoin(rawName: string) {
    const name = rawName.trim()
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

  const criteriaCard = (
    <div className="space-y-4">
      <SurfaceCard padding="md">
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

      <SurfaceCard padding="md">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <SectionHeading className="flex items-center gap-1.5">
            <UsersIcon className="size-4 text-primary" aria-hidden="true" />
            Thành viên ({room.members.length})
          </SectionHeading>
        </div>
        <ul className="flex flex-wrap gap-2">
          {room.members.map((member) => (
            <li
              key={member.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pr-2.5 pl-1.5 text-xs"
            >
              <Avatar size="sm" className="size-5">
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {formatInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{member.displayName}</span>
              {member.isMe ? (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  Bạn
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  )

  const placesNode = (
    <RoomMatchingPlaces
      room={room}
      canReset={isMember && activeChips.length > 0}
      onResetFilters={handleResetFilters}
      onRoomUpdated={storeRoom}
    />
  )

  return (
    <PageContainer size="wide" padded="compact">
      <RoomHeader
        room={room}
        isMember={isMember}
        copiedCode={copiedCode}
        activeChips={activeChips}
        onCopyCode={handleCopyCode}
        onJoin={handleJoin}
        onLeave={() => {
          void leaveRoom(room.code)
            .then(() => toast.success("Đã rời phòng"))
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "Không rời được phòng"),
            )
        }}
        onRemoveChip={(chip) => void handleRemoveChip(chip)}
        onResetFilters={() => void handleResetFilters()}
      />

      {isDesktop ? (
        <SplitLayout ratio="5-7" gap="lg">
          <StickyAside span={5}>{criteriaCard}</StickyAside>
          <SplitMain span={7}>{placesNode}</SplitMain>
        </SplitLayout>
      ) : (
        <Tabs defaultValue="places">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="places" className="gap-1.5">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              Quán & Bình chọn
            </TabsTrigger>
            <TabsTrigger value="criteria" className="gap-1.5">
              <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
              Tiêu chí ({activeChips.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="places">{placesNode}</TabsContent>
          <TabsContent value="criteria">{criteriaCard}</TabsContent>
        </Tabs>
      )}
    </PageContainer>
  )
}
