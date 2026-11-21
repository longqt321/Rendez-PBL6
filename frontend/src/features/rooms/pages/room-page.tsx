import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowUpDownIcon,
  CheckIcon,
  CopyIcon,
  LayoutGridIcon,
  LogOutIcon,
  MapIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { LoadMore } from "@/components/shared/load-more"
import { SectionHeading } from "@/components/shared/section-heading"
import { ShareButton } from "@/components/shared/share-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { PlacesMap } from "@/features/places/components/places-map"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { useMapPlaces } from "@/features/places/hooks/use-map-places"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { MAX_MEMBER_NAME_LENGTH } from "@/lib/constants"
import { formatInitials } from "@/lib/format"
import { ProposalForm } from "../components/proposal-form"
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import { roomFilterChips, type ParsedRoomProposalInput, type RoomFilterChip } from "../lib/room"
import type { Room, RoomProposalField } from "../types/room"

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const [joinName, setJoinName] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const {
    getRoom,
    getRoomStatus,
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
    if (!navigator.clipboard) return
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopiedCode(true)
      toast.success(`Đã sao chép mã phòng ${roomCode}`)
      setTimeout(() => setCopiedCode(false), 2000)
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
          />
        </SplitMain>
      </SplitLayout>
    </PageContainer>
  )
}

