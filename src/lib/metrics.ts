/**
 * Client-side metrics: ROUGE-1, ROUGE-2, ROUGE-L, BLEU.
 * Tokenisation: lowercase, strip punctuation, split by whitespace.
 * Capped at MAX_TOKENS to keep LCS O(n²) fast even for long texts.
 */

const MAX_TOKENS = 1_200

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
}

function buildNgrams(tokens: string[], n: number): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i <= tokens.length - n; i++) {
    const key = tokens.slice(i, i + n).join('\x00')
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

function mapSum(m: Map<string, number>): number {
  let s = 0
  for (const v of m.values()) s += v
  return s
}

function ngramF1(
  refTokens: string[],
  hypTokens: string[],
  n: number,
): { p: number; r: number; f: number } {
  if (refTokens.length < n || hypTokens.length < n) return { p: 0, r: 0, f: 0 }
  const refGrams = buildNgrams(refTokens, n)
  const hypGrams = buildNgrams(hypTokens, n)

  let hits = 0
  for (const [gram, cnt] of hypGrams) {
    hits += Math.min(cnt, refGrams.get(gram) ?? 0)
  }

  const refTotal = mapSum(refGrams)
  const hypTotal = mapSum(hypGrams)
  const p = hypTotal > 0 ? hits / hypTotal : 0
  const r = refTotal > 0 ? hits / refTotal : 0
  const f = p + r > 0 ? (2 * p * r) / (p + r) : 0
  return { p, r, f }
}

/** Space-optimised LCS length — O(m*n) time, O(n) space */
function lcsLen(a: string[], b: string[]): number {
  const n = b.length
  let prev = new Array<number>(n + 1).fill(0)
  let curr = new Array<number>(n + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1])
    }
    ;[prev, curr] = [curr, prev]
    curr.fill(0)
  }
  return prev[n]
}

export type NgramScore = { p: number; r: number; f: number }

export type RougeResult = {
  rouge1: NgramScore
  rouge2: NgramScore
  rougeL: NgramScore
}

export function computeRouge(reference: string, hypothesis: string): RougeResult {
  const ref = tokenize(reference)
  const hyp = tokenize(hypothesis)

  const rouge1 = ngramF1(ref, hyp, 1)
  const rouge2 = ngramF1(ref, hyp, 2)

  const lcs = lcsLen(ref, hyp)
  const lP = hyp.length > 0 ? lcs / hyp.length : 0
  const lR = ref.length > 0 ? lcs / ref.length : 0
  const lF = lP + lR > 0 ? (2 * lP * lR) / (lP + lR) : 0
  const rougeL: NgramScore = { p: lP, r: lR, f: lF }

  return { rouge1, rouge2, rougeL }
}

/**
 * Corpus BLEU with brevity penalty (up to 4-gram, clipped precision).
 * Returns a value in [0, 1].
 */
export function computeBleu(reference: string, hypothesis: string, maxN = 4): number {
  const ref = tokenize(reference)
  const hyp = tokenize(hypothesis)
  if (hyp.length === 0) return 0

  const effectiveMax = Math.min(maxN, hyp.length, ref.length)
  let logSum = 0
  let validGrams = 0

  for (let n = 1; n <= effectiveMax; n++) {
    const refGrams = buildNgrams(ref, n)
    const hypGrams = buildNgrams(hyp, n)
    let hits = 0
    let total = 0
    for (const [gram, cnt] of hypGrams) {
      hits += Math.min(cnt, refGrams.get(gram) ?? 0)
      total += cnt
    }
    if (total > 0) {
      logSum += Math.log(hits > 0 ? hits / total : 1e-10)
      validGrams++
    }
  }

  if (validGrams === 0) return 0
  const bp = hyp.length >= ref.length ? 1 : Math.exp(1 - ref.length / hyp.length)
  return bp * Math.exp(logSum / validGrams)
}

export type AllMetrics = {
  rouge1: NgramScore
  rouge2: NgramScore
  rougeL: NgramScore
  bleu: number
}

export function computeAllMetrics(reference: string, hypothesis: string): AllMetrics {
  const rouge = computeRouge(reference, hypothesis)
  const bleu = computeBleu(reference, hypothesis)
  return { ...rouge, bleu }
}

export function scoreLabel(score: number): 'high' | 'mid' | 'low' {
  if (score >= 0.5) return 'high'
  if (score >= 0.25) return 'mid'
  return 'low'
}
