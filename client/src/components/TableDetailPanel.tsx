import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import type { Table, Order, OrderItem, OrderStatus } from '@qr-order/shared'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import OrderEditMode from '@/components/OrderEditMode'
import TransferTableDialog from '@/components/TransferTableDialog'
import SplitBillDialog from '@/components/SplitBillDialog'
import { Pencil, ArrowRightLeft, Split } from 'lucide-react'

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
}
const ACTIVE: OrderStatus[] = ['pending', 'paid', 'preparing']

function unitPrice(item: OrderItem): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props { table: Table | null; storeId: string; open: boolean; onClose: () => void }

export default function TableDetailPanel({ table, storeId, open, onClose }: Props) {
  const { t } = useT()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'current' | 'history'>('current')
  const [, setTick] = useState(0)

  const fetchOrders = useCallback(async () => {
    if (!table) return
    setLoading(true)
    try {
      setOrders(await api.getOrders(storeId, undefined, table.id))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [storeId, table])

  useEffect(() => {
    if (open && table) { setTab('current'); fetchOrders() }
  }, [open, table, fetchOrders])

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((prev) => prev + 1), 60_000)
    return () => clearInterval(id)
  }, [open])

  const active = orders.find((o) => ACTIVE.includes(o.status))
  const past = orders
    .filter((o) => o.status === 'completed' || o.status === 'closed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const tabCls = (on: boolean) =>
    `px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
      on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col p-0 w-[380px] sm:max-w-[380px]">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{table?.name ?? t.tables.tableDetail}</SheetTitle>
          {table && (
            <p className="text-sm text-muted-foreground">
              {table.status === 'occupied' ? t.tableDetail.occupied : t.tableDetail.idle}
              {table.capacity ? ` · ${table.capacity} ${t.floorPlan.seats}` : ''}
              {table.zone ? ` · ${table.zone}` : ''}
            </p>
          )}
        </SheetHeader>

        <div className="flex border-b px-4">
          <button className={tabCls(tab === 'current')} onClick={() => setTab('current')}>
            {t.tableDetail.currentOrder}
          </button>
          <button className={tabCls(tab === 'history')} onClick={() => setTab('history')}>
            {t.tableDetail.orderHistory} ({past.length})
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4">
            {loading && <p className="text-sm text-muted-foreground text-center py-8">{t.common.loading}</p>}
            {!loading && tab === 'current' && (
              <CurrentTab order={active ?? null} storeId={storeId} onRefresh={fetchOrders} />
            )}
            {!loading && tab === 'history' && <HistoryTab orders={past} />}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function elapsed(iso: string, t: typeof import('@/i18n/admin').adminT.zh.tableDetail): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return t.justNow
  if (m < 60) return t.minutesAgo.replace('{{m}}', String(m))
  return t.hoursAgo.replace('{{h}}', String(Math.floor(m / 60))).replace('{{m}}', String(m % 60))
}

function CurrentTab({ order, storeId, onRefresh }: {
  order: Order | null; storeId: string; onRefresh: () => void
}) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)

  if (!order) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t.tableDetail.noActiveOrder}</p>
  }
  if (editing) {
    return <OrderEditMode order={order} storeId={storeId}
      onSave={() => { setEditing(false); onRefresh() }}
      onCancel={() => setEditing(false)} />
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">#{order.orderNumber}</span>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => setSplitOpen(true)}>
            <Split className="size-3 mr-1" />{t.splitBill.title}
          </Button>
          <Button size="xs" variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="size-3 mr-1" />{t.transferTable.title}
          </Button>
          <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3 mr-1" />{t.tableDetail.edit}
          </Button>
          <Badge variant="outline" className={STATUS_STYLE[order.status]}>{order.status}</Badge>
        </div>
      </div>
      <div className="text-sm space-y-1 text-muted-foreground">
        {order.customerName && (
          <div className="flex justify-between">
            <span>{t.tableDetail.customer}</span>
            <span className="text-foreground">{order.customerName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{t.tableDetail.elapsed}</span>
          <span className="text-foreground">{elapsed(order.createdAt, t.tableDetail)}</span>
        </div>
      </div>
      <Separator />
      <div className="space-y-3">
        {order.items.map((item, i) => <ItemRow key={i} item={item} />)}
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <span className="font-semibold">{t.tableDetail.total}</span>
        <span className="text-lg font-bold text-primary">{formatPriceUSD(order.totalPrice)}</span>
      </div>
      <TransferTableDialog open={transferOpen} onClose={() => setTransferOpen(false)}
        order={order} storeId={storeId} onTransferred={onRefresh} />
      <SplitBillDialog open={splitOpen} onClose={() => setSplitOpen(false)}
        order={order} storeId={storeId} />
    </div>
  )
}

function ItemRow({ item }: { item: OrderItem }) {
  const { t } = useT()
  return (
    <div className="flex justify-between text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium">{item.name}</span>
          <span className="text-muted-foreground">x{item.quantity}</span>
        </div>
        {item.selectedOptions?.length ? (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {item.selectedOptions.map((o, idx) => (
              <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 rounded px-1.5 py-0.5">
                {o.optionName ? `${o.optionName}: ${o.choiceName}` : o.choiceName}
              </span>
            ))}
          </div>
        ) : null}
        {item.remark && <p className="text-xs text-muted-foreground">{t.tableDetail.note}: {item.remark}</p>}
      </div>
      <span className="shrink-0 ml-2">{formatPriceUSD(unitPrice(item) * item.quantity)}</span>
    </div>
  )
}

function HistoryTab({ orders }: { orders: Order[] }) {
  const { t } = useT()
  if (!orders.length) return <p className="text-sm text-muted-foreground text-center py-8">{t.tableDetail.noPastOrders}</p>
  return (
    <div className="space-y-2">{orders.map((o) => (
      <div key={o.id} className="rounded-md border p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">#{o.orderNumber}</span>
          <Badge variant="outline" className={STATUS_STYLE[o.status]}>{o.status}</Badge>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{o.items.length} {t.menu.items}</span>
          <span>{formatPriceUSD(o.totalPrice)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{fmtTime(o.createdAt)}</p>
      </div>
    ))}</div>
  )
}
