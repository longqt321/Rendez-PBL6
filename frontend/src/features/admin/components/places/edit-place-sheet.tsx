import { useState } from "react"
import type { AdminPlace, PlaceCategory, PlaceStatus } from "@rendez/schema"
import { ExternalLinkIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import { formatCoordinate } from "@/lib/format"
import { useUpdateAdminPlace } from "../../hooks/use-admin"
import { ADMIN_UI } from "../../lib/admin-constants"
import { AdminDangerConfirm } from "../shared/admin-danger-confirm"
import { useAdminRuntime } from "../shared/admin-env-store"
import { AdminCoordinatePicker } from "./coordinate-picker"

const STATUS_OPTIONS: { value: PlaceStatus; label: string }[] = [
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đóng cửa" },
  { value: "unknown", label: "Chưa rõ" },
]

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value: value as PlaceCategory,
  label: meta.label,
}))

const PRICE_LEVELS = [1, 2, 3] as const

export function EditPlaceSheet({
  place,
  onClose,
}: Readonly<{ place: AdminPlace | null; onClose: () => void }>) {
  const { requiresStrictConfirm } = useAdminRuntime()
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<{
    lat: number | null
    lng: number | null
  } | null>(null)
  const updatePlace = useUpdateAdminPlace()

  if (!place) return null

  const isRiskyChange =
    (place.publishedAt !== null && !published) || (place.status !== "closed" && status === "closed")

  function submitMutation(lat: number | null, lng: number | null) {
    if (!place) return
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
          lat,
          lng,
          moderationNote: note.trim() ? note.trim() : null,
        },
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          onClose()
        },
      },
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!place) return

    if (name.trim().length < ADMIN_UI.PLACE_NAME_MIN_LEN) {
      setFormError(`Tên quán tối thiểu ${ADMIN_UI.PLACE_NAME_MIN_LEN} ký tự`)
      return
    }
    if (address.trim().length < ADMIN_UI.PLACE_ADDRESS_MIN_LEN) {
      setFormError(`Địa chỉ tối thiểu ${ADMIN_UI.PLACE_ADDRESS_MIN_LEN} ký tự`)
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
        parsedLat < ADMIN_UI.LAT_MIN ||
        parsedLat > ADMIN_UI.LAT_MAX ||
        parsedLng < ADMIN_UI.LNG_MIN ||
        parsedLng > ADMIN_UI.LNG_MAX
      ) {
        setFormError("Tọa độ vĩ độ/kinh độ không hợp lệ")
        return
      }
    }

    if (
      requiresStrictConfirm &&
      isRiskyChange &&
      note.trim().length < ADMIN_UI.PROD_MIN_REASON_LEN
    ) {
      setFormError(`Cần ghi chú tối thiểu ${ADMIN_UI.PROD_MIN_REASON_LEN} ký tự trên Production`)
      return
    }

    setFormError(null)
    if (isRiskyChange) {
      setPendingCoords({ lat: parsedLat, lng: parsedLng })
      setConfirmOpen(true)
      return
    }
    submitMutation(parsedLat, parsedLng)
  }

  return (
    <>
      <Sheet open={place !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle>Chỉnh sửa địa điểm</SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  render={
                    <Link to={`/discover/${place.id}`} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  Trang công khai
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </Button>
              </div>
              <SheetDescription>Thông tin, tọa độ và trạng thái hiển thị</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 px-4 py-2">
              <Field>
                <FieldLabel htmlFor="admin-place-name">Tên quán</FieldLabel>
                <Input
                  id="admin-place-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={ADMIN_UI.PLACE_NAME_MAX_LEN}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-place-address">Địa chỉ</FieldLabel>
                <Input
                  id="admin-place-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  maxLength={ADMIN_UI.PLACE_ADDRESS_MAX_LEN}
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
                  className="flex-wrap"
                >
                  {PRICE_LEVELS.map((level) => (
                    <ToggleGroupItem
                      key={level}
                      value={String(level)}
                      className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {priceLevelLabel(level)}
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
                  className="flex-wrap"
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
                lat={
                  Number.isFinite(Number(latText)) && latText.trim() !== "" ? Number(latText) : null
                }
                lng={
                  Number.isFinite(Number(lngText)) && lngText.trim() !== "" ? Number(lngText) : null
                }
                onPick={(nextLat, nextLng) => {
                  setLatText(formatCoordinate(nextLat))
                  setLngText(formatCoordinate(nextLng))
                }}
              />

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="admin-place-published">Hiển thị trên Khám phá</FieldLabel>
                </FieldContent>
                <Switch
                  id="admin-place-published"
                  checked={published}
                  onCheckedChange={setPublished}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-place-note">
                  Ghi chú{requiresStrictConfirm && isRiskyChange ? " (bắt buộc)" : ""}
                </FieldLabel>
                <Textarea
                  id="admin-place-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Lý do chỉnh sửa…"
                  className="min-h-16 resize-none"
                  maxLength={ADMIN_UI.MODERATION_NOTE_MAX_LEN}
                />
              </Field>

              {formError ? <FieldError>{formError}</FieldError> : null}
            </div>

            <SheetFooter className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={updatePlace.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                variant={isRiskyChange ? "destructive" : "default"}
                disabled={updatePlace.isPending}
              >
                {updatePlace.isPending ? <Spinner aria-label="Đang lưu" /> : null}
                Lưu thay đổi
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AdminDangerConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={!published ? "Ẩn địa điểm" : "Đóng cửa địa điểm"}
        description={`Thay đổi trạng thái hiển thị công khai của "${place.name}".`}
        confirmToken={place.name}
        confirmLabel="Nhập tên quán để xác nhận"
        actionLabel="Lưu thay đổi"
        isPending={updatePlace.isPending}
        onConfirm={() => {
          if (pendingCoords) submitMutation(pendingCoords.lat, pendingCoords.lng)
        }}
      />
    </>
  )
}
