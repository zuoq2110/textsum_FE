import type { RagChunkRef } from './ragApi'

export type RagChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  /** Chỉ assistant: chunk RAG của lượt này */
  chunks?: RagChunkRef[]
  /** Assistant lỗi — hiển thị thay vì content */
  error?: string
}
