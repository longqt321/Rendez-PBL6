import { useState, useCallback } from "react"

export interface UserCoordinates {
  lat: number
  lng: number
}

// Toạ độ Cầu Rồng Đà Nẵng dùng làm fallback vị trí trung tâm
export const DANANG_CENTER: UserCoordinates = {
  lat: 16.0612,
  lng: 108.2272,
}

export function useUserLocation() {
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị địa lý.")
      setCoordinates(DANANG_CENTER)
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsLocating(false)
      },
      (error) => {
        console.warn("Lỗi lấy vị trí người dùng:", error.message)
        setLocationError("Không lấy được toạ độ GPS, sử dụng vị trí trung tâm Đà Nẵng.")
        // Fallback về vị trí trung tâm Đà Nẵng (Cầu Rồng)
        setCoordinates(DANANG_CENTER)
        setIsLocating(false)
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true },
    )
  }, [])

  const clearLocation = useCallback(() => {
    setCoordinates(null)
    setLocationError(null)
  }, [])

  return {
    coordinates,
    isLocating,
    locationError,
    requestLocation,
    clearLocation,
  }
}
