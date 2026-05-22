import type { SummaryLength } from './extractiveSummarize'

export type ApiSummaryType = 'extractive' | 'abstractive' | 'hybrid'

export type OutputLang = 'vi' | 'en'

/**
 * Chuẩn hóa URL: chấp nhận base (vd. http://localhost:8000) hoặc full path …/api/v1/summarize
 */
export function resolveSummarizeApiUrl(): string {
  const raw = import.meta.env.VITE_SUMMARIZE_API_URL?.trim()
  if (!raw) return ''
  const u = raw.replace(/\/$/, '')
  if (/\/api\/v1\/summarize$/i.test(u)) return u
  return `${u}/api/v1/summarize`
}

export function hasSummarizeApi(): boolean {
  return Boolean(resolveSummarizeApiUrl())
}

/** Base API (vd. http://localhost:8000) từ cùng biến env với summarize */
export function resolveApiBaseUrl(): string {
  const full = resolveSummarizeApiUrl()
  if (!full) return ''
  return full.replace(/\/api\/v1\/summarize\/?$/i, '').replace(/\/$/, '')
}

/**
 * Headers JSON cho mọi request tới backend.
 * JWT auth được xử lý tự động qua HttpOnly cookie (credentials: 'include').
 * Nếu cấu hình VITE_SUMMARIZE_API_KEY, gửi kèm qua x-api-key.
 */
export function apiJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  }
  const apiKey = import.meta.env.VITE_SUMMARIZE_API_KEY?.trim()
  if (apiKey) headers['x-api-key'] = apiKey
  return headers
}

export type SummarizeApiRequest = {
  type: ApiSummaryType
  text: string
  length?: SummaryLength
  language?: OutputLang
  /** ID model theo `type` (extractive / abstractive / hybrid) */
  model?: string
  /** Chỉ dùng khi type = hybrid (override stage 1 extractive). */
  hybridExtractiveModel?: string
  /** Chỉ dùng khi type = hybrid (override stage 2 abstractive). */
  hybridAbstractiveModel?: string
  /** `true`: backend chạy sentiment trên chuỗi `summary` sau khi tóm tắt. */
  includeSentiment?: boolean
}

/** Kết quả sentiment khi `includeSentiment: true` và inference thành công. */
export type SummarizeSentiment = {
  label: string
  confidence: number
  scores: Record<string, number>
  model: string
}

export type SummarizeMeta = {
  type?: ApiSummaryType
  model?: string
  length?: SummaryLength
}

export type SummarizeResponse = {
  summary: string
  meta?: SummarizeMeta
  sentiment: SummarizeSentiment | null
}

type ApiErrorBody = { error?: { code?: string; message?: string } }
type ApiSuccessBody = {
  summary?: string
  meta?: SummarizeMeta
  sentiment?: SummarizeSentiment | null
}
type FileSummaryResponse = ApiSuccessBody & ApiErrorBody

function normalizeScores(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

const SENTIMENT_LABEL_VI: Record<string, string> = {
  negative: 'Tiêu cực',
  neutral: 'Trung tính',
  positive: 'Tích cực',
}

/** Map nhãn API (tiếng Anh) sang tiếng Việt cho UI. */
export function sentimentLabelVi(apiLabel: string): string {
  return SENTIMENT_LABEL_VI[apiLabel] ?? apiLabel
}

/** Chuẩn hoá object `sentiment` từ API (bỏ qua nếu thiếu trường bắt buộc). */
export function normalizeSummarizeSentiment(raw: unknown): SummarizeSentiment | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const label = typeof o.label === 'string' ? o.label.trim() : ''
  const confidence = typeof o.confidence === 'number' ? o.confidence : NaN
  const model = typeof o.model === 'string' ? o.model.trim() : ''
  const scores = normalizeScores(o.scores)
  if (!label || !Number.isFinite(confidence) || !model) return null
  return { label, confidence, scores, model }
}

function summarizeResponseFromBody(data: ApiSuccessBody): SummarizeResponse {
  const summaryRaw = data.summary
  const summary =
    typeof summaryRaw === 'string' && summaryRaw.trim() ? summaryRaw.trim() : ''
  const sentiment =
    data.sentiment === undefined || data.sentiment === null
      ? null
      : normalizeSummarizeSentiment(data.sentiment)
  return {
    summary,
    meta:
      data.meta && typeof data.meta === 'object'
        ? (data.meta as SummarizeMeta)
        : undefined,
    sentiment,
  }
}

