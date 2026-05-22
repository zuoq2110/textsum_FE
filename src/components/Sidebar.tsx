import { BarChart3, FileText, Link2, X, LayoutDashboard, Users, History, Moon, Sun, Monitor, LogOut, Zap, ChevronDown, MessageCircle } from 'lucide-react'
import { cn } from '../lib/cn'
import { type AuthSession, type AuthStatus } from '../hooks/useAuth'
import { type Theme } from '../hooks/useTheme'
import { useState } from 'react'

export type AppRoute = '/' | '/auth' | '/evaluate' | '/links-grouping' | '/qa' | '/admin' | '/admin/users' | '/admin/history'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Sáng', icon: <Sun className="size-4" /> },
  { value: 'dark', label: 'Tối', icon: <Moon className="size-4" /> },
  { value: 'system', label: 'Hệ thống', icon: <Monitor className="size-4" /> },
]

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('')
}

type NavItem = {
  path: AppRoute
  label: string
  icon: React.ReactNode
  description: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Tóm tắt',
    icon: <FileText className="size-4" />,
    description: 'Tóm tắt văn bản bằng AI',
  },
  {
    path: '/evaluate',
    label: 'Đánh giá',
    icon: <BarChart3 className="size-4" />,
    description: 'ROUGE · BLEU · BERTScore',
  },
  {
    path: '/links-grouping',
    label: 'Tóm tắt nhóm',
    icon: <Link2 className="size-4" />,
    description: 'Phân cụm & tóm tắt nhiều URL',
  },
  {
    path: '/qa',
    label: 'Hỏi đáp AI',
    icon: <MessageCircle className="size-4" />,
    description: 'Hỏi đáp với AI theo văn bản',
  },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    path: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard className="size-4" />,
    description: 'Tổng quan hệ thống',
    adminOnly: true,
  },
  {
    path: '/admin/users',
    label: 'Người dùng',
    icon: <Users className="size-4" />,
    description: 'Quản lý tài khoản',
    adminOnly: true,
  },
  {
    path: '/admin/history',
    label: 'Lịch sử',
    icon: <History className="size-4" />,
    description: 'Lịch sử tóm tắt',
    adminOnly: true,
  },
]

type SidebarProps = {
  pathname: string
  navigateTo: (path: AppRoute) => void
  mobileOpen: boolean
  desktopOpen?: boolean
  onClose: () => void
  isAdmin?: boolean
  session: AuthSession | null
  theme: Theme
  onSetTheme: (t: Theme) => void
  onLogout: () => void
}

export function Sidebar({ pathname, navigateTo, mobileOpen, desktopOpen = true, onClose, isAdmin = false, session, theme, onSetTheme, onLogout }: SidebarProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleNav = (path: AppRoute) => {
    navigateTo(path)
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed bottom-0 top-0 z-40 flex w-56 flex-col justify-between border-r border-(--color-border) bg-(--color-surface) transition-transform duration-300',
          desktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
          {/* Logo / Header */}
          <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-[14px]">
            <button
              type="button"
              onClick={() => handleNav('/')}
              className="flex items-center gap-2 rounded-lg py-0.5 transition hover:opacity-80"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) shadow-sm">
                <Zap className="size-4 text-white" aria-hidden />
              </span>
              <span className="text-base font-bold tracking-tight text-(--color-ink)">TextSum</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-(--color-ink-muted) hover:text-(--color-ink)"
              title="Đóng / Thu gọn"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Nav section */}
          <nav className="flex flex-col gap-1 p-3">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-(--color-ink-muted)/60">
              Chức năng
            </p>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    isActive
                      ? 'bg-(--color-accent-soft) text-(--color-ink)'
                      : 'text-(--color-ink-muted) hover:bg-(--color-surface-elevated) hover:text-(--color-ink)',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 transition',
                      isActive ? 'text-(--color-accent)' : 'group-hover:text-(--color-accent)',
                    )}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', isActive && 'font-semibold')}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-(--color-ink-muted)/70">{item.description}</p>
                  </div>
                  {isActive ? (
                    <span className="ml-auto mt-1.5 size-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                  ) : null}
                </button>
              )
            })}
          </nav>

          {/* Admin section */}
          {isAdmin ? (
            <nav className="flex flex-col gap-1 border-t border-(--color-border) p-3">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-(--color-ink-muted)/60">
                Quản trị
              </p>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className={cn(
                      'group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      isActive
                        ? 'bg-(--color-accent-soft) text-(--color-ink)'
                        : 'text-(--color-ink-muted) hover:bg-(--color-surface-elevated) hover:text-(--color-ink)',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 transition',
                        isActive ? 'text-(--color-accent)' : 'group-hover:text-(--color-accent)',
                      )}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', isActive && 'font-semibold')}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-(--color-ink-muted)/70">{item.description}</p>
                    </div>
                    {isActive ? (
                      <span className="ml-auto mt-1.5 size-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                    ) : null}
                  </button>
                )
              })}
            </nav>
          ) : null}
        </div>
        
        {/* Footer (Theme & User) */}
        <div className="border-t border-(--color-border) p-3 flex flex-col gap-2 bg-(--color-surface)">
          <button
            type="button"
            title="Đổi giao diện"
            onClick={() => {
              const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.value === theme)
              const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length
              onSetTheme(THEME_OPTIONS[nextIndex].value)
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition text-(--color-ink-muted) hover:bg-(--color-surface-elevated) hover:text-(--color-ink) w-full"
          >
            <span className="shrink-0 text-(--color-ink)">
              {theme === 'dark' ? <Moon className="size-4" /> : theme === 'light' ? <Sun className="size-4" /> : <Monitor className="size-4" />}
            </span>
            <span className="text-sm font-medium text-(--color-ink)">
              Giao diện: {theme === 'dark' ? 'Tối' : theme === 'light' ? 'Sáng' : 'Hệ thống'}
            </span>
          </button>

          {session ? (
            <div className="relative">
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 mb-1 flex w-full flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) p-1 shadow-lg animate-in slide-in-from-bottom-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      onLogout()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-red-500 hover:bg-red-500/10 transition font-medium"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-2 transition hover:border-(--color-accent)/40"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) text-xs font-bold text-white">
                    {getInitials(session.user.fullName)}
                  </span>
                  <div className="min-w-0 pr-2 text-left">
                    <p className="truncate text-xs font-semibold text-(--color-ink)">{session.user.fullName}</p>
                    <p className="truncate text-[10px] text-(--color-ink-muted)">{session.user.email}</p>
                  </div>
                </div>
                <ChevronDown className={cn("size-4 text-(--color-ink-muted) transition-transform", userMenuOpen && "rotate-180")} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}


