import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "./query-provider"
import { SkinProvider } from "./skin-provider"
import { ThemeProvider } from "./theme-provider"

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SkinProvider>
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </SkinProvider>
    </ThemeProvider>
  )
}
