import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'

export type RagChunkRef = {
  id?: string
  text: string
  score?: number
  source?: string
}

type ApiErrorBody = { error?: { message?: string } }

export type RagIngestRequest = {
  docId: string
  text: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
  collection?: string
}

type RagIngestResponse = {
  docId?: string
  chunks?: number
  status?: string
}

export async function ragIngest(req: RagIngestRequest): Promise<RagIngestResponse> {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error('Chưa cấu hình VITE_SUMMARIZE_API_URL.')
  }
  const res = await fetch(`${base}/api/v1/rag/ingest`, {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(req),
  })
  let data: ApiErrorBody & RagIngestResponse = {}
  try {
    data = (await res.json()) as ApiErrorBody & RagIngestResponse
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(data.error?.message?.trim() || res.statusText || `HTTP ${res.status}`)
  }
  return data
}

export type RagAskRequest = {
  question: string
  topK?: number
  docId?: string
  collection?: string
  /** ID model LLM — cùng chuẩn với body `model` của /api/v1/summarize */
  model?: string
}

type RagAskResponse = {
  answer?: string
  chunks?: RagChunkRef[]
}

export async function ragAsk(req: RagAskRequest): Promise<RagAskResponse> {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error('Chưa cấu hình VITE_SUMMARIZE_API_URL.')
  }
  const res = await fetch(`${base}/api/v1/rag/ask`, {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(req),
  })
  let data: ApiErrorBody & RagAskResponse = {}
  try {
    data = (await res.json()) as ApiErrorBody & RagAskResponse
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(data.error?.message?.trim() || res.statusText || `HTTP ${res.status}`)
  }
  if (!data.answer?.trim()) {
    throw new Error('Phản hồi RAG không có answer.')
  }
  return data
}
