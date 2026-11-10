import { useCallback, useMemo, useState } from "react"
import type { GeolocationState } from "@uidotdev/usehooks"
import { DANANG_CENTER, type Coordinates } from "@/lib/constants"
import { GeolocationWatcher } from "./geolocation-watcher"

export type UserCoordinates = Coordinates

const GEOLOCATION_OPTIONS: PositionOptions = {
  timeout: 8000,
  maximumAge: 60_000,
  enableHighAccuracy: true,
}

/**
 * Vị trí hiện tại của người dùng — chỉ hỏi quyền khi gọi `requestLocation()`.
 *
 * `locationGate` phải được render trong cây: nó vô hình, chỉ tồn tại để mount
 * `GeolocationWatcher` sau khi người dùng đã yêu cầu định vị.
 */
export function useUserLocation() {
  const [requested, setRequested] = useState(false)
  const [geo, setGeo] = useState<GeolocationState | null>(null)

  const handleState = useCallback((state: GeolocationState) => setGeo(state), [])

  const coordinates = useMemo<UserCoordinates | null>(() => {
    if (!requested) return null
    if (geo?.latitude != null && geo.longitude != null) {
      return { lat: geo.latitude, lng: geo.longitude }
    }
    // Lỗi → dùng tâm Đà Nẵng để bản đồ vẫn có điểm neo.
    if (geo?.error) return DANANG_CENTER
    return null
  }, [requested, geo])

  const locationError = useMemo(() => {
    if (!requested || !geo?.error) return null
    switch (geo.error.code) {
      case geo.error.PERMISSION_DENIED:
        return "Bạn đã từ chối quyền vị trí — đang dùng vị trí trung tâm Đà Nẵng."
      case geo.error.POSITION_UNAVAILABLE:
        return "Không xác định được vị trí — đang dùng vị trí trung tâm Đà Nẵng."
      case geo.error.TIMEOUT:
        return "Lấy vị trí quá lâu — đang dùng vị trí trung tâm Đà Nẵng."
      default:
        return "Không lấy được toạ độ GPS — đang dùng vị trí trung tâm Đà Nẵng."
    }
  }, [requested, geo])

  const requestLocation = useCallback(() => setRequested(true), [])
  const clearLocation = useCallback(() => {
    setRequested(false)
    setGeo(null)
  }, [])

  return {
    coordinates,
    isLocating: requested && (geo === null || geo.loading),
    locationError,
    requestLocation,
    clearLocation,
    locationGate: requested ? (
      <GeolocationWatcher options={GEOLOCATION_OPTIONS} onState={handleState} />
    ) : null,
  }
}
