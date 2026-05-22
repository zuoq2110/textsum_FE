import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  summarizeExtractive,
  type SummaryLength,
} from '../lib/extractiveSummarize'
import {
  hasSummarizeApi,
  summarizeFileViaApi,
  summarizeViaApi,
  type OutputLang,
  type SummarizeSentiment,
} from '../lib/summarizeApi'
import {
  saveHistoryEntry,
  type HistoryEntry,
  type SummarizeMode,
} from '../lib/historyStorage'
import { fetchServerHistory } from '../lib/historyApi'
import {
  ABSTRACTIVE_MODELS,
  EXTRACTIVE_MODELS,
  defaultAbstractiveModelId,
  defaultExtractiveModelId,
  loadModelPrefs,
  nextModelOptionId,
  saveModelPrefs,
} from '../lib/summarizeModels'
import { countWords, downloadText } from '../lib/text'

export type CopyTarget = 'source' | 'summary' | 'summaryB' | null

export type CompareSideState = {
  mode: SummarizeMode
  extractiveModelId: string
  abstractiveModelId: string
}

function defaultCompareSide(): CompareSideState {
  return {
    mode: 'extractive',
    extractiveModelId: defaultExtractiveModelId(),
    abstractiveModelId: defaultAbstractiveModelId(),
  }
}

