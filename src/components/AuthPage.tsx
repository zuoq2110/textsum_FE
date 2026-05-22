import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldCheck,
  UserPlus,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { type AuthSession, type AuthStatus } from '../hooks/useAuth'

type Tab = 'login' | 'register'

type AuthPageProps = {
  session: AuthSession | null
  status: AuthStatus
  error: string | null
  successMsg: string | null
  onLogin: (email: string, password: string, remember: boolean) => Promise<void>
  onRegister: (email: string, password: string, fullName: string, remember: boolean) => Promise<void>
  onLogout: () => void
  onClearMessages: () => void
  onSuccess: () => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const FEATURES = [
  'Lưu lịch sử tóm tắt của bạn',
  'Đồng bộ cài đặt trên mọi thiết bị',
  'Truy cập API với xác thực an toàn',
  'Hỗ trợ PhoBERT, Qwen và nhiều mô hình khác',
]

const INPUT_CLASS =
  'w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-(--color-ink) outline-none transition placeholder:text-(--color-ink-muted)/50 focus:border-(--color-accent)/60 focus:ring-2 focus:ring-(--color-accent)/15'

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(INPUT_CLASS, 'pr-11')}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) transition hover:text-(--color-ink)"
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function AlertBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden />
      <p className="text-sm leading-snug text-red-300">{message}</p>
    </div>
  )
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-(--color-mint)/30 bg-(--color-mint)/10 px-4 py-3">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--color-mint)" aria-hidden />
      <p className="text-sm leading-snug text-(--color-mint-dim)">{message}</p>
    </div>
  )
}

