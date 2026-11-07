export type PlaceCategory = "cafe" | "restaurant" | "street-food" | "bakery" | "dessert" | "bar"

export interface Place {
  id: string
  name: string
  address: string
  city: string
  category: PlaceCategory
  tags: string[]
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3
  imageSeed: string
  /** Chiều cao ảnh (px) cho bố cục masonry trên mobile */
  imageHeight: number
  /** null = địa điểm chưa được thuật toán đưa lên /discover */
  publishedAt: string | null
}
