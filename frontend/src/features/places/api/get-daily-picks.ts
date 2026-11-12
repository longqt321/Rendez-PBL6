import { api } from "@/lib/axios"
import type { DailyPicks } from "../types/place"

/**
 * `GET /places/daily-picks` — 3 quán "Gợi ý hôm nay" do server chọn sẵn.
 *
 * Không tham số, không phụ thuộc người xem; server chưa có picks (job chưa chạy)
 * trả `items: []` — client coi rỗng là "ẩn dải", không phải lỗi.
 */
export async function getDailyPicks(signal?: AbortSignal): Promise<DailyPicks> {
  const { data } = await api.get<DailyPicks>("/places/daily-picks", { signal })
  return data
}
