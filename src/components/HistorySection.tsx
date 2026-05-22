import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Clock, History, Trash2, X } from 'lucide-react'
import type { HistoryEntry } from '../lib/historyStorage'
import { sentimentLabelVi } from '../lib/summarizeApi'
import { resolveModelLabel } from '../lib/summarizeModels'
import { formatTime } from '../lib/text'
import { cn } from '../lib/cn'

const HISTORY_PREVIEW_COUNT = 4

type Props = {
  history: HistoryEntry[]
  onRestore: (e: HistoryEntry) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

export function HistorySection({ history, onRestore, onRemove, onClearAll }: Props) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (history.length <= HISTORY_PREVIEW_COUNT) setShowAll(false)
  }, [history.length])

  const hasMore = history.length > HISTORY_PREVIEW_COUNT
  const visibleHistory =
    showAll || !hasMore ? history : history.slice(0, HISTORY_PREVIEW_COUNT)

  return (
    <section className="mt-12 border-t border-(--color-border) pt-10" aria-labelledby="history-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
            <History className="size-[1.1rem]" aria-hidden />
          </span>
          <div>
            <h2 id="history-title" className="text-lg font-semibold text-(--color-ink)">
              Lịch sử trò chuyện
            </h2>
            <p className="text-xs text-(--color-ink-muted)">Lưu cục bộ trên trình duyệt</p>
          </div>
        </div>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-ink-muted) transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Xóa toàn bộ
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-elevated)/50 px-4 py-10 text-center">
          <Clock className="mx-auto mb-2 size-8 text-(--color-ink-muted)/50" aria-hidden />
          <p className="text-sm text-(--color-ink-muted)">Chưa có mục nào — tóm tắt để lưu tự động.</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleHistory.map((e) => {
              const modelLine = resolveModelLabel(e.model)
              return (
                <li
                  key={e.id}
                  className={cn(
                    'group flex overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/80',
                    'shadow-sm transition hover:border-(--color-accent)/40 hover:shadow-[var(--shadow-glow)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onRestore(e)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-1 px-4 py-3 text-left transition group-hover:bg-(--color-accent-soft)/20"
                  >
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-(--color-ink-muted)">
                      {formatTime(e.createdAt)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex w-fit rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide',
                        e.mode === 'abstractive'
                          ? 'bg-(--color-accent)/20 text-(--color-accent)'
                          : e.mode === 'hybrid'
                            ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-(--color-mint)/15 text-(--color-mint-dim)',
                      )}
                    >
                      {e.mode === 'abstractive'
                        ? 'Sinh văn'
                        : e.mode === 'hybrid'
                          ? 'Hybrid'
                          : 'Trích chọn'}
                    </span>
                    {modelLine ? (
                      <span
                        className="line-clamp-1 w-full text-[0.7rem] text-(--color-ink-muted)"
                        title={modelLine}
                      >
                        {modelLine}
                      </span>
                    ) : null}
                    {e.sentiment ? (
                      <span
                        className="inline-flex w-fit rounded-md border border-(--color-accent)/30 bg-(--color-accent-soft)/40 px-1.5 py-0.5 text-[0.65rem] font-medium text-(--color-accent)"
                        title={`${(e.sentiment.confidence * 100).toFixed(0)}% · ${e.sentiment.model}`}
                      >
                        {sentimentLabelVi(e.sentiment.label)} ·{' '}
                        {(e.sentiment.confidence * 100).toFixed(0)}%
                      </span>
                    ) : null}
                    <span className="line-clamp-2 text-sm leading-snug text-(--color-ink)">
                      {e.summary.slice(0, 140)}
                      {e.summary.length > 140 ? '…' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Xóa mục lịch sử"
                    onClick={() => onRemove(e.id)}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-(--color-border) text-(--color-ink-muted) transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface-elevated)/80 px-4 py-2 text-sm font-medium text-(--color-ink) transition hover:border-(--color-accent)/40 hover:bg-(--color-accent-soft)/30"
                aria-expanded={showAll}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="size-4 text-(--color-ink-muted)" aria-hidden />
                    Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4 text-(--color-ink-muted)" aria-hidden />
                    Xem tất cả ({history.length})
                  </>
                )}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