export function useTextSum() {
  const [source, setSource] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryB, setSummaryB] = useState('')
  const [mode, setMode] = useState<SummarizeMode>('extractive')
  const [length, setLength] = useState<SummaryLength>('medium')
  const [lang, setLang] = useState<OutputLang>('vi')
  const [extractiveModelId, setExtractiveModelId] = useState(defaultExtractiveModelId)
  const [abstractiveModelId, setAbstractiveModelId] = useState(
    defaultAbstractiveModelId,
  )
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareA, setCompareA] = useState<CompareSideState>(defaultCompareSide)
  const [compareB, setCompareB] = useState<CompareSideState>(defaultCompareSide)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareErrorA, setCompareErrorA] = useState<string | null>(null)
  const [compareErrorB, setCompareErrorB] = useState<string | null>(null)
  const [copyFlash, setCopyFlash] = useState<CopyTarget>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [includeSentiment, setIncludeSentiment] = useState(false)
  const [sentiment, setSentiment] = useState<SummarizeSentiment | null>(null)
  const [sentimentB, setSentimentB] = useState<SummarizeSentiment | null>(null)

  const apiConfigured = hasSummarizeApi()

  /** Lấy lịch sử từ server (im lặng nếu chưa đăng nhập / server lỗi). */
  const syncHistoryFromServer = useCallback(async () => {
    const serverItems = await fetchServerHistory(50, 0)
    setHistory(serverItems)
  }, [])

  useEffect(() => {
    // Chỉ hiển thị lịch sử từ server.
    setHistory([])
    void syncHistoryFromServer()
  }, [syncHistoryFromServer])

  useEffect(() => {
    const p = loadModelPrefs()
    if (
      p.extractive &&
      EXTRACTIVE_MODELS.some((m) => m.id === p.extractive)
    ) {
      setExtractiveModelId(p.extractive)
    }
    if (
      p.abstractive &&
      ABSTRACTIVE_MODELS.some((m) => m.id === p.abstractive)
    ) {
      setAbstractiveModelId(p.abstractive)
    }
  }, [])

  useEffect(() => {
    saveModelPrefs({
      extractive: extractiveModelId,
      abstractive: abstractiveModelId,
    })
  }, [extractiveModelId, abstractiveModelId])

  useEffect(() => {
    if ((mode === 'abstractive' || mode === 'hybrid') && !apiConfigured) {
      setMode('extractive')
    }
  }, [mode, apiConfigured])

  useEffect(() => {
    if (!compareEnabled) return
    setCompareA((s) =>
      (s.mode === 'abstractive' || s.mode === 'hybrid') && !apiConfigured
        ? { ...s, mode: 'extractive' }
        : s,
    )
    setCompareB((s) =>
      (s.mode === 'abstractive' || s.mode === 'hybrid') && !apiConfigured
        ? { ...s, mode: 'extractive' }
        : s,
    )
  }, [apiConfigured, compareEnabled])

  const stats = useMemo(() => {
    const chars = source.length
    const words = countWords(source)
    const minutes = Math.max(1, Math.ceil(words / 200))
    return { chars, words, minutes }
  }, [source])

  const flashCopy = useCallback((target: CopyTarget) => {
    setCopyFlash(target)
    window.setTimeout(() => setCopyFlash(null), 2000)
  }, [])

  const copySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source)
      flashCopy('source')
    } catch {
      setError('Không thể sao chép văn bản gốc.')
    }
  }, [source, flashCopy])

  const copySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary)
      flashCopy('summary')
    } catch {
      setError('Không thể sao chép văn tóm tắt.')
    }
  }, [summary, flashCopy])

  const copySummaryB = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryB)
      flashCopy('summaryB')
    } catch {
      setError('Không thể sao chép cột B.')
    }
  }, [summaryB, flashCopy])

  const setCompareEnabledWithInit = useCallback(
    (on: boolean) => {
      if (on) {
        if (!apiConfigured) {
          setError('So sánh 2 bản cần API (VITE_SUMMARIZE_API_URL).')
          return
        }
        setError(null)
        setCompareErrorA(null)
        setCompareErrorB(null)
        setCompareA({
          mode,
          extractiveModelId,
          abstractiveModelId,
        })
        setCompareB({
          mode,
          extractiveModelId: nextModelOptionId(
            EXTRACTIVE_MODELS,
            extractiveModelId,
          ),
          abstractiveModelId: nextModelOptionId(
            ABSTRACTIVE_MODELS,
            abstractiveModelId,
          ),
        })
        setSummary('')
        setSummaryB('')
        setSentiment(null)
        setSentimentB(null)
      } else {
        setSummaryB('')
        setCompareErrorA(null)
        setCompareErrorB(null)
      }
      setCompareEnabled(on)
    },
    [
      apiConfigured,
      mode,
      extractiveModelId,
      abstractiveModelId,
    ],
  )

  const summarize = useCallback(async (): Promise<boolean> => {
    const t = source.trim()
    if (!t) {
      setError('Vui lòng nhập văn bản cần tóm tắt.')
      return false
    }
    if (t.length < 40) {
      setError(
        'Văn bản quá ngắn — nên có ít nhất khoảng 40 ký tự để tóm tắt có ý nghĩa.',
      )
      return false
    }

    if (compareEnabled) {
      if (!apiConfigured) {
        setError(
          'So sánh 2 bản cần backend. Cấu hình VITE_SUMMARIZE_API_URL trong .env.',
        )
        return false
      }

      setError(null)
      setCompareErrorA(null)
      setCompareErrorB(null)
      setLoading(true)
      setSummary('')
      setSummaryB('')
      setSentiment(null)
      setSentimentB(null)

      const runSide = async (side: CompareSideState) => {
        if ((side.mode === 'abstractive' || side.mode === 'hybrid') && !apiConfigured) {
          throw new Error('Chế độ này cần API.')
        }
        const modelId =
          side.mode === 'abstractive'
            ? side.abstractiveModelId
            : side.mode === 'hybrid'
              ? undefined
              : side.extractiveModelId
        return summarizeViaApi({
          type: side.mode,
          text: t,
          length,
          language: lang,
          model: modelId,
          hybridExtractiveModel:
            side.mode === 'hybrid' ? side.extractiveModelId : undefined,
          hybridAbstractiveModel:
            side.mode === 'hybrid' ? side.abstractiveModelId : undefined,
          includeSentiment: includeSentiment ? true : undefined,
        })
      }

      try {
        const [ra, rb] = await Promise.allSettled([
          runSide(compareA),
          runSide(compareB),
        ])

        let textA = ''
        let textB = ''
        let errA: string | null = null
        let errB: string | null = null

        if (ra.status === 'fulfilled') {
          const out = ra.value.summary.trim()
          if (out) textA = out
          else errA = 'Không tạo được tóm tắt (cột A).'
        } else {
          errA =
            ra.reason instanceof Error
              ? ra.reason.message
              : 'Lỗi không xác định (cột A).'
        }

        if (rb.status === 'fulfilled') {
          const out = rb.value.summary.trim()
          if (out) textB = out
          else errB = 'Không tạo được tóm tắt (cột B).'
        } else {
          errB =
            rb.reason instanceof Error
              ? rb.reason.message
              : 'Lỗi không xác định (cột B).'
        }

        setSummary(textA)
        setSummaryB(textB)
        setSentiment(ra.status === 'fulfilled' ? ra.value.sentiment : null)
        setSentimentB(rb.status === 'fulfilled' ? rb.value.sentiment : null)
        setCompareErrorA(errA)
        setCompareErrorB(errB)

        const modelIdA =
          compareA.mode === 'abstractive'
            ? compareA.abstractiveModelId
            : compareA.mode === 'hybrid'
              ? undefined
              : compareA.extractiveModelId
        const modelIdB =
          compareB.mode === 'abstractive'
            ? compareB.abstractiveModelId
            : compareB.mode === 'hybrid'
              ? undefined
              : compareB.extractiveModelId

        if (textA.trim()) {
          saveHistoryEntry(
            t,
            textA,
            compareA.mode,
            modelIdA,
            includeSentiment && ra.status === 'fulfilled'
              ? ra.value.sentiment
              : undefined,
          )
        }
        if (textB.trim()) {
          saveHistoryEntry(
            t,
            textB,
            compareB.mode,
            modelIdB,
            includeSentiment && rb.status === 'fulfilled'
              ? rb.value.sentiment
              : undefined,
          )
        }
        if (textA.trim() || textB.trim()) {
          void syncHistoryFromServer()
        }

        return Boolean(textA.trim() || textB.trim())
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.',
        )
        return false
      } finally {
        setLoading(false)
      }
    }

    if ((mode === 'abstractive' || mode === 'hybrid') && !apiConfigured) {
      setError(
        'Chế độ này cần backend. Cấu hình VITE_SUMMARIZE_API_URL trong .env.',
      )
      return false
    }

    setError(null)
    setLoading(true)
    setSummary('')
    setSummaryB('')
    setSentiment(null)
    setSentimentB(null)

    const modelId =
      mode === 'abstractive'
        ? abstractiveModelId
        : mode === 'hybrid'
          ? undefined
          : extractiveModelId

    try {
      let out: string
      let usedMode: SummarizeMode
      let sentimentOut: SummarizeSentiment | null = null

      if (apiConfigured) {
        const res = await summarizeViaApi({
          type: mode,
          text: t,
          length,
          language: lang,
          model: modelId,
          hybridExtractiveModel: mode === 'hybrid' ? extractiveModelId : undefined,
          hybridAbstractiveModel: mode === 'hybrid' ? abstractiveModelId : undefined,
          includeSentiment: includeSentiment ? true : undefined,
        })
        out = res.summary
        sentimentOut = res.sentiment
        usedMode = mode
      } else {
        out = summarizeExtractive(t, length)
        usedMode = 'extractive'
        sentimentOut = null
      }

      if (!out.trim()) {
        setError(
          'Không tạo được tóm tắt — thử văn bản dài hơn hoặc thêm dấu câu giữa các câu.',
        )
        return false
      }

      setSummary(out)
      setSentiment(sentimentOut)
      saveHistoryEntry(
        t,
        out,
        usedMode,
        apiConfigured ? modelId : undefined,
        sentimentOut ?? undefined,
      )
      void syncHistoryFromServer()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.')
      return false
    } finally {
      setLoading(false)
    }
  }, [
    source,
    compareEnabled,
    compareA,
    compareB,
    mode,
    length,
    lang,
    apiConfigured,
    extractiveModelId,
    abstractiveModelId,
    includeSentiment,
    syncHistoryFromServer,
  ])

  const summarizeFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!apiConfigured) {
        setError(
          'Tóm tắt từ file cần backend. Cấu hình VITE_SUMMARIZE_API_URL trong .env.',
        )
        return false
      }

      setError(null)
      setCompareErrorA(null)
      setCompareErrorB(null)
      setLoading(true)
      setSummary('')
      setSummaryB('')
      setSentiment(null)
      setSentimentB(null)

      const runSide = async (side: CompareSideState) => {
        const modelId =
          side.mode === 'abstractive'
            ? side.abstractiveModelId
            : side.mode === 'hybrid'
              ? undefined
              : side.extractiveModelId

        return summarizeFileViaApi({
          file,
          type: side.mode,
          length,
          language: lang,
          model: modelId,
          hybridExtractiveModel:
            side.mode === 'hybrid' ? side.extractiveModelId : undefined,
          hybridAbstractiveModel:
            side.mode === 'hybrid' ? side.abstractiveModelId : undefined,
          includeSentiment: includeSentiment ? true : undefined,
        })
      }

      try {
        if (compareEnabled) {
          const [ra, rb] = await Promise.allSettled([
            runSide(compareA),
            runSide(compareB),
          ])

          let textA = ''
          let textB = ''
          let errA: string | null = null
          let errB: string | null = null

          if (ra.status === 'fulfilled') textA = ra.value.summary.trim()
          else {
            errA =
              ra.reason instanceof Error
                ? ra.reason.message
                : 'Lỗi không xác định (cột A).'
          }
          if (rb.status === 'fulfilled') textB = rb.value.summary.trim()
          else {
            errB =
              rb.reason instanceof Error
                ? rb.reason.message
                : 'Lỗi không xác định (cột B).'
          }

          if (!textA && !errA) errA = 'Không tạo được tóm tắt (cột A).'
          if (!textB && !errB) errB = 'Không tạo được tóm tắt (cột B).'

          setSummary(textA)
          setSummaryB(textB)
          setSentiment(ra.status === 'fulfilled' ? ra.value.sentiment : null)
          setSentimentB(rb.status === 'fulfilled' ? rb.value.sentiment : null)
          setCompareErrorA(errA)
          setCompareErrorB(errB)

          const sourceLabel = `[FILE] ${file.name}`
          const modelIdA =
            compareA.mode === 'abstractive'
              ? compareA.abstractiveModelId
              : compareA.mode === 'hybrid'
                ? undefined
                : compareA.extractiveModelId
          const modelIdB =
            compareB.mode === 'abstractive'
              ? compareB.abstractiveModelId
              : compareB.mode === 'hybrid'
                ? undefined
                : compareB.extractiveModelId

          if (textA) {
            saveHistoryEntry(
              sourceLabel,
              textA,
              compareA.mode,
              modelIdA,
              includeSentiment && ra.status === 'fulfilled'
                ? ra.value.sentiment
                : undefined,
            )
          }
          if (textB) {
            saveHistoryEntry(
              sourceLabel,
              textB,
              compareB.mode,
              modelIdB,
              includeSentiment && rb.status === 'fulfilled'
                ? rb.value.sentiment
                : undefined,
            )
          }
          if (textA || textB) void syncHistoryFromServer()
          return Boolean(textA || textB)
        }

        const fileRes = await summarizeFileViaApi({
          file,
          type: mode,
          length,
          language: lang,
          model:
            mode === 'abstractive'
              ? abstractiveModelId
              : mode === 'hybrid'
                ? undefined
                : extractiveModelId,
          hybridExtractiveModel: mode === 'hybrid' ? extractiveModelId : undefined,
          hybridAbstractiveModel: mode === 'hybrid' ? abstractiveModelId : undefined,
          includeSentiment: includeSentiment ? true : undefined,
        })

        const out = fileRes.summary
        if (!out.trim()) {
          setError('Không tạo được tóm tắt từ file.')
          return false
        }

        setSummary(out.trim())
        setSentiment(fileRes.sentiment)
        saveHistoryEntry(
          `[FILE] ${file.name}`,
          out.trim(),
          mode,
          mode === 'abstractive'
            ? abstractiveModelId
            : mode === 'hybrid'
              ? undefined
              : extractiveModelId,
          fileRes.sentiment ?? undefined,
        )
        void syncHistoryFromServer()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [
      apiConfigured,
      compareEnabled,
      compareA,
      compareB,
      length,
      lang,
      mode,
      extractiveModelId,
      abstractiveModelId,
      includeSentiment,
      syncHistoryFromServer,
    ],
  )

  const clearAll = useCallback(() => {
    setSource('')
    setSummary('')
    setSummaryB('')
    setSentiment(null)
    setSentimentB(null)
    setError(null)
    setCompareErrorA(null)
    setCompareErrorB(null)
  }, [])

  const downloadSummary = useCallback(() => {
    if (!summary.trim()) return
    downloadText(`tom-tat-${Date.now()}.txt`, summary)
  }, [summary])

  const downloadSummaryB = useCallback(() => {
    if (!summaryB.trim()) return
    downloadText(`tom-tat-b-${Date.now()}.txt`, summaryB)
  }, [summaryB])

  const restoreHistory = useCallback((e: HistoryEntry) => {
    setSource(e.source)
    setSummary(e.summary)
    setSummaryB('')
    setSentiment(e.sentiment ?? null)
    setSentimentB(null)
    setCompareEnabled(false)
    setCompareErrorA(null)
    setCompareErrorB(null)
    setMode(e.mode)
    setError(null)
    if (e.model) {
      if (e.mode === 'extractive' && EXTRACTIVE_MODELS.some((m) => m.id === e.model)) {
        setExtractiveModelId(e.model)
      }
      if (
        e.mode === 'abstractive' &&
        ABSTRACTIVE_MODELS.some((m) => m.id === e.model)
      ) {
        setAbstractiveModelId(e.model)
      }
    }
  }, [])

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearHistoryAll = useCallback(() => {
    setHistory([])
  }, [])

  const ragSummarizeModelId = compareEnabled
    ? compareA.mode === 'abstractive'
      ? compareA.abstractiveModelId
      : compareA.mode === 'hybrid'
        ? compareA.abstractiveModelId
        : compareA.extractiveModelId
    : mode === 'abstractive'
      ? abstractiveModelId
      : mode === 'hybrid'
        ? abstractiveModelId
        : extractiveModelId

  return {
    source,
    setSource,
    summary,
    summaryB,
    mode,
    setMode,
    length,
    setLength,
    lang,
    setLang,
    extractiveModelId,
    setExtractiveModelId,
    abstractiveModelId,
    setAbstractiveModelId,
    compareEnabled,
    setCompareEnabled: setCompareEnabledWithInit,
    compareA,
    setCompareA,
    compareB,
    setCompareB,
    compareErrorA,
    compareErrorB,
    loading,
    error,
    includeSentiment,
    setIncludeSentiment,
    sentiment,
    sentimentB,
    copyFlash,
    history,
    stats,
    apiConfigured,
    summaryWordCount: countWords(summary),
    summaryBWordCount: countWords(summaryB),
    ragSummarizeModelId,
    copySource,
    copySummary,
    copySummaryB,
    summarize,
    summarizeFile,
    clearAll,
    downloadSummary,
    downloadSummaryB,
    restoreHistory,
    removeHistory,
    clearHistoryAll,
    syncHistoryFromServer,
  }
}
