/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base hoặc full URL tới POST /api/v1/summarize (xem docs/summarize-api.md) */
  readonly VITE_SUMMARIZE_API_URL?: string
  /** Tùy chọn: Bearer token */
  readonly VITE_SUMMARIZE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
