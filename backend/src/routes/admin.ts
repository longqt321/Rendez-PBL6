import { Hono } from "hono"
import type { AppEnv } from "../app"
import { requireAuth } from "../lib/session"
import { registerAdminAuditLogRoutes } from "./admin/audit-logs"
import { registerAdminObservabilityRoutes } from "./admin/observability"
import { registerAdminOverviewRoutes } from "./admin/overview"
import { registerAdminPlaceRoutes } from "./admin/places"
import { registerAdminReportRoutes } from "./admin/reports"
import { registerAdminUserRoutes } from "./admin/users"

export function createAdminRouter() {
  const router = new Hono<AppEnv>()

  router.use("/admin/*", requireAuth)
  router.use("/admin", requireAuth)

  registerAdminOverviewRoutes(router)
  registerAdminReportRoutes(router)
  registerAdminPlaceRoutes(router)
  registerAdminUserRoutes(router)
  registerAdminAuditLogRoutes(router)
  registerAdminObservabilityRoutes(router)

  return router
}
