import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/app/app"
import { initClientTelemetry } from "@/lib/telemetry"
import "./index.css"

initClientTelemetry()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
