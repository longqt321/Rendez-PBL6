import { api } from "@/lib/axios"
import type { DailyPicks } from "../types/place"

export async function getDailyPicks(signal?: AbortSignal): Promise<DailyPicks> {
  const { data } = await api.get<DailyPicks>("/places/daily-picks", { signal })
  return data
}
