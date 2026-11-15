export function placeImageAlt(place: { name: string; imageUrl?: string }) {
  return place.imageUrl ? `Ảnh ${place.name}` : `Chưa có ảnh của ${place.name}`
}