export function AuthPage({
  session,
  status,
  error,
  successMsg,
  onLogin,
  onRegister,
  onLogout,
  onClearMessages,
  onSuccess,
}: AuthPageProps) {
  const [tab, setTab] = useState<Tab>('login')

  /* Login fields */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginRemember, setLoginRemember] = useState(true)

  /* Register fields */
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regRemember, setRegRemember] = useState(true)

  const loading = status === 'loading'

  const switchTab = (next: Tab) => {
    setTab(next)
    onClearMessages()
  }

  /* ── Validation ── */
  const loginCanSubmit =
    isValidEmail(loginEmail.trim()) && loginPassword.trim().length >= 6

  const regPasswordMatch = regPassword === regConfirm
  const regCanSubmit =
    regFullName.trim().length >= 2 &&
    isValidEmail(regEmail.trim()) &&
    regPassword.trim().length >= 6 &&
    regPasswordMatch

  /* ── Submit handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginCanSubmit || loading) return
    onClearMessages()
    try {
      await onLogin(loginEmail.trim().toLowerCase(), loginPassword, loginRemember)
      setLoginPassword('')
      onSuccess()
    } catch { /* error displayed via prop */ }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regCanSubmit || loading) return
    onClearMessages()
    try {
      await onRegister(regEmail.trim().toLowerCase(), regPassword, regFullName.trim(), regRemember)
      setRegPassword('')
      setRegConfirm('')
      onSuccess()
    } catch { /* error displayed via prop */ }
  }

  /* ── Left panel copy ── */
  const heading = tab === 'login' ? (
    <>Chào mừng<br /><span className="bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) bg-clip-text text-transparent">trở lại!</span></>
  ) : (
    <>Tham gia<br /><span className="bg-linear-to-r from-(--color-accent) to-(--color-mint-dim) bg-clip-text text-transparent">TextSum</span></>
  )
  const subText = tab === 'login'
    ? 'Đăng nhập để lưu lịch sử tóm tắt, đồng bộ cài đặt và trải nghiệm đầy đủ tính năng.'
    : 'Tạo tài khoản miễn phí để sử dụng tất cả tính năng của TextSum.'

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-(--color-border) shadow-[var(--shadow-card)] lg:grid lg:grid-cols-[1fr_1.1fr]">

        {/* ── Left panel — branding ── */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-(--color-accent)/15 via-(--color-surface-elevated) to-(--color-mint)/10 p-10 lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-(--color-accent)/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-8 h-48 w-48 rounded-full bg-(--color-mint)/20 blur-3xl"
          />

          <div className="relative">
            <div className="mb-8 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) shadow-sm">
                <Zap className="size-5 text-white" aria-hidden />
              </span>
              <span className="text-xl font-bold text-(--color-ink)">TextSum</span>
            </div>

            <h2 className="mb-3 text-3xl font-bold leading-snug text-(--color-ink)">
              {heading}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-(--color-ink-muted)">{subText}</p>

            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-(--color-ink-muted)">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--color-mint)" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-10 text-xs text-(--color-ink-muted)">
            © {new Date().getFullYear()} TextSum · Mọi quyền được bảo lưu
          </p>
        </div>

        {/* ── Right panel — form ── */}
        <div className="bg-(--color-surface-elevated) p-8 sm:p-10">

          {session ? (
            /* ── Logged-in state ── */
            <div className="flex h-full flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-(--color-ink)">Tài khoản của bạn</h3>
                <p className="mt-1 text-sm text-(--color-ink-muted)">Quản lý phiên đăng nhập</p>
              </div>

              <div className="mb-6 rounded-2xl border border-(--color-mint)/30 bg-(--color-mint)/8 p-5">
                <div className="mb-3 flex items-center gap-2 font-semibold text-(--color-mint-dim)">
                  <ShieldCheck className="size-5" aria-hidden />
                  Đã đăng nhập
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-(--color-accent) to-(--color-mint-dim) text-sm font-bold text-white">
                    {session.user.fullName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')}
                  </span>
                  <div>
                    <p className="font-semibold text-(--color-ink)">{session.user.fullName}</p>
                    <p className="text-sm text-(--color-ink-muted)">{session.user.email}</p>
                  </div>
                </div>
              </div>

              {error ? <AlertBanner message={error} /> : null}
              {successMsg ? <SuccessBanner message={successMsg} /> : null}

              <div className="mt-auto flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            /* ── Auth form ── */
            <div>
              {/* Mobile logo */}
              <div className="mb-6 flex items-center gap-2 lg:hidden">
                <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-(--color-accent) to-(--color-mint-dim)">
                  <Zap className="size-4 text-white" aria-hidden />
                </span>
                <span className="text-base font-bold text-(--color-ink)">TextSum</span>
              </div>

              {/* Tab switcher */}
              <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-(--color-surface) p-1">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-semibold transition',
                    tab === 'login'
                      ? 'bg-(--color-surface-elevated) text-(--color-ink) shadow-sm'
                      : 'text-(--color-ink-muted) hover:text-(--color-ink)',
                  )}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-semibold transition',
                    tab === 'register'
                      ? 'bg-(--color-surface-elevated) text-(--color-ink) shadow-sm'
                      : 'text-(--color-ink-muted) hover:text-(--color-ink)',
                  )}
                >
                  Đăng ký
                </button>
              </div>

              {/* ── Login form ── */}
              {tab === 'login' ? (
                <form onSubmit={(e) => void handleLogin(e)} noValidate className="grid gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-(--color-ink)">Chào mừng trở lại</h3>
                    <p className="mt-1 text-sm text-(--color-ink-muted)">Đăng nhập vào tài khoản của bạn</p>
                  </div>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Email</span>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Mật khẩu</span>
                    <PasswordInput
                      value={loginPassword}
                      onChange={setLoginPassword}
                      placeholder="Tối thiểu 6 ký tự"
                      autoComplete="current-password"
                    />
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-(--color-ink-muted)">
                    <input
                      type="checkbox"
                      checked={loginRemember}
                      onChange={(e) => setLoginRemember(e.target.checked)}
                      className="size-4 rounded accent-(--color-accent)"
                    />
                    Ghi nhớ đăng nhập trên thiết bị này
                  </label>

                  {error ? <AlertBanner message={error} /> : null}
                  {successMsg ? <SuccessBanner message={successMsg} /> : null}

                  <button
                    type="submit"
                    disabled={loading || !loginCanSubmit}
                    className={cn(
                      'mt-1 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition',
                      'bg-linear-to-r from-(--color-accent) to-(--color-mint-dim)',
                      'hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                  >
                    {loading ? (
                      <><Loader2 className="size-4 animate-spin" aria-hidden />Đang đăng nhập...</>
                    ) : (
                      <><LogIn className="size-4" aria-hidden />Đăng nhập</>
                    )}
                  </button>

                  <p className="text-center text-sm text-(--color-ink-muted)">
                    Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('register')}
                      className="font-semibold text-(--color-accent) underline-offset-2 hover:underline"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              ) : (
                /* ── Register form ── */
                <form onSubmit={(e) => void handleRegister(e)} noValidate className="grid gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-(--color-ink)">Tạo tài khoản</h3>
                    <p className="mt-1 text-sm text-(--color-ink-muted)">Miễn phí, chỉ mất vài giây</p>
                  </div>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Họ và tên</span>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Email</span>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Mật khẩu</span>
                    <PasswordInput
                      value={regPassword}
                      onChange={setRegPassword}
                      placeholder="Tối thiểu 6 ký tự"
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-(--color-ink)">Xác nhận mật khẩu</span>
                    <div className="relative">
                      <PasswordInput
                        value={regConfirm}
                        onChange={setRegConfirm}
                        placeholder="Nhập lại mật khẩu"
                        autoComplete="new-password"
                      />
                      {regConfirm.length > 0 ? (
                        <span
                          className={cn(
                            'absolute right-11 top-1/2 -translate-y-1/2 text-xs font-semibold',
                            regPasswordMatch ? 'text-emerald-500' : 'text-red-400',
                          )}
                        >
                          {regPasswordMatch ? '✓' : '✗'}
                        </span>
                      ) : null}
                    </div>
                    {regConfirm.length > 0 && !regPasswordMatch ? (
                      <span className="text-xs text-red-400">Mật khẩu nhập lại không khớp</span>
                    ) : null}
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-(--color-ink-muted)">
                    <input
                      type="checkbox"
                      checked={regRemember}
                      onChange={(e) => setRegRemember(e.target.checked)}
                      className="size-4 rounded accent-(--color-accent)"
                    />
                    Ghi nhớ đăng nhập trên thiết bị này
                  </label>

                  {error ? <AlertBanner message={error} /> : null}
                  {successMsg ? <SuccessBanner message={successMsg} /> : null}

                  <button
                    type="submit"
                    disabled={loading || !regCanSubmit}
                    className={cn(
                      'mt-1 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition',
                      'bg-linear-to-r from-(--color-accent) to-(--color-mint-dim)',
                      'hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                  >
                    {loading ? (
                      <><Loader2 className="size-4 animate-spin" aria-hidden />Đang tạo tài khoản...</>
                    ) : (
                      <><UserPlus className="size-4" aria-hidden />Tạo tài khoản</>
                    )}
                  </button>

                  <p className="text-center text-sm text-(--color-ink-muted)">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className="font-semibold text-(--color-accent) underline-offset-2 hover:underline"
                    >
                      Đăng nhập
                    </button>
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
