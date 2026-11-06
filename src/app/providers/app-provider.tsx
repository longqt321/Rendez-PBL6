import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "./query-provider"
import { ThemeProvider } from "./theme-provider"

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}
