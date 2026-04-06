import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Table } from '@qr-order/shared'

interface Props {
  table: Table | null    // null = create mode, non-null = edit mode
  storeId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function TableCrudDialog({ table, storeId, open, onClose, onSaved }: Props) {
  const { t } = useT()
  const isNew = !table
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(table?.name ?? '')
      setError(null)
    }
  }, [open, table])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await api.createTable(storeId, trimmed)
      } else {
        await api.updateTable(storeId, table.id, { name: trimmed })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!table) return
    if (!confirm(t.tables.confirmDelete)) return
    try {
      await api.deleteTable(storeId, table.id)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{isNew ? t.tables.addTitle : t.tables.editTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t.tables.nameLabel}</label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder={t.tables.namePlaceholder} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-between">
            {!isNew ? (
              <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete}>
                <Trash2 className="size-4 mr-1" />{t.common.delete}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}
                className="bg-primary hover:bg-primary/90">
                {saving ? '...' : (isNew ? t.common.add : t.common.save)}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
