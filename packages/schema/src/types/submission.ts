import type { PlaceCategory } from "./place"

export type SubmissionStatus = "pending" | "reviewed" | "dismissed"

export interface PlaceSubmission {
  id: string
  submitterId: string
  submitterName?: string
  name: string
  address: string
  city: string
  district?: string
  category: PlaceCategory
  priceLevel: (1 | 2 | 3) | null
  lat?: number
  lng?: number
  openingHours?: string
  phone?: string
  description?: string
  tags: string[]
  imageUrls: string[]
  status: SubmissionStatus
  reviewerId?: string
  reviewNote?: string
  createdPlaceId?: string
  createdAt: string
  updatedAt: string
}
