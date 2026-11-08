/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** `"true"` bật mock server in-memory; `"false"` tắt. Bỏ trống: dev bật, build tắt. */
  readonly VITE_ENABLE_MOCKS?: "true" | "false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
