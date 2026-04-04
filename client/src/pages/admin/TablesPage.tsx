import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/useT'
import {
  Armchair, Plus, Printer, ArrowLeftRight,
  CheckCircle2, Loader2, QrCode, Pencil, ChevronDown,
} from 'lucide-react'
import { api, type SessionSummary } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { formatPriceUSD } from '@/lib/format'
import { localized } from '@/lib/i18n-utils'
import { printQrCodes } from '@/lib/qr-pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import CloseTableDialog from '@/components/table/CloseTableDialog'
import TransferTableDialog from '@/components/table/TransferTableDialog'
import BillSettleDialog from '@/components/table/BillSettleDialog'
import TableCrudDialog from '@/components/table/TableCrudDialog'
import OrderingSheet from '@/components/order/OrderingSheet'
import type { Table, Order, OrderItem, Store } from '@qr-order/shared'

const POLL = 10_000

function elapsed(ms: number): string {
  const m = Math.floor(ms / 60_000); const s = Math.floor((ms % 60_000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}
function itemPrice(it: OrderItem) {
  return (it.price + (it.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)) * it.quantity
}

export default function TablesPage() {
  const { t, lang } = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''

  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuItemMap, setMenuItemMap] = useState<Record<string, string>>({})

  const [showDisabled, setShowDisabled] = useState(false)
  const [activeZone, setActiveZone] = useState<string>('__base__')

  const [transferOpen, setTransferOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [store, setStore] = useState<Store | null>(null)
  const [viewTab, setViewTab] = useState<'current' | 'history'>('current')
  const [crudOpen, setCrudOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState(() => {
    const saved = localStorage.getItem('qr-base-url')
    return saved || window.location.origin
  })
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [mobileDropdown, setMobileDropdown] = useState(false)
  const [orderingOpen, setOrderingOpen] = useState(false)
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [tbl, o] = await Promise.all([api.getTables(storeId!, showDisabled), api.getOrders(storeId)])
      setTables(tbl); setOrders(o)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [storeId, showDisabled])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, POLL); return () => clearInterval(id) }, [fetchData, showDisabled])
  useEffect(() => { if (storeId) api.getStore(storeId).then(setStore).catch(() => {}) }, [storeId])

  // Fetch session summary when a table with active session is selected (or on poll)
  const fetchSession = useCallback(() => {
    if (!storeId || !selected?.currentSessionId) { setSessionSummary(null); return }
    api.getSessionSummary(storeId, selected.currentSessionId).then(setSessionSummary).catch(() => setSessionSummary(null))
  }, [storeId, selected?.currentSessionId])
  useEffect(() => { fetchSession() }, [fetchSession])
  // Also refresh session summary when orders change (poll picks up new orders)
  useEffect(() => { if (selected?.currentSessionId) fetchSession() }, [orders, fetchSession, selected?.currentSessionId])

  // Auto-select table from ?select= query param (from floor plan → table link)
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
    if (!selected?.currentSessionId) return [] // no active session → no current orders
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
  const allItems = useMemo(() => sessionOrders.flatMap(o => o.items), [sessionOrders])
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

  const handleSelect = (tb: Table) => { setSelected(tb); setViewTab('current'); setMobileDropdown(false) }
  const refresh = useCallback(() => { fetchData(); fetchSession(); setCloseOpen(false); setTransferOpen(false) }, [fetchData, fetchSession])

  const updateBaseUrl = (url: string) => {
    setBaseUrl(url)
    localStorage.setItem('qr-base-url', url)
  }
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
  const handlePrintQr = () => printQrCodes(selected ? [selected] : zoneTables, baseUrl, 'Restaurant')
  const handlePrintAllQr = () => {
    // Print all tables in current zone (sorted by number)
    printQrCodes(zoneTables, baseUrl, 'Restaurant')
  }
  const openAddTable = () => { setEditingTable(null); setCrudOpen(true) }
  const openEditTable = (tb: Table) => { setEditingTable(tb); setCrudOpen(true) }

  const statusBadge = (status: Table['status']) => {
    if (status === 'occupied') return { label: t.tables.status.occupied, cls: 'text-red-600 bg-red-50' }
    return { label: t.tables.status.idle, cls: 'text-green-600 bg-green-50' }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* ── Mobile: Zone tabs + Table Selector ── */}
      <div className="md:hidden border-b bg-muted px-3 py-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setActiveZone('__base__')}
            className={cn('px-2 py-1 rounded text-xs font-medium',
              activeZone === '__base__' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>
            {t.floorPlan?.allZone || 'Base'}
          </button>
          {zones.map(z => (
            <button key={z} onClick={() => setActiveZone(z)}
              className={cn('px-2 py-1 rounded text-xs font-medium',
                activeZone === z ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>
              {z}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setMobileDropdown(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-background rounded border text-sm"
          >
            <span>{selected ? selected.name : t.tables.selectTableMobile}</span>
            <ChevronDown className={cn('size-4 transition-transform', mobileDropdown && 'rotate-180')} />
          </button>
          {mobileDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border rounded shadow-lg max-h-60 overflow-y-auto">
              {zoneTables.map(tb => {
                const { label, cls } = statusBadge(tb.status)
                return (
                  <button key={tb.id} onClick={() => handleSelect(tb)}
                    className={cn('w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted',
                      selected?.id === tb.id && 'bg-blue-50',
                      !tb.enabled ? 'opacity-50' : '')}>
                    <span>#{tb.number} {tb.name || ''}</span>
                    <span className={cn('text-xs px-2 rounded', cls)}>{label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Left: Table List (desktop) ── */}
      <aside className="w-56 shrink-0 bg-muted flex-col hidden md:flex">
        <div className="px-3 pt-3 pb-1">
          <label className="text-[10px] text-gray-400 font-semibold tracking-wide">{t.tables.baseUrl}</label>
          <Input value={baseUrl} onChange={e => updateBaseUrl(e.target.value)}
            className="h-7 text-xs mt-0.5" placeholder="http://192.168.1.x:5173" />
          {isLocalhost && (
            <p className="text-[10px] text-orange-500 mt-0.5">{t.tables.baseUrlWarning}</p>
          )}
        </div>
        <div className="px-3 pt-2 pb-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 font-semibold tracking-wide">{t.tables.tableStatus}</p>
            <button onClick={handlePrintAllQr} className="p-1 text-gray-400 hover:text-gray-600" title={t.tables.printAllQr}>
              <QrCode className="size-4" />
            </button>
          </div>
          <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={openAddTable}>
            <Plus className="size-3.5" />{t.tables.enableNew}
          </Button>
        </div>
        <div className="px-3 pb-2 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setActiveZone('__base__')}
              className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                activeZone === '__base__' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>
              {t.floorPlan?.allZone || 'Base'}
            </button>
            {zones.map(z => (
              <button key={z} onClick={() => setActiveZone(z)}
                className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  activeZone === z ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>
                {z}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showDisabled}
              onChange={e => setShowDisabled(e.target.checked)}
              className="rounded" />
            {t.tables.showDisabled}
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {zoneTables.map(tb => {
            const { label, cls } = statusBadge(tb.status)
            const isActive = selected?.id === tb.id
            return (
              <button key={tb.id} onClick={() => handleSelect(tb)}
                className={cn('w-full flex items-center justify-between px-2 py-2 rounded cursor-pointer text-sm transition-colors group',
                  isActive ? 'bg-blue-50 border-l-2 border-primary' : 'hover:bg-background',
                  !tb.enabled ? 'opacity-50' : '')}>
                <span className={cn('font-medium', isActive && 'font-semibold text-primary')}>
                  #{tb.number} {tb.name || ''}
                </span>
                <div className="flex items-center gap-1">
                  <span className={cn('text-xs px-2 rounded', cls)}>{label}</span>
                  <Pencil className="size-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); openEditTable(tb) }} />
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Center: Detail ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
          <Armchair className="size-20 opacity-20" />
          <p className="text-lg">{t.tables.selectTable}</p>
          <p className="text-sm">{t.tables.selectTableHint}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Armchair className="size-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold">{selected.name} {t.tables.tableDetail}</h2>
              </div>
              <p className="text-sm text-gray-500">
                {selected.capacity ?? '?'} {t.tables.guests} &bull; <span className="font-mono">{elapsed(elapsedMs)}</span> {t.tables.elapsed}
              </p>
            </div>
            <Input placeholder={t.tables.searchMenu} className="w-full sm:w-48" />
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="flex gap-1 border-b mb-3">
              <button onClick={() => setViewTab('current')}
                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${viewTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                {lang === 'zh' ? '当前' : 'Current'} ({sessionOrders.length})
              </button>
              <button onClick={() => setViewTab('history')}
                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${viewTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                {lang === 'zh' ? '历史' : 'History'} ({pastOrders.length})
              </button>
            </div>
            {displayOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                {viewTab === 'history' ? t.tables.noPastOrders : t.tables.noActiveOrders}
              </p>
            ) : viewTab === 'history' ? (
              // History: grouped by order with date
              displayOrders.map(o => {
                const oTax = Math.round(o.totalPrice * (store?.taxRate ?? 0) / 100)
                const oFee = Math.round(o.totalPrice * (store?.serviceFeeRate ?? 0) / 100)
                return (
                  <div key={o.id} className="mb-3 border rounded-lg p-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="font-medium">#{o.orderNumber}</span>
                      <span>{new Date(o.createdAt).toLocaleDateString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {o.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-sm py-0.5">
                        <span>{it.quantity}x {localized(it, lang)}</span>
                        <span className="text-muted-foreground">{formatPriceUSD((it.price + (it.selectedOptions ?? []).reduce((s, op) => s + op.priceAdjust, 0)) * it.quantity)}</span>
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
            ) : displayOrders.flatMap(o => o.items.map((it, i) => {
              const itemKey = `${o.id}:${i}`
              // Check paid status: exact match or partial qty match (key format "orderId:idx" or "orderId:idx:qty")
              const isPaid = paidItemSet.has(itemKey) || [...paidItemSet].some(k => k.startsWith(itemKey + ':'))
              return (
                <div key={`${o.id}-${i}`} className={`bg-card rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 shadow-sm hover:shadow-md transition-shadow flex gap-3 ${isPaid ? 'opacity-40' : ''}`}>
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
                            {(opt.optionName || opt.optionNameEn || '')}{(opt.optionName || opt.optionNameEn) ? ': ' : ''}{(opt.choiceName || opt.choiceNameEn || '')}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.remark && <p className="text-sm text-muted-foreground italic">{t.tables.note}: {it.remark}</p>}
                    <p className="text-xs text-gray-400 mt-1">{t.tables.qty}: {it.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold ${isPaid ? 'text-green-600 line-through' : 'text-primary'}`}>{formatPriceUSD(itemPrice(it))}</p>
                  </div>
                </div>
              )
            }))}
            {viewTab === 'current' && sessionOrders.length > 0 && (
              <div className="bg-card rounded-xl p-3 sm:p-4 mt-4 grid grid-cols-3 gap-3 sm:gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400">{t.tables.totalItems}</p>
                  <p className="text-lg font-bold">{allItems.reduce((s, it) => s + it.quantity, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{lang === 'zh' ? '待付' : 'Due'}</p>
                  <p className="text-lg font-bold text-primary">{formatPriceUSD(remaining)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t.tables.time}</p>
                  <p className="text-lg font-bold font-mono">{elapsed(elapsedMs)}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile: Action buttons (visible on small screens when right sidebar is hidden) ── */}
          <div className="md:hidden border-t bg-card p-3 space-y-2">
            {sessionOrders.length > 0 && (
              <div className="space-y-1 text-sm px-1">
                {totalPaid > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{lang === 'zh' ? '已付' : 'Paid'}</span>
                    <span className="text-green-600">−{formatPriceUSD(totalPaid)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{totalPaid > 0 ? (lang === 'zh' ? '待付' : 'Remaining') : t.common.total}</span>
                  <span className="font-bold text-primary text-lg">{formatPriceUSD(remaining)}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
            <Button size="sm" className="flex-1 min-w-[120px]"
              onClick={() => setOrderingOpen(true)}>
              <Plus className="size-4 mr-1" />{t.tables.addItems}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 min-w-[120px]"
              disabled={!currentOrder}
              onClick={() => currentOrder && api.reprintOrder(storeId, currentOrder.id)}>
              <Printer className="size-4 mr-1" />{t.tables.printBill}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 min-w-[120px]"
              onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="size-4 mr-1" />{t.tables.transfer}
            </Button>
            <Button size="sm" className="flex-1 min-w-[120px]" variant="outline"
              onClick={handlePrintQr}>
              <QrCode className="size-4 mr-1" />{t.tables.printQr}
            </Button>
            <Button size="sm" className="w-full bg-green-500 hover:bg-green-600"
              disabled={!currentOrder}
              onClick={() => selected?.currentSessionId ? setSessionDialogOpen(true) : setCloseOpen(true)}>
              <CheckCircle2 className="size-4 mr-1" />{t.tables.checkout}
            </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Right: Actions (desktop) ── */}
      {selected && (
        <aside className="w-64 shrink-0 border-l bg-card flex-col hidden md:flex">
          <div className="p-4 border-b">
            <p className="text-xs text-gray-400 font-semibold tracking-wide">{t.tables.orderActions}</p>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <ActionBtn icon={Plus} label={t.tables.addItems} primary
              onClick={() => setOrderingOpen(true)} />
            <ActionBtn icon={Printer} label={t.tables.printBill} disabled={!currentOrder} onClick={() => currentOrder && api.reprintOrder(storeId, currentOrder.id)} />
            <ActionBtn icon={ArrowLeftRight} label={t.tables.transfer} onClick={() => setTransferOpen(true)} />
            <ActionBtn icon={QrCode} label={t.tables.printQr} onClick={handlePrintQr} />
            {selected?.status !== 'occupied' && (
              <Button variant="outline" size="sm"
                onClick={async () => {
                  if (!confirm('Regenerate QR code? The old QR code will stop working.')) return
                  try {
                    const updated = await api.regenerateQr(storeId!, selected!.id)
                    fetchData()
                    setSelected(updated)
                  } catch (e) { console.error(e) }
                }}>
                🔄 {lang === 'zh' ? '重新生成 QR' : 'New QR'}
              </Button>
            )}
            {selected?.enabled && selected.status !== 'occupied' && (
              <Button variant="outline" size="sm" className="text-red-600"
                onClick={async () => {
                  if (!confirm(t.tables.confirmDisable)) return
                  try {
                    await api.disableTable(storeId!, selected.id)
                    fetchData()
                    setSelected(null)
                  } catch (e) {
                    console.error(e)
                  }
                }}>
                {t.tables.disable}
              </Button>
            )}
          </div>
          <div className="flex-1" />
          <div className="border-t p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{t.common.subtotal}</span><span>{formatPriceUSD(subtotal)}</span></div>
            {serviceFee > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">{t.tables.serviceFee}</span><span>+{formatPriceUSD(serviceFee)}</span></div>
            )}
            {tax > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">{t.tables.taxFee}</span><span>+{formatPriceUSD(tax)}</span></div>
            )}
            {totalPaid > 0 && (
              <div className="flex justify-between"><span className="text-green-600">{lang === 'zh' ? '已付' : 'Paid'}</span><span className="text-green-600">−{formatPriceUSD(totalPaid)}</span></div>
            )}
            <div className="flex justify-between text-xl font-bold">
              <span>{totalPaid > 0 ? (lang === 'zh' ? '待付' : 'Remaining') : t.common.total}</span><span className="text-primary">{formatPriceUSD(remaining)}</span>
            </div>
            <Button className="w-full py-4 text-lg font-bold bg-green-500 hover:bg-green-600 mt-3"
              disabled={!currentOrder}
              onClick={() => selected?.currentSessionId ? setSessionDialogOpen(true) : setCloseOpen(true)}>
              <CheckCircle2 className="size-5 mr-2" />{t.tables.checkout}
            </Button>
          </div>
        </aside>
      )}

      {/* Dialogs */}
      <CloseTableDialog table={selected} storeId={storeId} open={closeOpen}
        onOpenChange={setCloseOpen} onClosed={() => { setSelected(null); refresh() }} />
      {currentOrder && (
        <TransferTableDialog open={transferOpen} onClose={() => setTransferOpen(false)}
          order={currentOrder} storeId={storeId} onTransferred={refresh} />
      )}
      {sessionDialogOpen && selected?.currentSessionId && storeId && (
        <BillSettleDialog
          open={sessionDialogOpen}
          onClose={() => { setSessionDialogOpen(false); fetchData() }}
          storeId={storeId}
          sessionId={selected.currentSessionId}
          t={t}
          lang={lang}
        />
      )}
      <TableCrudDialog table={editingTable} storeId={storeId} open={crudOpen}
        onClose={() => setCrudOpen(false)} onSaved={() => { fetchData(); setCrudOpen(false) }}
        activeZone={activeZone} zones={zones} />
      {selected && (
        <OrderingSheet
          open={orderingOpen}
          onClose={() => setOrderingOpen(false)}
          storeId={storeId}
          tableId={selected.id}
          tableName={selected.name}
          onOrderCreated={refresh}
        />
      )}
    </div>
  )
}

function ActionBtn({ icon: Icon, label, primary, disabled, onClick }: {
  icon: typeof Plus; label: string; primary?: boolean; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('w-full flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-medium transition-colors',
        primary ? 'bg-primary text-white hover:bg-primary/90' : 'border hover:bg-background',
        disabled && 'opacity-40 cursor-not-allowed')}>
      <Icon className="size-4" />{label}
    </button>
  )
}
