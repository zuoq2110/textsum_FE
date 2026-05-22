import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type AuthSession,
  getCurrentUser,
  loginWithPassword as apiLogin,
  refreshToken as apiRefresh,
  registerWithPassword as apiRegister,
} from '../lib/authApi'

export type { AuthSession }

const AUTH_SESSION_KEY = 'textsum_auth_session_v1'

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.user || !parsed.tokens) return null
    if (!parsed.user.email || !parsed.tokens.accessToken || !parsed.tokens.refreshToken) return null
    return {
      user: parsed.user as AuthSession['user'],
      tokens: parsed.tokens as AuthSession['tokens'],
    }
  } catch {
    return null
  }
}

function saveSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

function clearSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export type AuthStatus = 'idle' | 'loading'

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Ref to latest session for use inside timer callbacks without stale closure
  const sessionRef = useRef(session)
  sessionRef.current = session

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMsg(null)
  }, [])

  /** Làm mới token hoàn toàn im lặng — không hiển thị loading hay thông báo */
  const silentRefresh = useCallback(async () => {
    const current = sessionRef.current ?? readSession()
    if (!current) return

    try {
      const nextTokens = await apiRefresh(current.tokens.refreshToken)
      const me = await getCurrentUser(nextTokens.accessToken)
      // Merge: giữ lại role từ current nếu API /me chưa return role
      const next: AuthSession = {
        user: { ...current.user, ...me, role: me.role ?? current.user.role },
        tokens: nextTokens,
      }
      setSession(next)
      saveSession(next)
    } catch {
      // Refresh thất bại → đăng xuất và báo lỗi
      clearSession()
      setSession(null)
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
  }, [])

  // Validate token khi mount, auto-refresh nếu hết hạn
  useEffect(() => {
    const stored = readSession()
    if (!stored) return

    let cancelled = false

    const bootstrap = async () => {
      try {
        const me = await getCurrentUser(stored.tokens.accessToken)
        if (cancelled) return
        // Merge: giữ lại role từ stored nếu API /me chưa return role
        setSession((prev) =>
          prev ? { ...prev, user: { ...prev.user, ...me, role: me.role ?? prev.user.role } } : prev,
        )
      } catch {
        try {
          const nextTokens = await apiRefresh(stored.tokens.refreshToken)
          const me = await getCurrentUser(nextTokens.accessToken)
          if (cancelled) return
          // Merge: giữ lại role từ stored nếu API /me chưa return role
          const next: AuthSession = {
            user: { ...stored.user, ...me, role: me.role ?? stored.user.role },
            tokens: nextTokens,
          }
          setSession(next)
          saveSession(next)
        } catch {
          if (cancelled) return
          clearSession()
          setSession(null)
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        }
      }
    }

    void bootstrap()
    return () => { cancelled = true }
  }, [])

  // Tự động làm mới trước khi token hết hạn (90 giây trước expiresIn)
  useEffect(() => {
    if (!session) return
    const expiresIn = session.tokens.expiresIn // seconds
    // Làm mới sớm 90s, tối thiểu chờ 10s để tránh vòng lặp ngay lập tức
    const delay = Math.max((expiresIn - 90) * 1000, 10_000)
    const timer = window.setTimeout(() => void silentRefresh(), delay)
    return () => window.clearTimeout(timer)
  }, [session?.tokens.accessToken, silentRefresh])

  const register = useCallback(
    async (email: string, password: string, fullName: string, remember: boolean) => {
      clearMessages()
      setStatus('loading')
      try {
        const next = await apiRegister(email, password, fullName)
        if (remember) saveSession(next)
        else clearSession()
        setSession(next)
        setSuccessMsg('Đăng ký thành công. Chào mừng bạn đến với TextSum!')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể đăng ký. Vui lòng thử lại.')
        throw e
      } finally {
        setStatus('idle')
      }
    },
    [clearMessages],
  )

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      clearMessages()
      setStatus('loading')
      try {
        const next = await apiLogin(email, password)
        if (remember) saveSession(next)
        else clearSession()
        setSession(next)
        setSuccessMsg('Đăng nhập thành công.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể đăng nhập. Vui lòng thử lại.')
        throw e
      } finally {
        setStatus('idle')
      }
    },
    [clearMessages],
  )

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    clearMessages()
    setSuccessMsg('Bạn đã đăng xuất.')
  }, [clearMessages])

  return { session, status, error, successMsg, login, register, logout, clearMessages }
}
