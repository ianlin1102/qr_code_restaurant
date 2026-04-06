import { useState, useEffect, useCallback } from 'react'
import { Plus, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/i18n/useT'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import TableGrid from '@/components/TableGrid'
import TableDetailPanel from '@/components/TableDetailPanel'
import ActiveOrdersSidebar from '@/components/ActiveOrdersSidebar'
import WaitlistPanel from '@/components/WaitlistPanel'
import type { Table, Order } from '@qr-order/shared'
import type { adminT } from '@/i18n/admin'

type T = (typeof adminT)['en']

const POLL_INTERVAL = 10_000

function secondsAgo(d: Date): number {
  return Math.round((Date.now() - d.getTime()) / 1000)
}

export default function FloorPlanPage() {
  const { t } = useT()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''

  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'waitlist'>('orders')
  const [activeZone, setActiveZone] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [t, o] = await Promise.all([api.getTables(storeId), api.getOrders(storeId)])
      setTables(t); setOrders(o); setLastUpdated(new Date())
    } catch { /* silent retry */ } finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, POLL_INTERVAL); return () => clearInterval(id) }, [fetchData])
  useEffect(() => { const id = setInterval(() => setElapsed(secondsAgo(lastUpdated)), 1000); return () => clearInterval(id) }, [lastUpdated])

  const occupiedCount = tables.filter(tb => tb.status === 'occupied').length
  const idleCount = tables.length - occupiedCount
  const occupancyPct = tables.length ? Math.round(occupiedCount / tables.length * 100) : 0
  const activeOrderCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length
  const zones = ['all', ...Array.from(new Set(tables.map(tb => tb.zone).filter(Boolean)))] as string[]
  const filteredTables = activeZone === 'all' ? tables : tables.filter(tb => tb.zone === activeZone)

  const handleTableClick = (table: Table) => { setSelectedTable(table); setDetailOpen(true) }
  const handleOrderClick = (order: Order) => {
    const matched = tables.find(tb => tb.id === order.tableId)
    if (matched) { setSelectedTable(matched); setDetailOpen(true) }
  }

  if (!storeId) return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">{t.floorPlan.notAuth}</p></div>
  if (loading && !tables.length) return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">{t.floorPlan.loading}</p></div>

  return (
    <div className="flex h-full bg-background">
      {/* Center Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <CenterTopBar zones={zones} activeZone={activeZone} setActiveZone={setActiveZone}
          elapsed={elapsed} t={t} occupancyPct={occupancyPct} idleCount={idleCount}
          activeOrderCount={activeOrderCount} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-auto p-4">
          <TableGrid tables={filteredTables} orders={orders} onTableClick={handleTableClick} />
        </div>
      </div>
      {/* Right Sidebar */}
      <div className="w-80 shrink-0 border-l bg-card flex flex-col hidden md:flex">
        <div className="flex border-b">
          {(['orders', 'waitlist'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {tab === 'orders' ? t.activeOrders.title : t.waitlist.title}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'orders'
            ? <ActiveOrdersSidebar storeId={storeId} onOrderClick={handleOrderClick} />
            : <WaitlistPanel storeId={storeId} />}
        </div>
        {/* Urgent Notifications */}
        <UrgentNotifications tables={tables} orders={orders} t={t} />
      </div>
      <TableDetailPanel table={selectedTable} storeId={storeId} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  )
}

/* ---- Center Top Bar ---- */
function CenterTopBar({ zones, activeZone, setActiveZone, elapsed, t, occupancyPct, idleCount, activeOrderCount, setActiveTab }: {
  zones: string[]; activeZone: string; setActiveZone: (z: string) => void; elapsed: number
  t: T; occupancyPct: number; idleCount: number; activeOrderCount: number
  setActiveTab: (t: 'orders' | 'waitlist') => void
}) {
  return (
    <div className="glass">
      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.occupancy}</span>
            <span className={cn('text-sm font-bold', occupancyPct >= 80 ? 'text-yellow-600' : 'text-green-600')}>
              {occupancyPct}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.availableTables}</span>
            <Badge className="bg-green-100 text-green-700 border-0">{idleCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.activeOrders}</span>
            <Badge className="bg-red-100 text-red-700 border-0">{activeOrderCount}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className={cn('size-2 rounded-full', elapsed < 5 ? 'bg-green-500 animate-pulse' : 'bg-gray-300')} />
          {t.floorPlan.secondsAgo.replace('{{s}}', String(elapsed))}
        </div>
      </div>
      {/* Zone filters row */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {zones.map(z => (
          <Button key={z} size="sm" variant={activeZone === z ? 'default' : 'outline'}
            className={activeZone === z ? 'bg-primary hover:bg-primary/90' : ''}
            onClick={() => setActiveZone(z)}>
            {z === 'all' ? t.floorPlan.allZone : z}
          </Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setActiveTab('waitlist')}>
          <Plus className="size-3 mr-1" />{t.waitlist.addEntry}
        </Button>
      </div>
    </div>
  )
}

/* ---- Urgent Notifications ---- */
// TODO: Add "Call Waiter" notifications here once WebSocket is implemented.
// Currently, the customer "Call Waiter" button only shows local feedback.
function UrgentNotifications({ tables, orders, t }: {
  tables: Table[]; orders: Order[]; t: T
}) {
  const alerts: { type: 'error' | 'info'; message: string }[] = []

  orders.forEach(o => {
    if (o.status !== 'pending') return
    const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)
    if (mins >= 15) {
      alerts.push({ type: 'error', message: `#${o.orderNumber} — ${t.floorPlan.longPending.replace('{{min}}', String(mins))}` })
    }
  })

  tables.forEach(tb => {
    if (tb.status === 'bill-requested') {
      alerts.push({ type: 'error', message: `${tb.name} — ${t.floorPlan.billRequestedAlert}` })
    }
  })

  if (alerts.length === 0) return null

  return (
    <div className="border-t p-3 space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">
        {t.floorPlan.urgentNotifications}
      </p>
      {alerts.map((alert, i) => (
        <div key={i} className={cn(
          'rounded-lg p-2.5 flex items-start gap-2 text-xs',
          alert.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        )}>
          {alert.type === 'error'
            ? <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            : <Info className="size-3.5 shrink-0 mt-0.5" />}
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  )
}
