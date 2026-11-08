import { useLocalStorage } from "@uidotdev/usehooks"
import { generateDays, resizeDays } from "../lib/trip"
import type { Trip, TripInput } from "../types/trip"

/** Key localStorage có version — đổi shape thì đổi version, không migrate. */
const TRIPS_STORAGE_KEY = "danang-trip-v1"

export interface UseTripsResult {
  trips: Trip[]
  /** Tạo chuyến mới: sinh id, days từ generateDays, unshift lên đầu (mới nhất trên cùng). */
  createTrip: (input: TripInput) => Trip
  /** Cập nhật: resizeDays(trip, input.startDate, input.endDate, input.baseDistrict) giữ nội dung ngày còn lại; ngày bị cắt dồn unscheduledPlaceIds. */
  updateTrip: (id: string, input: TripInput) => void
  deleteTrip: (id: string) => void
}

/**
 * Danh sách chuyến đi của người dùng, lưu bền ở localStorage.
 *
 * localStorage ≈ đúng ngữ nghĩa cá nhân với mock 1 user ME: dữ liệu chỉ thuộc về
 * người dùng hiện tại nên không cần server, không cần zustand hay context.
 * Mọi mutation đều đi qua `setTrips(prev => ...)` để không mutate mảng cũ.
 */
export function useTrips(): UseTripsResult {
  const [trips, setTrips] = useLocalStorage<Trip[]>(TRIPS_STORAGE_KEY, [])

  /**
   * Tạo chuyến mới từ dữ liệu form.
   *
   * Sinh id bằng `crypto.randomUUID()`, dựng lịch trình bằng `generateDays` và
   * đưa chuyến lên đầu danh sách (mới nhất trên cùng). Trả về chuyến vừa tạo để
   * nơi gọi có thể điều hướng ngay. Dữ liệu nằm ở localStorage ≈ đúng ngữ nghĩa
   * cá nhân với mock 1 user ME.
   */
  const createTrip = (input: TripInput): Trip => {
    const trip: Trip = {
      ...input,
      id: crypto.randomUUID(),
      days: generateDays(input.startDate, input.endDate, input.baseDistrict),
      unscheduledPlaceIds: [],
      createdAt: new Date().toISOString(),
    }

    setTrips((prev) => [trip, ...prev])

    return trip
  }

  /**
   * Cập nhật chuyến theo `id`.
   *
   * `resizeDays` giữ nội dung của những ngày còn lại và dồn địa điểm của ngày bị
   * cắt vào `unscheduledPlaceIds`; sau đó ghi đè các trường người dùng sửa.
   * Không tìm thấy chuyến thì không làm gì. Dữ liệu nằm ở localStorage ≈ đúng
   * ngữ nghĩa cá nhân với mock 1 user ME.
   */
  const updateTrip = (id: string, input: TripInput): void => {
    setTrips((prev) => {
      const existing = prev.find((trip) => trip.id === id)
      if (!existing) return prev

      const resized = resizeDays(existing, input.startDate, input.endDate, input.baseDistrict)
      const updated: Trip = {
        ...resized,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        arrivalAt: input.arrivalAt,
        departureAt: input.departureAt,
        baseDistrict: input.baseDistrict,
        baseLabel: input.baseLabel,
      }

      return prev.map((trip) => (trip.id === id ? updated : trip))
    })
  }

  /**
   * Xoá chuyến theo `id`.
   *
   * Chỉ lọc bỏ đúng phần tử cần xoá, không đụng tới các chuyến khác. Dữ liệu nằm
   * ở localStorage ≈ đúng ngữ nghĩa cá nhân với mock 1 user ME.
   */
  const deleteTrip = (id: string): void => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id))
  }

  return { trips, createTrip, updateTrip, deleteTrip }
}
