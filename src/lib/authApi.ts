import { translateApiError } from './apiErrors'
import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  role?: 'user' | 'admin'
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export type AuthSession = {
  user: AuthUser
  tokens: AuthTokens
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

function resolveAuthUrl(path: '/register' | '/login' | '/refresh' | '/me'): string {
  const baseUrl = resolveApiBaseUrl()
  if (!baseUrl) {
    throw new Error(
      'Chua cau hinh VITE_SUMMARIZE_API_URL. Hay them bien env va khoi dong lai dev server.',
    )
  }
  return `${baseUrl}/api/v1/auth${path}`
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function resolveErrorMessage(res: Response, data: ApiErrorBody | null): string {
  const { message } = translateApiError(
    data?.error?.code,
    data?.error?.message,
  )
  return message || res.statusText || `HTTP ${res.status}`
}

export async function registerWithPassword(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthSession> {
  const res = await fetch(resolveAuthUrl('/register'), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({ email, password, fullName }),
  })

  const data = await parseJsonSafe<ApiErrorBody & { user?: AuthUser; tokens?: AuthTokens }>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  const user = data?.user
  const tokens = data?.tokens
  if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error('Phản hồi đăng ký không hợp lệ.')
  }

  return { user, tokens }
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(resolveAuthUrl('/login'), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  const data = await parseJsonSafe<(ApiErrorBody & { user?: AuthUser; tokens?: AuthTokens })>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  const user = data?.user
  const tokens = data?.tokens
  if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error('Phan hoi login khong hop le.')
  }

  return { user, tokens }
}

export async function refreshToken(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(resolveAuthUrl('/refresh'), {
    method: 'POST',
    headers: apiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  })

  const data = await parseJsonSafe<(ApiErrorBody & Partial<AuthTokens>)>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  if (!data?.accessToken || !data.refreshToken) {
    throw new Error('Phan hoi refresh token khong hop le.')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: data.tokenType ?? 'bearer',
    expiresIn: data.expiresIn ?? 3600,
  }
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const res = await fetch(resolveAuthUrl('/me'), {
    method: 'GET',
    headers: {
      ...apiJsonHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  })

  const data = await parseJsonSafe<(ApiErrorBody & Partial<AuthUser>)>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  if (!data?.id || !data.email || !data.fullName) {
    throw new Error('Phan hoi me khong hop le.')
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    isActive: Boolean(data.isActive),
  }
}
