import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/useT'
import {
  Armchair, Plus, Printer, ArrowLeftRight,
  CheckCircle2, Loader2, QrCode, Pencil, RefreshCw, XCircle, Bell, Sparkles,
} from 'lucide-react'
import { api, type SessionSummary } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { localized, optionLabel } from '@/lib/i18n-utils'
import { printQrCodes } from '@/lib/qr-pdf'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import CloseTableDialog from '@/components/table/CloseTableDialog'
import TransferTableDialog from '@/components/table/TransferTableDialog'
import SplitBillManager from '@/components/table/SplitBillManager'
import TableCrudDialog from '@/components/table/TableCrudDialog'
import OrderingSheet from '@/components/order/OrderingSheet'
import OrderEditDialog from '@/components/order/OrderEditDialog'
import type { Table, Order, OrderItem } from '@qr-order/shared'
import { useStoreEvents } from '@/hooks/useStoreEvents'
import { POLL as INTERVALS } from '@/lib/intervals'
import { formatDurationMs } from '@/lib/time-format'

const POLL = INTERVALS.ADMIN_FALLBACK

function itemPrice(it: OrderItem) {
  return itemLineTotal(it)
}

/** Open a browser print window with a combined session receipt (all orders). */
function printSessionReceipt(
  orders: Order[], table: Table,
  summary: SessionSummary | null, lang: string,
) {
  const zh = lang === 'zh'
  const now = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const allItems: { name: string; qty: number; price: number; opts: string; remark?: string }[] = []
  for (const o of orders) {
    for (const it of o.items) {
      if (it.voided) continue
      const opts = (it.selectedOptions ?? []).map(op =>
        `${op.choiceName || op.choiceNameEn || ''}`).filter(Boolean).join(', ')
      allItems.push({
        name: localized(it, lang), qty: it.quantity,
        price: itemLineTotal(it), opts, remark: it.remark,
      })
    }
  }
  const subtotal = allItems.reduce((s, i) => s + i.price, 0)
  const tax = summary?.tax ?? 0
  const svc = summary?.serviceFee ?? 0
  const total = summary?.totalWithTax ?? subtotal
  const paid = summary?.totalPaid ?? 0
  const remaining = summary?.remaining ?? total

  const rows = allItems.map(i => `
    <tr>
      <td style="text-align:left">${i.name} x${i.qty}</td>
      <td style="text-align:right">${formatPriceUSD(i.price)}</td>
    </tr>
    ${i.opts ? `<tr><td colspan="2" style="padding-left:12px;font-size:11px;color:#555">${i.opts}</td></tr>` : ''}
    ${i.remark ? `<tr><td colspan="2" style="padding-left:12px;font-size:11px;color:#555">*${i.remark}</td></tr>` : ''}
  `).join('')

  const html = `<html><head><title>${zh ? '账单' : 'Bill'}</title>
<style>
  body{margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5}
  .r{width:280px;padding:16px;margin:auto}
  .c{text-align:center} .b{font-weight:bold}
  .d{border-top:1px dashed #333;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0}
  .total td{font-size:14px;font-weight:bold;padding-top:4px}
  @media print{body{margin:0}}
</style></head><body>
<div class="r">
  <div class="c b" style="font-size:16px;margin-bottom:4px">${zh ? '账单' : 'Bill'}</div>
  <div class="d"></div>
  <table>
    <tr><td>${zh ? '桌号' : 'Table'}</td><td style="text-align:right" class="b">${table.name}</td></tr>
    <tr><td>${zh ? '时间' : 'Time'}</td><td style="text-align:right">${now}</td></tr>
    <tr><td>${zh ? '订单数' : 'Orders'}</td><td style="text-align:right">${orders.length}</td></tr>
  </table>
  <div class="d"></div>
  <table>${rows}</table>
  <div class="d"></div>
  <table>
    <tr><td>${zh ? '小计' : 'Subtotal'}</td><td style="text-align:right">${formatPriceUSD(subtotal)}</td></tr>
    ${tax > 0 ? `<tr><td>${zh ? '税' : 'Tax'}</td><td style="text-align:right">${formatPriceUSD(tax)}</td></tr>` : ''}
    ${svc > 0 ? `<tr><td>${zh ? '服务费' : 'Service Fee'}</td><td style="text-align:right">${formatPriceUSD(svc)}</td></tr>` : ''}
    <tr class="total"><td>${zh ? '合计' : 'Total'}</td><td style="text-align:right">${formatPriceUSD(total)}</td></tr>
    ${paid > 0 ? `<tr><td style="color:green">${zh ? '已付' : 'Paid'}</td><td style="text-align:right;color:green">-${formatPriceUSD(paid)}</td></tr>` : ''}
    ${remaining > 0 && paid > 0 ? `<tr class="total"><td style="color:orange">${zh ? '待付' : 'Remaining'}</td><td style="text-align:right;color:orange">${formatPriceUSD(remaining)}</td></tr>` : ''}
  </table>
  <div class="d"></div>
  <div class="c" style="font-size:11px;color:#666;margin-top:8px">${zh ? '谢谢光临' : 'Thank you!'}</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open('', '_blank', 'width=320,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

export default function TablesPage() {
  const { t, lang } = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''
  const { subscribe } = useStoreEvents(storeId)

  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuItemMap, setMenuItemMap] = useState<Record<string, string>>({})

  const [showDisabled, setShowDisabled] = useState(false)
  const [activeZone, setActiveZone] = useState<string>('__base__')

  const [transferOpen, setTransferOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  // store state removed — tax/fee now from session summary, not recalculated from rates
  const [viewTab, setViewTab] = useState<'current' | 'history'>('current')
  const [crudOpen, setCrudOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [baseUrl, setBaseUrl] = useState(() => {
    const saved = localStorage.getItem('qr-base-url')
    return saved || window.location.origin
  })
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [orderingOpen, setOrderingOpen] = useState(false)
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [voidTarget, setVoidTarget] = useState<{ orderId: string; itemIndex: number } | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [tbl, o] = await Promise.all([api.getTables(storeId!, showDisabled), api.getOrders(storeId)])
      setTables(tbl); setOrders(o)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [storeId, showDisabled])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, POLL); return () => clearInterval(id) }, [fetchData, showDisabled])

  // SSE-driven updates: refresh on store:tables and store:orders events
  useEffect(() => {
    const unsub1 = subscribe('store:tables', () => { fetchData() })
    const unsub2 = subscribe('store:orders', () => { fetchData() })
    return () => { unsub1(); unsub2() }
  }, [subscribe, fetchData])

  const tablesRef = useRef<Table[]>([])
  tablesRef.current = tables
  useEffect(() => {
    return subscribe('table:waiter-called', (data: { tableId?: string }) => {
      const tbl = tablesRef.current.find(t => t.id === data?.tableId)
      const name = tbl?.name
      notify.warning(name ? `Table ${name} needs service` : 'A table is calling for service')
      fetchData()
    })
  }, [subscribe, fetchData])

  // Removed: store fetch was only used for tax rate recalculation (now from session summary)

  // Fetch session summary when a table with active session is selected (or on poll)
  const fetchSession = useCallback(() => {
    if (!storeId || !selected?.currentSessionId) { setSessionSummary(null); return }
    api.getSessionSummary(storeId, selected.currentSessionId).then(setSessionSummary).catch(() => setSessionSummary(null))
  }, [storeId, selected?.currentSessionId])
  useEffect(() => { fetchSession() }, [fetchSession])
  // Also refresh session summary when orders change (poll picks up new orders)
  useEffect(() => { if (selected?.currentSessionId) fetchSession() }, [orders, fetchSession, selected?.currentSessionId])

  // Auto-select table from ?select= query param (from floor plan -> table link)
  useEffect(() => {
    const selectId = searchParams.get('select')
    if (selectId && tables.length > 0) {
      const target = tables.find(t => t.id === selectId)
      if (target) {
        setSelected(target)
        // Switch to the table's zone
        if (target.zone) setActiveZone(target.zone)
        else setActiveZone('__base__')
      }
      setSearchParams({}, { replace: true }) // clean up URL
    }
  }, [tables, searchParams, setSearchParams])

  useEffect(() => {
    if (!storeId) return
    api.getMenuItems(storeId).then(items => {
      const map: Record<string, string> = {}
      for (const item of items) {
        if (item.image) map[item.id] = item.image
      }
      setMenuItemMap(map)
    }).catch(() => {})
  }, [storeId])

  // Zone grouping
  const zones = useMemo(() => Array.from(new Set(tables.map(t => t.zone).filter(Boolean))) as string[], [tables])
  const zoneTables = useMemo(() => {
    if (activeZone === '__base__') return tables.filter(t => !t.zone)
    return tables.filter(t => t.zone === activeZone)
  }, [tables, activeZone])

  // Derived (memoized)
  // Current session: ONLY orders linked to the active session
  const sessionOrders = useMemo(() => {
    if (!selected?.currentSessionId) return [] // no active session -> no current orders
    return orders.filter(o =>
      o.tableId === selected.id && o.sessionId === selected.currentSessionId && o.status !== 'closed',
    )
  }, [selected, orders])
  // History: all other orders for this table
  const pastOrders = useMemo(() => {
    if (!selected) return []
    const sid = selected.currentSessionId
    return orders
      .filter(o => o.tableId === selected.id && (!sid || o.sessionId !== sid))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [selected, orders])
  const displayOrders = viewTab === 'history' ? pastOrders : sessionOrders
  const paidItemSet = useMemo(() => new Set(sessionSummary?.paidItemIds ?? []), [sessionSummary?.paidItemIds])
  const currentOrder = sessionOrders[0] ?? null
  // Prices from server session summary (single source of truth)
  const subtotal = sessionSummary?.netDue ?? sessionOrders.reduce((s, o) => s + o.totalPrice, 0)
  const tax = sessionSummary?.tax ?? 0
  const serviceFee = sessionSummary?.serviceFee ?? 0
  const totalWithTax = sessionSummary?.totalWithTax ?? subtotal
  const totalPaid = sessionSummary?.totalPaid ?? 0
  const remaining = sessionSummary?.remaining ?? totalWithTax
  const elapsedMs = sessionOrders.length
    ? Date.now() - new Date(sessionOrders[sessionOrders.length - 1].createdAt).getTime() : 0

  const handleSelect = (tb: Table) => { setSelected(tb); setViewTab('current') }
  const refresh = useCallback(() => { fetchData(); fetchSession(); setCloseOpen(false); setTransferOpen(false) }, [fetchData, fetchSession])

  const updateBaseUrl = (url: string) => {
    setBaseUrl(url)
    localStorage.setItem('qr-base-url', url)
  }
  const handlePrintQr = () => printQrCodes(selected ? [selected] : zoneTables, baseUrl, 'Restaurant')
  const handlePrintAllQr = () => {
    // Print all tables in current zone (sorted by number)
    printQrCodes(zoneTables, baseUrl, 'Restaurant')
  }
  const openAddTable = () => { setEditingTable(null); setCrudOpen(true) }
  const openEditTable = (tb: Table) => { setEditingTable(tb); setCrudOpen(true) }

  const statusColor = (status: Table['status'], enabled: boolean) => {
    if (!enabled) return 'border-l-gray-300'
    switch (status) {
      case 'occupied': return 'border-l-red-500'
      case 'bill-requested': return 'border-l-red-600'
      case 'cleaning': return 'border-l-yellow-500'
      default: return 'border-l-green-500'
    }
  }
  const statusBadge = (status: Table['status']) => {
    switch (status) {
      case 'occupied': return { label: t.tables.status.occupied, cls: 'text-red-600 bg-red-50' }
      case 'bill-requested': return { label: t.tables.status.billRequested, cls: 'text-red-700 bg-red-100 ring-1 ring-red-300' }
      case 'cleaning': return { label: t.tables.status.cleaning, cls: 'text-yellow-700 bg-yellow-50' }
      default: return { label: t.tables.status.idle, cls: 'text-green-600 bg-green-50' }
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 space-y-2">
        {/* Row 1: Zone pills + Enable New + Print QR */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-wrap gap-1 overflow-x-auto">
            <button onClick={() => setActiveZone('__base__')}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                activeZone === '__base__' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {t.floorPlan?.allZone || 'Base'}
            </button>
            {zones.map(z => (
              <button key={z} onClick={() => setActiveZone(z)}
                className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  activeZone === z ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {z}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={openAddTable}>
            <Plus className="size-3.5" />{t.tables.enableNew}
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={handlePrintAllQr}>
            <QrCode className="size-3.5" />{t.tables.printAllQr}
          </Button>
        </div>
        {/* Row 2: Show disabled + spacer + Base URL btn */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showDisabled}
              onChange={e => setShowDisabled(e.target.checked)}
              className="rounded" />
            {t.tables.showDisabled}
          </label>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => {
            const url = prompt(t.tables.baseUrl, baseUrl)
            if (url) updateBaseUrl(url)
          }}>
            {t.tables.baseUrl}
          </Button>
        </div>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Card grid */}
        {zoneTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-20">
            <Armchair className="size-16 opacity-20" />
            <p className="text-sm">{t.tables.noActiveOrders}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {zoneTables.map(tb => {
              const { label, cls } = statusBadge(tb.status)
              const isActive = selected?.id === tb.id
              return (
                <button key={tb.id} onClick={() => handleSelect(tb)}
                  className={cn(
                    'relative text-left rounded-lg border border-l-4 p-3 min-h-[80px] transition-all group',
                    statusColor(tb.status, tb.enabled),
                    isActive ? 'ring-2 ring-primary bg-primary/5' : 'bg-card hover:bg-accent/50',
                    !tb.enabled && 'opacity-50',
                    tb.status === 'cleaning' && 'animate-pulse',
                  )}>
                  {tb.waiterCalledAt && (
                    <span className="absolute top-1 left-1 h-3 w-3 rounded-full bg-orange-500 animate-pulse shadow-lg ring-2 ring-orange-300"
                      title="Waiter called" aria-label="Waiter called" />
                  )}
                  <p className="text-lg font-bold">#{tb.number}</p>
                  <p className="text-xs text-muted-foreground truncate">{tb.name || ''}</p>
                  <span className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium', cls)}>
                    {label}
                  </span>
                  <Pencil className="absolute bottom-2 right-2 size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); openEditTable(tb) }} />
                </button>
              )
            })}
          </div>
        )}

        {/* ── Detail panel (only when table selected) ── */}
        {selected && (
          <div className="border rounded-lg bg-card mt-4">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Armchair className="size-4 text-primary" />
                  <h2 className="text-lg font-bold">{selected.name} {t.tables.tableDetail}</h2>
                  {selected.status === 'occupied' && sessionSummary && (() => {
                    const tp = sessionSummary.totalPaid ?? 0
                    const rem = sessionSummary.remaining ?? 0
                    if (tp > 0 && rem > 0) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">{t.tables.status.settling}</span>
                    if (rem <= 0 && tp > 0) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600">{t.tables.status.fullyPaid}</span>
                    return null
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selected.capacity ?? '?'} {t.tables.guests} &bull; <span className="font-mono">{formatDurationMs(elapsedMs)}</span> {t.tables.elapsed}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Action buttons row */}
            <div className="px-4 py-3 border-b flex flex-wrap gap-2">
              {selected.waiterCalledAt && (
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={async () => {
                    try {
                      const updated = await api.ackWaiterCall(storeId!, selected.id)
                      setSelected(updated); fetchData()
                      notify.success('✓')
                    } catch (e) { notify.fromError(e) }
                  }}>
                  <Bell className="size-4 mr-1" />{t.tableDetail.ackWaiterCall}
                </Button>
              )}
              {(selected.status === 'occupied' || selected.status === 'bill-requested') && (
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    try {
                      const updated = await api.setTableStatus(storeId!, selected.id, 'cleaning')
                      setSelected(updated); fetchData()
                      notify.success('✓')
                    } catch (e) { notify.fromError(e) }
                  }}>
                  <Sparkles className="size-4 mr-1" />{t.tableDetail.markCleaning}
                </Button>
              )}
              {selected.status === 'cleaning' && (
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    try {
                      const updated = await api.setTableStatus(storeId!, selected.id, 'idle')
                      setSelected(updated); fetchData()
                      notify.success('✓')
                    } catch (e) { notify.fromError(e) }
                  }}>
                  <CheckCircle2 className="size-4 mr-1" />{t.tableDetail.markIdle}
                </Button>
              )}
              {sessionSummary && (sessionSummary.remaining ?? 0) <= 0 && (sessionSummary.totalPaid ?? 0) > 0 && sessionSummary.status !== 'closed' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    try {
                      await api.closeSession(storeId!, sessionSummary.id)
                      notify.success(lang === 'zh' ? '已翻桌' : 'Table turned')
                      refresh()
                    } catch (e) { notify.fromError(e) }
                  }}>
                  <CheckCircle2 className="size-4 mr-1" />{lang === 'zh' ? '翻桌' : 'Close Table'}
                </Button>
              )}
              <Button size="sm" onClick={() => setOrderingOpen(true)}>
                <Plus className="size-4 mr-1" />{t.tables.addItems}
              </Button>
              <Button size="sm" variant="outline" disabled={sessionOrders.length === 0}
                onClick={() => printSessionReceipt(sessionOrders, selected!, sessionSummary, lang)}>
                <Printer className="size-4 mr-1" />{t.tables.printBill}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="size-4 mr-1" />{t.tables.transfer}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintQr}>
                <QrCode className="size-4 mr-1" />{t.tables.printQr}
              </Button>
              {selected.status !== 'occupied' && (
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!confirm('Regenerate QR code? The old QR code will stop working.')) return
                  try {
                    const updated = await api.regenerateQr(storeId!, selected!.id)
                    fetchData()
                    setSelected(updated)
                  } catch (e) { console.error(e) }
                }}>
                  <RefreshCw className="size-4 mr-1" />{lang === 'zh' ? '重新生成 QR' : 'New QR'}
                </Button>
              )}
              {selected.enabled && selected.status !== 'occupied' && (
                <Button size="sm" variant="outline" className="text-red-600" onClick={async () => {
                  if (!confirm(t.tables.confirmDisable)) return
                  try {
                    await api.disableTable(storeId!, selected.id)
                    fetchData()
                    setSelected(null)
                  } catch (e) { console.error(e) }
                }}>
                  {t.tables.disable}
                </Button>
              )}
              <div className="flex-1" />
              <Button size="sm" className="bg-green-500 hover:bg-green-600"
                disabled={!currentOrder}
                onClick={() => selected?.currentSessionId ? setSessionDialogOpen(true) : setCloseOpen(true)}>
                <CheckCircle2 className="size-4 mr-1" />{t.tables.checkout}
              </Button>
            </div>

            {/* Tabs: Current / History */}
            <div className="flex border-b">
              <button onClick={() => setViewTab('current')}
                className={cn('flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px]',
                  viewTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
                {lang === 'zh' ? '当前' : 'Current'} ({sessionOrders.length})
              </button>
              <button onClick={() => setViewTab('history')}
                className={cn('flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px]',
                  viewTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
                {lang === 'zh' ? '历史' : 'History'} ({pastOrders.length})
              </button>
            </div>

            {/* Order list */}
            <div className="px-4 py-3">
              {displayOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">
                  {viewTab === 'history' ? t.tables.noPastOrders : t.tables.noActiveOrders}
                </p>
              ) : viewTab === 'history' ? (
                // History: grouped by order with date
                displayOrders.map(o => {
                  // Use session-level tax/fee (server-calculated), apportioned per order
                  const sessionTax = sessionSummary?.tax ?? 0
                  const sessionFee = sessionSummary?.serviceFee ?? 0
                  const sessionFood = sessionSummary?.totalAmount ?? o.totalPrice
                  const ratio = sessionFood > 0 ? o.totalPrice / sessionFood : 0
                  const oTax = Math.round(sessionTax * ratio)
                  const oFee = Math.round(sessionFee * ratio)
                  return (
                    <div key={o.id} className="mb-3 border rounded-lg p-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span className="font-medium">#{o.orderNumber}</span>
                        <span>{new Date(o.createdAt).toLocaleDateString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {o.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-sm py-0.5">
                          <span>{it.quantity}x {localized(it, lang)}</span>
                          <span className="text-muted-foreground">{formatPriceUSD(itemPrice(it))}</span>
                        </div>
                      ))}
                      <div className="border-t mt-1 pt-1 space-y-0.5 text-xs text-muted-foreground">
                        {oTax > 0 && <div className="flex justify-between"><span>{t.tables.taxFee}</span><span>+{formatPriceUSD(oTax)}</span></div>}
                        {oFee > 0 && <div className="flex justify-between"><span>{t.tables.serviceFee}</span><span>+{formatPriceUSD(oFee)}</span></div>}
                        <div className="flex justify-between text-sm font-medium">
                          <span>{t.common.total}</span>
                          <span>{formatPriceUSD(o.totalPrice + oTax + oFee)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : displayOrders.map(o => (
                <div key={o.id} className="mb-3">
                  {/* Per-order header with edit button */}
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">#{o.orderNumber}</span>
                    <Button size="sm" variant="ghost" className="min-h-[44px] text-primary"
                      onClick={() => setEditingOrder(o)}>
                      {lang === 'zh' ? '编辑订单' : 'Edit Order'}
                    </Button>
                  </div>
                  {o.items.map((it, i) => {
                    const itemKey = `${o.id}:${i}`
                    const isPaid = paidItemSet.has(itemKey) || [...paidItemSet].some(k => k.startsWith(itemKey + ':'))
                    return (
                      <div key={`${o.id}-${i}`} className={cn('bg-muted/30 rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 shadow-sm hover:shadow-md transition-shadow flex gap-3', isPaid && 'opacity-40')}>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                          {menuItemMap[it.menuItemId] ? (
                            <img src={menuItemMap[it.menuItemId]} alt={localized(it, lang)} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl text-muted-foreground">{localized(it, lang).charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{localized(it, lang)}</p>
                            {isPaid && <span className="text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5">{lang === 'zh' ? '已付' : 'Paid'}</span>}
                          </div>
                          {it.selectedOptions && it.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {it.selectedOptions.map((opt, idx) => (
                                <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 rounded px-1.5 py-0.5">
                                  {optionLabel(opt)}
                                </span>
                              ))}
                            </div>
                          )}
                          {it.remark && <p className="text-sm text-muted-foreground italic">{t.tables.note}: {it.remark}</p>}
                          <p className="text-xs text-gray-400 mt-1">{t.tables.qty}: {it.quantity}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          {it.voided ? (
                            <>
                              <span className="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5">{t.voidItem?.voided || 'VOIDED'}</span>
                              <p className="text-sm text-muted-foreground line-through">{formatPriceUSD(itemPrice(it))}</p>
                            </>
                          ) : (
                            <>
                              <p className={cn('font-semibold', isPaid ? 'text-green-600 line-through' : 'text-primary')}>{formatPriceUSD(itemPrice(it))}</p>
                              {!isPaid && (
                                <Button size="sm" variant="ghost"
                                  className="min-h-[44px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVoidTarget({ orderId: o.id, itemIndex: i })
                                    setVoidReason('')
                                  }}>
                                  {t.voidItem?.button || 'Void'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Payment summary footer */}
            {viewTab === 'current' && sessionOrders.length > 0 && (
              <div className="border-t px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t.common.subtotal}</span><span>{formatPriceUSD(subtotal)}</span></div>
                {serviceFee > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.tables.serviceFee}</span><span>+{formatPriceUSD(serviceFee)}</span></div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.tables.taxFee}</span><span>+{formatPriceUSD(tax)}</span></div>
                )}
                {totalPaid > 0 && (
                  <div className="flex justify-between"><span className="text-green-600">{lang === 'zh' ? '已付' : 'Paid'}</span><span className="text-green-600">-{formatPriceUSD(totalPaid)}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1">
                  <span>{totalPaid > 0 ? (lang === 'zh' ? '待付' : 'Remaining') : t.common.total}</span>
                  <span className="text-primary">{formatPriceUSD(remaining)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CloseTableDialog table={selected} storeId={storeId} open={closeOpen}
        onOpenChange={setCloseOpen} onClosed={() => { setSelected(null); refresh() }} />
      {currentOrder && (
        <TransferTableDialog open={transferOpen} onClose={() => setTransferOpen(false)}
          order={currentOrder} storeId={storeId} onTransferred={refresh} />
      )}
      {sessionDialogOpen && selected?.currentSessionId && storeId && (
        <SplitBillManager
          open={sessionDialogOpen}
          onClose={() => { setSessionDialogOpen(false); fetchData() }}
          storeId={storeId}
          sessionId={selected.currentSessionId}
        />
      )}
      <TableCrudDialog table={editingTable} storeId={storeId} open={crudOpen}
        onClose={() => setCrudOpen(false)} onSaved={() => { fetchData(); setCrudOpen(false) }}
        activeZone={activeZone} zones={zones} />
      {selected && <>
        <OrderingSheet
          open={orderingOpen}
          onClose={() => setOrderingOpen(false)}
          storeId={storeId}
          tableId={selected.id}
          tableName={selected.name}
          onOrderCreated={refresh}
        />
        <OrderEditDialog
          order={editingOrder}
          storeId={storeId}
          open={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => { setEditingOrder(null); refresh() }}
          isOwner={true}
        />
      </>}

      {/* Void Item Dialog */}
      <Dialog open={!!voidTarget} onOpenChange={open => { if (!open) setVoidTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.voidItem?.confirm || 'Void this item? Price will be set to $0.'}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t.voidItem?.reason || 'Reason (optional)'}
            value={voidReason}
            onChange={e => setVoidReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]"
              onClick={() => setVoidTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" className="min-h-[44px]"
              onClick={async () => {
                if (!voidTarget) return
                try {
                  await api.voidItem(storeId, voidTarget.orderId, voidTarget.itemIndex, voidReason || undefined)
                  refresh()
                } catch { /* silent */ }
                setVoidTarget(null)
              }}>
              {t.voidItem?.button || 'Void'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
