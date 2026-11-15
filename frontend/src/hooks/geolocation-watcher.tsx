import { useEffect } from "react"
import { useGeolocation } from "@uidotdev/usehooks"
import type { GeolocationState } from "@uidotdev/usehooks"

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
