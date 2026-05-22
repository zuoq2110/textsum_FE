import { AlertCircle, ClipboardCopy, Download, Sparkles } from 'lucide-react'
import { cn } from '../lib/cn'
import { sentimentLabelVi, type SummarizeSentiment } from '../lib/summarizeApi'

type Props = {
  id: string
  value: string
  loading: boolean
  error: string | null
  wordCount: number
  copyDone: boolean
  onCopy: () => void
  onDownload: () => void
  /** Ghi đè tiêu đề / mô tả (vd. cột so sánh A/B) */
  title?: string
  description?: string
  /** Khi bật `includeSentiment` và API trả về object sentiment. */
  sentiment?: SummarizeSentiment | null
}

export function SummaryPanel({
  id,
  value,
  loading,
  error,
  wordCount,
  copyDone,
  onCopy,
  onDownload,
  title = 'Kết quả',
  description = 'Bản tóm tắt — có thể sao chép hoặc tải file',
  sentiment = null,
}: Props) {
  const scoreRows = sentiment
    ? Object.entries(sentiment.scores)
        .filter(([, v]) => Number.isFinite(v))
        .map(([k, v]) => ({
          key: k,
          label: sentimentLabelVi(k),
          value: Math.max(0, Math.min(1, v)),
        }))
        .sort((a, b) => b.value - a.value)
    : []

  const sentimentTone =
    sentiment?.label === 'positive'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100'
      : sentiment?.label === 'negative'
        ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100'
        : sentiment?.label === 'neutral'
          ? 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-500/50 dark:bg-slate-500/15 dark:text-slate-100'
          : 'border-(--color-accent)/30 bg-(--color-accent-soft)/40 text-(--color-ink)'

  return (
    <section
      className={cn(
        'group relative flex flex-col h-full flex-1 gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/70 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl',
        'transition-shadow duration-300 hover:shadow-[var(--shadow-glow)] sm:p-5',
      )}
      aria-labelledby={`${id}-label`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-(--color-accent-soft) to-(--color-mint)/20 text-(--color-accent)">
            <Sparkles className="size-[1.1rem]" aria-hidden />
          </span>
          <div>
            <label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold text-(--color-ink)">
              {title}
            </label>
            <p className="text-xs text-(--color-ink-muted)">{description}</p>
          </div>
        </div>
        {value ? (
          <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-0.5 text-xs font-semibold tabular-nums text-(--color-accent)">
            {wordCount.toLocaleString('vi-VN')} từ
          </span>
        ) : null}
      </div>

      <textarea
        id={id}
        value={value}
        readOnly
        placeholder={loading ? 'Đang xử lý…' : 'Bản tóm tắt sẽ hiển thị ở đây.'}
        rows={11}
        className={cn(
          'flex-1 min-h-[200px] w-full resize-none rounded-xl border border-(--color-border) bg-(--color-surface)/90 px-4 py-3 text-sm leading-relaxed text-(--color-ink)',
          'placeholder:text-(--color-ink-muted)/80',
          'focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/20',
        )}
      />

      {error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200 dark:text-red-100"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {sentiment ? (
        <div
          className={cn(
            'rounded-xl border p-3',
            sentimentTone,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {sentimentLabelVi(sentiment.label)}
            </span>
            <span className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-white/10">
              {(sentiment.confidence * 100).toFixed(1)}%
            </span>
          </div>

          <p className="mt-1 line-clamp-1 text-[0.7rem] opacity-85" title={sentiment.model}>
            Model: {sentiment.model}
          </p>

          {scoreRows.length > 0 ? (
            <div className="mt-3 space-y-2">
              {scoreRows.map((row) => (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[0.72rem]">
                    <span className="font-medium">{row.label}</span>
                    <span className="tabular-nums">{(row.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-current transition-all duration-500"
                      style={{ width: `${(row.value * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={!value.trim()}
          className="inline-flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-medium text-(--color-ink) transition enabled:hover:border-(--color-accent)/50 enabled:hover:bg-(--color-accent-soft)/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ClipboardCopy className="size-4 text-(--color-accent)" aria-hidden />
          {copyDone ? 'Đã chép' : 'Sao chép tóm tắt'}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!value.trim()}
          className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-(--color-ink-muted) transition enabled:hover:bg-(--color-accent-soft)/30 enabled:hover:text-(--color-ink) disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden />
          Tải .txt
        </button>
      </div>
    </section>
  )
}
