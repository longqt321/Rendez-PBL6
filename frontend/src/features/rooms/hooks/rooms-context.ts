import { createContext } from "react"
import type { UseRoomsResult } from "./use-rooms"

export const RoomsContext = createContext<UseRoomsResult | null>(null)
