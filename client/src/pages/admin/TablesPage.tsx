import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Table } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

function getDefaultBaseUrl(): string {
  const { protocol, hostname, port } = window.location
  // 如果从 localhost 访问，提示用户手动填写局域网 IP
  // 如果从局域网 IP 访问（如手机），直接复用当前 hostname
  return `${protocol}//${hostname}:${port || '5173'}`
}

function isLocalhost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

export default function TablesPage() {
  const { t } = useTranslation('admin')
  const STORE_ID = useAuthStore(s => s.user!.storeId)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState(getDefaultBaseUrl)

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNameEn, setEditNameEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Inline rename
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  const fetchTables = useCallback(async () => {
    try {
      const data = await api.getTables(STORE_ID)
      setTables(data)
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  // ===== CRUD =====

  const handleAdd = () => {
    setEditingId(null)
    setEditName('')
    setEditNameEn('')
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleEdit = (table: Table) => {
    setEditingId(table.id)
    setEditName(table.name)
    setEditNameEn(table.nameEn ?? '')
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = editName.trim()
    if (!name) return
    setSaving(true)
    setDialogError(null)
    try {
      const nameEn = editNameEn.trim() || undefined
      if (editingId) {
        await api.updateTable(STORE_ID, editingId, { name, nameEn })
      } else {
        await api.createTable(STORE_ID, name, nameEn)
      }
      setDialogOpen(false)
      await fetchTables()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('tables.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (table: Table) => {
    if (table.status === 'occupied') {
      alert(t('tables.deleteOccupied', { name: table.name }))
      return
    }
    if (!confirm(t('tables.confirmDelete', { name: table.name }))) return
    try {
      await api.deleteTable(STORE_ID, table.id)
      await fetchTables()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('tables.saveFailed'))
    }
  }

  const handleSettle = async (table: Table) => {
    if (!confirm(t('tables.confirmSettle', { name: table.name }))) return
    try {
      const result = await api.settleTable(STORE_ID, table.id)
      alert(t('tables.settled', { count: result.settled }))
      await fetchTables()
    } catch (err) {
      console.error('Failed to settle:', err)
    }
  }

  // ===== Inline rename =====

  const startRename = (table: Table) => {
    setRenameId(table.id)
    setRenameValue(table.name)
    setTimeout(() => renameRef.current?.select(), 0)
  }

  const commitRename = async () => {
    if (!renameId) return
    const name = renameValue.trim()
    setRenameId(null)
    if (!name) return
    const table = tables.find(t => t.id === renameId)
    if (table && name !== table.name) {
      try {
        await api.updateTable(STORE_ID, renameId, { name })
        await fetchTables()
      } catch (err) {
        alert(err instanceof Error ? err.message : t('tables.renameFailed'))
      }
    }
  }

  // ===== Print =====

  const handlePrintAll = () => window.print()

  const handlePrintSingle = (tableName: string) => {
    const cards = document.querySelectorAll<HTMLElement>('[data-table-card]')
    cards.forEach(card => {
      if (card.dataset.tableCard !== tableName) card.style.display = 'none'
    })
    window.print()
    cards.forEach(card => { card.style.display = '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const idleCount = tables.filter(t => t.status === 'idle').length
  const occupiedCount = tables.filter(t => t.status === 'occupied').length

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6 print:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t('tables.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('tables.summary', { total: tables.length, idle: idleCount, occupied: occupiedCount })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleAdd}>{t('tables.addTable')}</Button>
            <Button variant="outline" size="sm" onClick={handlePrintAll}>{t('tables.printAll')}</Button>
          </div>
        </div>

        {/* Base URL config */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground shrink-0">{t('tables.baseUrl')}</label>
          <Input
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="http://192.168.1.39:5173"
            className="font-mono text-base"
          />
        </div>
        {isLocalhost(baseUrl) && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            {t('tables.baseUrlWarning')}
          </div>
        )}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => {
          const scanUrl = `${baseUrl}/scan/${STORE_ID}/${table.id}`
          return (
            <Card
              key={table.id}
              data-table-card={table.name}
              className="print:break-inside-avoid print:border-2"
            >
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-xl">
                  {renameId === table.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setRenameId(null)
                      }}
                      className="border rounded px-2 py-1 text-center text-lg w-full max-w-[120px] mx-auto outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => startRename(table)}
                      className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-2 rounded transition-colors print:cursor-default print:hover:bg-transparent"
                      title={t('tables.nameLabel')}
                    >
                      {table.name}
                    </span>
                  )}
                </CardTitle>
                <Badge
                  variant={table.status === 'idle' ? 'secondary' : 'default'}
                  className="print:hidden w-fit mx-auto"
                >
                  {table.status === 'idle' ? t('tables.idle') : t('tables.occupied')}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={scanUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all print:hidden">
                  {scanUrl}
                </p>
                <p className="hidden print:block text-sm font-medium text-center">
                  {t('tables.scanToOrder')}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handlePrintSingle(table.name)}>
                    {t('tables.print')}
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleEdit(table)}>
                    {t('common:edit')}
                  </Button>
                  {table.status === 'occupied' && (
                    <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleSettle(table)}>
                      {t('tables.settle')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(table)}
                  >
                    {t('common:delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{editingId ? t('tables.editTitle') : t('tables.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('tables.nameLabel')}</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t('tables.namePlaceholder')}
                className="text-base"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('tables.nameDuplicate')}</p>
            </div>
            <div>
              <label className="text-sm font-medium">English Name</label>
              <Input
                value={editNameEn}
                onChange={e => setEditNameEn(e.target.value)}
                placeholder="e.g. Table 1, Room 1"
                className="text-base"
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
            </div>
            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common:cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                {saving ? t('common:saving') : t('common:save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
