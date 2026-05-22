import { Cpu, GitCompare, Loader2, MessageCircle, Sparkles, Wand2 } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { SummaryLength } from '../lib/extractiveSummarize'
import type { OutputLang } from '../lib/summarizeApi'
import type { SummarizeMode } from '../lib/historyStorage'
import type { CompareSideState } from '../hooks/useTextSum'
import {
  ABSTRACTIVE_MODELS,
  EXTRACTIVE_MODELS,
} from '../lib/summarizeModels'
import { cn } from '../lib/cn'
import { ModelSelect } from './ModelSelect'
import { SegmentGroup } from './ui/SegmentGroup'

type Props = {
  mode: SummarizeMode
  onMode: (m: SummarizeMode) => void
  length: SummaryLength
  onLength: (l: SummaryLength) => void
  lang: OutputLang
  onLang: (l: OutputLang) => void
  /** Gửi `includeSentiment` lên API khi tóm tắt (chỉ khi có backend). */
  includeSentiment: boolean
  onIncludeSentiment: (v: boolean) => void
  extractiveModelId: string
  onExtractiveModel: (id: string) => void
  abstractiveModelId: string
  onAbstractiveModel: (id: string) => void
  apiConfigured: boolean
  loading: boolean
  onSummarize: () => void | Promise<void>
  /** Mở pop-up hỏi đáp AI (chỉ khi có API) */
  onOpenRagAi?: () => void
  ragIngesting?: boolean
  compareEnabled: boolean
  onCompareEnabled: (enabled: boolean) => void
  compareA: CompareSideState
  setCompareA: Dispatch<SetStateAction<CompareSideState>>
  compareB: CompareSideState
  setCompareB: Dispatch<SetStateAction<CompareSideState>>
}

