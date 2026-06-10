import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { type AuthSession } from '../hooks/useAuth'
import { type HistoryEntry } from '../lib/historyStorage'
import { type AllMetrics, computeAllMetrics, scoreLabel } from '../lib/metrics'
import { evaluateWithJudge, type JudgeResponse, type PRFScore } from '../lib/judgeApi'
import {
  factCheckSummary,
  type FactCheckResponse,
  type FactCheckStatus,
  type FactMatch,
  type LlmVerification,
} from '../lib/factCheckApi'
import { cn } from '../lib/cn'

type EvaluatePageProps = {
  session: AuthSession | null
  history: HistoryEntry[]
  navigateTo: (path: '/' | '/auth' | '/evaluate') => void
}

const MODE_LABEL: Record<string, string> = {
  extractive: 'Trích chọn',
  abstractive: 'Trừu tượng',
  hybrid: 'Lai ghép',
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

function ScoreBar({
  label,
  tooltip,
  value,
  unavailable,
}: {
  label: string
  tooltip: string
  value?: number
  unavailable?: boolean
}) {
  const pct = value !== undefined ? Math.round(value * 100) : 0
  const lvl = value !== undefined ? scoreLabel(value) : 'low'

  return (
    <div className="group relative">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-(--color-ink)">{label}</span>
          <Info className="size-3.5 text-(--color-ink-muted)/50 opacity-0 transition group-hover:opacity-100" aria-hidden />
        </div>
        {unavailable ? (
          <span className="rounded-full bg-(--color-surface) px-2 py-0.5 text-xs text-(--color-ink-muted)">
            N/A
          </span>
        ) : (
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              lvl === 'high'
                ? 'text-emerald-500'
                : lvl === 'mid'
                  ? 'text-amber-400'
                  : 'text-red-400',
            )}
          >
            {pct}
          </span>
        )}
      </div>

      {unavailable ? (
        <div className="flex h-2.5 items-center rounded-full bg-(--color-surface) px-2">
          <span className="text-[10px] text-(--color-ink-muted)/60">{tooltip}</span>
        </div>
      ) : (
        <div className="h-2.5 overflow-hidden rounded-full bg-(--color-surface)">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              lvl === 'high'
                ? 'bg-linear-to-r from-emerald-500 to-teal-400'
                : lvl === 'mid'
                  ? 'bg-linear-to-r from-amber-400 to-yellow-300'
                  : 'bg-linear-to-r from-red-500 to-rose-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Tooltip */}
      <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-56 rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-2.5 text-xs text-(--color-ink-muted) shadow-[var(--shadow-card)] group-hover:block">
        {tooltip}
      </div>
    </div>
  )
}

type DisplayMetrics = AllMetrics & { bertscore?: PRFScore }

function MetricsCard({ metrics }: { metrics: DisplayMetrics }) {
  return (
    <div className="grid gap-5">
      {/* Score legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-ink-muted)">
        <span className="font-medium text-(--color-ink)">Thang điểm:</span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          Tốt ≥ 50
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-400" />
          Trung bình 25–50
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-red-400" />
          Thấp &lt; 25
        </span>
      </div>

      <div className="grid gap-4">
        <ScoreBar
          label="ROUGE-1 (F1)"
          value={metrics.rouge1.f}
          tooltip={`Độ trùng lặp 1-gram giữa văn bản gốc và bản tóm tắt.\nP: ${(metrics.rouge1.p * 100).toFixed(1)}   R: ${(metrics.rouge1.r * 100).toFixed(1)}`}
        />
        <ScoreBar
          label="ROUGE-2 (F1)"
          value={metrics.rouge2.f}
          tooltip={`Độ trùng lặp 2-gram. Đo lường cụm từ được giữ lại.\nP: ${(metrics.rouge2.p * 100).toFixed(1)}   R: ${(metrics.rouge2.r * 100).toFixed(1)}`}
        />
        <ScoreBar
          label="ROUGE-L (F1)"
          value={metrics.rougeL.f}
          tooltip={`Dựa trên dãy con chung dài nhất (LCS). Đo cấu trúc câu.\nP: ${(metrics.rougeL.p * 100).toFixed(1)}   R: ${(metrics.rougeL.r * 100).toFixed(1)}`}
        />
        <ScoreBar
          label="BLEU-4"
          value={metrics.bleu}
          tooltip="Điểm BLEU tối đa 4-gram với brevity penalty. Thường thấp hơn ROUGE."
        />
        <ScoreBar
          label="BERTScore"
          value={metrics.bertscore?.f}
          unavailable={!metrics.bertscore}
          tooltip={
            metrics.bertscore
              ? `Điểm semantic similarity.\nP: ${(metrics.bertscore.p * 100).toFixed(1)}   R: ${(metrics.bertscore.r * 100).toFixed(1)}`
              : 'Cần backend với mô hình BERT/PhoBERT để tính.'
          }
        />
      </div>

      {/* Detail table */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-(--color-ink-muted) hover:text-(--color-ink)">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
          Chi tiết Precision / Recall
        </summary>
        <div className="mt-3 overflow-hidden rounded-xl border border-(--color-border) text-xs">
          <table className="w-full">
            <thead className="bg-(--color-surface) text-(--color-ink-muted)">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Metric</th>
                <th className="px-3 py-2 text-right font-semibold">Precision</th>
                <th className="px-3 py-2 text-right font-semibold">Recall</th>
                <th className="px-3 py-2 text-right font-semibold">F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {(
                [
                  ['ROUGE-1', metrics.rouge1],
                  ['ROUGE-2', metrics.rouge2],
                  ['ROUGE-L', metrics.rougeL],
                ] as [string, { p: number; r: number; f: number }][]
              ).map(([name, s]) => (
                <tr key={name} className="text-(--color-ink)">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(s.p * 100).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(s.r * 100).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-(--color-accent)">
                    {(s.f * 100).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="text-(--color-ink)">
                <td className="px-3 py-2 font-medium">BLEU-4</td>
                <td colSpan={2} className="px-3 py-2 text-right text-(--color-ink-muted)">
                  —
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-(--color-accent)">
                  {(metrics.bleu * 100).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

const FACT_TYPE_LABEL: Record<string, string> = {
  money: 'Số tiền',
  date: 'Thời gian',
  ticker: 'Mã CK',
  percent: 'Phần trăm',
}

function factTypeLabel(type: string): string {
  return FACT_TYPE_LABEL[type] ?? type
}

function statusConfig(status: FactCheckStatus) {
  if (status === 'pass') {
    return {
      label: 'Đạt',
      icon: CheckCircle2,
      tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    }
  }
  if (status === 'warn') {
    return {
      label: 'Cần lưu ý',
      icon: AlertTriangle,
      tone: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    }
  }
  return {
    label: 'Không đạt',
    icon: XCircle,
    tone: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300',
  }
}

function FactMatchList({
  title,
  items,
  tone,
}: {
  title: string
  items: FactMatch[]
  tone: 'ok' | 'warn' | 'muted'
}) {
  if (!items.length) return null

  const toneClass =
    tone === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-(--color-border) bg-(--color-surface)'

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
        {title} ({items.length})
      </p>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li
            key={`${item.normalized}-${idx}`}
            className={cn('rounded-lg border px-2.5 py-2 text-xs', toneClass)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-(--color-ink)">{item.text}</span>
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-(--color-ink-muted) dark:bg-white/10">
                {factTypeLabel(item.type)}
              </span>
            </div>
            {item.reason ? (
              <p className="mt-1 text-[11px] leading-relaxed text-(--color-ink-muted)">{item.reason}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LlmVerificationList({ items }: { items: LlmVerification[] }) {
  if (!items.length) return null

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
        Xác minh LLM ({items.length})
      </p>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={`${item.claim}-${idx}`}
            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-2.5 py-2 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-(--color-ink)">{item.claim}</span>
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
                {item.verdict}
              </span>
            </div>
            {item.evidenceQuote ? (
              <p className="mt-1 text-[11px] italic text-(--color-ink-muted)">
                &ldquo;{item.evidenceQuote}&rdquo;
              </p>
            ) : null}
            <p className="mt-1 text-[11px] leading-relaxed text-(--color-ink)">{item.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FactCheckCard({ data }: { data: FactCheckResponse }) {
  const cfg = statusConfig(data.status)
  const StatusIcon = cfg.icon

  return (
    <div className="mt-6 border-t border-(--color-border) pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-(--color-accent)" aria-hidden />
          <h3 className="text-sm font-bold text-(--color-ink)">Hậu kiểm sự thật</h3>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
            cfg.tone,
          )}
        >
          <StatusIcon className="size-3.5" aria-hidden />
          {cfg.label}
        </span>
      </div>

      {data.issues.length > 0 ? (
        <div className="mb-4 space-y-2">
          {data.issues.map((issue, idx) => (
            <div
              key={`${issue.message}-${idx}`}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs',
                issue.level === 'error'
                  ? 'border-red-500/35 bg-red-500/10 text-red-200 dark:text-red-100'
                  : issue.level === 'warning'
                    ? 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                    : 'border-(--color-border) bg-(--color-surface) text-(--color-ink)',
              )}
            >
              <p className="font-semibold">{issue.message}</p>
              {issue.detail ? (
                <p className="mt-0.5 opacity-90">{issue.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-(--color-ink-muted)">
          Không phát hiện vấn đề về số liệu và claim so với văn bản gốc.
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-(--color-ink-muted)">
        <span>
          Regex: {data.regex.sourceFactCount} fact gốc / {data.regex.summaryFactCount} fact tóm tắt
        </span>
        {data.meta.pipeline ? <span>Pipeline: {data.meta.pipeline}</span> : null}
        {data.meta.llmModel ? <span>Model: {data.meta.llmModel}</span> : null}
        {data.meta.checkedAt ? (
          <span>
            Kiểm tra lúc{' '}
            {new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(data.meta.checkedAt))}
          </span>
        ) : null}
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-(--color-ink-muted) hover:text-(--color-ink)">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
          Chi tiết regex &amp; LLM
        </summary>
        <div className="mt-3 grid gap-4">
          <FactMatchList title="Khớp source" items={data.regex.matched} tone="ok" />
          <FactMatchList title="Nghi ngờ" items={data.regex.suspicious} tone="warn" />
          <FactMatchList title="Không khớp" items={data.regex.unmatched} tone="muted" />
          <LlmVerificationList items={data.llmVerifications} />
        </div>
      </details>
    </div>
  )
}

export function EvaluatePage({ session, history, navigateTo }: EvaluatePageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [judgeData, setJudgeData] = useState<JudgeResponse | null>(null)
  const [judgeLoading, setJudgeLoading] = useState(false)
  const [judgeError, setJudgeError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null)
  const [factCheckData, setFactCheckData] = useState<FactCheckResponse | null>(null)
  const [factCheckLoading, setFactCheckLoading] = useState(false)
  const [factCheckError, setFactCheckError] = useState<string | null>(null)

  const selected = useMemo(
    () => (selectedId ? history.find((e) => e.id === selectedId) ?? null : null),
    [selectedId, history],
  )

  async function handleEvaluate(): Promise<void> {
    if (!selected || judgeLoading) return

    setJudgeLoading(true)
    setJudgeError(null)

    const local = computeAllMetrics(selected.source, selected.summary)
    try {
      const res = await evaluateWithJudge({
        source: selected.source,
        candidateSummary: selected.summary,
        language: 'vi',
        targetLength: 'medium',
        metrics: ['rouge', 'bleu', 'bertscore'],
        generateReference: true,
        includeCritique: false,
      })
      const remote = res.metrics
      setJudgeData(res)
      setMetrics({
        rouge1: remote.rouge1 ?? local.rouge1,
        rouge2: remote.rouge2 ?? local.rouge2,
        rougeL: remote.rougeL ?? local.rougeL,
        bleu: typeof remote.bleu === 'number' ? remote.bleu : local.bleu,
        ...(remote.bertscore ? { bertscore: remote.bertscore } : {}),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không gọi được Judge API, đang dùng điểm local.'
      setJudgeData(null)
      setJudgeError(msg)
      setMetrics(local)
    } finally {
      setJudgeLoading(false)
    }
  }

  async function handleFactCheck(): Promise<void> {
    if (!selected || factCheckLoading) return

    setFactCheckLoading(true)
    setFactCheckError(null)

    try {
      const res = await factCheckSummary({
        source: selected.source,
        summary: selected.summary,
        language: 'vi',
        useLlm: true,
      })
      setFactCheckData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không gọi được Fact-check API.'
      setFactCheckData(null)
      setFactCheckError(msg)
    } finally {
      setFactCheckLoading(false)
    }
  }

  // Not logged in — show gate
  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-(--color-border) bg-(--color-surface-elevated) p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-(--color-accent-soft)">
            <Lock className="size-7 text-(--color-accent)" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-(--color-ink)">Cần đăng nhập</h2>
          <p className="mb-6 text-sm leading-relaxed text-(--color-ink-muted)">
            Chức năng đánh giá chất lượng tóm tắt chỉ dành cho người dùng đã đăng nhập.
            Lịch sử tóm tắt của bạn sẽ được tải tự động sau khi đăng nhập.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('/auth')}
            className="w-full rounded-xl bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Đi đến trang đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-1">
      {/* Page header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <BarChart3 className="size-5 text-(--color-accent)" aria-hidden />
          <h2 className="text-2xl font-bold text-(--color-ink)">Đánh giá chất lượng</h2>
        </div>
        <p className="text-sm text-(--color-ink-muted)">
          Chọn một bản tóm tắt từ lịch sử để đo lường ROUGE, BLEU và hậu kiểm số liệu so với văn bản gốc.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) py-16 text-center">
          <Sparkles className="mb-3 size-10 text-(--color-ink-muted)/40" />
          <p className="font-medium text-(--color-ink)">Chưa có lịch sử tóm tắt</p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Hãy tóm tắt một đoạn văn bản trước, sau đó quay lại đây để đánh giá.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="mt-5 rounded-xl border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-ink-muted) transition hover:text-(--color-ink)"
          >
            Đi đến trang tóm tắt
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left — History list */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--color-ink-muted)/60">
              Lịch sử tóm tắt ({history.length})
            </p>
            <div className="flex flex-col gap-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id)
                    setJudgeData(null)
                    setJudgeError(null)
                    setJudgeLoading(false)
                    setMetrics(null)
                    setFactCheckData(null)
                    setFactCheckError(null)
                    setFactCheckLoading(false)
                  }}
                  className={cn(
                    'w-full rounded-2xl border p-3.5 text-left transition',
                    selectedId === entry.id
                      ? 'border-(--color-accent)/50 bg-(--color-accent-soft) ring-1 ring-(--color-accent)/30'
                      : 'border-(--color-border) bg-(--color-surface-elevated) hover:border-(--color-accent)/30',
                  )}
                >
                  {/* Mode badge */}
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        selectedId === entry.id
                          ? 'bg-(--color-accent)/15 text-(--color-accent)'
                          : 'bg-(--color-surface) text-(--color-ink-muted)',
                      )}
                    >
                      {MODE_LABEL[entry.mode] ?? entry.mode}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-(--color-ink-muted)/60">
                      <Clock className="size-3" />
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>

                  {/* Source preview */}
                  <p className="mb-1 line-clamp-2 text-xs leading-relaxed text-(--color-ink)">
                    {entry.source}
                  </p>
                  {/* Summary preview */}
                  <p className="line-clamp-1 text-[11px] text-(--color-ink-muted)/70">
                    → {entry.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right — Metrics */}
          <div>
            {selected ? (
              <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-6 shadow-[var(--shadow-card)]">
                <div className="mb-5 border-b border-(--color-border) pb-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-(--color-ink-muted)/60">
                    Văn bản đã chọn
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
                        Gốc
                      </p>
                      <p className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs leading-relaxed text-(--color-ink)">
                        {selected.source}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
                        Tóm tắt
                      </p>
                      <p className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs leading-relaxed text-(--color-ink)">
                        {selected.summary}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={judgeLoading}
                      className="rounded-xl bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {judgeLoading ? 'Đang đánh giá...' : 'Đánh giá'}
                    </button>
                    <button
                      type="button"
                      onClick={handleFactCheck}
                      disabled={factCheckLoading}
                      className="rounded-xl border border-(--color-accent)/40 bg-(--color-accent-soft) px-4 py-2 text-xs font-semibold text-(--color-accent) transition hover:border-(--color-accent)/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {factCheckLoading ? 'Đang hậu kiểm...' : 'Hậu kiểm'}
                    </button>
                    {!metrics && !factCheckData ? (
                      <span className="text-xs text-(--color-ink-muted)">
                        Bấm Đánh giá để lấy điểm, hoặc Hậu kiểm để kiểm tra số liệu.
                      </span>
                    ) : null}
                  </div>
                  {judgeLoading ? (
                    <p className="mt-3 text-xs text-(--color-ink-muted)">Đang lấy điểm từ Judge API...</p>
                  ) : null}
                  {judgeError ? (
                    <p className="mt-3 text-xs text-amber-400">
                      Judge API lỗi: {judgeError}
                    </p>
                  ) : null}
                  {factCheckLoading ? (
                    <p className="mt-3 text-xs text-(--color-ink-muted)">Đang chạy hậu kiểm fact-check...</p>
                  ) : null}
                  {factCheckError ? (
                    <p className="mt-3 text-xs text-amber-400">
                      Fact-check API lỗi: {factCheckError}
                    </p>
                  ) : null}
                  {judgeData?.referenceSummary ? (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
                        Reference (Judge)
                      </p>
                      <p className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs leading-relaxed text-(--color-ink)">
                        {judgeData.referenceSummary}
                      </p>
                    </div>
                  ) : null}
                </div>

                {metrics ? <MetricsCard metrics={metrics} /> : null}
                {factCheckData ? <FactCheckCard data={factCheckData} /> : null}
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-elevated)/50">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-3 size-10 text-(--color-ink-muted)/30" />
                  <p className="text-sm font-medium text-(--color-ink-muted)">
                    Chọn một bản tóm tắt để xem điểm đánh giá
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