function RoomMatchingPlaces({
  room,
  canReset,
  onResetFilters,
}: Readonly<{
  room: Room
  canReset: boolean
  onResetFilters: () => Promise<void>
}>) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const [sort, setSort] = useState<"rating" | "newest">("rating")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [personalSearchDraft, setPersonalSearchDraft] = useState("")
  const personalSearch = useDebouncedValue(personalSearchDraft.trim(), 250)

  const roomFilterPayload = {
    categories: room.filter.categories,
    excludedCategories: room.filter.excludedCategories,
    districts: room.filter.districts,
    excludedDistricts: room.filter.excludedDistricts,
    includeKeywords: [...room.filter.includeKeywords, ...(personalSearch ? [personalSearch] : [])],
    excludeKeywords: room.filter.excludeKeywords,
    priceMax: room.filter.priceMax,
  }

  const listQuery = useDiscoverPlaces(
    {
      category: "all",
      district: "all",
      query: "",
      sort,
      room: roomFilterPayload,
    },
    { enabled: viewMode === "grid" },
  )

  const mapQuery = useMapPlaces(
    {
      category: "all",
      district: "all",
      query: "",
      sort,
      room: roomFilterPayload,
    },
    null,
    { allowUnbounded: true },
  )

  const sentinelRef = useInfiniteScroll({
    hasNextPage: viewMode === "grid" ? (listQuery.hasNextPage ?? false) : false,
    isFetchingNextPage: listQuery.isFetchingNextPage,
    fetchNextPage: () => void listQuery.fetchNextPage(),
  })

  const places = listQuery.data?.pages.flatMap((p) => p.items) ?? []
  const mapPlaces = mapQuery.data?.items ?? []
  const total =
    viewMode === "map"
      ? (mapQuery.data?.total ?? mapPlaces.length)
      : (listQuery.data?.pages[0]?.meta?.totalResults ?? places.length)

  const isPending = viewMode === "map" ? mapQuery.isPending : listQuery.isPending
  const isEmpty =
    viewMode === "map" ? !isPending && mapPlaces.length === 0 : !isPending && places.length === 0

  return (
    <section
      aria-labelledby="room-matches-heading"
      className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      {/* Thanh điều khiển kết quả cố định ở đỉnh cột phải (shrink-0) */}
      <SurfaceCard
        padding="sm"
        className="flex shrink-0 flex-wrap items-center justify-between gap-2.5"
      >
        <SectionHeading
          id="room-matches-heading"
          icon={<SparklesIcon className="size-4 text-primary" aria-hidden="true" />}
        >
          Quán phù hợp ({total})
        </SectionHeading>

        {/* Ô tìm kiếm riêng cho cá nhân ngay trong danh sách kết quả nhóm */}
        <div className="min-w-44 flex-1 sm:max-w-xs">
          <InputGroup className="h-8 rounded-full bg-background">
            <InputGroupAddon>
              <SearchIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={personalSearchDraft}
              onChange={(event) => setPersonalSearchDraft(event.target.value)}
              placeholder="Tìm riêng tên quán, món…"
              aria-label="Tìm riêng trong kết quả nhóm"
              className="text-xs"
            />
            {personalSearchDraft ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setPersonalSearchDraft("")}
                  aria-label="Xoá tìm riêng"
                >
                  <XIcon className="size-3" aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {viewMode === "grid" ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-8 gap-1 text-xs"
              onClick={() => setSort((prev) => (prev === "rating" ? "newest" : "rating"))}
            >
              <ArrowUpDownIcon className="size-3.5" aria-hidden="true" />
              {sort === "rating" ? "Đánh giá cao" : "Mới nhất"}
            </Button>
          ) : null}

          <ToggleGroup
            value={[viewMode]}
            onValueChange={(value) => {
              const next = value[0] as "grid" | "map" | undefined
              if (next) setViewMode(next)
            }}
            variant="outline"
            size="sm"
            aria-label="Chế độ xem trong phòng"
          >
            <ToggleGroupItem value="grid" className="h-8 px-2.5 text-xs">
              <LayoutGridIcon className="mr-1 size-3.5" aria-hidden="true" />
              Danh sách
            </ToggleGroupItem>
            <ToggleGroupItem value="map" className="h-8 px-2.5 text-xs">
              <MapIcon className="mr-1 size-3.5" aria-hidden="true" />
              Bản đồ
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </SurfaceCard>

      {/* ScrollArea chỉ cuộn danh sách quán ở cột phải */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PlaceCardSkeleton key={i} imageHeight={200} />
          ))}
        </div>
      ) : isEmpty ? (
        <Empty className="border border-dashed border-border bg-card/50 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không còn quán nào khớp toàn bộ tiêu chí</EmptyTitle>
            <EmptyDescription>
              {personalSearch
                ? `Không có quán nào khớp từ khoá tìm riêng “${personalSearch}” trong kết quả nhóm.`
                : "Bạn có thể bấm dấu X trên từng thẻ điều kiện ở phía trên hoặc đặt lại toàn bộ bộ lọc phòng."}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-2">
            {personalSearch ? (
              <Button variant="outline" size="sm" onClick={() => setPersonalSearchDraft("")}>
                Xoá từ khoá tìm riêng
              </Button>
            ) : null}
            {canReset ? (
              <Button variant="outline" size="sm" onClick={() => void onResetFilters()}>
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Đặt lại toàn bộ bộ lọc nhóm
              </Button>
            ) : null}
          </div>
        </Empty>
      ) : viewMode === "map" ? (
        <SurfaceCard padding="none" className="h-[500px] overflow-hidden lg:min-h-0 lg:flex-1">
          <PlacesMap
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={(place) => setSelectedPlaceId(place.id)}
            onClearSelection={() => setSelectedPlaceId(null)}
            height="h-full"
            isPlacesLoading={mapQuery.isFetching}
            totalPlaces={mapQuery.data?.total}
            fitKey={JSON.stringify(roomFilterPayload)}
          />
        </SurfaceCard>
      ) : (
        <ScrollArea className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div className="space-y-4 pr-2.5 pb-4">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {places.map((place) => (
                <li key={place.id}>
                  <PlaceCard place={place} />
                </li>
              ))}
            </ul>
            <LoadMore
              sentinelRef={sentinelRef}
              hasNextPage={listQuery.hasNextPage ?? false}
              isFetchingNextPage={listQuery.isFetchingNextPage}
              onLoadMore={() => void listQuery.fetchNextPage()}
              loadingLabel="Đang tải thêm quán cho nhóm"
              endMessage="Đã hiển thị hết quán phù hợp với tiêu chí nhóm."
            />
          </div>
        </ScrollArea>
      )}
    </section>
  )
}
