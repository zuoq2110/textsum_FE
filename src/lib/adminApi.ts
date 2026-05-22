import { translateApiError } from './apiErrors'
import { apiJsonHeaders, resolveApiBaseUrl } from './summarizeApi'
import { USE_MOCK_DATA, MOCK_ADMIN_STATS, MOCK_ADMIN_USERS, MOCK_ADMIN_SUMMARIES } from './adminMockData'

// Types
export type AdminStats = {
  totalUsers: number
  totalSummaries: number
  todaySummaries: number
  activeUsers: number
  modelUsage: {
    extractive: number
    abstractive: number
    hybrid: number
  }
}

export type Activity = {
  id: string
  type: 'user_registered' | 'user_login' | 'summary_created'
  userId: string
  userName: string
  userEmail: string
  metadata?: {
    mode?: 'extractive' | 'abstractive' | 'hybrid'
  }
  createdAt: string
}

export type AdminUser = {
  id: string
  email: string
  fullName: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string | null
  lastLoginAt: string | null
  summaryCount: number
}

export type AdminSummary = {
  id: string
  userId: string
  userName: string
  userEmail: string
  mode: 'extractive' | 'abstractive' | 'hybrid'
  source: string
  summary: string
  wordCount: number
  createdAt: string
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

// Helper functions
function resolveAdminUrl(path: string): string {
  const baseUrl = resolveApiBaseUrl()
  if (!baseUrl) {
    throw new Error('Chưa cấu hình VITE_SUMMARIZE_API_URL')
  }
  return `${baseUrl}/api/v1/admin${path}`
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function resolveErrorMessage(res: Response, data: ApiErrorBody | null): string {
  const { message } = translateApiError(data?.error?.code, data?.error?.message)
  return message || res.statusText || `HTTP ${res.status}`
}

async function authenticatedFetch(
  url: string,
  accessToken: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...apiJsonHeaders(),
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
    credentials: 'include',
  })
}

// Admin Dashboard API
export async function getAdminStats(accessToken: string): Promise<AdminStats> {
  if (USE_MOCK_DATA) {
    console.log('[MOCK] Using mock admin stats')
    return Promise.resolve(MOCK_ADMIN_STATS)
  }

  const res = await authenticatedFetch(resolveAdminUrl('/stats'), accessToken)

  const data = await parseJsonSafe<ApiErrorBody & Partial<AdminStats>>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  if (!data?.totalUsers || !data?.totalSummaries) {
    throw new Error('Phản hồi stats không hợp lệ')
  }

  return {
    totalUsers: data.totalUsers,
    totalSummaries: data.totalSummaries,
    todaySummaries: data.todaySummaries ?? 0,
    activeUsers: data.activeUsers ?? 0,
    modelUsage: data.modelUsage ?? { extractive: 0, abstractive: 0, hybrid: 0 },
  }
}

export async function getAdminActivities(
  accessToken: string,
  params?: { limit?: number; offset?: number },
): Promise<{ activities: Activity[]; total: number }> {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())

  const url = resolveAdminUrl(`/activities?${queryParams.toString()}`)
  const res = await authenticatedFetch(url, accessToken)

  const data = await parseJsonSafe<ApiErrorBody & { activities?: Activity[]; total?: number }>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  return {
    activities: data?.activities ?? [],
    total: data?.total ?? 0,
  }
}

// User Management API
export async function getAdminUsers(
  accessToken: string,
  params?: {
    search?: string
    role?: 'all' | 'admin' | 'user'
    status?: 'all' | 'active' | 'banned'
    limit?: number
    offset?: number
  },
): Promise<{ users: AdminUser[]; total: number }> {
  if (USE_MOCK_DATA) {
    console.log('[MOCK] Using mock admin users')
    let filtered = [...MOCK_ADMIN_USERS]
    
    // Apply filters
    if (params?.search) {
      const search = params.search.toLowerCase()
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      )
    }
    if (params?.role && params.role !== 'all') {
      filtered = filtered.filter(u => u.role === params.role)
    }
    if (params?.status === 'active') {
      filtered = filtered.filter(u => u.isActive)
    } else if (params?.status === 'banned') {
      filtered = filtered.filter(u => !u.isActive)
    }
    
    return Promise.resolve({ users: filtered, total: filtered.length })
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.set('search', params.search)
  if (params?.role && params.role !== 'all') queryParams.set('role', params.role)
  if (params?.status) {
    if (params.status === 'active') queryParams.set('isActive', 'true')
    else if (params.status === 'banned') queryParams.set('isActive', 'false')
  }
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())

  const url = resolveAdminUrl(`/users?${queryParams.toString()}`)
  const res = await authenticatedFetch(url, accessToken)

  const data = await parseJsonSafe<ApiErrorBody & { users?: AdminUser[]; total?: number }>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  return {
    users: data?.users ?? [],
    total: data?.total ?? 0,
  }
}

