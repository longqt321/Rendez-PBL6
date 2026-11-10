import { useEffect } from "react"
import { useGeolocation } from "@uidotdev/usehooks"
import type { GeolocationState } from "@uidotdev/usehooks"

/**
 * Cầu nối vô hình giữa `useGeolocation` và hook `useUserLocation`.
 *
 * `useGeolocation` đăng ký `getCurrentPosition` + `watchPosition` **ngay khi
 * mount**, nên không thể gọi thẳng trong `useUserLocation` (sẽ hỏi quyền vị
 * trí ngay lúc mở `/discover`). Component này chỉ được render sau khi người
 * dùng bấm "Gần đây".
 *
 * Tách khỏi `use-user-location.tsx` để file đó chỉ export hook — tránh vi phạm
 * `react-refresh/only-export-components`.
 */
export function GeolocationWatcher({
  options,
  onState,
}: {
  options: PositionOptions
  onState: (state: GeolocationState) => void
}) {
  const state = useGeolocation(options)

  useEffect(() => {
    onState(state)
  }, [state, onState])

  return null
}
