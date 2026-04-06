import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Order, Table } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  order: Order
  storeId: string
  onTransferred: () => void
}

export default function TransferTableDialog({ open, onClose, order, storeId, onTransferred }: Props) {
  const { t } = useT()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedId(null)
    setLoading(true)
    api.getTables(storeId)
      .then(data => {
        const available = data.filter(
          tbl => tbl.status === 'idle' && tbl.id !== order.tableId,
        )
        setTables(available)
      })
      .catch(err => console.error('Failed to fetch tables:', err))
      .finally(() => setLoading(false))
  }, [open, storeId, order.tableId])

  const handleTransfer = async () => {
    if (!selectedId) return
    setTransferring(true)
    try {
      await api.transferOrder(storeId, order.id, selectedId)
      onTransferred()
      onClose()
    } catch (err) {
      console.error('Failed to transfer order:', err)
    } finally {
      setTransferring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) onClose() }}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] md:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.transferTable.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t.transferTable.currentTable}: {order.tableName}
        </p>

        <p className="text-sm font-medium pt-2">
          {t.transferTable.selectTarget}
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t.common.loading}
          </p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t.transferTable.noAvailable}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tables.map(tbl => (
              <Card
                key={tbl.id}
                className={`cursor-pointer transition-colors ${
                  selectedId === tbl.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedId(tbl.id)}
              >
                <CardContent className="p-3 text-center">
                  <span className="text-sm font-medium">{tbl.name}</span>
                  {tbl.zone && (
                    <span className="block text-xs text-muted-foreground">{tbl.zone}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedId || transferring}
          >
            {transferring
              ? t.common.saving
              : t.transferTable.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
