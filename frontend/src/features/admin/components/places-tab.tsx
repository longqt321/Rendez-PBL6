import { useState } from "react"
import type { AdminPlace, PlaceCategory, PlaceStatus } from "@rendez/schema"
import { useDebounce } from "@uidotdev/usehooks"
import { ChevronDownIcon, MapPinIcon, PencilIcon, SearchIcon } from "lucide-react"
import { MapContainer, Marker, useMapEvents } from "react-leaflet"
import { useTheme } from "next-themes"
import "leaflet/dist/leaflet.css"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { DANANG_CENTER_TUPLE } from "@/lib/constants"
import { ResilientTileLayer } from "@/features/places/components/resilient-tile-layer"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META, categoryLabel } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import { formatCoordinate, formatNumber } from "@/lib/format"
import type { AdminPlaceVisibilityFilter } from "../api/admin-api"
import { useAdminPlaces, useUpdateAdminPlace } from "../hooks/use-admin"

const VISIBILITY_FILTERS: { value: AdminPlaceVisibilityFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "published", label: "Đang hiển thị" },
  { value: "unpublished", label: "Đang ẩn" },
  { value: "closed", label: "Đóng cửa" },
]

const STATUS_OPTIONS: { value: PlaceStatus; label: string }[] = [
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đóng cửa" },
  { value: "unknown", label: "Chưa rõ" },
]

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value: value as PlaceCategory,
  label: meta.label,
}))

