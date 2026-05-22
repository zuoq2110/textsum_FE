import { useEffect, useRef } from 'react'
import { Bot, Database, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react'
import type { RagChatMessage } from '../lib/ragChatTypes'
import { formatTime } from '../lib/text'
import { cn } from '../lib/cn'

export type RagQaFormProps = {
  apiConfigured: boolean
  docId: string
  onDocId: (v: string) => void
  question: string
  onQuestion: (v: string) => void
  messages: RagChatMessage[]
  indexedChars: number
  ingesting: boolean
  asking: boolean
  error: string | null
  canIngest: boolean
  onIngest: () => void
  onAsk: () => void
  onClearChat: () => void
  showHeader?: boolean
}

export function RagQaForm(props: RagQaFormProps) {
  const {
    apiConfigured,
    docId,
    onDocId,
    question,
    onQuestion,
    messages,
    indexedChars,
    ingesting,
    asking,
    error,
    canIngest,
    onIngest,
    onAsk,
    onClearChat,
    showHeader = true,
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const canSend =
    apiConfigured && indexedChars > 0 && !asking && question.trim().length > 0

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, asking])

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onAsk()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {showHeader ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
            <Database className="size-[1.1rem]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-(--color-ink)">Hỏi đáp với RAG</h3>
            <p className="text-xs text-(--color-ink-muted)">
              Chunk + vector search + model trả lời theo văn bản đã lập chỉ mục
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-(--color-border)/80 pb-3">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-(--color-ink-muted)">
          docId
          <input
            value={docId}
            onChange={(e) => onDocId(e.target.value)}
            placeholder="doc-2026-04-11"
            className="rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
        </label>
        <button
          type="button"
          disabled={!canIngest || ingesting}
          onClick={onIngest}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap sm:text-sm',
            'bg-(--color-accent-soft) text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          {ingesting ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
          Lập chỉ mục lại
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-ink-muted)">
          <span>
            {indexedChars > 0
              ? `~${indexedChars.toLocaleString('vi-VN')} ký tự`
              : 'Chưa index'}
          </span>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={onClearChat}
              className="inline-flex items-center gap-1 rounded-lg border border-(--color-border) px-2 py-1 font-medium text-(--color-ink-muted) transition hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Xóa hội thoại
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="shrink-0 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          'flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-(--color-border)/90 bg-(--color-surface)/40 p-3 sm:min-h-[240px]',
          'scroll-smooth',
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && !asking ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <MessageCircle className="size-10 text-(--color-ink-muted)/35" aria-hidden />
            <p className="max-w-[260px] text-sm text-(--color-ink-muted)">
              {indexedChars > 0
                ? 'Bắt đầu hỏi về nội dung đã lập chỉ mục. Enter để gửi, Shift+Enter xuống dòng.'
                : 'Lập chỉ mục tài liệu (tự động sau khi tóm tắt đủ dài) rồi chat tại đây.'}
            </p>
          </div>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex w-full flex-col gap-1', m.role === 'user' ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[min(100%,520px)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                m.role === 'user'
                  ? 'rounded-br-md bg-(--color-accent) text-white'
                  : m.error
                    ? 'rounded-bl-md border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200'
                    : 'rounded-bl-md border border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink)',
              )}
            >
              {m.role === 'assistant' && !m.error ? (
                <p className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-(--color-ink-muted)">
                  <Bot className="size-3.5 text-(--color-accent)" aria-hidden />
                  AI
                </p>
              ) : null}
              {m.error ? (
                <p className="text-sm">{m.error}</p>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
            <span className="px-1 text-[0.65rem] text-(--color-ink-muted)/80">
              {formatTime(m.createdAt)}
            </span>
            {m.role === 'assistant' && m.chunks && m.chunks.length > 0 ? (
              <details className="max-w-[min(100%,520px)] rounded-xl border border-(--color-border) bg-(--color-surface)/80 text-xs">
                <summary className="cursor-pointer select-none px-3 py-2 font-medium text-(--color-ink-muted) hover:text-(--color-ink)">
                  Chunk tham chiếu ({m.chunks.length})
                </summary>
                <ul className="max-h-40 space-y-2 overflow-y-auto border-t border-(--color-border) p-2">
                  {m.chunks.map((c, i) => (
                    <li
                      key={`${m.id}-c-${c.id ?? i}`}
                      className="rounded-lg bg-(--color-surface-elevated)/60 p-2 text-(--color-ink-muted)"
                    >
                      <p className="mb-0.5 font-medium text-(--color-ink)">
                        {(c.id ?? `chunk-${i + 1}`) +
                          (typeof c.score === 'number' ? ` · ${c.score.toFixed(3)}` : '')}
                      </p>
                      <p className="line-clamp-4">{c.text}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}

        {asking ? (
          <div className="flex w-full justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-(--color-border) bg-(--color-surface-elevated) px-4 py-3 text-sm text-(--color-ink-muted)">
              <Loader2 className="size-4 shrink-0 animate-spin text-(--color-accent)" aria-hidden />
              Đang trả lời…
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2">
        <textarea
          data-rag-question
          value={question}
          onChange={(e) => onQuestion(e.target.value)}
          onKeyDown={onComposerKeyDown}
          placeholder="Nhập câu hỏi… (Enter gửi, Shift+Enter xuống dòng)"
          rows={2}
          disabled={!apiConfigured || indexedChars === 0 || asking}
          className={cn(
            'min-h-[3rem] flex-1 resize-none rounded-2xl border border-(--color-border) bg-(--color-surface) px-3 py-2.5 text-sm text-(--color-ink)',
            'outline-none focus:border-(--color-accent) disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => void onAsk()}
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-2xl px-4 py-3 text-sm font-semibold',
            'bg-(--color-mint)/20 text-(--color-mint-dim) disabled:cursor-not-allowed disabled:opacity-45',
          )}
          aria-label="Gửi câu hỏi"
        >
          {asking ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </div>
    </div>
  )
}
