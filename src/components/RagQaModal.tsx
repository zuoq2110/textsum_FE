import { useEffect, useId, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { RagQaForm, type RagQaFormProps } from './RagQaForm'
import { cn } from '../lib/cn'

type Props = {
  open: boolean
  onClose: () => void
} & Omit<RagQaFormProps, 'showHeader'>

export function RagQaModal({ open, onClose, ...formProps }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusId = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLInputElement>('[data-rag-question]')?.focus()
    })
    return () => {
      cancelAnimationFrame(focusId)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Đóng hộp thoại"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex h-[min(88vh,720px)] max-h-[min(92vh,800px)] w-full max-w-lg flex-col rounded-t-2xl border border-(--color-border)',
          'bg-(--color-surface-elevated) shadow-[var(--shadow-card)] sm:max-w-xl sm:rounded-2xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-(--color-border) px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
              <MessageCircle className="size-[1.1rem]" aria-hidden />
            </span>
            <h2 id={titleId} className="truncate text-base font-semibold text-(--color-ink)">
              Hỏi đáp với AI
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-(--color-ink-muted) transition hover:border-(--color-border) hover:bg-(--color-surface) hover:text-(--color-ink)"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
          <RagQaForm {...formProps} showHeader={false} />
        </div>
      </div>
    </div>
  )
}
