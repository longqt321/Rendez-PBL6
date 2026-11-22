import { createContext, useContext } from "react"
import type { AdminRuntimeEnv, AdminRuntimeInfo } from "@rendez/schema"

export const DEFAULT_ADMIN_RUNTIME: AdminRuntimeInfo = {
  env: "development",
  piiMasked: false,
  redisConnected: false,
  mailConfigured: false,
  mediaStorage: "local",
  demoAutoVerifyEmail: false,
}

export interface AdminEnvContextValue {
  runtime: AdminRuntimeInfo
  env: AdminRuntimeEnv
  isProd: boolean
  isStaging: boolean
  isDev: boolean
  requiresStrictConfirm: boolean
}

export const AdminEnvContext = createContext<AdminEnvContextValue>({
  runtime: DEFAULT_ADMIN_RUNTIME,
  env: "development",
  isProd: false,
  isStaging: false,
  isDev: true,
  requiresStrictConfirm: false,
})

export function useAdminRuntime(): AdminEnvContextValue {
  return useContext(AdminEnvContext)
}
