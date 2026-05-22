import { translateApiError } from './apiErrors'
import {
  apiJsonHeaders,
  resolveApiBaseUrl,
  type ApiSummaryType,
  type OutputLang,
  type SummarizeMeta,
  type SummarizeSentiment,
} from './summarizeApi'

export type TopicLabel =
  | 'bat_dong_san'
  | 'chung_khoan'
  | 'ngan_hang'
  | 'vang_ngoai_te'
  | 'tai_chinh_khac'
  | 'xa_hoi_khac'

export const TOPIC_LABEL_VI: Record<TopicLabel, string> = {
  bat_dong_san: 'Bất động sản',
  chung_khoan: 'Chứng khoán',
  ngan_hang: 'Ngân hàng',
  vang_ngoai_te: 'Vàng / Ngoại tệ',
  tai_chinh_khac: 'Tài chính khác',
  xa_hoi_khac: 'Xã hội khác',
}

type ApiErrorBody = { error?: { code?: string; message?: string } }

export type LinkAnalyzeItem = {
  url: string
  textLength: number
  topic: TopicLabel
  isFinance: boolean
  financeScore: number
}

export type LinkCluster = {
  clusterId: number
  urlIndexes: number[]
  avgSimilarity: number
  topic: TopicLabel
  isFinance: boolean
  correlationScore: number
}

export type LinksAnalyzeResponse = {
  items: LinkAnalyzeItem[]
  clusters: LinkCluster[]
  overallCorrelationScore: number
  warnings: string[]
}

export type LinksAnalyzeRequest = {
  urls: string[]
  similarityThreshold?: number
}

export type LinksSummarizeMode = 'auto' | 'single-cluster' | 'multi-cluster'

export type LinksSummarizeRequest = {
  urls: string[]
  similarityThreshold?: number
  mode?: LinksSummarizeMode
  targetClusterIds?: number[] | null
  type?: ApiSummaryType
  length?: 'short' | 'medium' | 'long'
  language?: OutputLang
  model?: string
  hybridExtractiveModel?: string
  hybridAbstractiveModel?: string
  includeSentiment?: boolean
}

export type ClusterSummary = {
  clusterId: number
  urlIndexes: number[]
  topic: TopicLabel
  correlationScore: number
  summary: string
  summaryMarked?: string
  markers?: SummaryMarker[]
  segments?: SummarySegment[]
  meta?: SummarizeMeta
  sentiment: SummarizeSentiment | null
}

export type SummaryMarker = {
  marker: string
  urlIndex: number
  url: string
  title: string
}

export type SummarySegment = {
  marker: string
  urlIndex: number
  url: string
  text: string
}

export type LinksSummarizeResponse = {
  analysis: LinksAnalyzeResponse
  summaries: ClusterSummary[]
  warnings: string[]
}

function resolveUrl(path: string): string {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error(
      'Chưa cấu hình VITE_SUMMARIZE_API_URL. Vui lòng thêm biến env và khởi động lại ứng dụng.',
    )
  }
  return `${base}${path}`
}

function clampThreshold(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0.6
  return Math.max(0, Math.min(1, v))
}

function normalizeAnalyzeResponse(raw: Partial<LinksAnalyzeResponse>): LinksAnalyzeResponse {
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
    clusters: Array.isArray(raw.clusters) ? raw.clusters : [],
    overallCorrelationScore:
      typeof raw.overallCorrelationScore === 'number' ? raw.overallCorrelationScore : 0,
    warnings: Array.isArray(raw.warnings) ? raw.warnings.filter(Boolean) : [],
  }
}

