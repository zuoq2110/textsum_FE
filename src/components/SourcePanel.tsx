import { useCallback, useRef, useState } from 'react'
import {
  ClipboardCopy,
  Eraser,
  FileText,
  Link2,
  Loader2,
  Timer,
  Upload,
} from 'lucide-react'
import { fetchTextFromUrl } from '../lib/fetchArticleApi'
import { readLocalTextFile } from '../lib/readLocalTextFile'
import { cn } from '../lib/cn'

type Props = {
  id: string
  value: string
  onChange: (v: string) => void
  chars: number
  words: number
  minutes: number
  copyDone: boolean
  onCopy: () => void
  onClear: () => void
  /** Cho phép lấy nội dung từ URL qua API backend */
  apiConfigured: boolean
  onSummarizeFile: (file: File) => Promise<boolean>
  summarizeLoading: boolean
}

export function SourcePanel({
  id,
  value,
  onChange,
  chars,
  words,
  minutes,
  copyDone,
  onCopy,
  onClear,
  apiConfigured,
  onSummarizeFile,
  summarizeLoading,
}: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFetchUrl = useCallback(async () => {
    setImportError(null)
    const u = urlInput.trim()
    if (!u) {
      setImportError('Nhập link bài viết trước khi lấy nội dung.')
      return
    }
    setUrlLoading(true)
    try {
      const text = await fetchTextFromUrl(u)
      onChange(text)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Không lấy được nội dung.')
    } finally {
      setUrlLoading(false)
    }
  }, [urlInput, onChange])

  const handleFilePick = useCallback(() => {
    setImportError(null)
    fileRef.current?.click()
  }, [])

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setImportError(null)
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const shouldUseServer = ['pdf', 'docx', 'txt'].includes(ext)
      if (shouldUseServer) {
        if (!apiConfigured) {
          setImportError(
            'Tệp PDF/DOCX/TXT cần backend để parse và tóm tắt. Hãy cấu hình API trước.',
          )
          return
        }
        try {
          await onSummarizeFile(file)
        } catch (err) {
          setImportError(
            err instanceof Error ? err.message : 'Không thể tóm tắt từ tệp này.',
          )
        }
        return
      }

      try {
        const text = await readLocalTextFile(file)
        onChange(text)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Không đọc được tệp.')
      }
    },
    [apiConfigured, onChange, onSummarizeFile],
  )

  return (
    <section
      className={cn(
        'group relative flex flex-col h-full flex-1 gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/70 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl',
        'transition-shadow duration-300 hover:shadow-[var(--shadow-glow)] sm:p-5',
      )}
      aria-labelledby={`${id}-label`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
            <FileText className="size-[1.1rem]" aria-hidden />
          </span>
          <div>
            <label
              id={`${id}-label`}
              htmlFor={id}
              className="text-sm font-semibold text-(--color-ink)"
            >
              Văn bản gốc
            </label>
            <p className="text-xs text-(--color-ink-muted)">
              Gõ, dán, tải tệp văn bản hoặc lấy từ link (link cần API)
            </p>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-ink-muted)"
          aria-live="polite"
        >
          <span className="tabular-nums">{chars.toLocaleString('vi-VN')} ký tự</span>
          <span className="text-(--color-border)">·</span>
          <span className="tabular-nums">{words.toLocaleString('vi-VN')} từ</span>
          <span className="text-(--color-border)">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Timer className="size-3.5 opacity-70" aria-hidden />~{minutes} phút đọc
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface)/80 p-2 sm:flex-row sm:items-center',
            !apiConfigured && 'opacity-90',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <Link2
              className={cn(
                'size-4 shrink-0',
                apiConfigured ? 'text-(--color-accent)' : 'text-(--color-ink-muted)',
              )}
              aria-hidden
            />
            <input
              type="url"
              name="article-url"
              autoComplete="url"
              placeholder="https://… (link bài viết)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={!apiConfigured || urlLoading}
              className={cn(
                'min-w-0 flex-1 bg-transparent text-sm text-(--color-ink) placeholder:text-(--color-ink-muted)/60',
                'outline-none disabled:cursor-not-allowed',
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={!apiConfigured || urlLoading}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
              apiConfigured
                ? 'bg-(--color-accent-soft) text-(--color-accent) hover:bg-(--color-accent)/20'
                : 'cursor-not-allowed bg-(--color-border)/40 text-(--color-ink-muted)',
            )}
          >
            {urlLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Lấy nội dung
          </button>
        </div>

        <div className="flex sm:shrink-0">
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
              accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.log,.tsv,text/plain"
            onChange={onFileChange}
          />
          <button
  type="button"
  onClick={handleFilePick}
  disabled={summarizeLoading}
  className="inline-flex items-center justify-center
             w-14 h-14
             rounded-xl border border-(--color-border)
             bg-(--color-surface)
             text-(--color-ink) transition
             hover:border-(--color-mint-dim)/50 hover:bg-(--color-mint)/10"
  aria-label="Upload file"
>
  {summarizeLoading ? (
    <Loader2 className="size-4 animate-spin text-(--color-mint-dim)" />
  ) : (
    <Upload className="size-5 text-(--color-mint-dim)" />
  )}
</button>
        </div>
      </div>

      {!apiConfigured && (
        <p className="text-[0.7rem] leading-relaxed text-(--color-ink-muted)">
          <strong className="text-(--color-ink)">Lấy từ link</strong> cần backend{' '}
          <code className="rounded bg-(--color-accent-soft)/50 px-1 font-mono text-[0.65rem]">
            POST /api/v1/fetch-text
          </code>{' '}
          (trình duyệt không thể tự tải trang ngoài do CORS). Cấu hình{' '}
          <code className="font-mono text-[0.65rem]">VITE_SUMMARIZE_API_URL</code> trỏ tới cùng
          server.
        </p>
      )}

      {importError ? (
        <p
          className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          {importError}
        </p>
      ) : null}

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Dán hoặc gõ đoạn văn (tiếng Việt / English). Nên có nhiều câu và dấu câu rõ ràng để tóm tắt đẹp hơn…"
        rows={12}
        spellCheck
        className={cn(
          'min-h-[220px] w-full resize-y rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm leading-relaxed text-(--color-ink)',
          'placeholder:text-(--color-ink-muted)/70',
          'transition-[border-color,box-shadow] duration-200',
          'focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/25',
        )}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-medium text-(--color-ink) transition hover:border-(--color-accent)/50 hover:bg-(--color-accent-soft)/40"
        >
          <ClipboardCopy className="size-4 text-(--color-accent)" aria-hidden />
          {copyDone ? 'Đã chép' : 'Sao chép văn gốc'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-(--color-ink-muted) transition hover:bg-(--color-accent-soft)/30 hover:text-(--color-ink)"
        >
          <Eraser className="size-4" aria-hidden />
          Xóa nội dung
        </button>
      </div>
    </section>
  )
}
