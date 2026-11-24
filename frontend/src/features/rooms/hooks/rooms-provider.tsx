import type { ReactNode } from "react"
import { RoomsContext } from "./rooms-context"
import { useRoomsState } from "./use-rooms"

export function RoomsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const value = useRoomsState()
  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
}
