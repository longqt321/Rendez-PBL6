import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "./query-provider"
import { SkinProvider } from "./skin-provider"
import { ThemeProvider } from "./theme-provider"

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SkinProvider>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </SkinProvider>
    </ThemeProvider>
  )
}
