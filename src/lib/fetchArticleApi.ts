import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'

type FetchTextResponse = { text?: string; error?: { message?: string } }

/**
 * Lấy văn bản thuần từ URL bài viết — cần backend (proxy + trích HTML).
 * POST /api/v1/fetch-text { "url": "https://..." } → { "text": "..." }
 */
export async function fetchTextFromUrl(url: string): Promise<string> {
  const base = resolveApiBaseUrl()
  if (!base) {
    throw new Error(
      'Cần cấu hình VITE_SUMMARIZE_API_URL để lấy nội dung từ link (trình duyệt không gọi trực tiếp trang khác do CORS).',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    throw new Error('URL không hợp lệ.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Chỉ hỗ trợ liên kết http hoặc https.')
  }

  const endpoint = `${base}/api/v1/fetch-text`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({ url: url.trim() }),
  })

  let data: FetchTextResponse = {}
  try {
    data = (await res.json()) as FetchTextResponse
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      data.error?.message?.trim() ||
      res.statusText ||
      `HTTP ${res.status}`
    throw new Error(msg)
  }

  const text = data.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Phản hồi không có văn bản trích được.')
  }
  return text.trim()
}
