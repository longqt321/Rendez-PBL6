/**
 * Alt chuẩn cho ảnh địa điểm. Có ảnh thật thì mô tả ảnh; không có thì placeholder
 * đã hiện tên quán ngay trên khung nên alt chỉ nói rõ trạng thái thiếu ảnh.
 */
export function placeImageAlt(place: { name: string; imageUrl?: string }) {
  return place.imageUrl ? `Ảnh ${place.name}` : `Chưa có ảnh của ${place.name}`
}