export function SummarizeControls({
  mode,
  onMode,
  length,
  onLength,
  lang,
  onLang,
  includeSentiment,
  onIncludeSentiment,
  extractiveModelId,
  onExtractiveModel,
  abstractiveModelId,
  onAbstractiveModel,
  apiConfigured,
  loading,
  onSummarize,
  onOpenRagAi,
  ragIngesting = false,
  compareEnabled,
  onCompareEnabled,
  compareA,
  setCompareA,
  compareB,
  setCompareB,
}: Props) {
  return (
    <section
      className="relative h-full flex flex-col flex-1 overflow-hidden rounded-2xl border border-(--color-border) bg-linear-to-br from-(--color-surface-elevated) via-(--color-surface-elevated) to-(--color-accent-soft)/25 p-4 shadow-[var(--shadow-card)] sm:p-6"
      aria-label="Tùy chọn tóm tắt"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-(--color-accent)/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-(--color-ink)">
          <Wand2 className="size-4 text-(--color-accent)" aria-hidden />
          Tùy chọn
        </div>

        <div
          className={cn(
            'grid gap-5',
            compareEnabled ? 'grid-cols-1' : 'grid-cols-1',
          )}
        >
          {!compareEnabled ? (
            <SegmentGroup
              label="Chế độ"
              value={mode}
              onChange={onMode}
              options={[
                {
                  value: 'extractive' as const,
                  label: 'Trích chọn',
                  title: apiConfigured
                    ? 'PhoBERT (extractive) qua API'
                    : 'Thuật toán trích chọn cục bộ (khi chưa có API)',
                },
                {
                  value: 'abstractive' as const,
                  label: 'Sinh văn',
                  disabled: !apiConfigured,
                  title: apiConfigured
                    ? 'Qwen (abstractive) qua API'
                    : 'Cần VITE_SUMMARIZE_API_URL trỏ tới backend',
                },
                {
                  value: 'hybrid' as const,
                  label: 'Lai ghép',
                  disabled: !apiConfigured,
                  title: apiConfigured
                    ? '2-stage: PhoBERT extractive -> SLM abstractive'
                    : 'Cần VITE_SUMMARIZE_API_URL trỏ tới backend',
                },
              ]}
            />
          ) : null}
          <SegmentGroup
            label="Độ dài"
            value={length}
            onChange={onLength}
            options={[
              { value: 'short' as const, label: 'Ngắn' },
              { value: 'medium' as const, label: 'Vừa' },
              { value: 'long' as const, label: 'Dài' },
            ]}
          />
        </div>

        {apiConfigured ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--color-border) bg-(--color-surface)/40 px-4 py-3 text-sm transition hover:border-(--color-accent)/35 hover:bg-(--color-accent-soft)/20">
            <input
              type="checkbox"
              checked={includeSentiment}
              onChange={(e) => onIncludeSentiment(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border-(--color-border) accent-(--color-accent)"
            />
            <span>
              <span className="font-medium text-(--color-ink)">
                Phân tích cảm xúc bản tóm tắt
              </span>
            </span>
          </label>
        ) : null}

        {apiConfigured && compareEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-(--color-accent)/25 bg-(--color-surface-elevated)/90 p-4 shadow-inner">
              <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-(--color-ink-muted)">
                <GitCompare className="size-3.5 text-(--color-accent)" aria-hidden />
                Cột A
              </p>
              <SegmentGroup
                label="Chế độ"
                value={compareA.mode}
                onChange={(m) => setCompareA((s) => ({ ...s, mode: m }))}
                className="mt-3"
                options={[
                  {
                    value: 'extractive' as const,
                    label: 'Trích chọn',
                    title: 'PhoBERT (extractive) qua API',
                  },
                  {
                    value: 'abstractive' as const,
                    label: 'Sinh văn',
                    disabled: !apiConfigured,
                    title: 'Abstractive qua API',
                  },
                  {
                    value: 'hybrid' as const,
                    label: 'Hybrid',
                    disabled: !apiConfigured,
                    title: '2-stage: PhoBERT -> SLM',
                  },
                ]}
              />
              {compareA.mode === 'extractive' ? (
                <ModelSelect
                  id="compare-a-extractive"
                  label="PhoBERT (extractive)"
                  value={compareA.extractiveModelId}
                  options={EXTRACTIVE_MODELS}
                  onChange={(id) =>
                    setCompareA((s) => ({ ...s, extractiveModelId: id }))
                  }
                  disabled={loading}
                  className="mt-3"
                />
              ) : compareA.mode === 'abstractive' ? (
                <ModelSelect
                  id="compare-a-abstractive"
                  label="Model (abstractive)"
                  value={compareA.abstractiveModelId}
                  options={ABSTRACTIVE_MODELS}
                  onChange={(id) =>
                    setCompareA((s) => ({ ...s, abstractiveModelId: id }))
                  }
                  disabled={loading}
                  className="mt-3"
                />
              ) : (
                <div className="mt-3 grid gap-3">
                  <ModelSelect
                    id="compare-a-hybrid-extractive"
                    label="Stage 1 (extractive)"
                    value={compareA.extractiveModelId}
                    options={EXTRACTIVE_MODELS}
                    onChange={(id) =>
                      setCompareA((s) => ({ ...s, extractiveModelId: id }))
                    }
                    disabled={loading}
                  />
                  <ModelSelect
                    id="compare-a-hybrid-abstractive"
                    label="Stage 2 (abstractive)"
                    value={compareA.abstractiveModelId}
                    options={ABSTRACTIVE_MODELS}
                    onChange={(id) =>
                      setCompareA((s) => ({ ...s, abstractiveModelId: id }))
                    }
                    disabled={loading}
                  />
                </div>
              )}
            </div>
            <div className="rounded-xl border border-(--color-mint-dim)/30 bg-(--color-surface-elevated)/90 p-4 shadow-inner">
              <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-(--color-ink-muted)">
                <GitCompare className="size-3.5 text-(--color-mint-dim)" aria-hidden />
                Cột B
              </p>
              <SegmentGroup
                label="Chế độ"
                value={compareB.mode}
                onChange={(m) => setCompareB((s) => ({ ...s, mode: m }))}
                className="mt-3"
                options={[
                  {
                    value: 'extractive' as const,
                    label: 'Trích chọn',
                    title: 'PhoBERT (extractive) qua API',
                  },
                  {
                    value: 'abstractive' as const,
                    label: 'Sinh văn',
                    disabled: !apiConfigured,
                    title: 'Abstractive qua API',
                  },
                  {
                    value: 'hybrid' as const,
                    label: 'Hybrid',
                    disabled: !apiConfigured,
                    title: '2-stage: PhoBERT -> SLM',
                  },
                ]}
              />
              {compareB.mode === 'extractive' ? (
                <ModelSelect
                  id="compare-b-extractive"
                  label="PhoBERT (extractive)"
                  value={compareB.extractiveModelId}
                  options={EXTRACTIVE_MODELS}
                  onChange={(id) =>
                    setCompareB((s) => ({ ...s, extractiveModelId: id }))
                  }
                  disabled={loading}
                  className="mt-3"
                />
              ) : compareB.mode === 'abstractive' ? (
                <ModelSelect
                  id="compare-b-abstractive"
                  label="Model (abstractive)"
                  value={compareB.abstractiveModelId}
                  options={ABSTRACTIVE_MODELS}
                  onChange={(id) =>
                    setCompareB((s) => ({ ...s, abstractiveModelId: id }))
                  }
                  disabled={loading}
                  className="mt-3"
                />
              ) : (
                <div className="mt-3 grid gap-3">
                  <ModelSelect
                    id="compare-b-hybrid-extractive"
                    label="Stage 1 (extractive)"
                    value={compareB.extractiveModelId}
                    options={EXTRACTIVE_MODELS}
                    onChange={(id) =>
                      setCompareB((s) => ({ ...s, extractiveModelId: id }))
                    }
                    disabled={loading}
                  />
                  <ModelSelect
                    id="compare-b-hybrid-abstractive"
                    label="Stage 2 (abstractive)"
                    value={compareB.abstractiveModelId}
                    options={ABSTRACTIVE_MODELS}
                    onChange={(id) =>
                      setCompareB((s) => ({ ...s, abstractiveModelId: id }))
                    }
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {apiConfigured && !compareEnabled ? (
          <div className="rounded-xl border border-(--color-accent)/25 bg-(--color-surface-elevated)/90 p-4 shadow-inner">
            {mode === 'extractive' ? (
              <ModelSelect
                id="model-extractive"
                label="PhoBERT (extractive)"
                value={extractiveModelId}
                options={EXTRACTIVE_MODELS}
                onChange={onExtractiveModel}
                disabled={loading}
                className="mt-3"
              />
            ) : mode === 'abstractive' ? (
              <ModelSelect
                id="model-abstractive"
                label="Qwen (abstractive)"
                value={abstractiveModelId}
                options={ABSTRACTIVE_MODELS}
                onChange={onAbstractiveModel}
                disabled={loading}
                className="mt-3"
              />
            ) : (
              <div className="mt-3 grid gap-3">
                <ModelSelect
                  id="model-hybrid-extractive"
                  label="Stage 1 (extractive)"
                  value={extractiveModelId}
                  options={EXTRACTIVE_MODELS}
                  onChange={onExtractiveModel}
                  disabled={loading}
                />
                <ModelSelect
                  id="model-hybrid-abstractive"
                  label="Stage 2 (abstractive)"
                  value={abstractiveModelId}
                  options={ABSTRACTIVE_MODELS}
                  onChange={onAbstractiveModel}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        ) : null}

        {!apiConfigured ? (
          <p className="rounded-xl border border-(--color-border)/80 bg-(--color-surface)/60 px-3 py-2 text-xs text-(--color-ink-muted)">
            Khi cấu hình API, bạn có thể chọn model PhoBERT / Qwen tương ứng backend. Danh sách ID chỉnh trong{' '}
            <code className="font-mono text-[0.7rem] text-(--color-ink)">src/lib/summarizeModels.ts</code>.
          </p>
        ) : null}

        {!apiConfigured && (
          <p className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface)/80 px-3 py-2 text-xs leading-relaxed text-(--color-ink-muted)">
            <Cpu className="mb-0.5 inline size-3.5 align-text-bottom text-(--color-accent)" />{' '}
            Chưa có <strong className="text-(--color-ink)">API backend</strong>: chế độ{' '}
            <strong className="text-(--color-ink)">Trích chọn</strong> dùng tóm tắt cục bộ trên
            trình duyệt. Để bật <strong className="text-(--color-ink)">Sinh văn/Hybrid</strong>,
            thêm{' '}
            <code className="rounded bg-(--color-accent-soft) px-1 py-0.5 font-mono text-[0.7rem] text-(--color-ink)">
              VITE_SUMMARIZE_API_URL
            </code>{' '}
            trong <code className="rounded bg-(--color-accent-soft) px-1 py-0.5 font-mono text-[0.7rem]">.env</code> và chạy lại dev server.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void onSummarize()}
            className={cn(
              'relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 text-base font-semibold text-white',
              'bg-linear-to-r from-(--color-accent) via-(--color-mint-dim) to-(--color-accent)',
              'shadow-lg shadow-(--color-accent)/25 transition hover:brightness-110 active:scale-[0.99]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                {compareEnabled ? 'Đang so sánh…' : 'Đang tóm tắt…'}
              </>
            ) : (
              <>
                {compareEnabled ? (
                  <GitCompare className="size-5" aria-hidden />
                ) : (
                  <Sparkles className="size-5" aria-hidden />
                )}
                {compareEnabled ? 'Tóm tắt & so sánh' : 'Tóm tắt ngay'}
              </>
            )}
          </button>

          {apiConfigured && onOpenRagAi ? (
            <button
              type="button"
              disabled={loading || ragIngesting}
              onClick={onOpenRagAi}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated)/90 px-4 py-3 text-sm font-semibold text-(--color-ink)',
                'transition hover:border-(--color-accent)/35 hover:bg-(--color-accent-soft)/25',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)/50',
                'disabled:cursor-not-allowed disabled:opacity-55',
              )}
            >
              {ragIngesting ? (
                <Loader2 className="size-4 animate-spin text-(--color-accent)" aria-hidden />
              ) : (
                <MessageCircle className="size-4 text-(--color-accent)" aria-hidden />
              )}
              {ragIngesting ? 'Đang lập chỉ mục cho AI…' : 'Hỏi đáp với AI'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
