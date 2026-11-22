import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@uidotdev/usehooks"
import {
  BriefcaseIcon,
  CheckIcon,
  GraduationCapIcon,
  HomeIcon,
  LocateFixedIcon,
  MapPinIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import type { AnchorKind, UserLocationAnchor } from "@rendez/schema"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { searchAddress, type GeocodeSuggestion } from "../api/location-api"
import {
  useCreateAnchor,
  useDeleteAnchor,
  useMyAnchors,
  useUpdateAnchor,
} from "../hooks/use-location-data"
import { anchorKindIcon } from "../lib/anchor-icon"

const ANCHOR_PRESETS: { kind: AnchorKind; label: string; icon: typeof HomeIcon }[] = [
  { kind: "home", label: "Nhà riêng", icon: HomeIcon },
  { kind: "work", label: "Công ty", icon: BriefcaseIcon },
  { kind: "school", label: "Trường học", icon: GraduationCapIcon },
  { kind: "custom", label: "Mốc khác", icon: MapPinIcon },
]

interface ManageAnchorsSectionProps {
  readonly enabled: boolean
  readonly onSelectAnchor?: (anchor: UserLocationAnchor) => void
}

export function ManageAnchorsSection({ enabled, onSelectAnchor }: ManageAnchorsSectionProps) {
  const { data: anchors = [], isPending } = useMyAnchors(enabled)
  const createAnchor = useCreateAnchor()
  const updateAnchor = useUpdateAnchor()
  const deleteAnchor = useDeleteAnchor()

  const [kind, setKind] = useState<AnchorKind>("home")
  const [label, setLabel] = useState("Nhà riêng")
  const [addressQuery, setAddressQuery] = useState("")
  const debouncedQuery = useDebounce(addressQuery.trim(), 350)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number
    lng: number
    address: string
  } | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [locating, setLocating] = useState(false)

  const shouldSearch =
    debouncedQuery.length >= 2 && (!pickedCoords || debouncedQuery !== pickedCoords.address)
  const { data: suggestions = [], isFetching: searching } = useQuery({
    queryKey: ["geocode", debouncedQuery],
    queryFn: () => searchAddress(debouncedQuery),
    enabled: shouldSearch,
    staleTime: 5 * 60 * 1000,
  })

  function handlePresetSelect(preset: (typeof ANCHOR_PRESETS)[number]) {
    setKind(preset.kind)
    if (preset.kind !== "custom") {
      setLabel(preset.label)
    } else if (label === "Nhà riêng" || label === "Công ty" || label === "Trường học") {
      setLabel("")
    }
  }

  function handlePickSuggestion(item: GeocodeSuggestion) {
    setPickedCoords({ lat: item.lat, lng: item.lng, address: item.address })
    setAddressQuery(item.address)
    setDropdownOpen(false)
  }

  function handleUseCurrentGps() {
    if (!("geolocation" in navigator)) {
      toast.error("Trình duyệt không hỗ trợ định vị GPS.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const fallbackLabel = `Vị trí GPS hiện tại (±${Math.round(pos.coords.accuracy)}m)`
        setPickedCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: addressQuery.trim() || fallbackLabel,
        })
        if (!addressQuery.trim()) setAddressQuery(fallbackLabel)
        setDropdownOpen(false)
        toast.success(`Đã lấy tọa độ GPS (±${Math.round(pos.coords.accuracy)}m)`)
      },
      () => {
        setLocating(false)
        toast.error("Không lấy được tọa độ GPS trên thiết bị này.")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    )
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedCoords) {
      toast.error("Vui lòng chọn địa chỉ từ danh sách gợi ý hoặc bấm lấy GPS.")
      return
    }
    createAnchor.mutate(
      {
        label: label.trim(),
        kind,
        lat: pickedCoords.lat,
        lng: pickedCoords.lng,
        address: pickedCoords.address.slice(0, 200) || null,
        isDefault,
      },
      {
        onSuccess: (created) => {
          toast.success(`Đã lưu mốc "${created.label}"`)
          setAddressQuery("")
          setPickedCoords(null)
          setIsDefault(false)
          onSelectAnchor?.(created)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <FieldLabel className="text-xs text-muted-foreground">
          Mốc đã lưu ({anchors.length}/10)
        </FieldLabel>
        {isPending ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" aria-label="Đang tải mốc vị trí" />
          </div>
        ) : anchors.length === 0 ? (
          <Empty className="border border-dashed border-border/70 py-4">
            <EmptyHeader>
              <EmptyDescription className="text-xs">
                Chưa có mốc cá nhân nào. Thêm Nhà riêng, Công ty hoặc Trường học bên dưới để tính
                khoảng cách chính xác hơn.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {anchors.map((anchor) => {
              const Icon = anchorKindIcon(anchor.kind)
              return (
                <Item key={anchor.id} variant="outline" size="sm" className="bg-card/60">
                  <ItemMedia variant="icon">
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="flex items-center gap-1.5">
                      <span className="truncate">{anchor.label}</span>
                      {anchor.isDefault ? (
                        <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                          Mặc định
                        </Badge>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription className="truncate text-xs">
                      {anchor.address || "Đã ghim tọa độ"}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="gap-1">
                    {!anchor.isDefault ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Đặt làm mặc định"
                        aria-label={`Đặt ${anchor.label} làm mặc định`}
                        disabled={updateAnchor.isPending}
                        onClick={() =>
                          updateAnchor.mutate(
                            { id: anchor.id, input: { isDefault: true } },
                            {
                              onSuccess: () =>
                                toast.success(`Đã đặt "${anchor.label}" làm mặc định`),
                            },
                          )
                        }
                      >
                        <StarIcon className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Xóa mốc"
                      aria-label={`Xóa mốc ${anchor.label}`}
                      disabled={deleteAnchor.isPending}
                      onClick={() =>
                        deleteAnchor.mutate(anchor.id, {
                          onSuccess: () => toast.success(`Đã xóa mốc "${anchor.label}"`),
                        })
                      }
                    >
                      <Trash2Icon className="size-3.5 text-destructive" />
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </section>

      <Separator />

      <form onSubmit={handleCreate} className="space-y-3">
        <FieldLabel className="text-xs text-muted-foreground">Thêm mốc mới</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {ANCHOR_PRESETS.map((preset) => {
            const Icon = preset.icon
            const active = kind === preset.kind
            return (
              <Button
                key={preset.kind}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => handlePresetSelect(preset)}
              >
                <Icon className="mr-1 size-3" />
                {preset.label}
              </Button>
            )
          })}
        </div>

        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tên mốc (vd: Nhà riêng, Trường Bách Khoa)"
          maxLength={60}
          required
        />

        <div className="relative space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value)
                  setPickedCoords(null)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setDropdownOpen(true)
                }}
                placeholder="Gõ tên trường, công ty hoặc địa chỉ (vd: Trường Bách Khoa)..."
                className="pr-8 pl-8"
              />
              {searching ? (
                <Spinner
                  className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
                  aria-label="Đang tìm địa chỉ"
                />
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleUseCurrentGps}
              disabled={locating}
              title="Lấy vị trí GPS hiện tại"
            >
              {locating ? (
                <Spinner className="size-3.5" aria-label="Đang lấy vị trí GPS" />
              ) : (
                <LocateFixedIcon className="size-3.5" />
              )}
              <span className="ml-1 hidden sm:inline">GPS</span>
            </Button>
          </div>

          {dropdownOpen && suggestions.length > 0 ? (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
              {suggestions.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left font-normal"
                  onClick={() => handlePickSuggestion(item)}
                >
                  <span className="line-clamp-1 text-xs font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{item.address}</span>
                </Button>
              ))}
            </div>
          ) : null}

          {pickedCoords ? (
            <p className="flex items-center gap-1 text-xs text-primary">
              <CheckIcon className="size-3 shrink-0" />
              <span className="truncate">Đã ghim vị trí: {pickedCoords.address}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant={isDefault ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsDefault((v) => !v)}
          >
            <StarIcon className="mr-1 size-3" />
            {isDefault ? "Đang chọn làm mặc định" : "Đặt làm mốc mặc định"}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={createAnchor.isPending || anchors.length >= 10 || !pickedCoords}
          >
            {createAnchor.isPending ? "Đang lưu..." : "Lưu mốc"}
          </Button>
        </div>
      </form>
    </div>
  )
}

interface ManageAnchorsDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSelectAnchor?: (anchor: UserLocationAnchor) => void
}

export function ManageAnchorsDialog({
  open,
  onOpenChange,
  onSelectAnchor,
}: ManageAnchorsDialogProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mốc vị trí cá nhân"
      description="Lưu nhà riêng, công ty hoặc trường học để tính khoảng cách chính xác ngay cả khi laptop không có GPS."
    >
      <ManageAnchorsSection enabled={open} onSelectAnchor={onSelectAnchor} />
    </ResponsiveModal>
  )
}
