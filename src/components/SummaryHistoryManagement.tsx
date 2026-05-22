import { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  Search,
  Trash2,
  Eye,
  Filter,
  Calendar,
  User,
  Clock,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { type AuthSession } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import { getAdminSummaries, deleteSummary, type AdminSummary } from '../lib/adminApi'

type SummaryHistoryManagementProps = {
  session: AuthSession | null
}

const PAGE_SIZE = 10

const MODE_LABEL: Record<string, string> = {
  extractive: 'Trích chọn',
  abstractive: 'Trừu tượng',
  hybrid: 'Lai ghép',
}

const MODE_COLOR: Record<string, string> = {
  extractive: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  abstractive: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  hybrid: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Không rõ'
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return 'Không hợp lệ'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return 'Không hợp lệ'
  }
}

type PaginationProps = {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPage: (page: number) => void
}

function Pagination({ currentPage, totalPages, totalItems, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  // Tạo danh sách trang hiển thị: luôn hiện trang đầu, cuối, và ±1 quanh trang hiện tại
  const pages: (number | 'ellipsis')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis')
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-(--color-border) pt-4">
      <p className="text-xs text-(--color-ink-muted)">
        Hiển thị <span className="font-medium text-(--color-ink)">{from}–{to}</span> trong{' '}
        <span className="font-medium text-(--color-ink)">{totalItems}</span> kết quả
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex size-8 items-center justify-center rounded-lg border border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink-muted) transition hover:border-(--color-accent)/50 hover:text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="flex size-8 items-center justify-center text-xs text-(--color-ink-muted)">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg border text-xs font-medium transition',
                p === currentPage
                  ? 'border-(--color-accent) bg-(--color-accent) text-white'
                  : 'border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink) hover:border-(--color-accent)/50 hover:text-(--color-accent)',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex size-8 items-center justify-center rounded-lg border border-(--color-border) bg-(--color-surface-elevated) text-(--color-ink-muted) transition hover:border-(--color-accent)/50 hover:text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang sau"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

type SummaryCardProps = {
  summary: AdminSummary
  onView: (summary: AdminSummary) => void
  onDelete: (summaryId: string) => void
  isProcessing: boolean
}

function SummaryCard({ summary, onView, onDelete, isProcessing }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-5 shadow-[var(--shadow-card)] transition hover:border-(--color-accent)/30">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', MODE_COLOR[summary.mode])}>
            {MODE_LABEL[summary.mode]}
          </span>
          <span className="flex items-center gap-1 text-xs text-(--color-ink-muted)">
            <Clock className="size-3.5" />
            {formatDate(summary.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView(summary)}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-(--color-ink-muted) transition hover:bg-(--color-surface) hover:text-(--color-accent) disabled:opacity-50"
            title="Xem chi tiết"
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(summary.id)}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-(--color-ink-muted) transition hover:bg-(--color-surface) hover:text-rose-500 disabled:opacity-50"
            title="Xóa"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-(--color-ink-muted)">
        <User className="size-4" />
        <span className="font-medium text-(--color-ink)">{summary.userName}</span>
        <span>•</span>
        <span>{summary.userEmail}</span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
            Văn bản gốc
          </p>
          <p className="line-clamp-2 text-sm leading-relaxed text-(--color-ink)">
            {summary.source}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
            Tóm tắt ({summary.wordCount} từ)
          </p>
          <p className="line-clamp-2 text-sm leading-relaxed text-(--color-ink-muted)">
            {summary.summary}
          </p>
        </div>
      </div>
    </div>
  )
}

type SummaryDetailModalProps = {
  summary: AdminSummary | null
  onClose: () => void
}

