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
import CloseTableDialog from '@/components/CloseTableDialog'
import type { Table } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

const POLL_INTERVAL = 10_000

function getDefaultBaseUrl(): string {
  const { protocol, hostname, port } = window.location
  // Standard ports (80/443) or empty → omit port suffix
  const needsPort = port && port !== '80' && port !== '443'
  return `${protocol}//${hostname}${needsPort ? ':' + port : ''}`
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
  const [activeTableIds, setActiveTableIds] = useState<Set<string>>(new Set())

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNameEn, setEditNameEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Close table dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closingTable, setClosingTable] = useState<Table | null>(null)

  // Inline rename
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  const fetchTablesAndOrders = useCallback(async () => {
    try {
      const [tablesData, ordersData] = await Promise.all([
        api.getTables(STORE_ID),
        api.getOrders(STORE_ID),
      ])
      setTables(tablesData)
      const active = new Set<string>()
      for (const order of ordersData) {
        if (order.status === 'pending' || order.status === 'preparing') {
          active.add(order.tableId)
        }
      }
      setActiveTableIds(active)
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setLoading(false)
    }
  }, [STORE_ID])

  useEffect(() => {
    fetchTablesAndOrders()
    const interval = setInterval(fetchTablesAndOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchTablesAndOrders])

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
      await fetchTablesAndOrders()
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
      await fetchTablesAndOrders()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('tables.saveFailed'))
    }
  }

  const handleSettle = async (table: Table) => {
    if (!confirm(t('tables.confirmSettle', { name: table.name }))) return
    try {
      const result = await api.settleTable(STORE_ID, table.id)
      alert(t('tables.settled', { count: result.settled }))
      await fetchTablesAndOrders()
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
        await fetchTablesAndOrders()
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

  const isTableActive = (table: Table) =>
    table.status === 'occupied' || activeTableIds.has(table.id)

  const idleCount = tables.filter(t => !isTableActive(t)).length
  const occupiedCount = tables.filter(t => isTableActive(t)).length

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
                  variant={isTableActive(table) ? 'default' : 'secondary'}
                  className="print:hidden w-fit mx-auto"
                >
                  {isTableActive(table) ? t('tables.occupied') : t('tables.idle')}
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
                <div className="flex gap-2 flex-wrap justify-center print:hidden">
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handlePrintSingle(table.name)}>
                    {t('tables.print')}
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleEdit(table)}>
                    {t('common:edit')}
                  </Button>
                  {isTableActive(table) && (
                    <>
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleSettle(table)}>
                        {t('tables.settle')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] text-orange-600 hover:text-orange-700"
                        onClick={() => { setClosingTable(table); setCloseDialogOpen(true) }}
                      >
                        {t('tables.closeTable')}
                      </Button>
                    </>
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

      {/* Close Table Dialog */}
      <CloseTableDialog
        table={closingTable}
        storeId={STORE_ID}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onClosed={fetchTablesAndOrders}
      />
    </div>
  )
}
