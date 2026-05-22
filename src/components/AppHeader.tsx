import { Sparkles, Zap } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="relative overflow-hidden px-1 pb-10 pt-8 sm:pb-12 sm:pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-linear-to-br from-(--color-accent)/30 via-transparent to-(--color-mint)/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 h-48 w-48 rounded-full bg-(--color-mint)/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-elevated)/80 px-3 py-1.5 text-xs font-medium text-(--color-ink-muted) shadow-[var(--shadow-card)] backdrop-blur-md">
          <Sparkles className="size-3.5 text-(--color-accent)" aria-hidden />
          PhoBERT · Qwen · Một API
          <Zap className="size-3.5 text-(--color-mint)" aria-hidden />
        </div>
        <h1 className="bg-linear-to-r from-(--color-ink) via-(--color-accent) to-(--color-mint-dim) bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          TextSum
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-(--color-ink-muted)">
          Tóm tắt văn bản tiếng Việt bằng AI · Trích chọn · Trừu tượng · Lai ghép
        </p>
      </div>
    </header>
  )
}
