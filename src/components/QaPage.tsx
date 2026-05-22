import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RagChatMessage } from '../lib/ragChatTypes'
import { formatTime } from '../lib/text'
import { cn } from '../lib/cn'

type QaPageProps = {
  source: string
  onSource: (v: string) => void
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
}

const SUGGESTED_QUESTIONS = [
  'Nội dung chính của văn bản này là gì?',
  'Tóm tắt các ý quan trọng nhất.',
  'Văn bản đề cập đến vấn đề gì?',
  'Kết luận của tác giả là gì?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-(--color-accent) opacity-60"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function ChunkReference({ message }: { message: RagChatMessage }) {
  const [open, setOpen] = useState(false)
  if (!message.chunks || message.chunks.length === 0) return null
  return (
    <div className="mt-1.5 max-w-[min(100%,560px)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-surface-elevated) hover:text-(--color-ink)"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {message.chunks.length} đoạn tham chiếu
      </button>
      {open && (
        <div className="mt-1 rounded-xl border border-(--color-border) bg-(--color-surface)/80 divide-y divide-(--color-border)">
          {message.chunks.map((c, i) => (
            <div key={`${message.id}-c-${c.id ?? i}`} className="px-3 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-(--color-ink-muted) uppercase tracking-wide">
                  {c.id ?? `Chunk ${i + 1}`}
                </span>
                {typeof c.score === 'number' && (
                  <span className="rounded-full bg-(--color-accent-soft) px-1.5 py-0.5 text-[10px] font-semibold text-(--color-accent)">
                    {(c.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="line-clamp-3 text-xs text-(--color-ink-muted)">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatMessage({ message }: { message: RagChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex w-full gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5',
          isUser
            ? 'bg-(--color-accent) text-white'
            : 'bg-(--color-surface-elevated) border border-(--color-border) text-(--color-accent)',
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      {/* Bubble + meta */}
      <div className={cn('flex max-w-[min(75%,560px)] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-(--color-accent) text-white shadow-sm'
              : message.error
                ? 'rounded-tl-sm border border-red-400/30 bg-red-50/80 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                : 'rounded-tl-sm border border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink) shadow-sm',
          )}
        >
          {message.error ? (
            <p className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
              {message.error}
            </p>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <span className="px-1 text-[10px] text-(--color-ink-muted)/70">{formatTime(message.createdAt)}</span>
        {!isUser && <ChunkReference message={message} />}
      </div>
    </div>
  )
}

export function QaPage({
  source,
  onSource,
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
}: QaPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showDocId, setShowDocId] = useState(false)

  const isIndexed = indexedChars > 0
  const chars = source.length
  const words = source.trim() ? source.trim().split(/\s+/).length : 0
  const canSend = apiConfigured && isIndexed && !asking && question.trim().length > 0

  // Auto-scroll chat
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, asking])

  // Auto-resize question input
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [question])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onAsk()
    }
  }

  const handleSuggest = (q: string) => {
    onQuestion(q)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-svh flex-col lg:flex-row gap-0 overflow-hidden">
      {/* ── Left: Document panel ── */}
      <div className="flex w-full flex-col border-b border-(--color-border) bg-(--color-surface) lg:w-[400px] lg:min-w-[320px] lg:max-w-[420px] lg:border-b-0 lg:border-r lg:h-full">
        {/* Doc panel header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-(--color-border) px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-(--color-accent-soft) text-(--color-accent)">
              <FileText className="size-3.5" />
            </span>
            <span className="text-sm font-semibold text-(--color-ink)">Văn bản nguồn</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isIndexed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                Đã lập chỉ mục
              </span>
            )}
            {source ? (
              <button
                type="button"
                onClick={() => onSource('')}
                className="rounded-md p-1 text-(--color-ink-muted) transition hover:bg-(--color-surface-elevated) hover:text-red-500"
                title="Xóa văn bản"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Textarea */}
        <div className="relative flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(e) => onSource(e.target.value)}
            placeholder={
              isIndexed
                ? 'Đã lập chỉ mục. Thay đổi văn bản và nhấn "Lập chỉ mục lại" để cập nhật.'
                : 'Dán văn bản của bạn vào đây…\n\nVí dụ: bài báo, tài liệu, hợp đồng, bài viết…'
            }
            spellCheck={false}
            className={cn(
              'h-full w-full resize-none bg-transparent px-4 py-3 text-sm text-(--color-ink) outline-none',
              'placeholder:text-(--color-ink-muted)/40 lg:min-h-[200px]',
            )}
          />
          {!source && !isIndexed && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center pb-3">
              <span className="rounded-full bg-(--color-surface-elevated) border border-(--color-border) px-3 py-1 text-xs text-(--color-ink-muted)">
                Tối thiểu 80 ký tự
              </span>
            </div>
          )}
        </div>

        {/* Doc panel footer */}
        <div className="shrink-0 border-t border-(--color-border) bg-(--color-surface) px-4 py-3 space-y-3">
          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-(--color-ink-muted)">
            <span>
              {chars > 0
                ? `${chars.toLocaleString('vi-VN')} ký tự · ${words.toLocaleString('vi-VN')} từ`
                : 'Chưa có văn bản'}
            </span>
            {isIndexed && (
              <span className="text-emerald-600 dark:text-emerald-400">
                ~{indexedChars.toLocaleString('vi-VN')} ký tự đã lập chỉ mục
              </span>
            )}
          </div>

          {/* Advanced: docId toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowDocId(!showDocId)}
              className="flex items-center gap-1 text-[11px] text-(--color-ink-muted)/70 hover:text-(--color-ink-muted) transition"
            >
              <ChevronRight
                className={cn('size-3 transition-transform', showDocId && 'rotate-90')}
              />
              Nâng cao (docId)
            </button>
            {showDocId && (
              <div className="mt-2">
                <label className="flex flex-col gap-1 text-xs text-(--color-ink-muted)">
                  Định danh tài liệu
                  <input
                    value={docId}
                    onChange={(e) => onDocId(e.target.value)}
                    placeholder="doc-2026-05-12"
                    className="rounded-lg border border-(--color-border) bg-(--color-surface-elevated) px-3 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-accent)"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Index button */}
          <button
            type="button"
            disabled={!canIngest || ingesting}
            onClick={onIngest}
            className={cn(
              'relative w-full overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              'inline-flex items-center justify-center gap-2',
              canIngest && !ingesting
                ? 'bg-(--color-accent) text-white shadow-sm hover:opacity-90'
                : 'bg-(--color-surface-elevated) text-(--color-ink-muted) border border-(--color-border)',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {ingesting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang lập chỉ mục…
              </>
            ) : (
              <>
                <Database className="size-4" />
                {isIndexed ? 'Lập chỉ mục lại' : 'Lập chỉ mục'}
              </>
            )}
          </button>

          {/* API warning */}
          {!apiConfigured && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              Cần cấu hình{' '}
              <code className="font-mono">VITE_SUMMARIZE_API_URL</code> để dùng tính năng này.
            </p>
          )}

          {/* Tips (khi chưa index) */}
          {!isIndexed && apiConfigured && (
            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-3">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-(--color-ink-muted)">
                <Sparkles className="size-3 text-(--color-accent)" />
                Hướng dẫn
              </p>
              <ol className="space-y-0.5 text-[11px] text-(--color-ink-muted) list-decimal list-inside leading-relaxed">
                <li>Dán văn bản vào ô trên (≥ 80 ký tự)</li>
                <li>Nhấn <strong className="text-(--color-ink)">Lập chỉ mục</strong></li>
                <li>Đặt câu hỏi trong khung chat →</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-(--color-surface) lg:h-full">
        {/* Chat header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-(--color-border) px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) text-white">
              <Zap className="size-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-(--color-ink)">Hỏi đáp với AI</p>
              {isIndexed && (
                <p className="text-[10px] text-(--color-ink-muted)">
                  {messages.length > 0
                    ? `${Math.ceil(messages.length / 2)} lượt hỏi đáp`
                    : 'Sẵn sàng · đặt câu hỏi bất kỳ'}
                </p>
              )}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-border) px-2.5 py-1.5 text-xs text-(--color-ink-muted) transition hover:border-red-400/40 hover:bg-red-50/80 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            >
              <Trash2 className="size-3.5" />
              Xóa hội thoại
            </button>
          )}
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth min-h-0"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {/* Empty state */}
          {messages.length === 0 && !asking && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6 py-12">
              {isIndexed ? (
                <>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-(--color-accent-soft) to-(--color-mint-dim)/20 ring-4 ring-(--color-accent-soft)">
                    <MessageCircle className="size-7 text-(--color-accent)" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-(--color-ink)">Sẵn sàng hỏi đáp!</p>
                    <p className="mt-1 text-sm text-(--color-ink-muted)">
                      Đặt bất kỳ câu hỏi nào về nội dung đã lập chỉ mục.
                    </p>
                  </div>
                  {/* Suggested questions */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSuggest(q)}
                        className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-3 py-1.5 text-xs text-(--color-ink-muted) transition hover:border-(--color-accent)/40 hover:bg-(--color-accent-soft) hover:text-(--color-ink)"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-(--color-surface-elevated) border border-(--color-border)">
                    <Database className="size-7 text-(--color-ink-muted)/40" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-(--color-ink)">Chưa có dữ liệu</p>
                    <p className="mt-1 text-sm text-(--color-ink-muted)">
                      Dán văn bản vào ô bên trái và nhấn <strong>Lập chỉ mục</strong> để bắt đầu.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
              {error}
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {/* Typing indicator */}
          {asking && (
            <div className="flex gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--color-surface-elevated) border border-(--color-border) text-(--color-accent) mt-0.5">
                <Bot className="size-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-(--color-border) bg-(--color-surface-elevated) px-4 py-3 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-(--color-border) bg-(--color-surface) px-4 py-3">
          <div
            className={cn(
              'flex items-end gap-2 rounded-2xl border bg-(--color-surface-elevated) px-3 py-2 transition',
              'focus-within:border-(--color-accent)',
              !isIndexed || !apiConfigured ? 'border-(--color-border)/50 opacity-60' : 'border-(--color-border)',
            )}
          >
            <textarea
              ref={inputRef}
              data-rag-question
              value={question}
              onChange={(e) => onQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !apiConfigured
                  ? 'Cần cấu hình API để sử dụng...'
                  : !isIndexed
                    ? 'Lập chỉ mục văn bản trước để đặt câu hỏi...'
                    : 'Nhập câu hỏi của bạn… (Enter gửi, Shift+Enter xuống dòng)'
              }
              rows={1}
              disabled={!apiConfigured || !isIndexed || asking}
              className={cn(
                'max-h-[120px] min-h-[2rem] flex-1 resize-none bg-transparent py-1 text-sm text-(--color-ink) outline-none',
                'placeholder:text-(--color-ink-muted)/50 disabled:cursor-not-allowed',
              )}
            />
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void onAsk()}
              aria-label="Gửi câu hỏi"
              className={cn(
                'mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl transition',
                canSend
                  ? 'bg-(--color-accent) text-white shadow-sm hover:opacity-90'
                  : 'bg-(--color-surface) text-(--color-ink-muted)/40 cursor-not-allowed',
              )}
            >
              {asking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-(--color-ink-muted)/50">
            Enter để gửi · Shift+Enter để xuống dòng
          </p>
        </div>
      </div>
    </div>
  )
}
