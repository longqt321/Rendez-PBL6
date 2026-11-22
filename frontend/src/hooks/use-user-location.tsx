import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { GeolocationState } from "@uidotdev/usehooks"
import type { CityLandmark, SyncedLocation, UserLocationAnchor } from "@rendez/schema"
import { upsertSyncedLocation } from "@/features/location/api/location-api"
import {
  LOCATION_QUERY_KEYS,
  useLandmarks,
  useMyAnchors,
  useSyncedLocation,
} from "@/features/location/hooks/use-location-data"
import { calculateDistanceKm } from "@/features/places/lib/danang-districts"
import { useMe } from "@/features/profile/hooks/use-me"
import { DANANG_CENTER, type Coordinates } from "@/lib/constants"
import { GeolocationWatcher } from "./geolocation-watcher"

export type UserCoordinates = Coordinates

export type LocationSourceKind =
  | "manual_anchor"
  | "manual_landmark"
  | "device_gps"
  | "phone_synced"
  | "default_anchor"
  | "device_coarse"
  | "fallback_center"

export interface ResolvedLocationSource {
  kind: LocationSourceKind
  label: string
  coordinates: UserCoordinates
  updatedAt?: string
}

export const ACTIVE_LOCATION_SOURCE_STORAGE_KEY = "rendez.active-location-source"
const LOCATION_SOURCE_EVENT = "rendez:location-source-change"
const HIGH_ACCURACY_THRESHOLD_METERS = 150
const SYNC_MAX_ACCURACY_METERS = 1000
const SYNC_MIN_INTERVAL_MS = 60_000
const SYNC_MIN_DISTANCE_KM = 0.05 // 50m

const GEOLOCATION_OPTIONS: PositionOptions = {
  timeout: 8000,
  maximumAge: 60_000,
  enableHighAccuracy: true,
}

/**
 * Phát hiện thiết bị có phải điện thoại/tablet có GPS phần cứng hay không.
 * Laptop/Desktop thường chỉ ước lượng vị trí qua IP/Wi-Fi (dễ sai lệch hàng km).
 */
export function detectHardwareGpsDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false
  const navWithUaData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean }
  }
  if (navWithUaData.userAgentData?.mobile === true) return true
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false
  return coarsePointer && navigator.maxTouchPoints > 0
}

