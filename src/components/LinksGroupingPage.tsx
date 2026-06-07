import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ExternalLink, Layers3, Link2, Loader2, Sparkles, Target } from 'lucide-react'
import { ModelSelect } from './ModelSelect'
import { cn } from '../lib/cn'
import { sentimentLabelVi } from '../lib/summarizeApi'
import {
  TOPIC_LABEL_VI,
  analyzeLinks,
  summarizeLinks,
  type LinksAnalyzeResponse,
  type LinksSummarizeMode,
  type LinksSummarizeResponse,
} from '../lib/linksGroupingApi'
import {
  ABSTRACTIVE_MODELS,
  EXTRACTIVE_MODELS,
  defaultAbstractiveModelId,
  defaultExtractiveModelId,
  loadModelPrefs,
  saveModelPrefs,
} from '../lib/summarizeModels'

function parseUrls(raw: string): string[] {
  const arr = raw
    .split(/\r?\n|,/g)
    .map((x) => x.trim())
    .filter(Boolean)
  return Array.from(new Set(arr))
}

function ScoreBadge({ value }: { value: number }) {
  const score = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  const tone =
    score >= 70
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100'
      : score >= 40
        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100'
        : 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100'
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', tone)}>
      {score.toFixed(1)}%
    </span>
  )
}


