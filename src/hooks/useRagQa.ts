import { useCallback, useMemo, useRef, useState } from 'react'
import { ragAsk, ragIngest } from '../lib/ragApi'
import type { RagChatMessage } from '../lib/ragChatTypes'
import { hasSummarizeApi } from '../lib/summarizeApi'

function defaultDocId(): string {
  return `doc-${new Date().toISOString().slice(0, 10)}`
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useRagQa(sourceText: string, summarizeModelId: string) {
  const [docId, setDocId] = useState(defaultDocId)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<RagChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [asking, setAsking] = useState(false)
  const [indexedChars, setIndexedChars] = useState(0)
  const askLock = useRef(false)

  const apiConfigured = hasSummarizeApi()
  const indexed = indexedChars > 0

  const canIngest = useMemo(() => sourceText.trim().length > 80 && apiConfigured, [sourceText, apiConfigured])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const ingest = useCallback(async (explicitSource?: string) => {
    const textToIngest = explicitSource !== undefined ? explicitSource : sourceText
    if (textToIngest.trim().length <= 80 || !apiConfigured) {
      setError('Cần có văn bản đủ dài và cấu hình API.')
      return
    }
    setError(null)
    setIngesting(true)
    try {
      await ragIngest({
        docId: docId.trim() || defaultDocId(),
        text: textToIngest,
        chunkSize: 800,
        chunkOverlap: 120,
      })
      setIndexedChars(textToIngest.length)
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể ingest tài liệu.')
    } finally {
      setIngesting(false)
    }
  }, [apiConfigured, docId, sourceText])

  const ask = useCallback(async () => {
    if (askLock.current) return
    if (!apiConfigured) {
      setError('Cần cấu hình API để dùng RAG.')
      return
    }
    const q = question.trim()
    if (!q) {
      setError('Nhập câu hỏi trước.')
      return
    }
    if (!indexed) {
      setError('Bạn cần lập chỉ mục tài liệu trước khi hỏi.')
      return
    }
    setError(null)
    setQuestion('')
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'user', content: q, createdAt: Date.now() },
    ])
    askLock.current = true
    setAsking(true)
    try {
      const out = await ragAsk({
        question: q,
        docId: docId.trim() || undefined,
        topK: 4,
        ...(summarizeModelId.trim()
          ? { model: summarizeModelId.trim() }
          : {}),
      })
      const text = out.answer?.trim() ?? ''
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: text,
          createdAt: Date.now(),
          chunks: out.chunks?.length ? out.chunks : undefined,
        },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể truy vấn RAG.'
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
          error: msg,
        },
      ])
    } finally {
      askLock.current = false
      setAsking(false)
    }
  }, [apiConfigured, question, indexed, docId, summarizeModelId])

  return {
    docId,
    setDocId,
    question,
    setQuestion,
    messages,
    error,
    ingesting,
    asking,
    indexedChars,
    apiConfigured,
    canIngest,
    ingest,
    ask,
    clearChat,
  }
}