function readStoredSourceKey(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_LOCATION_SOURCE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredSourceKey(key: string | null): void {
  try {
    if (key) window.localStorage.setItem(ACTIVE_LOCATION_SOURCE_STORAGE_KEY, key)
    else window.localStorage.removeItem(ACTIVE_LOCATION_SOURCE_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(LOCATION_SOURCE_EVENT, { detail: key }))
  } catch {
    // Bỏ qua trong môi trường private/restricted storage
  }
}

export interface ResolveLocationInput {
  requested: boolean
  hasHardwareGps?: boolean
  selectedSourceKey: string | null
  geo: GeolocationState | null
  syncedLocation: SyncedLocation | null
  anchors: UserLocationAnchor[]
  landmarks: CityLandmark[]
}

/**
 * Thứ tự ưu tiên nguồn vị trí:
 * 1. Mốc được chọn thủ công (`anchor:<id>` hoặc `landmark:<id>`)
 * 2. Trên thiết bị có GPS phần cứng (Mobile): ưu tiên `device_gps` (accuracy <= 150m) trước `phone_synced`
 * 3. Trên Laptop/Desktop (không có GPS phần cứng): ưu tiên `phone_synced` từ điện thoại (kể cả trước khi bấm Gần tôi)
 * 4. Mốc cá nhân mặc định (`isDefault = true`)
 * 5. Vị trí ước lượng từ trình duyệt (khi đã yêu cầu `requested`)
 * 6. Tâm Đà Nẵng (`DANANG_CENTER`) khi có lỗi GPS
 */
export function resolveLocationSource(input: ResolveLocationInput): ResolvedLocationSource | null {
  const {
    selectedSourceKey,
    geo,
    syncedLocation,
    anchors,
    landmarks,
    requested,
    hasHardwareGps = true,
  } = input

  if (selectedSourceKey?.startsWith("anchor:")) {
    const id = selectedSourceKey.slice("anchor:".length)
    const found = anchors.find((a) => a.id === id)
    if (found) {
      return {
        kind: "manual_anchor",
        label: found.label,
        coordinates: { lat: found.lat, lng: found.lng },
      }
    }
  }

  if (selectedSourceKey?.startsWith("landmark:")) {
    const id = selectedSourceKey.slice("landmark:".length)
    const found = landmarks.find((l) => l.id === id)
    if (found) {
      return {
        kind: "manual_landmark",
        label: found.name,
        coordinates: { lat: found.lat, lng: found.lng },
      }
    }
  }

  const hasDeviceCoords = geo?.latitude != null && geo?.longitude != null
  const deviceAccuracy = geo?.accuracy ?? Number.POSITIVE_INFINITY

  if (
    requested &&
    hasHardwareGps &&
    hasDeviceCoords &&
    deviceAccuracy <= HIGH_ACCURACY_THRESHOLD_METERS
  ) {
    return {
      kind: "device_gps",
      label: "Vị trí hiện tại",
      coordinates: { lat: geo.latitude!, lng: geo.longitude! },
    }
  }

  // Trên laptop (không có GPS phần cứng), ưu tiên dùng ngay vị trí đồng bộ từ điện thoại
  if (syncedLocation && (!hasHardwareGps || requested)) {
    return {
      kind: "phone_synced",
      label: "Từ điện thoại",
      coordinates: { lat: syncedLocation.lat, lng: syncedLocation.lng },
      updatedAt: syncedLocation.updatedAt,
    }
  }

  const defaultAnchor = anchors.find((a) => a.isDefault)
  if (defaultAnchor && (!hasHardwareGps || requested)) {
    return {
      kind: "default_anchor",
      label: defaultAnchor.label,
      coordinates: { lat: defaultAnchor.lat, lng: defaultAnchor.lng },
    }
  }

  if (!requested) return null

  if (hasDeviceCoords) {
    return {
      kind: "device_coarse",
      label: hasHardwareGps ? "Vị trí ước lượng" : "Vị trí từ mạng (laptop)",
      coordinates: { lat: geo.latitude!, lng: geo.longitude! },
    }
  }

  if (geo?.error) {
    return {
      kind: "fallback_center",
      label: "Trung tâm Đà Nẵng",
      coordinates: DANANG_CENTER,
    }
  }

  return null
}

export async function syncLocationToServer(
  qc: ReturnType<typeof useQueryClient>,
  coords: { latitude: number; longitude: number; accuracy: number },
): Promise<SyncedLocation | null> {
  if (coords.accuracy > SYNC_MAX_ACCURACY_METERS) return null
  const loc = await upsertSyncedLocation({
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
  })
  qc.setQueryData(LOCATION_QUERY_KEYS.syncedLocation, loc)
  return loc
}

/**
 * Chạy ở cấp AppShell: nếu người dùng đang mở app trên Mobile và đã đăng nhập,
 * tự động lấy GPS 1 lần để đồng bộ sang tài khoản cho Laptop dùng.
 */
export function useMobileGpsAutoSync() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const isAuthenticated = Boolean(me)
  const hasHardwareGps = useMemo(() => detectHardwareGpsDevice(), [])
  const syncedOnceRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !hasHardwareGps || syncedOnceRef.current) return
    if (!("geolocation" in navigator)) return
    syncedOnceRef.current = true

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void syncLocationToServer(qc, pos.coords).catch(() => {})
      },
      () => {},
      GEOLOCATION_OPTIONS,
    )
  }, [isAuthenticated, hasHardwareGps, qc])
}

