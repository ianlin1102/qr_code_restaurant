import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Table } from '@qr-order/shared'

interface Props {
  table: Table | null    // null = enable new table, non-null = edit existing
  storeId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function TableCrudDialog({ table, storeId, open, onClose, onSaved }: Props) {
  const { t } = useT()
  const isNew = !table
  const [name, setName] = useState('')
  const [tableNumber, setTableNumber] = useState<number>(1)
  const [allFull, setAllFull] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(table?.name ?? '')
    setError(null)
    setAllFull(false)
    if (isNew) {
      api.getNextTableNumber(storeId).then(r => {
        setTableNumber(r.number)
        setAllFull(r.allFull)
      }).catch(() => {})
    }
  }, [open, table, isNew, storeId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await api.enableTable(storeId, tableNumber, name.trim() || undefined)
      } else {
        await api.updateTable(storeId, table.id, { name: name.trim() })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{isNew ? t.tables.enableTitle : t.tables.editTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isNew && (
            <div>
              <label className="text-sm font-medium">{t.tables.numberLabel}</label>
              <Input type="number" min={1} value={tableNumber}
                onChange={e => setTableNumber(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">{t.tables.numberHint}</p>
              {allFull && (
                <p className="text-sm text-destructive mt-1">{t.tables.allTablesFull}</p>
              )}
            </div>
          )}
          {!isNew && table && (
            <p className="text-sm text-muted-foreground">#{table.number}</p>
          )}
          <div>
            <label className="text-sm font-medium">{t.tables.displayNameLabel}</label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder={t.tables.displayNamePlaceholder} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving || (isNew && allFull)}
              className="bg-primary hover:bg-primary/90">
              {saving ? '...' : (isNew ? t.tables.enable : t.common.save)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
