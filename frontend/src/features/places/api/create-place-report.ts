import { api } from "@/lib/axios"
import type { PlaceReport, PlaceReportReason } from "../types/place-report"

export interface CreatePlaceReportInput {
  reason: PlaceReportReason

  detail?: string
}

export async function createPlaceReport(
  placeId: string,
  input: CreatePlaceReportInput,
): Promise<PlaceReport> {
  const { data } = await api.post<PlaceReport>(`/places/${placeId}/reports`, input)
  return data
}
