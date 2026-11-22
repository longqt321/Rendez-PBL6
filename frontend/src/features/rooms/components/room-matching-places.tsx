import { useState } from "react"
import {
  ArrowUpDownIcon,
  LayoutGridIcon,
  MapIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { useDebounce } from "@uidotdev/usehooks"
import { SurfaceCard } from "@/components/layout/page-primitives"
import { LoadMore } from "@/components/shared/load-more"
import { SectionHeading } from "@/components/shared/section-heading"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { PlacesMap } from "@/features/places/components/places-map"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { useMapPlaces } from "@/features/places/hooks/use-map-places"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useRoomVoting } from "../hooks/use-room-voting"
import type { Room } from "../types/room"
import { RoomVotingPanel } from "./room-voting-panel"

interface RoomMatchingPlacesProps {
  readonly room: Room
  readonly canReset: boolean
  readonly onResetFilters: () => Promise<void>
  readonly onRoomUpdated: (room: Room) => void
}

export function RoomMatchingPlaces({
  room,
  canReset,
  onResetFilters,
  onRoomUpdated,
}: RoomMatchingPlacesProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const voting = useRoomVoting(room.code, onRoomUpdated)
  const [sort, setSort] = useState<"rating" | "newest">("rating")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [personalSearchDraft, setPersonalSearchDraft] = useState("")
  const personalSearch = useDebounce(personalSearchDraft.trim(), 250)

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
            <RoomVotingPanel
              room={room}
              isOwner={Boolean(room.members.some((m) => m.isMe))}
              onRoomUpdated={onRoomUpdated}
            />
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {places.map((place) => {
                const inCandidates = room.candidates.some((c) => c.placeId === place.id)
                return (
                  <li key={place.id} className="flex flex-col gap-1.5">
                    <PlaceCard place={place} />
                    {room.phase === "filtering" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={inCandidates ? "secondary" : "outline"}
                        disabled={inCandidates || voting.pending}
                        onClick={() => void voting.addCandidate(place.id)}
                      >
                        {inCandidates ? "Đã thêm vào bình chọn" : "+ Thêm vào bình chọn"}
                      </Button>
                    ) : null}
                  </li>
                )
              })}
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
