import { STOPWORDS } from './stopwords'

export type SummaryLength = 'short' | 'medium' | 'long'

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const blocks = normalized.split(/\n+/).map((b) => b.trim()).filter(Boolean)
  const sentences: string[] = []

  for (const block of blocks) {
    const subs = block
      .split(/(?<=[.!?…])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (subs.length === 0) sentences.push(block)
    else sentences.push(...subs)
  }

  return sentences.filter((s) => s.length > 0)
}

function tokenize(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
}

function sentenceCountFor(length: SummaryLength, total: number): number {
  const caps: Record<SummaryLength, { min: number; max: number; ratio: number }> =
    {
      short: { min: 2, max: 4, ratio: 0.12 },
      medium: { min: 4, max: 7, ratio: 0.22 },
      long: { min: 6, max: 12, ratio: 0.35 },
    }
  const { min, max, ratio } = caps[length]
  const n = Math.ceil(total * ratio)
  return Math.min(max, Math.max(min, Math.min(n, total)))
}

/**
 * Tóm tắt trích chọn (TF trong văn bản): chọn các câu có điểm cao, giữ thứ tự gốc.
 */
export function summarizeExtractive(
  text: string,
  length: SummaryLength,
): string {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return ''

  const k = sentenceCountFor(length, sentences.length)
  if (sentences.length <= k) return sentences.join(' ')

  const docFreq = new Map<string, number>()
  const sentenceTokens = sentences.map((s) => tokenize(s))

  for (const tokens of sentenceTokens) {
    const seen = new Set<string>()
    for (const w of tokens) {
      if (seen.has(w)) continue
      seen.add(w)
      docFreq.set(w, (docFreq.get(w) ?? 0) + 1)
    }
  }

  const maxFreq = Math.max(1, ...docFreq.values())

  const scores = sentenceTokens.map((tokens) => {
    if (tokens.length === 0) return 0
    let sum = 0
    for (const w of tokens) {
      const tf = docFreq.get(w) ?? 0
      const idf = Math.log(1 + maxFreq / (tf || 1))
      sum += tf * idf
    }
    return sum / Math.sqrt(tokens.length + 1)
  })

  const indexed = scores.map((score, i) => ({ i, score }))
  indexed.sort((a, b) => b.score - a.score)
  const top = new Set(indexed.slice(0, k).map((x) => x.i))

  const ordered = sentences
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => top.has(i))
    .sort((a, b) => a.i - b.i)

  return ordered.map(({ s }) => s).join(' ')
}
