import { LRUCache } from "lru-cache"
import { decryptJsonForUser, encryptJsonForUser } from "./crypto"
import { getRedis } from "./redis"

const ROOM_LOCATION_TTL_SECONDS = 24 * 60 * 60
const KEY_PREFIX = "rendez:room-loc:"

export interface EphemeralMemberLocation {
  lat: number
  lng: number
  locationLabel: string | null
}

const memoryRoomLocations = new LRUCache<string, string>({
  max: 2_000,
  ttl: ROOM_LOCATION_TTL_SECONDS * 1000,
})

function keyFor(roomCode: string, memberId: string): string {
  return `${KEY_PREFIX}${roomCode}:${memberId}`
}

/** Làm tròn 4 chữ số thập phân (~11m) để tránh lưu GPS chính xác từng mét. */
function quantizeCoord(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export async function setRoomMemberLocation(
  roomCode: string,
  memberId: string,
  coords: { lat: number; lng: number; locationLabel?: string | null },
): Promise<void> {
  const payload: EphemeralMemberLocation = {
    lat: quantizeCoord(coords.lat),
    lng: quantizeCoord(coords.lng),
    locationLabel: coords.locationLabel ?? null,
  }
  const sealed = encryptJsonForUser(roomCode, payload)
  const key = keyFor(roomCode, memberId)
  const redis = getRedis()
  if (redis) {
    await redis.set(key, sealed, "EX", ROOM_LOCATION_TTL_SECONDS)
    return
  }
  memoryRoomLocations.set(key, sealed)
}

export async function clearRoomMemberLocation(roomCode: string, memberId: string): Promise<void> {
  const key = keyFor(roomCode, memberId)
  const redis = getRedis()
  if (redis) {
    await redis.del(key)
  }
  memoryRoomLocations.delete(key)
}

export async function getRoomMemberLocations(
  roomCode: string,
  memberIds: readonly string[],
): Promise<Map<string, EphemeralMemberLocation>> {
  const result = new Map<string, EphemeralMemberLocation>()
  if (memberIds.length === 0) return result

  const keys = memberIds.map((id) => keyFor(roomCode, id))
  const redis = getRedis()
  const rawValues: (string | null)[] = redis
    ? await redis.mget(...keys)
    : keys.map((k) => memoryRoomLocations.get(k) ?? null)

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i]
    const sealed = rawValues[i]
    if (!memberId || !sealed) continue
    const decoded = decryptJsonForUser<EphemeralMemberLocation>(roomCode, sealed)
    if (decoded && Number.isFinite(decoded.lat) && Number.isFinite(decoded.lng)) {
      result.set(memberId, decoded)
    }
  }
  return result
}