export function useUserLocation() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const isAuthenticated = Boolean(me)
  const hasHardwareGps = useMemo(() => detectHardwareGpsDevice(), [])
  const [requested, setRequested] = useState(false)
  const [geo, setGeo] = useState<GeolocationState | null>(null)
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(() =>
    readStoredSourceKey(),
  )

  const { data: landmarks = [] } = useLandmarks()
  const { data: anchors = [] } = useMyAnchors(isAuthenticated)
  const { data: syncedLocation = null } = useSyncedLocation(isAuthenticated)

  const lastSyncRef = useRef<{ lat: number; lng: number; at: number } | null>(null)

  useEffect(() => {
    function onSourceChange(e: Event) {
      const detail = (e as CustomEvent<string | null>).detail ?? null
      setSelectedSourceKey(detail)
    }
    window.addEventListener(LOCATION_SOURCE_EVENT, onSourceChange)
    return () => window.removeEventListener(LOCATION_SOURCE_EVENT, onSourceChange)
  }, [])

  const pushMobileGps = useCallback(
    (lat: number, lng: number, accuracy: number) => {
      if (accuracy > SYNC_MAX_ACCURACY_METERS) return
      const now = Date.now()
      const prev = lastSyncRef.current
      if (prev) {
        const movedKm = calculateDistanceKm(prev.lat, prev.lng, lat, lng)
        if (now - prev.at < SYNC_MIN_INTERVAL_MS && movedKm < SYNC_MIN_DISTANCE_KM) {
          return
        }
      }
      lastSyncRef.current = { lat, lng, at: now }
      void upsertSyncedLocation({ lat, lng, accuracy })
        .then((loc) => {
          qc.setQueryData(LOCATION_QUERY_KEYS.syncedLocation, loc)
        })
        .catch(() => {})
    },
    [qc],
  )

  // Chỉ thiết bị có GPS phần cứng (Mobile) mới được phép đẩy vị trí lên /me/location.
  useEffect(() => {
    if (!isAuthenticated || !hasHardwareGps) return
    if (geo?.latitude == null || geo?.longitude == null || geo.accuracy == null) return
    pushMobileGps(geo.latitude, geo.longitude, geo.accuracy)
  }, [isAuthenticated, hasHardwareGps, geo, pushMobileGps])

  const handleState = useCallback((state: GeolocationState) => setGeo(state), [])

  const resolvedSource = useMemo(
    () =>
      resolveLocationSource({
        requested,
        hasHardwareGps,
        selectedSourceKey,
        geo,
        syncedLocation,
        anchors,
        landmarks,
      }),
    [requested, hasHardwareGps, selectedSourceKey, geo, syncedLocation, anchors, landmarks],
  )

  const coordinates = resolvedSource?.coordinates ?? null

  const locationError = useMemo(() => {
    if (resolvedSource && resolvedSource.kind !== "fallback_center") return null
    if (!requested || !geo?.error) return null
    switch (geo.error.code) {
      case geo.error.PERMISSION_DENIED:
        return "Bạn đã từ chối quyền vị trí. Đang dùng vị trí trung tâm Đà Nẵng."
      case geo.error.POSITION_UNAVAILABLE:
        return "Không xác định được vị trí. Đang dùng vị trí trung tâm Đà Nẵng."
      case geo.error.TIMEOUT:
        return "Lấy vị trí quá lâu. Đang dùng vị trí trung tâm Đà Nẵng."
      default:
        return "Không lấy được toạ độ GPS. Đang dùng vị trí trung tâm Đà Nẵng."
    }
  }, [requested, geo, resolvedSource])

  const requestLocation = useCallback(() => setRequested(true), [])
  const clearLocation = useCallback(() => {
    setRequested(false)
    setGeo(null)
    writeStoredSourceKey(null)
  }, [])

  const selectLocationSource = useCallback(
    (key: string | null) => {
      writeStoredSourceKey(key)
      if (key === null) {
        setRequested(true)
        void qc.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.syncedLocation })
      }
    },
    [qc],
  )

  return {
    coordinates,
    hasHardwareGps,
    locationSource: resolvedSource,
    selectedSourceKey,
    selectLocationSource,
    isLocating:
      requested && !selectedSourceKey && resolvedSource === null && (geo === null || geo.loading),
    locationError,
    requestLocation,
    clearLocation,
    locationGate: requested ? (
      <GeolocationWatcher options={GEOLOCATION_OPTIONS} onState={handleState} />
    ) : null,
  }
}
