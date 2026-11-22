import { useEffect, type ReactNode } from "react"
import type { AdminRuntimeEnv, AdminRuntimeInfo } from "@rendez/schema"
import { AdminEnvContext, DEFAULT_ADMIN_RUNTIME } from "./admin-env-store"

const ENV_TITLE_PREFIX: Record<AdminRuntimeEnv, string> = {
  development: "[DEV]",
  staging: "[STAGING]",
  production: "[PROD]",
}

export function AdminEnvProvider({
  runtime,
  activeTabLabel,
  children,
}: Readonly<{
  runtime?: AdminRuntimeInfo
  activeTabLabel: string
  children: ReactNode
}>) {
  const resolved = runtime ?? DEFAULT_ADMIN_RUNTIME
  const isProd = resolved.env === "production"
  const isStaging = resolved.env === "staging"
  const isDev = resolved.env === "development"

  useEffect(() => {
    const prefix = ENV_TITLE_PREFIX[resolved.env]
    document.title = `${prefix} ${activeTabLabel} · Quản trị Rendez`
  }, [resolved.env, activeTabLabel])

  return (
    <AdminEnvContext.Provider
      value={{
        runtime: resolved,
        env: resolved.env,
        isProd,
        isStaging,
        isDev,
        requiresStrictConfirm: isProd,
      }}
    >
      {children}
    </AdminEnvContext.Provider>
  )
}