export function PlacesTab() {
  const [searchText, setSearchText] = useState("")
  const debouncedQuery = useDebounce(searchText, 300)
  const [visibility, setVisibility] = useState<AdminPlaceVisibilityFilter>("all")
  const [district, setDistrict] = useState<string>("all")
  const [editing, setEditing] = useState<AdminPlace | null>(null)

  const placesQuery = useAdminPlaces({
    visibility,
    district,
    q: debouncedQuery,
  })
  const places = placesQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-64">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm tên, địa chỉ quán…"
              aria-label="Tìm kiếm địa điểm trong quản trị"
            />
          </InputGroup>
        </div>

        <ToggleGroup
          value={[visibility]}
          onValueChange={(next) => {
            const selected = next[0] as AdminPlaceVisibilityFilter | undefined
            if (selected) setVisibility(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Lọc trạng thái hiển thị"
        >
          {VISIBILITY_FILTERS.map((item) => (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="min-h-9 sm:min-h-8" />}
          >
            {district === "all" ? "Tất cả quận" : district}
            <ChevronDownIcon className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={district} onValueChange={setDistrict}>
              <DropdownMenuRadioItem value="all">Tất cả quận</DropdownMenuRadioItem>
              {DANANG_DISTRICTS.map((item) => (
                <DropdownMenuRadioItem key={item} value={item}>
                  {item}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {placesQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`place-adm-skel-${index}`} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : placesQuery.isError ? (
        <ErrorState
          variant="plain"
          title="Không tải được danh sách địa điểm"
          onRetry={() => void placesQuery.refetch()}
        />
      ) : places.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Không có địa điểm phù hợp</EmptyTitle>
            <EmptyDescription>Thử đổi từ khoá tìm kiếm hoặc bộ lọc trạng thái.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ItemGroup className="gap-2">
            {places.map((place) => (
              <Item key={place.id} variant="outline" className="items-start gap-3">
                <ItemContent className="gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ItemTitle className="text-sm font-semibold">{place.name}</ItemTitle>
                    <Badge variant="secondary">{categoryLabel(place.category)}</Badge>
                    <Badge variant="outline">{priceLevelLabel(place.priceLevel)}</Badge>
                    {place.publishedAt === null ? (
                      <Badge variant="outline">Đang ẩn</Badge>
                    ) : place.status === "closed" ? (
                      <Badge variant="destructive">Đóng cửa</Badge>
                    ) : (
                      <Badge variant="default">Hiển thị</Badge>
                    )}
                  </div>
                  <ItemDescription className="text-xs">
                    {place.address}
                    {place.district ? ` · ${place.district}` : ""} ·{" "}
                    {place.lat !== null && place.lng !== null
                      ? `${formatCoordinate(place.lat)}, ${formatCoordinate(place.lng)}`
                      : "Chưa có toạ độ"}
                  </ItemDescription>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(place.reviewCount)} đánh giá · {formatNumber(place.reportCount)}{" "}
                    báo cáo
                    {place.moderationNote ? ` · Ghi chú: ${place.moderationNote}` : ""}
                  </p>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9 sm:min-h-8"
                    onClick={() => setEditing(place)}
                  >
                    <PencilIcon className="size-3.5" aria-hidden="true" />
                    Chỉnh sửa
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>

          <LoadMore
            hasNextPage={placesQuery.hasNextPage}
            isFetchingNextPage={placesQuery.isFetchingNextPage}
            onLoadMore={() => placesQuery.fetchNextPage()}
            loadingLabel="Đang tải thêm địa điểm"
            endMessage="Đã hiển thị hết danh sách địa điểm."
          />
        </>
      )}

      <EditPlaceDialog
        key={editing?.id ?? "none"}
        place={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function EditPlaceDialog({
  place,
  onClose,
}: Readonly<{
  place: AdminPlace | null
  onClose: () => void
}>) {
  const [name, setName] = useState(place?.name ?? "")
  const [address, setAddress] = useState(place?.address ?? "")
  const [district, setDistrict] = useState<string>(place?.district ?? "")
  const [category, setCategory] = useState<PlaceCategory>(place?.category ?? "cafe")
  const [priceLevel, setPriceLevel] = useState<1 | 2 | 3>(place?.priceLevel ?? 1)
  const [status, setStatus] = useState<PlaceStatus>(place?.status ?? "open")
  const [published, setPublished] = useState(place?.publishedAt !== null)
  const [latText, setLatText] = useState(
    place?.lat !== null && place?.lat !== undefined ? String(place.lat) : "",
  )
  const [lngText, setLngText] = useState(
    place?.lng !== null && place?.lng !== undefined ? String(place.lng) : "",
  )
  const [note, setNote] = useState(place?.moderationNote ?? "")
  const [formError, setFormError] = useState<string | null>(null)
  const updatePlace = useUpdateAdminPlace()

  if (!place) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!place) return

    if (name.trim().length < 2) {
      setFormError("Tên quán cần ít nhất 2 ký tự")
      return
    }
    if (address.trim().length < 2) {
      setFormError("Địa chỉ cần ít nhất 2 ký tự")
      return
    }

    const latTrim = latText.trim()
    const lngTrim = lngText.trim()
    let parsedLat: number | null = null
    let parsedLng: number | null = null

    if (latTrim !== "" || lngTrim !== "") {
      parsedLat = Number(latTrim)
      parsedLng = Number(lngTrim)
      if (
        latTrim === "" ||
        lngTrim === "" ||
        Number.isNaN(parsedLat) ||
        Number.isNaN(parsedLng) ||
        parsedLat < -90 ||
        parsedLat > 90 ||
        parsedLng < -180 ||
        parsedLng > 180
      ) {
        setFormError("Toạ độ vĩ độ/kinh độ không hợp lệ")
        return
      }
    }

    setFormError(null)
    updatePlace.mutate(
      {
        placeId: place.id,
        input: {
          name: name.trim(),
          address: address.trim(),
          district: district.trim() ? district.trim() : null,
          category,
          priceLevel,
          status,
          published,
          lat: parsedLat,
          lng: parsedLng,
          moderationNote: note.trim() ? note.trim() : null,
        },
      },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <Dialog open={place !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa địa điểm</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin và trạng thái hiển thị của quán.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="admin-place-name">Tên quán</FieldLabel>
            <Input
              id="admin-place-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-place-address">Địa chỉ</FieldLabel>
            <Input
              id="admin-place-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field>
            <FieldLabel>Quận</FieldLabel>
            <ToggleGroup
              value={[district || "none"]}
              onValueChange={(next) => {
                const selected = next[0]
                if (selected !== undefined) setDistrict(selected === "none" ? "" : selected)
              }}
              variant="outline"
              size="sm"
              className="flex-wrap"
            >
              <ToggleGroupItem
                value="none"
                className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                Chưa rõ
              </ToggleGroupItem>
              {DANANG_DISTRICTS.map((item) => (
                <ToggleGroupItem
                  key={item}
                  value={item}
                  className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {item}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel>Loại hình</FieldLabel>
            <ToggleGroup
              value={[category]}
              onValueChange={(next) => {
                const selected = next[0] as PlaceCategory | undefined
                if (selected) setCategory(selected)
              }}
              variant="outline"
              size="sm"
              className="flex-wrap"
            >
              {CATEGORY_OPTIONS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Mức giá</FieldLabel>
              <ToggleGroup
                value={[String(priceLevel)]}
                onValueChange={(next) => {
                  const selected = next[0]
                  if (selected === "1" || selected === "2" || selected === "3") {
                    setPriceLevel(Number(selected) as 1 | 2 | 3)
                  }
                }}
                variant="outline"
                size="sm"
              >
                {[1, 2, 3].map((level) => (
                  <ToggleGroupItem
                    key={level}
                    value={String(level)}
                    className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {priceLevelLabel(level as 1 | 2 | 3)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel>Tình trạng quán</FieldLabel>
              <ToggleGroup
                value={[status]}
                onValueChange={(next) => {
                  const selected = next[0] as PlaceStatus | undefined
                  if (selected) setStatus(selected)
                }}
                variant="outline"
                size="sm"
              >
                {STATUS_OPTIONS.map((item) => (
                  <ToggleGroupItem
                    key={item.value}
                    value={item.value}
                    className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="admin-place-lat">Vĩ độ (lat)</FieldLabel>
              <Input
                id="admin-place-lat"
                value={latText}
                onChange={(event) => setLatText(event.target.value)}
                placeholder="16.0612"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-place-lng">Kinh độ (lng)</FieldLabel>
              <Input
                id="admin-place-lng"
                value={lngText}
                onChange={(event) => setLngText(event.target.value)}
                placeholder="108.2215"
              />
            </Field>
          </div>

          <AdminCoordinatePicker
            lat={Number.isFinite(Number(latText)) && latText.trim() !== "" ? Number(latText) : null}
            lng={Number.isFinite(Number(lngText)) && lngText.trim() !== "" ? Number(lngText) : null}
            onPick={(nextLat, nextLng) => {
              setLatText(formatCoordinate(nextLat))
              setLngText(formatCoordinate(nextLng))
            }}
          />

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="admin-place-published">Hiển thị trên Khám phá</FieldLabel>
            </FieldContent>
            <Switch id="admin-place-published" checked={published} onCheckedChange={setPublished} />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-place-note">Ghi chú kiểm duyệt</FieldLabel>
            <Textarea
              id="admin-place-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú lý do chỉnh sửa…"
              className="min-h-16 resize-none"
              maxLength={300}
            />
          </Field>

          {formError ? <FieldError>{formError}</FieldError> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={updatePlace.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={updatePlace.isPending}>
              {updatePlace.isPending ? <Spinner aria-label="Đang lưu địa điểm" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CoordinateClickHandler({
  onPick,
}: Readonly<{ onPick: (lat: number, lng: number) => void }>) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function AdminCoordinatePicker({
  lat,
  lng,
  onPick,
}: Readonly<{
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : DANANG_CENTER_TUPLE

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Bấm lên bản đồ để chọn nhanh toạ độ quán</p>
      <div className="relative h-44 w-full overflow-hidden rounded-surface border border-border bg-muted">
        <MapContainer
          center={center}
          zoom={lat !== null && lng !== null ? 15 : 13}
          scrollWheelZoom={false}
          className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
        >
          <ResilientTileLayer />
          <CoordinateClickHandler onPick={onPick} />
          {lat !== null && lng !== null ? <Marker position={[lat, lng]} /> : null}
        </MapContainer>
      </div>
    </div>
  )
}
