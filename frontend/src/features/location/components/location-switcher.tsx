import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  LandmarkIcon,
  LocateFixedIcon,
  MapPinIcon,
  RefreshCwIcon,
  Settings2Icon,
  SmartphoneIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMe } from "@/features/profile/hooks/use-me"
import {
  detectHardwareGpsDevice,
  syncLocationToServer,
  type ResolvedLocationSource,
} from "@/hooks/use-user-location"
import { useLandmarks, useMyAnchors } from "../hooks/use-location-data"
import { anchorKindIcon } from "../lib/anchor-icon"
import { ManageAnchorsDialog } from "./manage-anchors-dialog"

interface LocationSwitcherProps {
  readonly locationSource: ResolvedLocationSource | null
  readonly selectedSourceKey: string | null
  readonly onSelectSource: (key: string | null) => void
}

export function LocationSwitcher({
  locationSource,
  selectedSourceKey,
  onSelectSource,
}: LocationSwitcherProps) {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const isAuthenticated = Boolean(me)
  const isMobileGps = detectHardwareGpsDevice()
  const { data: landmarks = [] } = useLandmarks()
  const { data: anchors = [] } = useMyAnchors(isAuthenticated)
  const [manageOpen, setManageOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  function handleSyncMobileNow() {
    if (!("geolocation" in navigator)) {
      toast.error("Trình duyệt không hỗ trợ GPS.")
      return
    }
    setSyncing(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void syncLocationToServer(qc, pos.coords)
          .then((loc) => {
            if (!loc) {
              toast.error(`Độ chính xác GPS chưa đủ tốt (±${Math.round(pos.coords.accuracy)}m)`)
              return
            }
            toast.success(`Đã đồng bộ GPS (±${Math.round(pos.coords.accuracy)}m)`)
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : "Không thể đồng bộ GPS")
          })
          .finally(() => setSyncing(false))
      },
      () => {
        setSyncing(false)
        toast.error("Hãy cấp quyền Vị trí (GPS) cho trình duyệt trên điện thoại.")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  const currentValue = selectedSourceKey ?? "auto"

  function renderCurrentIcon() {
    if (!locationSource) return <MapPinIcon className="size-3.5 text-muted-foreground" />
    switch (locationSource.kind) {
      case "phone_synced":
        return <SmartphoneIcon className="size-3.5 text-primary" />
      case "manual_landmark":
        return <LandmarkIcon className="size-3.5 text-primary" />
      case "device_gps":
        return <LocateFixedIcon className="size-3.5 text-primary" />
      default:
        return <MapPinIcon className="size-3.5 text-primary" />
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-48 gap-1.5 rounded-full px-2.5 text-xs"
              aria-label="Chọn mốc vị trí tính khoảng cách"
            />
          }
        >
          {renderCurrentIcon()}
          <span className="truncate">{locationSource?.label ?? "Chọn vị trí"}</span>
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuRadioGroup
            value={currentValue}
            onValueChange={(val) => {
              const str = String(val)
              onSelectSource(str === "auto" ? null : str)
            }}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                Vị trí của bạn
              </DropdownMenuLabel>
              <DropdownMenuRadioItem value="auto">
                <LocateFixedIcon className="mr-2 size-3.5" />
                <span>Tự động (GPS / Điện thoại)</span>
              </DropdownMenuRadioItem>
              {anchors.map((anchor) => {
                const Icon = anchorKindIcon(anchor.kind)
                return (
                  <DropdownMenuRadioItem key={anchor.id} value={`anchor:${anchor.id}`}>
                    <Icon className="mr-2 size-3.5" />
                    <span className="truncate">{anchor.label}</span>
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuGroup>

            {landmarks.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Địa danh nổi tiếng
                  </DropdownMenuLabel>
                  {landmarks.map((lm) => (
                    <DropdownMenuRadioItem key={lm.id} value={`landmark:${lm.id}`}>
                      <LandmarkIcon className="mr-2 size-3.5" />
                      <span className="truncate">
                        {lm.name}
                        {lm.district ? ` · ${lm.district}` : ""}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuRadioGroup>

          {isAuthenticated && (
            <>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-1">
                {isMobileGps && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={syncing}
                    className="h-7 w-full justify-start text-xs text-primary"
                    onClick={handleSyncMobileNow}
                  >
                    <RefreshCwIcon className={`mr-2 size-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Đang lấy GPS..." : "Đẩy GPS máy này sang Laptop"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-start text-xs"
                  onClick={() => setManageOpen(true)}
                >
                  <Settings2Icon className="mr-2 size-3.5" />
                  Quản lý mốc cá nhân...
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageAnchorsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onSelectAnchor={(anchor) => {
          onSelectSource(`anchor:${anchor.id}`)
          setManageOpen(false)
        }}
      />
    </>
  )
}
