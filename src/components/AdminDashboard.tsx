import { BarChart3, FileText, TrendingUp, Users, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type AuthSession } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import {
  getAdminStats,
  getAdminActivities,
  getAdminDailyStats,
  type AdminStats,
  type Activity,
  type DailyStat,
} from '../lib/adminApi'

type AdminDashboardProps = {
  session: AuthSession | null
}

type StatCardProps = {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  color: 'accent' | 'mint' | 'amber' | 'rose'
}

function StatCard({ label, value, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-(--color-accent-soft) text-(--color-accent)',
    mint: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-[var(--shadow-card)] transition hover:border-(--color-accent)/30">
      <div className="mb-2.5 flex items-center justify-between">
        <div className={cn('flex size-9 items-center justify-center rounded-lg', colorClasses[color])}>
          {icon}
        </div>
        {trend ? (
          <div className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-3" />
            {trend}
          </div>
        ) : null}
      </div>
      <div className="mb-0.5 text-2xl font-bold text-(--color-ink)">{value}</div>
      <div className="text-xs text-(--color-ink-muted)">{label}</div>
    </div>
  )
}

function formatActivityMessage(activity: Activity): string {
  switch (activity.type) {
    case 'user_registered':
      return `Người dùng mới ${activity.userEmail} đã đăng ký`
    case 'user_login':
      return `Người dùng ${activity.userName} đã đăng nhập`
    case 'summary_created':
      return `Người dùng ${activity.userName} đã tạo tóm tắt mới (${activity.metadata?.mode ?? 'unknown'})`
    default:
      return 'Hoạt động không xác định'
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
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return 'Không rõ'
  }
}

type ModelUsageChartProps = {
  extractive: number
  abstractive: number
  hybrid: number
}

const CHART_COLORS = [
  { stroke: '#3b82f6', from: '#3b82f6', to: '#60a5fa', label: 'Extractive' },
  { stroke: '#a855f7', from: '#a855f7', to: '#c084fc', label: 'Abstractive' },
  { stroke: '#14b8a6', from: '#14b8a6', to: '#2dd4bf', label: 'Hybrid' },
]

