import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Table, Order } from '@qr-order/shared'

interface Props {
  table: Table | null
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}

export default function CloseTableDialog({ table, storeId, open, onOpenChange, onClosed }: Props) {
  const { t } = useT()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !table) return
    setLoading(true)
    setError(null)
    api.getOrders(storeId, undefined, table.id)
      .then(data => {
        const active = data.filter(o =>
          o.status === 'pending' || o.status === 'preparing' || o.status === 'paid',
        )
        setOrders(active)
      })
      .catch(err => console.error('Failed to fetch table orders:', err))
      .finally(() => setLoading(false))
  }, [open, table, storeId])

  const handleClose = async () => {
    if (!table) return
    setClosing(true)
    try {
      await api.closeTable(storeId, table.id)
      onOpenChange(false)
      onClosed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close table')
    } finally {
      setClosing(false)
    }
  }

  const grandTotal = orders.reduce((sum, o) => sum + o.totalPrice, 0)

  if (!table) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] md:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.tables.confirmCloseTitle} &quot;{table.name}&quot;?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t.tables.confirmCloseDesc}</p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.common.loading}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t.dashboard.noOrders}
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>#{order.orderNumber}</span>
                  <span>{formatPriceUSD(order.totalPrice)}</span>
                </div>
                <ul className="space-y-0.5">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>{t.tables.grandTotal}</span>
              <span>{formatPriceUSD(grandTotal)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={closing}
          >
            {closing ? t.common.saving : t.tables.closeConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
