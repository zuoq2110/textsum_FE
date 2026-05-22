import type { ModelOption } from '../lib/summarizeModels'
import { cn } from '../lib/cn'

type Props = {
  id: string
  label: string
  value: string
  options: ModelOption[]
  onChange: (id: string) => void
  disabled?: boolean
  hint?: string
  className?: string
}

export function ModelSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  hint,
  className,
}: Props) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-(--color-ink-muted)"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full min-w-0 rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-3 py-2.5 text-sm font-medium text-(--color-ink)',
          'shadow-inner outline-none transition',
          'focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="text-[0.7rem] leading-snug text-(--color-ink-muted)">{hint}</p>
      ) : null}
    </div>
  )
}