export async function updateUserRole(
  accessToken: string,
  userId: string,
  role: 'admin' | 'user',
): Promise<void> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] Update user ${userId} role to ${role}`)
    return Promise.resolve()
  }

  const res = await authenticatedFetch(resolveAdminUrl(`/users/${userId}/role`), accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

  const data = await parseJsonSafe<ApiErrorBody>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }
}

export async function updateUserStatus(
  accessToken: string,
  userId: string,
  isActive: boolean,
): Promise<void> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] Update user ${userId} status to ${isActive}`)
    return Promise.resolve()
  }

  const res = await authenticatedFetch(resolveAdminUrl(`/users/${userId}/status`), accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })

  const data = await parseJsonSafe<ApiErrorBody>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }
}

export async function deleteUser(accessToken: string, userId: string): Promise<void> {
  const res = await authenticatedFetch(resolveAdminUrl(`/users/${userId}`), accessToken, {
    method: 'DELETE',
  })

  const data = await parseJsonSafe<ApiErrorBody>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }
}

// Summary History Management API
export async function getAdminSummaries(
  accessToken: string,
  params?: {
    search?: string
    mode?: 'all' | 'extractive' | 'abstractive' | 'hybrid'
    userId?: string
    limit?: number
    offset?: number
  },
): Promise<{
  summaries: AdminSummary[]
  total: number
  stats: { extractive: number; abstractive: number; hybrid: number }
}> {
  if (USE_MOCK_DATA) {
    console.log('[MOCK] Using mock admin summaries')
    let filtered = [...MOCK_ADMIN_SUMMARIES]
    
    // Apply filters
    if (params?.search) {
      const search = params.search.toLowerCase()
      filtered = filtered.filter(s => 
        s.source.toLowerCase().includes(search) || 
        s.summary.toLowerCase().includes(search) ||
        s.userName.toLowerCase().includes(search) ||
        s.userEmail.toLowerCase().includes(search)
      )
    }
    if (params?.mode && params.mode !== 'all') {
      filtered = filtered.filter(s => s.mode === params.mode)
    }
    if (params?.userId) {
      filtered = filtered.filter(s => s.userId === params.userId)
    }
    
    const stats = {
      extractive: MOCK_ADMIN_SUMMARIES.filter(s => s.mode === 'extractive').length,
      abstractive: MOCK_ADMIN_SUMMARIES.filter(s => s.mode === 'abstractive').length,
      hybrid: MOCK_ADMIN_SUMMARIES.filter(s => s.mode === 'hybrid').length,
    }
    
    return Promise.resolve({ summaries: filtered, total: filtered.length, stats })
  }

  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.set('search', params.search)
  if (params?.mode && params.mode !== 'all') queryParams.set('mode', params.mode)
  if (params?.userId) queryParams.set('userId', params.userId)
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  if (params?.offset) queryParams.set('offset', params.offset.toString())

  const url = resolveAdminUrl(`/summaries?${queryParams.toString()}`)
  const res = await authenticatedFetch(url, accessToken)

  const data = await parseJsonSafe<
    ApiErrorBody & {
      summaries?: AdminSummary[]
      total?: number
      stats?: { extractive: number; abstractive: number; hybrid: number }
    }
  >(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  return {
    summaries: data?.summaries ?? [],
    total: data?.total ?? 0,
    stats: data?.stats ?? { extractive: 0, abstractive: 0, hybrid: 0 },
  }
}

export async function deleteSummary(accessToken: string, summaryId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] Delete summary ${summaryId}`)
    return Promise.resolve()
  }

  const res = await authenticatedFetch(resolveAdminUrl(`/summaries/${summaryId}`), accessToken, {
    method: 'DELETE',
  })

  const data = await parseJsonSafe<ApiErrorBody>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }
}

export type DailyStat = {
  date: string   // 'YYYY-MM-DD'
  summaries: number
  users: number
}

export async function getAdminDailyStats(
  accessToken: string,
  days = 30,
): Promise<DailyStat[]> {
  if (USE_MOCK_DATA) {
    const result: DailyStat[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().slice(0, 10)
      // Tạo dữ liệu giả có xu hướng tăng nhẹ + noise
      const base = 8 + Math.floor((days - i) * 0.4)
      const noise = Math.floor(Math.random() * 10) - 4
      result.push({ date, summaries: Math.max(0, base + noise), users: Math.max(0, Math.floor((base + noise) * 0.6)) })
    }
    return Promise.resolve(result)
  }

  const url = resolveAdminUrl(`/analytics/summaries?days=${days}`)
  const res = await authenticatedFetch(url, accessToken)
  const data = await parseJsonSafe<ApiErrorBody & { data?: DailyStat[] }>(res)

  if (!res.ok) throw new Error(resolveErrorMessage(res, data))
  return data?.data ?? []
}

export async function deleteBulkSummaries(
  accessToken: string,
  summaryIds: string[],
): Promise<{ deleted: number }> {
  const res = await authenticatedFetch(resolveAdminUrl('/summaries/bulk'), accessToken, {
    method: 'DELETE',
    body: JSON.stringify({ summaryIds }),
  })

  const data = await parseJsonSafe<ApiErrorBody & { deleted?: number }>(res)

  if (!res.ok) {
    throw new Error(resolveErrorMessage(res, data))
  }

  return {
    deleted: data?.deleted ?? 0,
  }
}
