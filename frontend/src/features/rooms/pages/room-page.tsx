import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LocateFixedIcon,
  MapIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia } from "@/components/ui/item"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLandmarks, useMyAnchors } from "@/features/location/hooks/use-location-data"
import { useMe } from "@/features/profile/hooks/use-me"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { useUserLocation } from "@/hooks/use-user-location"
import { RoomCandidatesPanel } from "../components/room-candidates-panel"
import { RoomGroupMap } from "../components/room-group-map"
import { RoomHeader } from "../components/room-header"
import { RoomPreferencesPanel } from "../components/room-preferences-panel"
import { useRoomVoting } from "../hooks/use-room-voting"
import { useRooms, type RoomStatus } from "../hooks/use-rooms"
import type { ParsedRoomProposalInput } from "../lib/room"
import { scoreAndRankRoomCandidates } from "../lib/room-scoring"

export function RoomPage() {
  const { code = "" } = useParams<{ code: string }>()
  const isDesktop = useIsDesktop()
  const { data: me } = useMe()
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const [desktopMapOpen, setDesktopMapOpen] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const copyTimerRef = useRef<number | null>(null)

  const { data: anchors = [] } = useMyAnchors(Boolean(me))
  const { data: landmarks = [] } = useLandmarks()

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
    deleteProposal,
    updateMyLocation,
    leaveRoom,
  } = useRooms()
  const room = getRoom(code)
  const status: RoomStatus = room ? "ready" : getRoomStatus(code)
  const voting = useRoomVoting(code, storeRoom)

  const { coordinates, locationSource, isLocating, requestLocation, locationGate } =
    useUserLocation()
  const pendingDeviceLocationRef = useRef(false)

  useEffect(() => {
    if (!pendingDeviceLocationRef.current || !coordinates || !room) return
    pendingDeviceLocationRef.current = false
    void updateMyLocation(room.code, {
      lat: coordinates.lat,
      lng: coordinates.lng,
      locationLabel: locationSource?.label ?? "Vị trí hiện tại",
    })
      .then(() => toast.success("Đã cập nhật vị trí của bạn trên bản đồ nhóm"))
      .catch(() => toast.error("Không cập nhật được vị trí"))
  }, [coordinates, locationSource, room, updateMyLocation])

  const scoredCandidates = useMemo(() => (room ? scoreAndRankRoomCandidates(room) : []), [room])

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
      toast.success("Đã vào phòng nhóm")
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
        <h1 className="sr-only">Đang tải phòng nhóm</h1>
        <output className="mt-8 block text-sm text-muted-foreground">Đang tải phòng…</output>
      </PageContainer>
    )
  }

  if (status === "error") {
    return (
      <PageContainer size="narrow">
        <h1 className="sr-only">Không tải được phòng nhóm</h1>
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
        <h1 className="sr-only">Không tìm thấy phòng nhóm</h1>
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
  const meMember = room.members.find((m) => m.isMe)
  const activeProposalsCount = room.proposals.filter((p) => p.status !== "dismissed").length
  const locatedMembersCount = room.members.filter((m) => m.lat != null && m.lng != null).length

  async function handleAddProposals(items: ParsedRoomProposalInput[]) {
    if (!room) return
    try {
      await addMyProposals(room.code, items, { autoApply: false })
      toast.success("Đã thêm tiêu chí của bạn")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thêm được tiêu chí")
    }
  }

  async function handleDeleteProposal(proposalId: string) {
    if (!room) return
    try {
      await deleteProposal(room.code, proposalId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được tiêu chí")
    }
  }

  async function handleSetPresetLocation(input: { lat: number; lng: number; label: string }) {
    if (!room) return
    try {
      await updateMyLocation(room.code, {
        lat: input.lat,
        lng: input.lng,
        locationLabel: input.label,
      })
      toast.success(`Đã đặt vị trí của bạn: ${input.label}`)
    } catch {
      toast.error("Không cập nhật được vị trí")
    }
  }

  async function handlePickMyLocation(coords: { lat: number; lng: number }) {
    await handleSetPresetLocation({
      lat: coords.lat,
      lng: coords.lng,
      label: "Vị trí đã ghim trên bản đồ",
    })
  }

  function handleUseDeviceLocation() {
    if (!room) return
    if (coordinates) {
      void handleSetPresetLocation({
        lat: coordinates.lat,
        lng: coordinates.lng,
        label: locationSource?.label ?? "Vị trí hiện tại",
      })
      return
    }
    pendingDeviceLocationRef.current = true
    requestLocation()
  }

  const locationQuickBar = isMember ? (
    <Item variant="muted" size="sm" className="mb-3 flex-wrap">
      <ItemMedia variant="icon">
        <MapPinIcon className="text-primary" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemDescription className="truncate text-xs">
          {meMember?.lat != null ? (
            <>
              Vị trí của bạn:{" "}
              <strong className="text-foreground">
                {meMember.locationLabel ?? "Đã chia sẻ toạ độ"}
              </strong>
            </>
          ) : (
            "Đặt vị trí để tính khoảng cách công bằng cho nhóm"
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="flex-wrap">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          disabled={isLocating}
          onClick={handleUseDeviceLocation}
        >
          <LocateFixedIcon className="size-3.5" aria-hidden="true" />
          GPS hiện tại
        </Button>

        {anchors.length > 0 || landmarks.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" size="xs" variant="outline">
                  Chọn mốc / địa danh
                  <ChevronDownIcon className="size-3" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
              {anchors.length > 0 ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mốc đã lưu của bạn</DropdownMenuLabel>
                  {anchors.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() =>
                        void handleSetPresetLocation({ lat: a.lat, lng: a.lng, label: a.label })
                      }
                    >
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}
              {anchors.length > 0 && landmarks.length > 0 ? <DropdownMenuSeparator /> : null}
              {landmarks.length > 0 ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Địa danh Đà Nẵng</DropdownMenuLabel>
                  {landmarks.slice(0, 12).map((lm) => (
                    <DropdownMenuItem
                      key={lm.id}
                      onClick={() =>
                        void handleSetPresetLocation({ lat: lm.lat, lng: lm.lng, label: lm.name })
                      }
                    >
                      {lm.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </ItemActions>
    </Item>
  ) : null

  const panelTabs = (
    <Tabs defaultValue="candidates" className="w-full">
      <TabsList className="mb-3 grid w-full grid-cols-2">
        <TabsTrigger value="candidates" className="gap-1.5">
          <MapPinIcon className="size-3.5" aria-hidden="true" />
          Địa điểm ({scoredCandidates.length})
        </TabsTrigger>
        <TabsTrigger value="preferences" className="gap-1.5">
          <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
          Tiêu chí ({activeProposalsCount})
        </TabsTrigger>
      </TabsList>

      {!isMember ? (
        <Alert className="mb-3 border-dashed border-primary/40 bg-primary/5 py-2">
          <AlertDescription className="text-xs text-foreground">
            Nhập tên ở góc trên để tham gia phòng trước khi đề xuất quán, thêm tiêu chí hoặc chia sẻ
            vị trí.
          </AlertDescription>
        </Alert>
      ) : null}

      <TabsContent value="candidates">
        <RoomCandidatesPanel
          room={room}
          scoredCandidates={scoredCandidates}
          selectedPlaceId={selectedPlaceId}
          isMember={isMember}
          pending={voting.pending}
          onSelectPlace={(id) => {
            setSelectedPlaceId(id)
          }}
          onAddCandidate={voting.addCandidate}
          onRemoveCandidate={voting.removeCandidate}
          onStartVoting={voting.startVoting}
          onCastVote={voting.castVote}
          onFinalizeVoting={voting.finalizeVoting}
        />
      </TabsContent>

      <TabsContent value="preferences">
        <RoomPreferencesPanel
          room={room}
          isMember={isMember}
          onAddProposals={handleAddProposals}
          onDeleteProposal={handleDeleteProposal}
        />
      </TabsContent>
    </Tabs>
  )

  return (
    <PageContainer size="wide" padded="compact">
      {locationGate}
      <RoomHeader
        room={room}
        isMember={isMember}
        defaultDisplayName={me?.name ?? ""}
        copiedCode={copiedCode}
        onCopyCode={handleCopyCode}
        onJoin={handleJoin}
        onLeave={() => {
          void leaveRoom(room.code)
            .then(() => toast.success("Đã rời phòng"))
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "Không rời được phòng"),
            )
        }}
      />

      {locationQuickBar}

      {isDesktop ? (
        desktopMapOpen ? (
          <SplitLayout ratio="5-7" gap="lg">
            <StickyAside span={5}>
              <SurfaceCard padding="md">{panelTabs}</SurfaceCard>
            </StickyAside>
            <SplitMain span={7}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Bản đồ nhóm ({locatedMembersCount} người đã ghim · {scoredCandidates.length} quán)
                </p>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setDesktopMapOpen(false)}
                >
                  <ChevronUpIcon className="size-3.5" aria-hidden="true" />
                  Thu gọn bản đồ
                </Button>
              </div>
              <RoomGroupMap
                members={room.members}
                scoredCandidates={scoredCandidates}
                selectedPlaceId={selectedPlaceId}
                isMember={isMember}
                onSelectPlace={setSelectedPlaceId}
                onPickMyLocation={handlePickMyLocation}
                onUseDeviceLocation={handleUseDeviceLocation}
                isLocating={isLocating}
                className="h-[calc(100dvh-15rem)] min-h-[520px] w-full"
              />
            </SplitMain>
          </SplitLayout>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDesktopMapOpen(true)}
              >
                <MapIcon className="size-4" aria-hidden="true" />
                Hiện bản đồ nhóm ({locatedMembersCount} người · {scoredCandidates.length} quán)
              </Button>
            </div>
            <SurfaceCard padding="md">{panelTabs}</SurfaceCard>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
            onClick={() => setMobileMapOpen(true)}
          >
            <MapIcon className="size-4" aria-hidden="true" />
            Xem bản đồ nhóm ({locatedMembersCount} người · {scoredCandidates.length} quán)
          </Button>

          <SurfaceCard padding="md">{panelTabs}</SurfaceCard>

          <Drawer open={mobileMapOpen} onOpenChange={setMobileMapOpen}>
            <DrawerContent className="h-[85dvh] max-h-[85dvh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle>Bản đồ nhóm · {room.name}</DrawerTitle>
                <DrawerDescription>
                  Xem vị trí các thành viên, thứ hạng quán đề xuất hoặc chạm bản đồ để đặt vị trí
                </DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 flex-1 px-4 pb-4">
                <RoomGroupMap
                  members={room.members}
                  scoredCandidates={scoredCandidates}
                  selectedPlaceId={selectedPlaceId}
                  isMember={isMember}
                  onSelectPlace={setSelectedPlaceId}
                  onPickMyLocation={handlePickMyLocation}
                  onUseDeviceLocation={handleUseDeviceLocation}
                  isLocating={isLocating}
                  className="h-full min-h-[380px] w-full"
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
    </PageContainer>
  )
}
