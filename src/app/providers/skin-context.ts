import { createContext, useContext } from "react"

export type Skin = "default" | "retro"

export interface SkinContextValue {
  skin: Skin
  setSkin: (skin: Skin) => void
}

export const SkinContext = createContext<SkinContextValue | null>(null)

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext)
  if (!ctx) throw new Error("useSkin phải được dùng bên trong <SkinProvider>")
  return ctx
}