export function LinksGroupingPage() {
  const [urlsInput, setUrlsInput] = useState('')
  const [threshold, setThreshold] = useState(0.6)
  const [mode, setMode] = useState<LinksSummarizeMode>('auto')
  const [sumType, setSumType] = useState<'extractive' | 'abstractive' | 'hybrid'>('hybrid')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [language, setLanguage] = useState<'vi' | 'en'>('vi')
  const [includeSentiment, setIncludeSentiment] = useState(false)
  const [targetClusterIds, setTargetClusterIds] = useState<number[]>([])
  const [extractiveModelId, setExtractiveModelId] = useState(defaultExtractiveModelId)
  const [abstractiveModelId, setAbstractiveModelId] = useState(defaultAbstractiveModelId)

  const [analysis, setAnalysis] = useState<LinksAnalyzeResponse | null>(null)
  const [result, setResult] = useState<LinksSummarizeResponse | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [summarizeLoading, setSummarizeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urls = useMemo(() => parseUrls(urlsInput), [urlsInput])
  const canRun = urls.length > 0 && urls.length <= 50

  const clusters = analysis?.clusters ?? result?.analysis.clusters ?? []

  useEffect(() => {
    const p = loadModelPrefs()
    if (p.extractive && EXTRACTIVE_MODELS.some((m) => m.id === p.extractive)) {
      setExtractiveModelId(p.extractive)
    }
    if (p.abstractive && ABSTRACTIVE_MODELS.some((m) => m.id === p.abstractive)) {
      setAbstractiveModelId(p.abstractive)
    }
  }, [])

  useEffect(() => {
    saveModelPrefs({
      extractive: extractiveModelId,
      abstractive: abstractiveModelId,
    })
  }, [extractiveModelId, abstractiveModelId])

  async function onAnalyze(): Promise<void> {
    if (!canRun || analyzeLoading) return
    setError(null)
    setAnalyzeLoading(true)
    setResult(null)
    try {
      const data = await analyzeLinks({ urls, similarityThreshold: threshold })
      setAnalysis(data)
      setTargetClusterIds((prev) =>
        prev.filter((id) => data.clusters.some((c) => c.clusterId === id)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không phân tích được danh sách link.')
    } finally {
      setAnalyzeLoading(false)
    }
  }

  async function onSummarize(): Promise<void> {
    if (!canRun || summarizeLoading) return
    setError(null)
    setSummarizeLoading(true)
    try {
      const data = await summarizeLinks({
        urls,
        similarityThreshold: threshold,
        mode,
        targetClusterIds: mode === 'multi-cluster' ? targetClusterIds : null,
        type: sumType,
        length,
        language,
        includeSentiment,
        model:
          sumType === 'extractive'
            ? extractiveModelId
            : sumType === 'abstractive'
              ? abstractiveModelId
              : undefined,
        hybridExtractiveModel: sumType === 'hybrid' ? extractiveModelId : undefined,
        hybridAbstractiveModel: sumType === 'hybrid' ? abstractiveModelId : undefined,
      })
      setAnalysis(data.analysis)
      setResult(data)
      if (mode === 'multi-cluster') {
        setTargetClusterIds((prev) =>
          prev.filter((id) => data.analysis.clusters.some((c) => c.clusterId === id)),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tóm tắt được theo cụm.')
    } finally {
      setSummarizeLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/70 p-4 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
            <Link2 className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-(--color-ink)">Tóm tắt nhóm</h2>
            <p className="text-sm text-(--color-ink-muted)">
              Dán mỗi dòng một URL. Hệ thống phân cụm nội dung trước khi tóm tắt.
            </p>
          </div>
        </div>

        <textarea
          value={urlsInput}
          onChange={(e) => setUrlsInput(e.target.value)}
          rows={8}
          placeholder="https://example.com/a&#10;https://example.com/b"
          className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-ink) focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-(--color-ink-muted)">
          <span>{urls.length} link hợp lệ</span>
          {urls.length > 50 ? <span className="text-red-400">Tối đa 50 link mỗi request</span> : null}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-(--color-ink-muted)">Ngưỡng similarity (0..1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(1, Number(e.target.value) || 0)))}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink)"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-(--color-ink-muted)">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as LinksSummarizeMode)}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink)"
            >
              <option value="auto">Auto (tất cả cụm)</option>
              <option value="single-cluster">Single cluster (lớn nhất)</option>
              <option value="multi-cluster">Multi cluster (chọn cụm)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-(--color-ink-muted)">Type</span>
            <select
              value={sumType}
              onChange={(e) =>
                setSumType(e.target.value as 'extractive' | 'abstractive' | 'hybrid')
              }
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink)"
            >
              <option value="extractive">Trích xuất</option>
              <option value="abstractive">Trừu tượng</option>
              <option value="hybrid">Lai ghép</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-(--color-ink-muted)">Độ dài</span>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink)"
            >
              <option value="short">Ngắn</option>
              <option value="medium">Vừa</option>
              <option value="long">Dài</option>
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-(--color-accent)/25 bg-(--color-surface-elevated)/90 p-4 shadow-inner">
          {sumType === 'extractive' ? (
            <ModelSelect
              id="links-grouping-model-extractive"
              label="PhoBERT (extractive)"
              value={extractiveModelId}
              options={EXTRACTIVE_MODELS}
              onChange={setExtractiveModelId}
              disabled={summarizeLoading}
            />
          ) : sumType === 'abstractive' ? (
            <ModelSelect
              id="links-grouping-model-abstractive"
              label="Qwen / Gemma (abstractive)"
              value={abstractiveModelId}
              options={ABSTRACTIVE_MODELS}
              onChange={setAbstractiveModelId}
              disabled={summarizeLoading}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <ModelSelect
                id="links-grouping-model-hybrid-extractive"
                label="Stage 1 (extractive)"
                value={extractiveModelId}
                options={EXTRACTIVE_MODELS}
                onChange={setExtractiveModelId}
                disabled={summarizeLoading}
              />
              <ModelSelect
                id="links-grouping-model-hybrid-abstractive"
                label="Stage 2 (abstractive)"
                value={abstractiveModelId}
                options={ABSTRACTIVE_MODELS}
                onChange={setAbstractiveModelId}
                disabled={summarizeLoading}
              />
            </div>
          )}
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-(--color-ink)">
          <input
            type="checkbox"
            checked={includeSentiment}
            onChange={(e) => setIncludeSentiment(e.target.checked)}
            className="size-4 rounded accent-(--color-accent)"
          />
          Bật sentiment cho từng summary cụm
        </label>

        {mode === 'multi-cluster' && clusters.length > 0 ? (
          <div className="mt-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-ink-muted)">
              Chọn cụm cần tóm tắt
            </p>
            <div className="flex flex-wrap gap-2">
              {clusters.map((c) => {
                const checked = targetClusterIds.includes(c.clusterId)
                return (
                  <label
                    key={c.clusterId}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
                      checked
                        ? 'border-(--color-accent) bg-(--color-accent-soft)/40 text-(--color-ink)'
                        : 'border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink-muted)',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setTargetClusterIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== c.clusterId)
                            : [...prev, c.clusterId],
                        )
                      }
                      className="size-3.5 rounded accent-(--color-accent)"
                    />
                    Cụm {c.clusterId} · {TOPIC_LABEL_VI[c.topic]}
                  </label>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canRun || analyzeLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-medium text-(--color-ink) transition hover:border-(--color-accent)/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzeLoading ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}
            Phân tích link
          </button>
          <button
            type="button"
            onClick={onSummarize}
            disabled={!canRun || summarizeLoading || (mode === 'multi-cluster' && targetClusterIds.length === 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {summarizeLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Tóm tắt theo cụm
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </section>

      {analysis ? (
        <section className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/70 p-4 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 className="size-4 text-(--color-accent)" />
              <h3 className="text-base font-semibold text-(--color-ink)">Kết quả phân cụm</h3>
            </div>
            <ScoreBadge value={analysis.overallCorrelationScore} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.clusters.map((c) => (
              <article
                key={c.clusterId}
                className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-(--color-ink)">Cụm {c.clusterId}</p>
                  <ScoreBadge value={c.correlationScore} />
                </div>
                <p className="text-xs text-(--color-ink-muted)">
                  {TOPIC_LABEL_VI[c.topic]} · {c.isFinance ? 'Tài chính' : 'Ngoài tài chính'}
                </p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  {c.urlIndexes.length} link · Similarity TB {(c.avgSimilarity * 100).toFixed(1)}%
                </p>
              </article>
            ))}
          </div>

          {analysis.warnings.length ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="mb-1 font-semibold">Cảnh báo</p>
              <ul className="space-y-1">
                {analysis.warnings.map((w) => (
                  <li key={w}>- {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/70 p-4 shadow-[var(--shadow-card)] sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-(--color-ink)">Tóm tắt theo cụm</h3>
          <div className="space-y-3">
            {result.summaries.map((s) => (
              <article
                key={`${s.clusterId}-${s.summary.slice(0, 20)}`}
                className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-(--color-accent-soft)/40 px-2 py-0.5 text-xs font-semibold text-(--color-ink)">
                    Cụm {s.clusterId}
                  </span>
                  <span className="rounded-lg border border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted)">
                    {TOPIC_LABEL_VI[s.topic]}
                  </span>
                  <ScoreBadge value={s.correlationScore} />
                </div>
                {Array.isArray(s.segments) && s.segments.length > 0 ? (
                  <div className="space-y-2">
                    {s.segments.map((seg) => (
                      <div
                        key={`${s.clusterId}-${seg.marker}-${seg.urlIndex}-${seg.text.slice(0, 20)}`}
                        className="group relative overflow-visible rounded-lg border border-(--color-border) bg-(--color-surface-elevated)/70 p-3 transition-colors hover:border-(--color-accent)/40 hover:bg-(--color-accent-soft)/20"
                      >
                        {/* Bridge trong suốt lấp khoảng trống block → tooltip, giữ hover CSS liên tục */}
                        <div className="absolute bottom-full left-0 right-0 h-3" />

                        {/* Tooltip link gốc — hiện phía trên block */}
                        <div className="absolute bottom-[calc(100%+4px)] left-1/2 z-30 hidden w-80 -translate-x-1/2 rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-3 py-2.5 shadow-[var(--shadow-card)] group-hover:block">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-md bg-(--color-accent-soft)/50 px-1.5 py-0.5 text-[0.7rem] font-bold text-(--color-accent)">
                              {seg.marker}
                            </span>
                            <a
                              href={seg.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-(--color-accent) underline-offset-2 hover:underline"
                            >
                              Mở nguồn
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                          <p className="break-all text-[0.7rem] leading-snug text-(--color-ink-muted)">
                            {seg.url}
                          </p>
                        </div>

                        {/* Badge marker nhỏ góc trên */}
                        <span className="relative z-10 mb-1.5 inline-block rounded-md bg-(--color-accent-soft)/40 px-1.5 py-0.5 text-[0.7rem] font-semibold text-(--color-accent)">
                          {seg.marker}
                        </span>

                        <p className="relative z-10 whitespace-pre-wrap text-sm leading-relaxed text-(--color-ink)">
                          {seg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-(--color-ink)">
                    {s.summary}
                  </p>
                )}

                {s.sentiment ? (
                  <div className="mt-3 rounded-lg border border-(--color-border) bg-(--color-surface-elevated) p-2.5 text-xs text-(--color-ink-muted)">
                    Cảm xúc: <span className="font-semibold text-(--color-ink)">{sentimentLabelVi(s.sentiment.label)}</span> ·{' '}
                    {(s.sentiment.confidence * 100).toFixed(1)}%
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {result.warnings.length ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="mb-1 font-semibold">Cảnh báo khi tóm tắt</p>
              <ul className="space-y-1">
                {result.warnings.map((w) => (
                  <li key={w}>- {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
