import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { usePermission } from '@/hooks/usePermission'
import { useT } from '@/i18n/useT'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FloorCanvas } from '@/components/floor/FloorCanvas'
import TableGrid from '@/components/table/TableGrid'
import type { Table, Order } from '@qr-order/shared'
import { useStoreEvents } from '@/hooks/useStoreEvents'

const POLL_INTERVAL = 30_000

export default function FloorPlanPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''
  const canEdit = usePermission('tables:write')
  const { subscribe } = useStoreEvents(storeId)

  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activeZone, setActiveZone] = useState<string>('__base__')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [tbl, o] = await Promise.all([api.getTables(storeId), api.getOrders(storeId)])
      setTables(tbl); setOrders(o)
    } catch { /* silent retry */ } finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, POLL_INTERVAL); return () => clearInterval(id) }, [fetchData])

  // SSE-driven updates: refresh on store:tables events
  useEffect(() => {
    return subscribe('store:tables', () => { fetchData() })
  }, [subscribe, fetchData])

  const enabledTables = useMemo(() => tables.filter(tb => tb.enabled), [tables])
  const occupiedCount = useMemo(() => enabledTables.filter(tb => tb.status === 'occupied').length, [enabledTables])
  const idleCount = enabledTables.length - occupiedCount
  const occupancyPct = enabledTables.length ? Math.round(occupiedCount / enabledTables.length * 100) : 0

  const zones = useMemo(() => Array.from(new Set(enabledTables.map(tb => tb.zone).filter(Boolean))) as string[], [enabledTables])
  const filteredTables = useMemo(() => {
    if (activeZone === '__base__') return enabledTables.filter(tb => !tb.zone)
    return enabledTables.filter(tb => tb.zone === activeZone)
  }, [enabledTables, activeZone])

  const handleTableClick = (table: Table) => {
    navigate(`/admin/tables?select=${table.id}`)
  }

  const useSvgCanvas = filteredTables.some(t => t.x != null && t.y != null)

  if (!storeId) return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">{t.floorPlan.notAuth}</p></div>
  if (loading && !tables.length) return <div className="flex items-center justify-center h-full"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Stats + Zone filter bar */}
      <div className="glass">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.occupancy}</span>
              <span className={cn('text-sm font-bold', occupancyPct >= 80 ? 'text-yellow-600' : 'text-green-600')}>{occupancyPct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.availableTables}</span>
              <Badge className="bg-green-100 text-green-700 border-0">{idleCount}</Badge>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/floor-plan/editor')}>
              <Pencil className="size-3 mr-1" />{t.common.edit}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <Button size="sm" variant={activeZone === '__base__' ? 'default' : 'outline'}
            onClick={() => setActiveZone('__base__')}>
            {t.floorPlan.allZone}
          </Button>
          {zones.map(z => (
            <Button key={z} size="sm" variant={activeZone === z ? 'default' : 'outline'}
              onClick={() => setActiveZone(z)}>
              {z}
            </Button>
          ))}
        </div>
      </div>

      {/* Floor canvas — full remaining height */}
      <div className="flex-1 overflow-hidden p-4">
        {useSvgCanvas ? (
          <FloorCanvas tables={filteredTables} onTableClick={handleTableClick} />
        ) : (
          <TableGrid tables={filteredTables} orders={orders} onTableClick={handleTableClick} />
        )}
      </div>
    </div>
  )
}