function ModelUsageChart({ extractive, abstractive, hybrid }: ModelUsageChartProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const rawValues = [extractive, abstractive, hybrid]
  const total = rawValues.reduce((a, b) => a + b, 0) || 1

  const size = 128
  const cx = size / 2
  const cy = size / 2
  const r = 44
  const strokeWidth = 16
  const circumference = 2 * Math.PI * r

  // Tính từng segment: startAngle = góc bắt đầu tính từ 12 giờ (−90°)
  let cumPct = 0
  const segments = rawValues.map((val, i) => {
    const pct = (val / total) * 100
    const dash = animated ? (pct / 100) * circumference : 0
    // Mỗi segment tự xoay về đúng vị trí
    const rotateDeg = (cumPct / 100) * 360 - 90
    cumPct += pct
    return { pct, dash, rotateDeg, val, colors: CHART_COLORS[i] }
  })

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-sm font-semibold text-(--color-ink)">Phân bổ chế độ tóm tắt</h3>

      <div className="flex items-center gap-5">
        {/* Donut chart */}
        <div className="relative shrink-0">
          <svg width={size} height={size}>
            {/* Track nền */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              strokeWidth={strokeWidth}
              stroke="var(--color-border)"
            />
            {/* Mỗi segment rotate độc lập — không phụ thuộc strokeDashoffset */}
            {segments.map((seg) => (
              <circle
                key={seg.colors.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${seg.dash} ${circumference}`}
                transform={`rotate(${seg.rotateDeg} ${cx} ${cy})`}
                style={{
                  stroke: seg.colors.stroke,
                  transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-(--color-ink)">{total.toLocaleString('vi-VN')}</span>
            <span className="text-[10px] text-(--color-ink-muted)">tổng số</span>
          </div>
        </div>

        {/* Legend + progress bars */}
        <div className="flex-1 space-y-2.5">
          {segments.map((seg) => (
            <div key={seg.colors.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.colors.stroke }}
                  />
                  <span className="font-medium text-(--color-ink)">{seg.colors.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold" style={{ color: seg.colors.stroke }}>
                    {seg.pct.toFixed(1)}%
                  </span>
                  <span className="text-(--color-ink-muted)">
                    ({seg.val.toLocaleString('vi-VN')})
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-(--color-surface)">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: animated ? `${seg.pct}%` : '0%',
                    background: `linear-gradient(to right, ${seg.colors.from}, ${seg.colors.to})`,
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    transitionDelay: '80ms',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Tạo smooth bezier path từ mảng điểm
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function DailyActivityChart({ data }: { data: DailyStat[] }) {
  const [animated, setAnimated] = useState(false)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; stat: DailyStat } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (data.length === 0) return null

  const W = 800
  const H = 180
  const padL = 36
  const padR = 16
  const padT = 16
  const padB = 32

  const maxVal = Math.max(...data.map((d) => d.summaries), 1)
  const n = data.length

  const toX = (i: number) => padL + (i / (n - 1)) * (W - padL - padR)
  const toY = (v: number) => padT + (1 - v / maxVal) * (H - padT - padB)

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.summaries) }))
  const linePath = smoothPath(pts)

  // Area fill path (close xuống đáy)
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`

  // X-axis labels: hiện mỗi 5 ngày
  const xLabels = data.filter((_, i) => i === 0 || i === n - 1 || i % 5 === 0)

  // Y-axis grid lines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: toY(t * maxVal),
    label: Math.round(t * maxVal),
  }))

  function formatShortDate(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-(--color-ink)">Hoạt động 30 ngày gần đây</h3>
          <p className="text-xs text-(--color-ink-muted)">Số lượng tóm tắt mỗi ngày</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-2.5 py-1 text-xs text-(--color-ink-muted)">
          <span className="size-2 rounded-full bg-[var(--color-accent)]" />
          Tóm tắt / ngày
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 180 }}
          onMouseMove={(e) => {
            if (!svgRef.current) return
            const rect = svgRef.current.getBoundingClientRect()
            const scaleX = W / rect.width
            const mx = (e.clientX - rect.left) * scaleX
            // Tìm điểm gần nhất trên trục X
            let closest = 0
            let minDist = Infinity
            pts.forEach((p, i) => {
              const dist = Math.abs(p.x - mx)
              if (dist < minDist) { minDist = dist; closest = i }
            })
            if (minDist < 30) {
              const scaleY = H / rect.height
              const screenX = pts[closest].x / scaleX + rect.left
              const screenY = pts[closest].y / scaleY + rect.top
              setTooltip({ x: screenX, y: screenY, stat: data[closest] })
            } else {
              setTooltip(null)
            }
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
            <clipPath id="lineClip">
              <rect
                x={padL} y={padT}
                width={animated ? W - padL - padR : 0}
                height={H - padT - padB}
                style={{ transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </clipPath>
          </defs>

          {/* Y-axis grid lines */}
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={padL} y1={tick.y} x2={W - padR} y2={tick.y}
                stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4 4"
              />
              <text
                x={padL - 6} y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--color-ink-muted)"
                opacity={0.7}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* X-axis baseline */}
          <line
            x1={padL} y1={H - padB} x2={W - padR} y2={H - padB}
            stroke="var(--color-border)" strokeWidth={1}
          />

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#lineAreaGrad)"
            clipPath="url(#lineClip)"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#lineClip)"
          />

          {/* Dots */}
          {animated && pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y} r={3}
              fill="var(--color-accent)"
              stroke="var(--color-surface-elevated)"
              strokeWidth={2}
              opacity={tooltip?.stat === data[i] ? 1 : 0}
            />
          ))}

          {/* X-axis labels */}
          {xLabels.map((d, i) => {
            const idx = data.indexOf(d)
            return (
              <text
                key={i}
                x={toX(idx)}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-ink-muted)"
                opacity={0.7}
              >
                {formatShortDate(d.date)}
              </text>
            )
          })}
        </svg>

        {/* Tooltip */}
        {tooltip ? (
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-3 py-2 text-xs shadow-[var(--shadow-card)]"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
          >
            <p className="font-semibold text-(--color-ink)">
              {new Date(tooltip.stat.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            <p className="text-(--color-ink-muted)">{tooltip.stat.summaries} tóm tắt</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RecentActivityCard({ activities }: { activities: Activity[] }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-sm font-semibold text-(--color-ink)">Hoạt động gần đây</h3>
      <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-0.5">
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-(--color-ink-muted)">Chưa có hoạt động nào</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-2.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 transition hover:border-(--color-accent)/30"
            >
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md',
                  activity.type === 'summary_created'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-(--color-accent-soft) text-(--color-accent)',
                )}
              >
                {activity.type === 'summary_created' ? (
                  <FileText className="size-3.5" />
                ) : (
                  <Users className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-(--color-ink)">{formatActivityMessage(activity)}</p>
                <p className="text-[11px] text-(--color-ink-muted)">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!session?.tokens?.accessToken) return

      setLoading(true)
      setError(null)

      try {
        const [statsData, dailyData] = await Promise.all([
          getAdminStats(session.tokens.accessToken),
          getAdminDailyStats(session.tokens.accessToken, 30).catch(() => [] as DailyStat[]),
        ])
        setStats(statsData)
        setDailyStats(dailyData)

        // Activities optional
        getAdminActivities(session.tokens.accessToken, { limit: 10 })
          .then((d) => setActivities(d.activities))
          .catch(() => setActivities([]))
      } catch (err) {
        console.error('Failed to fetch admin data:', err)
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [session?.tokens?.accessToken])

  if (!session) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-6 py-4 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm text-(--color-ink-muted)">Bạn cần đăng nhập với quyền admin</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-(--color-ink-muted)">
          <Loader2 className="size-4 animate-spin" />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) px-6 py-4 text-center shadow-[var(--shadow-card)]">
          <p className="mb-1 text-sm font-semibold text-(--color-ink)">Lỗi tải dữ liệu</p>
          <p className="text-xs text-rose-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-(--color-accent)" aria-hidden />
        <div>
          <h2 className="text-lg font-bold leading-tight text-(--color-ink)">Dashboard Admin</h2>
          <p className="text-xs text-(--color-ink-muted)">Tổng quan hệ thống và thống kê hoạt động</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng người dùng"
          value={stats.totalUsers.toLocaleString('vi-VN')}
          icon={<Users className="size-5" />}
          trend="+12%"
          color="accent"
        />
        <StatCard
          label="Tổng tóm tắt"
          value={stats.totalSummaries.toLocaleString('vi-VN')}
          icon={<FileText className="size-5" />}
          trend="+8%"
          color="mint"
        />
        <StatCard
          label="Tóm tắt hôm nay"
          value={stats.todaySummaries.toLocaleString('vi-VN')}
          icon={<TrendingUp className="size-5" />}
          color="amber"
        />
        <StatCard
          label="Người dùng hoạt động"
          value={stats.activeUsers.toLocaleString('vi-VN')}
          icon={<Users className="size-5" />}
          trend="+5%"
          color="rose"
        />
      </div>

      {/* Charts and activity */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ModelUsageChart
          extractive={stats.modelUsage.extractive}
          abstractive={stats.modelUsage.abstractive}
          hybrid={stats.modelUsage.hybrid}
        />
        <RecentActivityCard activities={activities} />
      </div>

      {/* Daily activity line chart */}
      <DailyActivityChart data={dailyStats} />
    </div>
  )
}
