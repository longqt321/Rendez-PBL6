/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL API; bỏ trống thì `env.ts` dùng mặc định `/api`. */
  readonly VITE_API_BASE_URL?: string
  /** `"true"`/`"false"` — chỉ có hiệu lực ở dev (mock không tồn tại ở production). */
  readonly VITE_ENABLE_MOCKS?: "true" | "false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
