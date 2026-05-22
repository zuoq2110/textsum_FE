import type { SummarizeSentiment } from './summarizeApi'

export type SummarizeMode = 'extractive' | 'abstractive' | 'hybrid'

export type HistoryEntry = {
  id: string
  createdAt: number
  source: string
  summary: string
  mode: SummarizeMode
  /** ID model đã dùng khi gọi API (nếu có) */
  model?: string
  /** Có khi lúc tóm tắt đã bật `includeSentiment` và server trả về / lưu sentiment. */
  sentiment?: SummarizeSentiment
}

const KEY = 'textsum_history_v1'
const MAX = 30

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function normalizeMode(raw: unknown): SummarizeMode {
  if (raw === 'abstractive' || raw === 'extractive' || raw === 'hybrid') return raw
  if (raw === 'openai') return 'abstractive'
  return 'extractive'
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.id === 'string' &&
          typeof x.source === 'string' &&
          typeof x.summary === 'string',
      )
      .map((x) => ({ ...x, mode: normalizeMode(x.mode) }))
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export function saveHistoryEntry(
  source: string,
  summary: string,
  mode: SummarizeMode,
  model?: string,
  sentiment?: SummarizeSentiment | null,
): HistoryEntry {
  const entry: HistoryEntry = {
    id: uid(),
    createdAt: Date.now(),
    source,
    summary,
    mode,
    ...(model?.trim() ? { model: model.trim() } : {}),
    ...(sentiment ? { sentiment } : {}),
  }
  const prev = loadHistory()
  const next = [entry, ...prev].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
  return entry
}

export function removeHistoryEntry(id: string): void {
  const prev = loadHistory()
  localStorage.setItem(
    KEY,
    JSON.stringify(prev.filter((e) => e.id !== id)),
  )
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