export async function analyzeLinks(req: LinksAnalyzeRequest): Promise<LinksAnalyzeResponse> {
  const res = await fetch(resolveUrl('/api/v1/summarize/links/analyze'), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      urls: req.urls,
      similarityThreshold: clampThreshold(req.similarityThreshold),
    }),
  })

  let data: (ApiErrorBody & Partial<LinksAnalyzeResponse>) | null = null
  try {
    data = (await res.json()) as ApiErrorBody & Partial<LinksAnalyzeResponse>
  } catch {
    data = null
  }

  if (!res.ok) {
    const { message } = translateApiError(data?.error?.code, data?.error?.message)
    throw new Error(message || res.statusText || `HTTP ${res.status}`)
  }
  return normalizeAnalyzeResponse(data ?? {})
}

export async function summarizeLinks(req: LinksSummarizeRequest): Promise<LinksSummarizeResponse> {
  const res = await fetch(resolveUrl('/api/v1/summarize/links'), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      urls: req.urls,
      similarityThreshold: clampThreshold(req.similarityThreshold),
      mode: req.mode ?? 'auto',
      ...(req.targetClusterIds?.length ? { targetClusterIds: req.targetClusterIds } : {}),
      type: req.type ?? 'hybrid',
      length: req.length ?? 'medium',
      language: req.language ?? 'vi',
      ...(req.model?.trim() ? { model: req.model.trim() } : {}),
      ...(req.hybridExtractiveModel?.trim()
        ? { hybridExtractiveModel: req.hybridExtractiveModel.trim() }
        : {}),
      ...(req.hybridAbstractiveModel?.trim()
        ? { hybridAbstractiveModel: req.hybridAbstractiveModel.trim() }
        : {}),
      ...(req.includeSentiment ? { includeSentiment: true } : {}),
    }),
  })

  let data: (ApiErrorBody & Partial<LinksSummarizeResponse>) | null = null
  try {
    data = (await res.json()) as ApiErrorBody & Partial<LinksSummarizeResponse>
  } catch {
    data = null
  }

  if (!res.ok) {
    const { message } = translateApiError(data?.error?.code, data?.error?.message)
    throw new Error(message || res.statusText || `HTTP ${res.status}`)
  }

  const analysis = normalizeAnalyzeResponse(data?.analysis ?? {})
  const summaries = Array.isArray(data?.summaries)
    ? data.summaries.map((s) => ({
        clusterId: s.clusterId ?? -1,
        urlIndexes: Array.isArray(s.urlIndexes) ? s.urlIndexes : [],
        topic: (s.topic ?? 'xa_hoi_khac') as TopicLabel,
        correlationScore: typeof s.correlationScore === 'number' ? s.correlationScore : 0,
        summary: typeof s.summary === 'string' ? s.summary : '',
        summaryMarked:
          typeof s.summaryMarked === 'string' && s.summaryMarked.trim()
            ? s.summaryMarked
            : undefined,
        markers: Array.isArray(s.markers)
          ? s.markers
              .filter((m) => m && typeof m === 'object')
              .map((m) => ({
                marker: typeof m.marker === 'string' ? m.marker : '',
                urlIndex: typeof m.urlIndex === 'number' ? m.urlIndex : -1,
                url: typeof m.url === 'string' ? m.url : '',
                title: typeof m.title === 'string' ? m.title : '',
              }))
              .filter((m) => m.marker && m.url)
          : [],
        segments: Array.isArray(s.segments)
          ? s.segments
              .filter((seg) => seg && typeof seg === 'object')
              .map((seg) => ({
                marker: typeof seg.marker === 'string' ? seg.marker : '',
                urlIndex: typeof seg.urlIndex === 'number' ? seg.urlIndex : -1,
                url: typeof seg.url === 'string' ? seg.url : '',
                text: typeof seg.text === 'string' ? seg.text : '',
              }))
              .filter((seg) => seg.marker && seg.url && seg.text.trim())
          : [],
        meta: s.meta,
        sentiment: s.sentiment ?? null,
      }))
    : []

  return {
    analysis,
    summaries,
    warnings: Array.isArray(data?.warnings) ? data.warnings.filter(Boolean) : [],
  }
}
