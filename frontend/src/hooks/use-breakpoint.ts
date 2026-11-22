import { useMediaQuery } from "@uidotdev/usehooks"

export const BREAKPOINTS = {
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
} as const

export function useIsDesktop() {
  return useMediaQuery(BREAKPOINTS.md)
}

export function useIsMobile() {
  return !useIsDesktop()
}
