import type { SummarizeMode } from './historyStorage'

/** ID gửi lên API (`model` trong body). Chỉnh theo backend thực tế. */
export type ModelOption = { id: string; label: string }

/** Model kế tiếp trong danh sách (để gợi ý cột B khi bật so sánh). */
export function nextModelOptionId(models: ModelOption[], currentId: string): string {
  if (!models.length) return currentId
  const i = Math.max(0, models.findIndex((m) => m.id === currentId))
  return models[(i + 1) % models.length]!.id
}

export const EXTRACTIVE_MODELS: ModelOption[] = [
  { id: 'phobert-extractive-v1', label: 'PhoBERT — finetune (mặc định)' },
  { id: 'phobert-extractive-v2', label: 'PhoBERT — v2' },
  {
    id: 'phobert-finance-extractive-v1',
    label: 'PhoBERT — tài chính (finetune)',
  },
]

export const ABSTRACTIVE_MODELS: ModelOption[] = [
  { id: 'qwen-abstractive-v1', label: 'Qwen — v1' },
  { id: 'qwen-abstractive-v2', label: 'Qwen — v2' },
  {
    id: 'qwen-abstractive-finance-v1',
    label: 'Qwen 2.5 3B — tài chính (finetune)',
  },
  {
    id: 'llama3.2-3b-abstractive-finance-v1',
    label: 'Llama 3.2 3B — tài chính (finetune)',
  },
  {
    id: 'qwen2.5-7b-abstractive-finance-v1',
    label: 'Qwen 2.5 7B — tài chính (finetune)',
  },
  { id: 'gemini-3.1-flash-lite-v1', label: 'Gemini 3.1 Flash Lite — v1' },
  { id: 'gemini-2.5-flash-lite-v1', label: 'Gemini 2.5 Flash Lite' },
]

/** Mô tả ngắn một cột so sánh (chế độ + nhãn model đang dùng). */
export function formatCompareSideCaption(
  mode: SummarizeMode,
  extractiveModelId: string,
  abstractiveModelId: string,
): string {
  const modeLabel =
    mode === 'extractive'
      ? 'Trích chọn'
      : mode === 'abstractive'
        ? 'Sinh văn'
        : 'Hybrid'
  if (mode === 'hybrid') {
    const exLabel =
      EXTRACTIVE_MODELS.find((m) => m.id === extractiveModelId)?.label ??
      extractiveModelId
    const abLabel =
      ABSTRACTIVE_MODELS.find((m) => m.id === abstractiveModelId)?.label ??
      abstractiveModelId
    return `${modeLabel} — ${exLabel} + ${abLabel}`
  }
  const modelId = mode === 'extractive' ? extractiveModelId : abstractiveModelId
  const list = mode === 'extractive' ? EXTRACTIVE_MODELS : ABSTRACTIVE_MODELS
  const label = list.find((m) => m.id === modelId)?.label ?? modelId
  return `${modeLabel} — ${label}`
}

export function defaultExtractiveModelId(): string {
  return EXTRACTIVE_MODELS[0]?.id ?? 'phobert-extractive-v1'
}

export function defaultAbstractiveModelId(): string {
  return ABSTRACTIVE_MODELS[0]?.id ?? 'qwen-abstractive-v1'
}

const PREFS_KEY = 'textsum_model_prefs_v1'

export type ModelPrefs = {
  extractive: string
  abstractive: string
}

export function loadModelPrefs(): Partial<ModelPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Partial<ModelPrefs>
    return typeof p === 'object' && p ? p : {}
  } catch {
    return {}
  }
}

export function saveModelPrefs(prefs: ModelPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function resolveModelLabel(id: string | undefined): string | null {
  if (!id?.trim()) return null
  const all = [...EXTRACTIVE_MODELS, ...ABSTRACTIVE_MODELS]
  return all.find((m) => m.id === id)?.label ?? id
}
