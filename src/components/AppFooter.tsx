import { Lock, Server } from 'lucide-react'

export function AppFooter() {
  return (
    <footer className="mx-auto mt-14 max-w-2xl border-t border-(--color-border) pt-8 text-center">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-(--color-ink-muted)">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-surface-elevated) px-3 py-1.5">
          <Server className="size-3.5 text-(--color-accent)" aria-hidden />
          <strong className="font-semibold text-(--color-ink)">API</strong>
          văn bản được gửi tới server bạn cấu hình
        </span>
        <span className="text-(--color-border) max-sm:hidden">|</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-surface-elevated) px-3 py-1.5">
          <Lock className="size-3.5 text-(--color-mint)" aria-hidden />
          Không có API: trích chọn chạy{' '}
          <strong className="font-semibold text-(--color-ink)">cục bộ</strong>, không ra mạng
        </span>
      </div>
    </footer>
  )
}
