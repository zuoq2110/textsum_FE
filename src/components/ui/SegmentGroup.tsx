import { cn } from '../../lib/cn'

type Option<T extends string> = { value: T; label: string; disabled?: boolean; title?: string }

type Props<T extends string> = {
  label: string
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: Props<T>) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-(--color-ink-muted)">
        {label}
      </span>
      <div
        className="flex w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-0.5 shadow-inner"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              'flex-1 min-h-[2.25rem] px-3 py-1.5 text-sm font-medium transition-all duration-200',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
              value === opt.value
                ? 'rounded-[10px] bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) text-white shadow-md'
                : 'rounded-[10px] text-(--color-ink) hover:bg-(--color-accent-soft)/60',
              opt.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
