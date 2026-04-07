import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AnalyticsResponse, AuthUser } from '@qr-order/shared'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultRange(): [string, string] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return [toDateStr(start), toDateStr(end)]
}

function downloadCsv(data: AnalyticsResponse) {
  const l = ['Section,Date/Item,Orders/Qty,Revenue,Avg Order Value']
  data.dailyStats.forEach(d => l.push(`Daily,${d.date},${d.orderCount},${d.revenue},${d.avgOrderValue}`))
  l.push('', 'Section,Rank,Name,Quantity,Revenue')
  data.topItems.forEach((item, i) => l.push(`TopItem,${i + 1},${item.name.replace(/,/g, ' ')},${item.quantity},${item.revenue}`))
  l.push('', `Summary,Total Orders,${data.totalOrders},,`, `Summary,Total Revenue,,${data.totalRevenue},`, `Summary,Avg Order Value,,${data.avgOrderValue},`)
  const blob = new Blob([l.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `analytics-${toDateStr(new Date())}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const { t } = useT()
  const storeId = useAuthStore(s => s.user?.storeId)
  const [[start, end], setRange] = useState(defaultRange)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<'day' | 'week'>('day')

  const fetchData = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getAnalytics(storeId, start, end)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [storeId, start, end])

  useEffect(() => { fetchData() }, [fetchData])

  if (!storeId) return <div className="p-8 text-center text-muted-foreground">{t.analytics.noStore}</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold font-display">{t.analytics.title}</h1>
          {data && (
            <Button variant="outline" size="sm" onClick={() => downloadCsv(data)}>
              {t.analytics.exportCsv}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Date range picker */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">{t.analytics.from}</label>
          <input
            type="date"
            value={start}
            onChange={e => setRange([e.target.value, end])}
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="text-sm font-medium">{t.analytics.to}</label>
          <input
            type="date"
            value={end}
            onChange={e => setRange([start, e.target.value])}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        {loading && <div className="text-center py-12 text-muted-foreground">{t.analytics.loading}</div>}
        {error && <div className="text-center py-12 text-red-600">{error}</div>}

        {data && !loading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard label={t.analytics.totalOrders} value={String(data.totalOrders)} />
              <SummaryCard label={t.analytics.totalRevenue} value={formatPriceUSD(data.totalRevenue)} />
              <SummaryCard label={t.analytics.avgOrderValue} value={formatPriceUSD(data.avgOrderValue)} />
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">{t.analytics.revenueChart}</h2>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(['day', 'week'] as const).map(mode => (
                      <button key={mode} onClick={() => setChartMode(mode)}
                        className={cn('px-3 py-1 text-xs rounded-md transition-colors',
                          chartMode === mode ? 'bg-card shadow text-primary font-medium' : 'text-gray-500')}>
                        {mode === 'day' ? t.analytics.day : t.analytics.week}
                      </button>
                    ))}
                  </div>
                </div>
                <RevenueChart dailyStats={data.dailyStats} mode={chartMode} />
              </CardContent>
            </Card>

            {/* Top Items table */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-3">{t.analytics.topItems}</h2>
                {data.topItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.analytics.noItems}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">{t.analytics.rank}</th>
                          <th className="pb-2 pr-4">{t.analytics.item}</th>
                          <th className="pb-2 pr-4 text-right">{t.analytics.qtySold}</th>
                          <th className="pb-2 text-right">{t.analytics.revenue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topItems.map((item, i) => (
                          <tr key={item.menuItemId} className="border-b last:border-0">
                            <td className="py-2 pr-4">{i + 1}</td>
                            <td className="py-2 pr-4">{item.name}</td>
                            <td className="py-2 pr-4 text-right">{item.quantity}</td>
                            <td className="py-2 text-right">{formatPriceUSD(item.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily stats table */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-3">{t.analytics.dailyStats}</h2>
                {data.dailyStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.analytics.noData}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">{t.analytics.date}</th>
                          <th className="pb-2 pr-4 text-right">{t.analytics.orders}</th>
                          <th className="pb-2 pr-4 text-right">{t.analytics.revenue}</th>
                          <th className="pb-2 text-right">{t.analytics.avgValue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dailyStats.map(d => (
                          <tr key={d.date} className="border-b last:border-0">
                            <td className="py-2 pr-4">{d.date}</td>
                            <td className="py-2 pr-4 text-right">{d.orderCount}</td>
                            <td className="py-2 pr-4 text-right">{formatPriceUSD(d.revenue)}</td>
                            <td className="py-2 text-right">{formatPriceUSD(d.avgOrderValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff Performance */}
            <StaffPerformanceSection storeId={storeId} />
          </>
        )}
      </main>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  )
}

function RevenueChart({ dailyStats, mode }: { dailyStats: AnalyticsResponse['dailyStats']; mode: 'day' | 'week' }) {
  if (dailyStats.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No data</p>

  const bars = mode === 'week'
    ? (() => {
        const weeks: Record<string, number> = {}
        dailyStats.forEach(d => {
          const date = new Date(d.date)
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          const key = weekStart.toISOString().slice(0, 10)
          weeks[key] = (weeks[key] ?? 0) + d.revenue
        })
        return Object.entries(weeks).map(([label, value]) => ({ label: label.slice(5), value }))
      })()
    : dailyStats.map(d => ({
        label: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
        value: d.revenue,
      }))

  const maxVal = Math.max(...bars.map(b => b.value), 1)

  return (
    <div className="flex items-end gap-1.5 h-40">
      {bars.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative" style={{ height: '120px' }}>
            <div
              className="absolute bottom-0 w-full rounded-t-md bg-primary hover:bg-primary/80 transition-colors"
              style={{ height: `${Math.max(4, (bar.value / maxVal) * 100)}%` }}
              title={formatPriceUSD(bar.value)}
            />
          </div>
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

const ROLE_COLORS: Record<string, string> = { owner: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800', waiter: 'bg-green-100 text-green-800' }

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-800'}`}>
      {role}
    </span>
  )
}

function StaffPerformanceSection({ storeId }: { storeId: string }) {
  const { t } = useT()
  const [staff, setStaff] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getStaff(storeId).then(data => {
      if (!cancelled) { setStaff(data); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [storeId])

  if (loading) return null

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-1">
          {t.analytics.staffPerformance}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t.analytics.staffNote}
        </p>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.analytics.noStaff}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">{t.analytics.staffName}</th>
                  <th className="pb-2 pr-4">{t.analytics.staffRole}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{s.username}</td>
                    <td className="py-2 pr-4"><RoleBadge role={s.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