export async function summarizeViaApi(req: SummarizeApiRequest): Promise<SummarizeResponse> {
  const url = resolveSummarizeApiUrl()
  if (!url) {
    throw new Error(
      'Chưa cấu hình VITE_SUMMARIZE_API_URL. Thêm vào file .env và khởi động lại dev server.',
    )
  }

  const body: Record<string, unknown> = {
    type: req.type,
    text: req.text,
    length: req.length ?? 'medium',
  }
  if (req.model?.trim()) {
    body.model = req.model.trim()
  }
  if (req.type === 'abstractive' || req.type === 'hybrid') {
    body.language = req.language ?? 'vi'
  }
  if (req.type === 'hybrid') {
    if (req.hybridExtractiveModel?.trim()) {
      body.hybridExtractiveModel = req.hybridExtractiveModel.trim()
    }
    if (req.hybridAbstractiveModel?.trim()) {
      body.hybridAbstractiveModel = req.hybridAbstractiveModel.trim()
    }
  }
  if (req.includeSentiment === true) {
    body.includeSentiment = true
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  let data: ApiErrorBody & ApiSuccessBody = {}
  try {
    data = (await res.json()) as ApiErrorBody & ApiSuccessBody
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      data.error?.message?.trim() ||
      (typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message?: string }).message)
        : '') ||
      res.statusText ||
      `HTTP ${res.status}`
    throw new Error(msg)
  }

  const parsed = summarizeResponseFromBody(data)
  if (!parsed.summary) {
    throw new Error('Phản hồi API không có trường summary hợp lệ.')
  }
  if (req.includeSentiment === true && parsed.sentiment === null) {
    throw new Error(
      'Đã bật phân tích cảm xúc nhưng phản hồi không có dữ liệu sentiment hợp lệ.',
    )
  }
  return parsed
}

export type SummarizeFileApiRequest = {
  file: File
  type: ApiSummaryType
  length?: SummaryLength
  language?: OutputLang
  model?: string
  hybridExtractiveModel?: string
  hybridAbstractiveModel?: string
  includeSentiment?: boolean
}

export async function summarizeFileViaApi(
  req: SummarizeFileApiRequest,
): Promise<SummarizeResponse> {
  const summarizeBase = resolveSummarizeApiUrl()
  if (!summarizeBase) {
    throw new Error(
      'Chưa cấu hình VITE_SUMMARIZE_API_URL. Thêm vào file .env và khởi động lại dev server.',
    )
  }

  if (!req.file) {
    throw new Error('Thiếu file cần tóm tắt.')
  }

  const url = `${summarizeBase}/file`
  const form = new FormData()
  form.append('file', req.file)
  form.append('type', req.type)
  form.append('length', req.length ?? 'medium')
  form.append('language', req.language ?? 'vi')
  if (req.model?.trim()) {
    form.append('model', req.model.trim())
  }
  if (req.type === 'hybrid') {
    if (req.hybridExtractiveModel?.trim()) {
      form.append('hybridExtractiveModel', req.hybridExtractiveModel.trim())
    }
    if (req.hybridAbstractiveModel?.trim()) {
      form.append('hybridAbstractiveModel', req.hybridAbstractiveModel.trim())
    }
  }
  if (req.includeSentiment === true) {
    form.append('includeSentiment', 'true')
  }

  const apiKey = import.meta.env.VITE_SUMMARIZE_API_KEY?.trim()
  const headers: Record<string, string> = {}
  if (apiKey) headers['x-api-key'] = apiKey

  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  })

  let data: FileSummaryResponse = {}
  try {
    data = (await res.json()) as FileSummaryResponse
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg = data.error?.message?.trim() || res.statusText || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const parsed = summarizeResponseFromBody(data)
  if (!parsed.summary) {
    throw new Error('Phản hồi API không có trường summary hợp lệ.')
  }
  if (req.includeSentiment === true && parsed.sentiment === null) {
    throw new Error(
      'Đã bật phân tích cảm xúc nhưng phản hồi không có dữ liệu sentiment hợp lệ.',
    )
  }

  return parsed
}
