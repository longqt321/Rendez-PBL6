/** Một ngày trong lịch trình chuyến đi. */
export interface TripDay {
  /** Ngày local dạng "YYYY-MM-DD" — KHÔNG dùng ISO có múi giờ. */
  date: string
  district?: string
  placeIds: string[]
  budgetTier?: 1 | 2 | 3
  note?: string
}

/** Chuyến đi của người dùng. */
export interface Trip {
  id: string
  name: string
  startDate: string // "YYYY-MM-DD" local
  endDate: string // "YYYY-MM-DD" local
  arrivalAt?: string // ISO datetime — chỉ để gắn nhãn ngày, không dựng timeline
  departureAt?: string
  baseDistrict?: string
  baseLabel?: string
  days: TripDay[]
  /** Quán bị rơi khỏi ngày khi rút ngắn chuyến — không xoá im lặng. */
  unscheduledPlaceIds: string[]
  createdAt: string
}

export type TripStatus = "upcoming" | "ongoing" | "ended"

/** Dữ liệu form tạo/chỉnh chuyến đi. */
export interface TripInput {
  name: string
  startDate: string
  endDate: string
  arrivalAt?: string
  departureAt?: string
  baseDistrict?: string
  baseLabel?: string
}
