import { translateApiError } from './apiErrors'
import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'

export type JudgeMetricName = 'rouge' | 'bleu' | 'bertscore'
export type JudgeTargetLength = 'short' | 'medium' | 'long'

export type PRFScore = {
  p: number
  r: number
  f: number
}

export type JudgeRequest = {
  source: string
  candidateSummary?: string
  language?: string
  targetLength?: JudgeTargetLength
  metrics?: JudgeMetricName[]
  generateReference?: boolean
  includeCritique?: boolean
}

export type JudgeMetrics = {
  rouge1?: PRFScore
  rouge2?: PRFScore
  rougeL?: PRFScore
  bleu?: number
  bertscore?: PRFScore
}

export type JudgeMeta = {
  referenceModel?: string
  language?: string
  generatedAt?: string
  metricVersions?: Record<string, string>
  computedAt?: string | null
}

export type JudgeResponse = {
  referenceSummary: string
  metrics: JudgeMetrics
  meta: JudgeMeta
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

function resolveJudgeApiUrl(): string {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error(
      'Chưa cấu hình VITE_SUMMARIZE_API_URL. Hãy thêm biến env và khởi động lại dev server.',
    )
  }
  return `${base}/api/v1/evaluate/judge`
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function normalizeMetricList(metrics?: JudgeMetricName[]): JudgeMetricName[] | undefined {
  if (!metrics?.length) return undefined
  return Array.from(new Set(metrics))
}

export async function evaluateWithJudge(payload: JudgeRequest): Promise<JudgeResponse> {
  const reqBody: JudgeRequest = {
    source: payload.source,
    ...(payload.candidateSummary?.trim()
      ? { candidateSummary: payload.candidateSummary.trim() }
      : {}),
    language: payload.language?.trim() || 'vi',
    targetLength: payload.targetLength ?? 'medium',
    generateReference: payload.generateReference ?? true,
    includeCritique: payload.includeCritique ?? false,
    ...(normalizeMetricList(payload.metrics) ? { metrics: normalizeMetricList(payload.metrics) } : {}),
  }

  const res = await fetch(resolveJudgeApiUrl(), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(reqBody),
  })

  const data = await parseJsonSafe<ApiErrorBody & Partial<JudgeResponse>>(res)
  if (!res.ok) {
    const { message } = translateApiError(data?.error?.code, data?.error?.message)
    throw new Error(message || res.statusText || `HTTP ${res.status}`)
  }

  const referenceSummary = data?.referenceSummary?.trim()
  if (!referenceSummary) {
    throw new Error('Phản hồi evaluate/judge không có referenceSummary hợp lệ.')
  }

  return {
    referenceSummary,
    metrics: data?.metrics ?? {},
    meta: data?.meta ?? {},
  }
}