function SummaryDetailModal({ summary, onClose }: SummaryDetailModalProps) {
  if (!summary) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-(--color-border) bg-(--color-surface-elevated) shadow-[var(--shadow-card)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-elevated) px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-(--color-ink)">Chi tiết tóm tắt</h3>
            <p className="text-sm text-(--color-ink-muted)">ID: {summary.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-(--color-ink-muted) transition hover:bg-(--color-surface) hover:text-(--color-ink)"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Meta info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
                Người dùng
              </p>
              <p className="font-medium text-(--color-ink)">{summary.userName}</p>
              <p className="text-sm text-(--color-ink-muted)">{summary.userEmail}</p>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-(--color-ink-muted)/60">
                Thông tin
              </p>
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', MODE_COLOR[summary.mode])}>
                  {MODE_LABEL[summary.mode]}
                </span>
                <span className="text-sm text-(--color-ink-muted)">
                  {summary.wordCount} từ
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-(--color-ink-muted)">
                <Calendar className="size-3.5" />
                {formatDate(summary.createdAt)}
              </p>
            </div>
          </div>

          {/* Source and summary */}
          <div>
            <p className="mb-2 text-sm font-semibold text-(--color-ink)">Văn bản gốc</p>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-(--color-border) bg-(--color-surface) p-4 text-sm leading-relaxed text-(--color-ink)">
              {summary.source}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-(--color-ink)">Kết quả tóm tắt</p>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-(--color-border) bg-(--color-surface) p-4 text-sm leading-relaxed text-(--color-ink)">
              {summary.summary}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SummaryHistoryManagement({ session }: SummaryHistoryManagementProps) {
  const [summaries, setSummaries] = useState<AdminSummary[]>([])
  const [stats, setStats] = useState({ total: 0, extractive: 0, abstractive: 0, hybrid: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'extractive' | 'abstractive' | 'hybrid'>('all')
  const [selectedSummary, setSelectedSummary] = useState<AdminSummary | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function fetchSummaries() {
      if (!session?.tokens?.accessToken) return

      setLoading(true)
      setError(null)

      try {
        const data = await getAdminSummaries(session.tokens.accessToken, {
          search: searchQuery || undefined,
          mode: filterMode,
        })
        setSummaries(data.summaries)
        setStats({
          total: data.total,
          extractive: data.stats.extractive,
          abstractive: data.stats.abstractive,
          hybrid: data.stats.hybrid,
        })
      } catch (err) {
        console.error('Failed to fetch summaries:', err)
        setError(err instanceof Error ? err.message : 'Không thể tải lịch sử tóm tắt')
      } finally {
        setLoading(false)
      }
    }

    void fetchSummaries()
  }, [session?.tokens?.accessToken, searchQuery, filterMode])

  const filteredSummaries = useMemo(() => {
    setCurrentPage(1)
    return summaries.filter((summary) => {
      const matchesSearch =
        summary.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesMode = filterMode === 'all' || summary.mode === filterMode
      return matchesSearch && matchesMode
    })
  }, [summaries, searchQuery, filterMode])

  const totalPages = Math.ceil(filteredSummaries.length / PAGE_SIZE)
  const paginatedSummaries = filteredSummaries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const refetchSummaries = async () => {
    if (!session?.tokens?.accessToken) return

    try {
      const data = await getAdminSummaries(session.tokens.accessToken, {
        search: searchQuery || undefined,
        mode: filterMode,
      })
      setSummaries(data.summaries)
      setStats({
        total: data.total,
        extractive: data.stats.extractive,
        abstractive: data.stats.abstractive,
        hybrid: data.stats.hybrid,
      })
    } catch (err) {
      console.error('Failed to fetch summaries:', err)
    }
  }

  const handleDelete = async (summaryId: string) => {
    if (!session?.tokens?.accessToken || processing) return

    if (!window.confirm('Bạn có chắc chắn muốn xóa tóm tắt này?')) return

    setProcessing(true)
    try {
      await deleteSummary(session.tokens.accessToken, summaryId)
      await refetchSummaries()
    } catch (err) {
      console.error('Failed to delete summary:', err)
      alert(err instanceof Error ? err.message : 'Không thể xóa tóm tắt')
    } finally {
      setProcessing(false)
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-(--color-border) bg-(--color-surface-elevated) p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm text-(--color-ink-muted)">Bạn cần đăng nhập với quyền admin</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-(--color-ink-muted)">
          <Loader2 className="size-6 animate-spin" />
          <span>Đang tải lịch sử tóm tắt...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-(--color-border) bg-(--color-surface-elevated) p-8 text-center shadow-[var(--shadow-card)]">
          <p className="mb-2 text-lg font-semibold text-(--color-ink)">Lỗi tải dữ liệu</p>
          <p className="text-sm text-rose-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <FileText className="size-6 text-(--color-accent)" aria-hidden />
            <h2 className="text-2xl font-bold text-(--color-ink)">Quản lý lịch sử tóm tắt</h2>
          </div>
          <p className="text-sm text-(--color-ink-muted)">
            Xem và quản lý tất cả các bản tóm tắt của người dùng
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
            <p className="mb-1 text-sm text-(--color-ink-muted)">Tổng tóm tắt</p>
            <p className="text-2xl font-bold text-(--color-ink)">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
            <p className="mb-1 text-sm text-(--color-ink-muted)">Trích chọn</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.extractive}
            </p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
            <p className="mb-1 text-sm text-(--color-ink-muted)">Trừu tượng</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.abstractive}
            </p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
            <p className="mb-1 text-sm text-(--color-ink-muted)">Lai ghép</p>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {stats.hybrid}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--color-ink-muted)" />
            <input
              type="text"
              placeholder="Tìm kiếm theo nội dung hoặc người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) py-2 pl-10 pr-4 text-sm text-(--color-ink) placeholder:text-(--color-ink-muted)/60 focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
            />
          </div>

          {/* Filter by mode */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-(--color-ink-muted)" />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
            >
              <option value="all">Tất cả chế độ</option>
              <option value="extractive">Trích chọn</option>
              <option value="abstractive">Trừu tượng</option>
              <option value="hybrid">Lai ghép</option>
            </select>
          </div>
        </div>

        {/* Summaries list */}
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSummaries.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-elevated)/50 py-16">
                <FileText className="mb-3 size-10 text-(--color-ink-muted)/40" />
                <p className="font-medium text-(--color-ink)">Không tìm thấy tóm tắt</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            ) : (
              paginatedSummaries.map((summary) => (
                <SummaryCard
                  key={summary.id}
                  summary={summary}
                  onView={setSelectedSummary}
                  onDelete={handleDelete}
                  isProcessing={processing}
                />
              ))
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSummaries.length}
            pageSize={PAGE_SIZE}
            onPage={setCurrentPage}
          />
        </div>
      </div>

      {/* Detail modal */}
      <SummaryDetailModal
        summary={selectedSummary}
        onClose={() => setSelectedSummary(null)}
      />
    </>
  )
}
