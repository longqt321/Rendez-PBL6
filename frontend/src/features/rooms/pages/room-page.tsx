import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  LayoutGridIcon,
  LogOutIcon,
  MapIcon,
  SearchXIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { MAX_MEMBER_NAME_LENGTH } from "@/lib/constants"
import { formatInitials } from "@/lib/format"
import { ProposalForm } from "../components/proposal-form"
import { ProposalList } from "../components/proposal-list"
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import { roomFilterChips } from "../lib/room"
import type { Room } from "../types/room"

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
      toast.success("Đã vào phòng, kết quả lọc sẽ dùng chung cho cả nhóm")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không vào được phòng")
    }
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

  const isActive = activeCode === room.code
  const activeChips = roomFilterChips(room)

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
    <PageContainer size="wide">
      <Breadcrumb className="mb-4">
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

      {/* Room Command Banner */}
      <SurfaceCard variant="accent" padding="lg" className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {room.name}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {room.code}
              </Badge>
              {isActive ? <Badge>Đang đồng bộ</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Bàn tròn chốt quán: mỗi người gửi điều mình muốn hoặc không muốn, danh sách quán phù
              hợp sẽ tự cập nhật bên phải.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ShareButton
              title={`Vào phòng lọc “${room.name}”`}
              url={`/rooms/${room.code}`}
              label="Mời bạn bè"
            />
            {isActive ? (
              <Button
                variant="outline"
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
                  className="h-8 w-28 bg-card text-xs"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || event.keyCode === 229) return
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
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Thành viên trong phòng */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {room.members.map((member) => (
                <Avatar
                  key={member.id}
                  size="sm"
                  title={member.displayName}
                  className="ring-2 ring-background"
                >
                  <AvatarFallback className="bg-secondary text-xs font-bold">
                    {formatInitials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {room.members.length} thành viên trong phòng
            </span>
          </div>

          {/* Bảng tổng hợp điều kiện đang có hiệu lực */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Đang lọc:</span>
            {activeChips.length > 0 ? (
              activeChips.map((chip) => (
                <Badge
                  key={`${chip.kind}-${chip.label}`}
                  variant="outline"
                  className={
                    chip.kind === "exclude"
                      ? "border-destructive/40 bg-destructive/10 text-xs text-destructive"
                      : "border-primary/40 bg-primary/10 text-xs text-primary"
                  }
                >
                  {chip.label}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Chưa có điều kiện nào</span>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Workspace 2 cột: Trái (Đề xuất) | Phải (Kết quả quán trực tiếp) */}
      <SplitLayout ratio="5-7" gap="lg">
        <StickyAside span={5} className="space-y-6">
          <SurfaceCard>
            <SectionHeading className="mb-3">Đề xuất của bạn</SectionHeading>
            <ProposalForm
              onSubmit={(input) => {
                void addMyProposal(room.code, input)
                  .then(() => toast.success("Đã gửi đề xuất cho cả nhóm"))
                  .catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Không gửi được đề xuất"),
                  )
              }}
            />
          </SurfaceCard>

          <section aria-label="Đề xuất của cả nhóm">
            <SectionHeading className="mb-3">Đề xuất của cả nhóm</SectionHeading>
            <ProposalList
              room={room}
              onApply={(proposalId) => void handleApply(proposalId)}
              onDismiss={(proposalId) => {
                void dismissProposal(room.code, proposalId).catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Không bỏ qua được đề xuất"),
                )
              }}
            />
          </section>
        </StickyAside>

        <SplitMain span={7}>
          <RoomMatchingPlaces room={room} />
        </SplitMain>
      </SplitLayout>
    </PageContainer>
  )
}

function RoomMatchingPlaces({ room }: Readonly<{ room: Room }>) {
  const query = useDiscoverPlaces({
    category: "all",
    district: "all",
    query: "",
    sort: "rating",
    room: {
      categories: room.filter.categories,
      excludedCategories: room.filter.excludedCategories,
      districts: room.filter.districts,
      excludedDistricts: room.filter.excludedDistricts,
      includeKeywords: room.filter.includeKeywords,
      excludeKeywords: room.filter.excludeKeywords,
      priceMax: room.filter.priceMax,
    },
  })

  const places = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.meta?.totalResults ?? places.length

  return (
    <section aria-labelledby="room-matches-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionHeading
            id="room-matches-heading"
            icon={<SparklesIcon className="size-4 text-primary" aria-hidden="true" />}
          >
            Quán phù hợp với cả nhóm
          </SectionHeading>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {query.isPending
              ? "Đang tìm quán khớp điều kiện…"
              : `Đang có ${total} địa điểm phù hợp tại Đà Nẵng`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link to="/discover" />}>
            <LayoutGridIcon className="size-3.5" aria-hidden="true" />
            Xem dạng lưới
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/map" />}>
            <MapIcon className="size-3.5" aria-hidden="true" />
            Bản đồ nhóm
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PlaceCardSkeleton key={i} imageHeight={200} />
          ))}
        </div>
      ) : places.length === 0 ? (
        <Empty className="border border-dashed border-border bg-card/50 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không còn quán nào khớp bộ lọc</EmptyTitle>
            <EmptyDescription>
              Các điều kiện hiện tại đang loại hết kết quả. Hãy bỏ qua hoặc giảm bớt một vài ràng
              buộc.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {places.slice(0, 8).map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
