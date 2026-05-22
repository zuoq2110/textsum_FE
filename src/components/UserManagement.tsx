import { useState, useMemo, useEffect } from 'react'
import {
  Users,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  Shield,
  Mail,
  Calendar,
  Filter,
  Loader2,
} from 'lucide-react'
import { type AuthSession } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import {
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
  type AdminUser,
} from '../lib/adminApi'

type UserManagementProps = {
  session: AuthSession | null
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

function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Không rõ'
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return 'Không rõ'
    
    const now = Date.now()
    const diff = now - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Vừa xong'
    if (minutes < 60) return `${minutes} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    if (days < 7) return `${days} ngày trước`
    return formatDate(isoDate)
  } catch {
    return 'Không rõ'
  }
}

type UserCardProps = {
  user: AdminUser
  onToggleStatus: (userId: string) => void
  onToggleRole: (userId: string) => void
  isProcessing: boolean
}

function UserCard({ user, onToggleStatus, onToggleRole, isProcessing }: UserCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-5 shadow-[var(--shadow-card)] transition hover:border-(--color-accent)/30">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-(--color-accent-soft) text-lg font-bold text-(--color-accent)">
            {user.fullName.charAt(0).toUpperCase()}
          </div>

          {/* User info */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-(--color-ink)">{user.fullName}</h3>
              {user.role === 'admin' ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                  <Shield className="size-3" />
                  Admin
                </span>
              ) : null}
              <span
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                  user.isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
                )}
              >
                {user.isActive ? (
                  <>
                    <CheckCircle className="size-3" />
                    Hoạt động
                  </>
                ) : (
                  <>
                    <Ban className="size-3" />
                    Bị khóa
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1 text-sm text-(--color-ink-muted)">
              <Mail className="size-3.5" />
              {user.email}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-(--color-ink-muted)">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Tham gia: {formatDate(user.createdAt)}
              </span>
              <span>•</span>
              <span>Đăng nhập: {formatRelativeTime(user.lastLogin)}</span>
              <span>•</span>
              <span>{user.summaryCount} tóm tắt</span>
            </div>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-(--color-ink-muted) transition hover:bg-(--color-surface) hover:text-(--color-ink)"
          >
            <MoreVertical className="size-4" />
          </button>

          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-(--color-border) bg-(--color-surface-elevated) py-1 shadow-[var(--shadow-card)]">
                <button
                  type="button"
                  onClick={() => {
                    onToggleRole(user.id)
                    setMenuOpen(false)
                  }}
                  disabled={isProcessing}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-(--color-ink) transition hover:bg-(--color-surface) disabled:opacity-50"
                >
                  <Shield className="size-4" />
                  {user.role === 'admin' ? 'Gỡ quyền Admin' : 'Cấp quyền Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleStatus(user.id)
                    setMenuOpen(false)
                  }}
                  disabled={isProcessing}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-(--color-ink) transition hover:bg-(--color-surface) disabled:opacity-50"
                >
                  {user.isActive ? (
                    <>
                      <Ban className="size-4" />
                      Khóa tài khoản
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4" />
                      Mở khóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function UserManagement({ session }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all')

  useEffect(() => {
    async function fetchUsers() {
      if (!session?.tokens?.accessToken) return

      setLoading(true)
      setError(null)

      try {
        const data = await getAdminUsers(session.tokens.accessToken, {
          search: searchQuery || undefined,
          role: filterRole,
          status: filterStatus,
        })
        setUsers(data.users)
      } catch (err) {
        console.error('Failed to fetch users:', err)
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng')
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [session?.tokens?.accessToken, searchQuery, filterRole, filterStatus])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'banned' && !user.isActive)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, filterRole, filterStatus])

  const refetchUsers = async () => {
    if (!session?.tokens?.accessToken) return

    try {
      const data = await getAdminUsers(session.tokens.accessToken, {
        search: searchQuery || undefined,
        role: filterRole,
        status: filterStatus,
      })
      setUsers(data.users)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleToggleStatus = async (userId: string) => {
    if (!session?.tokens?.accessToken || processing) return

    const user = users.find((u) => u.id === userId)
    if (!user) return

    setProcessing(true)
    try {
      await updateUserStatus(session.tokens.accessToken, userId, !user.isActive)
      await refetchUsers()
    } catch (err) {
      console.error('Failed to update user status:', err)
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái')
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleRole = async (userId: string) => {
    if (!session?.tokens?.accessToken || processing) return

    const user = users.find((u) => u.id === userId)
    if (!user) return

    setProcessing(true)
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin'
      await updateUserRole(session.tokens.accessToken, userId, newRole)
      await refetchUsers()
    } catch (err) {
      console.error('Failed to update user role:', err)
      alert(err instanceof Error ? err.message : 'Không thể cập nhật quyền')
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
          <span>Đang tải danh sách người dùng...</span>
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
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Users className="size-6 text-(--color-accent)" aria-hidden />
          <h2 className="text-2xl font-bold text-(--color-ink)">Quản lý người dùng</h2>
        </div>
        <p className="text-sm text-(--color-ink-muted)">
          Quản lý tài khoản, phân quyền và trạng thái người dùng
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
          <p className="mb-1 text-sm text-(--color-ink-muted)">Tổng người dùng</p>
          <p className="text-2xl font-bold text-(--color-ink)">{users.length}</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
          <p className="mb-1 text-sm text-(--color-ink-muted)">Đang hoạt động</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4">
          <p className="mb-1 text-sm text-(--color-ink-muted)">Bị khóa</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {users.filter((u) => !u.isActive).length}
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
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) py-2 pl-10 pr-4 text-sm text-(--color-ink) placeholder:text-(--color-ink-muted)/60 focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-(--color-ink-muted)" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'banned')}
            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-elevated)/50 py-16">
            <Users className="mb-3 size-10 text-(--color-ink-muted)/40" />
            <p className="font-medium text-(--color-ink)">Không tìm thấy người dùng</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onToggleStatus={handleToggleStatus}
              onToggleRole={handleToggleRole}
              isProcessing={processing}
            />
          ))
        )}
      </div>
    </div>
  )
}
