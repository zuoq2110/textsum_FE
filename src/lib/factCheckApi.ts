import { translateApiError } from './apiErrors'
import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'

export type FactCheckStatus = 'pass' | 'fail' | 'warn'

export type FactMatch = {
  text: string
  type: string
  normalized: string
  reason: string | null
}

export type FactCheckRegex = {
  matched: FactMatch[]
  unmatched: FactMatch[]
  suspicious: FactMatch[]
  sourceFactCount: number
  summaryFactCount: number
}

export type LlmVerification = {
  claim: string
  verdict: string
  evidenceQuote: string
  reason: string
}

export type FactCheckIssue = {
  level: 'warning' | 'error' | 'info'
  source: string
  message: string
  detail: string
}

export type FactCheckMeta = {
  language?: string
  useLlm?: boolean
  llmModel?: string
  checkedAt?: string
  pipeline?: string
}

export type FactCheckRequest = {
  source: string
  summary: string
  language?: string
  useLlm?: boolean
  model?: string
}

export type FactCheckResponse = {
  status: FactCheckStatus
  regex: FactCheckRegex
  llmVerifications: LlmVerification[]
  issues: FactCheckIssue[]
  warnings: string[]
  meta: FactCheckMeta
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

const DEFAULT_FACT_CHECK_MODEL = 'gemini-2.5-flash-lite-v1'

function resolveFactCheckApiUrl(): string {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error(
      'Chưa cấu hình VITE_SUMMARIZE_API_URL. Hãy thêm biến env và khởi động lại dev server.',
    )
  }
  return `${base}/api/v1/fact-check`
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function factCheckSummary(payload: FactCheckRequest): Promise<FactCheckResponse> {
  const reqBody: FactCheckRequest = {
    source: payload.source.trim(),
    summary: payload.summary.trim(),
    language: payload.language?.trim() || 'vi',
    useLlm: payload.useLlm ?? true,
    model: payload.model?.trim() || DEFAULT_FACT_CHECK_MODEL,
  }

  const res = await fetch(resolveFactCheckApiUrl(), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(reqBody),
  })

  const data = await parseJsonSafe<ApiErrorBody & Partial<FactCheckResponse>>(res)
  if (!res.ok) {
    const { message } = translateApiError(data?.error?.code, data?.error?.message)
    throw new Error(message || res.statusText || `HTTP ${res.status}`)
  }

  if (!data?.status || !data.regex) {
    throw new Error('Phản hồi fact-check không hợp lệ.')
  }

  return {
    status: data.status,
    regex: data.regex,
    llmVerifications: data.llmVerifications ?? [],
    issues: data.issues ?? [],
    warnings: data.warnings ?? [],
    meta: data.meta ?? {},
  }
}
