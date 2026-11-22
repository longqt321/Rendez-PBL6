import type {
  CityLandmark,
  CreateAnchorInput,
  SyncedLocation,
  UpdateAnchorInput,
  UpsertSyncedLocationInput,
  UserLocationAnchor,
} from "@rendez/schema"
import { api } from "@/lib/axios"

export interface GeocodeSuggestion {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export async function searchAddress(query: string): Promise<GeocodeSuggestion[]> {
  const { data } = await api.get<{ items: GeocodeSuggestion[] }>("/geocode", {
    params: { q: query },
  })
  return data.items
}

export async function getLandmarks(): Promise<CityLandmark[]> {
  const { data } = await api.get<{ items: CityLandmark[] }>("/landmarks")
  return data.items
}

export async function getMyAnchors(): Promise<UserLocationAnchor[]> {
  const { data } = await api.get<{ items: UserLocationAnchor[] }>("/me/anchors")
  return data.items
}

export async function createAnchor(input: CreateAnchorInput): Promise<UserLocationAnchor> {
  const { data } = await api.post<{ anchor: UserLocationAnchor }>("/me/anchors", input)
  return data.anchor
}

export async function updateAnchor(
  id: string,
  input: UpdateAnchorInput,
): Promise<UserLocationAnchor> {
  const { data } = await api.patch<{ anchor: UserLocationAnchor }>(`/me/anchors/${id}`, input)
  return data.anchor
}

export async function deleteAnchor(id: string): Promise<void> {
  await api.delete(`/me/anchors/${id}`)
}

export async function getSyncedLocation(): Promise<SyncedLocation | null> {
  const { data } = await api.get<{ location: SyncedLocation | null }>("/me/location")
  return data.location
}

export async function upsertSyncedLocation(
  input: UpsertSyncedLocationInput,
): Promise<SyncedLocation> {
  const { data } = await api.put<{ location: SyncedLocation }>("/me/location", input)
  return data.location
}

export async function deleteSyncedLocation(): Promise<void> {
  await api.delete("/me/location")
}
