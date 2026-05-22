const MAX_BYTES = 5 * 1024 * 1024

const ALLOWED_EXT = /\.(txt|md|markdown|csv|json|log|tsv)$/i

function looksLikeTextFile(file: File): boolean {
  if (ALLOWED_EXT.test(file.name)) return true
  if (file.type.startsWith('text/')) return true
  if (file.type === 'application/json') return true
  if (!file.type) return true
  return false
}

/** Đọc tệp văn bản cục bộ (UTF-8). */
export async function readLocalTextFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('Tệp quá lớn (tối đa 5 MB).')
  }
  if (!looksLikeTextFile(file)) {
    throw new Error(
      'Chỉ hỗ trợ tệp văn bản (.txt, .md, .csv, .json, …). File Word/PDF cần xử lý phía server.',
    )
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const t = typeof reader.result === 'string' ? reader.result : ''
      if (!t.trim()) {
        reject(new Error('Tệp trống hoặc không đọc được dưới dạng văn bản.'))
        return
      }
      resolve(t)
    }
    reader.onerror = () => reject(new Error('Không đọc được tệp.'))
    reader.readAsText(file, 'UTF-8')
  })
}
