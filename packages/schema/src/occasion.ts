import { z } from "zod"
import type { PlaceCategory } from "./types/place"

export const OCCASION_KEYS = ["solo", "date", "friends", "family", "late-night"] as const
export type OccasionKey = (typeof OCCASION_KEYS)[number]

export const occasionSchema = z.enum(OCCASION_KEYS)

export interface OccasionPreset {
  readonly key: OccasionKey
  readonly label: string
  readonly shortLabel: string
  readonly description: string
  readonly categories: readonly PlaceCategory[]
  readonly queryKeywords: readonly string[]
}

export const OCCASION_PRESETS: readonly OccasionPreset[] = [
  {
    key: "solo",
    label: "Đi một mình · Làm việc",
    shortLabel: "Một mình",
    description: "Quán yên tĩnh, cà phê học bài hoặc ăn nhanh gọn",
    categories: ["cafe", "bakery"],
    queryKeywords: ["yên tĩnh", "làm việc", "wifi", "cà phê"],
  },
  {
    key: "date",
    label: "Hẹn hò 2 người",
    shortLabel: "Hẹn hò",
    description: "Không gian ấm cúng, đồ tráng miệng hoặc quán view đẹp",
    categories: ["cafe", "restaurant", "dessert", "bar"],
    queryKeywords: ["view đẹp", "ấm cúng", "hẹn hò", "chill"],
  },
  {
    key: "friends",
    label: "Tụ tập bạn bè",
    shortLabel: "Bạn bè",
    description: "Quán rộng rãi, ăn vặt, lẩu nướng hoặc trò chuyện thoải mái",
    categories: ["street-food", "restaurant", "cafe", "bar"],
    queryKeywords: ["nhóm", "rộng rãi", "ăn vặt", "tụ tập"],
  },
  {
    key: "family",
    label: "Gia đình",
    shortLabel: "Gia đình",
    description: "Quán ăn chuẩn vị, sạch sẽ, phù hợp nhiều lứa tuổi",
    categories: ["restaurant", "bakery", "dessert"],
    queryKeywords: ["gia đình", "cơm", "hải sản", "đặc sản"],
  },
  {
    key: "late-night",
    label: "Ăn khuya · Chill tối",
    shortLabel: "Đi khuya",
    description: "Quán mở muộn, ăn đêm hoặc bar nhẹ buổi tối",
    categories: ["street-food", "bar", "restaurant"],
    queryKeywords: ["khuya", "đêm", "tối", "chill"],
  },
] as const

export function getOccasionPreset(key: OccasionKey): OccasionPreset {
  return OCCASION_PRESETS.find((item) => item.key === key) ?? OCCASION_PRESETS[0]!
}
