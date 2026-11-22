import { describe, expect, it } from "vitest"
import type { CityLandmark, SyncedLocation, UserLocationAnchor } from "@rendez/schema"
import { DANANG_CENTER } from "@/lib/constants"
import { resolveLocationSource } from "./use-user-location"

const anchorHome: UserLocationAnchor = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "Nhà riêng",
  kind: "home",
  lat: 16.051,
  lng: 108.201,
  address: null,
  isDefault: true,
  createdAt: "2026-11-22T00:00:00.000Z",
  updatedAt: "2026-11-22T00:00:00.000Z",
}

const landmarkDragon: CityLandmark = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "cau-rong",
  name: "Cầu Rồng",
  district: "Hải Châu",
  lat: 16.0611,
  lng: 108.2275,
  sortOrder: 1,
}

const syncedPhone: SyncedLocation = {
  lat: 16.07,
  lng: 108.22,
  accuracy: 15,
  updatedAt: "2026-11-22T10:00:00.000Z",
}

const emptyGeo = null

describe("resolveLocationSource", () => {
  it("ưu tiên mốc cá nhân hoặc địa danh thành phố được chọn thủ công ngay cả khi chưa bật GPS", () => {
    const resAnchor = resolveLocationSource({
      requested: false,
      selectedSourceKey: `anchor:${anchorHome.id}`,
      geo: emptyGeo,
      syncedLocation: syncedPhone,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(resAnchor?.kind).toBe("manual_anchor")
    expect(resAnchor?.coordinates).toEqual({ lat: anchorHome.lat, lng: anchorHome.lng })

    const resLandmark = resolveLocationSource({
      requested: false,
      selectedSourceKey: `landmark:${landmarkDragon.id}`,
      geo: emptyGeo,
      syncedLocation: syncedPhone,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(resLandmark?.kind).toBe("manual_landmark")
    expect(resLandmark?.label).toBe("Cầu Rồng")
  })

  it("ưu tiên GPS chính xác trên thiết bị (<= 150m) hơn vị trí đồng bộ từ điện thoại", () => {
    const res = resolveLocationSource({
      requested: true,
      selectedSourceKey: null,
      geo: {
        loading: false,
        accuracy: 25,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 16.08,
        longitude: 108.23,
        speed: null,
        timestamp: Date.now(),
        error: null,
      },
      syncedLocation: syncedPhone,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(res?.kind).toBe("device_gps")
    expect(res?.coordinates).toEqual({ lat: 16.08, lng: 108.23 })
  })

  it("dùng vị trí đồng bộ từ điện thoại khi thiết bị không có GPS hoặc accuracy > 150m", () => {
    const res = resolveLocationSource({
      requested: true,
      selectedSourceKey: null,
      geo: {
        loading: false,
        accuracy: 800,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 16.01,
        longitude: 108.15,
        speed: null,
        timestamp: Date.now(),
        error: null,
      },
      syncedLocation: syncedPhone,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(res?.kind).toBe("phone_synced")
    expect(res?.coordinates).toEqual({ lat: syncedPhone.lat, lng: syncedPhone.lng })
  })

  it("trên laptop (không có GPS phần cứng), luôn ưu tiên vị trí đồng bộ từ điện thoại trước geo của laptop", () => {
    const res = resolveLocationSource({
      requested: true,
      hasHardwareGps: false,
      selectedSourceKey: null,
      geo: {
        loading: false,
        accuracy: 40,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 16.09,
        longitude: 108.18,
        speed: null,
        timestamp: Date.now(),
        error: null,
      },
      syncedLocation: syncedPhone,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(res?.kind).toBe("phone_synced")
    expect(res?.coordinates).toEqual({ lat: syncedPhone.lat, lng: syncedPhone.lng })
  })

  it("rơi về mốc mặc định, rồi GPS thô, rồi DANANG_CENTER khi không có nguồn tốt hơn", () => {
    const resDefault = resolveLocationSource({
      requested: true,
      selectedSourceKey: null,
      geo: emptyGeo,
      syncedLocation: null,
      anchors: [anchorHome],
      landmarks: [landmarkDragon],
    })
    expect(resDefault?.kind).toBe("default_anchor")

    const resFallback = resolveLocationSource({
      requested: true,
      selectedSourceKey: null,
      geo: {
        loading: false,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: null,
        longitude: null,
        speed: null,
        timestamp: null,
        error: {
          code: 2,
          message: "Position unavailable",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        },
      },
      syncedLocation: null,
      anchors: [],
      landmarks: [],
    })
    expect(resFallback?.kind).toBe("fallback_center")
    expect(resFallback?.coordinates).toEqual(DANANG_CENTER)
  })
})
