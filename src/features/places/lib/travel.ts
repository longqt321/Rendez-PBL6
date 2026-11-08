export type TravelMode = "scooter" | "walk"

/** Tốc độ trung bình trong nội thành Đà Nẵng (km/h). */
const SPEED_KMH: Record<TravelMode, number> = { scooter: 20, walk: 4.5 }

/** Hệ số bảo thủ: đường chim bay chậm hơn thực tế 1,5 lần. */
const CONSERVATIVE_FACTOR = 1.5

/** Làm tròn lên bội số 5 phút — con số quá chính xác tạo cảm giác giả. */
const ROUND_TO_MINUTES = 5

/**
 * Ước lượng phút di chuyển nội thành từ khoảng cách đường chim bay.
 *
 * ƯỚC LƯỢNG, không phải routing thật: không có dữ liệu đường bộ, giờ cao điểm.
 * UI gọi hàm này phải ghi rõ "ước lượng" cho người dùng.
 * Dùng chung cho cảnh báo lịch trình (DX-6.2) và cảnh báo "đi vòng" theo ngày (DX-10.2) —
 * một nghiệp vụ một chỗ, không nhân bản công thức.
 */
export function estimateTravelMinutes(distanceKm: number, mode: TravelMode = "scooter"): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const minutes = (distanceKm / SPEED_KMH[mode]) * 60 * CONSERVATIVE_FACTOR
  return Math.ceil(minutes / ROUND_TO_MINUTES) * ROUND_TO_MINUTES
}
