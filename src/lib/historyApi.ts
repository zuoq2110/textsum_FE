/**
 * Client cho GET /api/v1/history/summaries
 * Auth tự động qua HttpOnly cookie (credentials: 'include').
 */
import {
  apiJsonHeaders,
  normalizeSummarizeSentiment,
  resolveApiBaseUrl,
} from './summarizeApi'
import { type HistoryEntry, type SummarizeMode } from './historyStorage'

type ServerHistoryRequest = {
  type?: string
  text?: string
  length?: string
  language?: string
  model?: string | null
  hybridExtractiveModel?: string | null
  hybridAbstractiveModel?: string | null
}

type ServerHistoryResult = {
  summary?: string
  meta?: {
    type?: string
    model?: string
    length?: string
  }
  sentiment?: unknown
}

type ServerHistoryItem = {
  id: string
  userId?: string
  email?: string
  request: ServerHistoryRequest
  result: ServerHistoryResult
  createdAt: string
}

type ServerHistoryResponse = {
  items?: ServerHistoryItem[]
  total?: number
  limit?: number
  skip?: number
}

function normalizeMode(raw: unknown): SummarizeMode {
  if (raw === 'abstractive' || raw === 'extractive' || raw === 'hybrid') return raw
  return 'extractive'
}

function mapToHistoryEntry(item: ServerHistoryItem): HistoryEntry | null {
  const source = item.request?.text?.trim()
  const summary = item.result?.summary?.trim()
  if (!source || !summary) return null

  const model =
    (item.request.model?.trim() || item.result.meta?.model?.trim()) ?? undefined

  const sentiment = normalizeSummarizeSentiment(item.result?.sentiment)

  return {
    id: item.id,
    createdAt: new Date(item.createdAt).getTime(),
    source,
    summary,
    mode: normalizeMode(item.request?.type),
    ...(model ? { model } : {}),
    ...(sentiment ? { sentiment } : {}),
  }
}

export async function fetchServerHistory(
  limit = 50,
  skip = 0,
): Promise<HistoryEntry[]> {
  const base = resolveApiBaseUrl()
  if (!base) return []

  const url = `${base}/api/v1/history/summaries?limit=${limit}&skip=${skip}`
  const res = await fetch(url, {
    method: 'GET',
    headers: apiJsonHeaders(),
    credentials: 'include',
  })

  if (!res.ok) return []

  let data: ServerHistoryResponse = {}
  try {
    data = (await res.json()) as ServerHistoryResponse
  } catch {
    return []
  }

  if (!Array.isArray(data.items)) return []

  return data.items
    .map(mapToHistoryEntry)
    .filter((e): e is HistoryEntry => e !== null)
}
