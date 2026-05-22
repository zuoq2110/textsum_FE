/**
 * Dịch error code + message từ backend sang tiếng Việt.
 *
 * Format lỗi backend:
 * { "error": { "code": "INVALID_BODY", "message": "body.password: String should have at least 8 characters" } }
 */

const FIELD_LABEL: Record<string, string> = {
  'body.email': 'Email',
  'body.password': 'Mật khẩu',
  'body.fullName': 'Họ và tên',
  'body.refreshToken': 'Token làm mới',
  'body.text': 'Văn bản',
  'body.url': 'Đường dẫn URL',
  'body.question': 'Câu hỏi',
  'body.docId': 'ID tài liệu',
  'body.source': 'Văn bản gốc',
  'body.candidateSummary': 'Bản tóm tắt cần đánh giá',
  'body.language': 'Ngôn ngữ',
  'body.targetLength': 'Độ dài mục tiêu',
  'body.metrics': 'Danh sách độ đo',
  'body.generateReference': 'Cờ sinh tham chiếu',
  'body.includeCritique': 'Cờ nhận xét',
  'body.urls': 'Danh sách URL',
  'body.similarityThreshold': 'Ngưỡng tương đồng',
  'body.mode': 'Chế độ tóm tắt theo cụm',
  'body.targetClusterIds': 'Danh sách cụm mục tiêu',
  'body.type': 'Kiểu tóm tắt',
  'body.length': 'Độ dài tóm tắt',
  'body.includeSentiment': 'Phân tích cảm xúc',
}

function translateValidationDetail(raw: string): string {
  const s = raw.trim()
  const lower = s.toLowerCase()

  const minMatch = s.match(/at least (\d+) character/i)
  if (minMatch) return `Phải có ít nhất ${minMatch[1]} ký tự`

  const maxMatch = s.match(/at most (\d+) character/i)
  if (maxMatch) return `Không được vượt quá ${maxMatch[1]} ký tự`

  if (lower.includes('valid email') || lower.includes('email address'))
    return 'Địa chỉ email không hợp lệ'
  if (lower.includes('required') || lower.includes('field required'))
    return 'Trường này là bắt buộc'
  if (lower.includes('missing')) return 'Thiếu thông tin bắt buộc'
  if (lower.includes('too short')) return 'Quá ngắn'
  if (lower.includes('too long')) return 'Quá dài'
  if (lower.includes('not a valid') || lower.includes('invalid'))
    return 'Giá trị không hợp lệ'
  if (lower.includes('already exist')) return 'Đã tồn tại'

  return s
}

function translateBodyMessage(message: string): string {
  // "body.password: String should have at least 8 characters"
  const colonIdx = message.indexOf(':')
  if (colonIdx === -1) return message

  const fieldKey = message.slice(0, colonIdx).trim()
  const detail = message.slice(colonIdx + 1).trim()
  const fieldLabel = FIELD_LABEL[fieldKey]

  if (fieldLabel) {
    return `${fieldLabel}: ${translateValidationDetail(detail)}`
  }

  return translateValidationDetail(detail) || message
}

const CODE_MESSAGE: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
  EMAIL_EXISTS: 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.',
  USER_DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  TEXT_TOO_SHORT: 'Văn bản quá ngắn để thực hiện tóm tắt.',
  TEXT_TOO_LONG: 'Văn bản quá dài — vui lòng chia nhỏ và thử lại.',
  PAYLOAD_TOO_LARGE: 'Dữ liệu gửi lên quá lớn.',
  FETCH_FAILED: 'Không thể crawl toàn bộ URL đã gửi. Vui lòng kiểm tra lại link.',
  MODEL_UNAVAILABLE: 'Mô hình AI hiện không khả dụng. Vui lòng thử lại sau.',
  INFERENCE_TIMEOUT: 'Quá thời gian chờ phản hồi từ mô hình AI. Vui lòng thử lại.',
  METRIC_UNSUPPORTED: 'Độ đo được yêu cầu hiện không được hỗ trợ.',
  NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu.',
  INTERNAL_ERROR: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
}

export type TranslatedError = {
  /** Thông báo tiếng Việt hiển thị cho người dùng */
  message: string
  /** Error code gốc từ backend (để debug) */
  code?: string
}

export function translateApiError(
  code: string | undefined,
  rawMessage: string | undefined,
): TranslatedError {
  // 1. Code đã có bản dịch sẵn
  if (code && code !== 'INVALID_BODY' && CODE_MESSAGE[code]) {
    return { message: CODE_MESSAGE[code], code }
  }

  // 2. INVALID_BODY — parse field + detail từ message
  if (code === 'INVALID_BODY' && rawMessage) {
    return { message: translateBodyMessage(rawMessage), code }
  }

  // 3. Không có code — thử dịch raw message nếu dạng "body.field: ..."
  if (rawMessage) {
    const viMsg = translateBodyMessage(rawMessage)
    if (viMsg !== rawMessage) return { message: viMsg, code }
    // Nếu không dịch được, trả nguyên message gốc
    return { message: rawMessage, code }
  }

  return { message: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.', code }
}
