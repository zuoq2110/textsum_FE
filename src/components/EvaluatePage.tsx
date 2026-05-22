import { useMemo, useState } from 'react'
import { BarChart3, ChevronRight, Clock, Info, Lock, Sparkles } from 'lucide-react'
import { type AuthSession } from '../hooks/useAuth'
import { type HistoryEntry } from '../lib/historyStorage'
import { type AllMetrics, computeAllMetrics, scoreLabel } from '../lib/metrics'
import { evaluateWithJudge, type JudgeResponse, type PRFScore } from '../lib/judgeApi'
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

export function EvaluatePage({ session, history, navigateTo }: EvaluatePageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [judgeData, setJudgeData] = useState<JudgeResponse | null>(null)
  const [judgeLoading, setJudgeLoading] = useState(false)
  const [judgeError, setJudgeError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null)

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
          Chọn một bản tóm tắt từ lịch sử để đo lường ROUGE, BLEU và các chỉ số chất lượng khác.
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
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={judgeLoading}
                      className="rounded-xl bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {judgeLoading ? 'Đang đánh giá...' : 'Đánh giá'}
                    </button>
                    {!metrics ? (
                      <span className="text-xs text-(--color-ink-muted)">
                        Chọn văn bản xong, bấm Đánh giá để gọi Judge API.
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
