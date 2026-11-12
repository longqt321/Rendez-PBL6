import { AppProvider } from "./providers/app-provider"
import { AppRouter } from "./router"
import { ApiDebugOverlay } from "@/components/dev/api-debug-overlay"

export function App() {
  return (
    <AppProvider>
      <AppRouter />
      {/* Overlay dev (Ctrl+Shift+D) — tự ẩn hoàn toàn ở bản PROD. */}
      <ApiDebugOverlay />
    </AppProvider>
  )
}
