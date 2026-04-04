import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { Loader2, GripVertical } from 'lucide-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Category, MenuItem } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'
import { localized } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export default function CategoryManagePage() {
  const { t, lang } = useT()
  const STORE_ID = useAuthStore(s => s.user!.storeId)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<{ name: string; nameEn?: string; sortOrder: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null) // null = adding new
  const [saving, setSaving] = useState(false)

  // Inline edit state (name)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState('')
  const inlineRef = useRef<HTMLInputElement>(null)

  // Inline edit state (sortOrder)
  const [sortEditId, setSortEditId] = useState<string | null>(null)
  const [sortEditValue, setSortEditValue] = useState('')
  const sortRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const [catsData, itemsData] = await Promise.all([
        api.getCategories(STORE_ID),
        api.getMenuItems(STORE_ID),
      ])
      setCategories(catsData)
      setMenuItems(itemsData)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const itemCountForCategory = (catId: string) =>
    menuItems.filter(i => i.categoryId === catId).length

  // ===== CRUD =====

  const openDialog = (cat?: Category) => {
    if (cat) {
      setEditingCat({ name: cat.name, nameEn: cat.nameEn ?? '', sortOrder: cat.sortOrder })
      setEditingId(cat.id)
    } else {
      const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder), 0)
      setEditingCat({ name: '', nameEn: '', sortOrder: maxSort + 1 })
      setEditingId(null)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingCat || !editingCat.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await api.updateCategory(STORE_ID, editingId, { ...editingCat, nameEn: editingCat.nameEn?.trim() || undefined })
      } else {
        await api.createCategory(STORE_ID, { name: editingCat.name.trim(), nameEn: editingCat.nameEn?.trim() || undefined, sortOrder: editingCat.sortOrder })
      }
      setDialogOpen(false)
      setEditingCat(null)
      setEditingId(null)
      await fetchData()
    } catch (err) {
      console.error('Failed to save category:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    const count = itemCountForCategory(cat.id)
    if (count > 0) {
      alert(`Cannot delete "${localized(cat, lang)}": it has ${count} dishes. Please move or delete them first.`)
      return
    }
    if (!confirm(`Delete category "${localized(cat, lang)}"?`)) return
    try {
      await api.deleteCategory(STORE_ID, cat.id)
      await fetchData()
    } catch (err) {
      console.error('Failed to delete category:', err)
    }
  }

  // ===== Inline name edit =====

  const startInlineEdit = (cat: Category) => {
    setInlineEditId(cat.id); setInlineEditValue(cat.name)
    setTimeout(() => inlineRef.current?.select(), 0)
  }

  const commitInlineEdit = async () => {
    if (!inlineEditId) return
    const trimmed = inlineEditValue.trim(); setInlineEditId(null)
    if (!trimmed) return; const cat = categories.find(c => c.id === inlineEditId)
    if (cat && trimmed !== cat.name) {
      try {
        await api.updateCategory(STORE_ID, inlineEditId, { name: trimmed })
        await fetchData()
      } catch (err) {
        console.error('Failed to update:', err)
      }
    }
  }

  // ===== Sort =====

  /** Swap sortOrder with adjacent category */
  const handleMove = async (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(c => c.id === catId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    try {
      await Promise.all([
        api.updateCategory(STORE_ID, a.id, { sortOrder: b.sortOrder }),
        api.updateCategory(STORE_ID, b.id, { sortOrder: a.sortOrder }),
      ])
      await fetchData()
    } catch (err) {
      console.error('Failed to reorder:', err)
    }
  }

  const startSortEdit = (cat: Category) => {
    setSortEditId(cat.id); setSortEditValue(String(cat.sortOrder))
    setTimeout(() => sortRef.current?.select(), 0)
  }

  const commitSortEdit = async () => {
    if (!sortEditId) return
    const newOrder = parseInt(sortEditValue); setSortEditId(null)
    if (isNaN(newOrder)) return
    const current = categories.find(c => c.id === sortEditId)
    if (!current || current.sortOrder === newOrder) return
    const conflict = categories.find(c => c.id !== sortEditId && c.sortOrder === newOrder)
    try {
      if (conflict) {
        // Swap: conflict takes current's old sortOrder
        await Promise.all([
          api.updateCategory(STORE_ID, sortEditId, { sortOrder: newOrder }),
          api.updateCategory(STORE_ID, conflict.id, { sortOrder: current.sortOrder }),
        ])
      } else {
        await api.updateCategory(STORE_ID, sortEditId, { sortOrder: newOrder })
      }
      await fetchData()
    } catch (err) {
      console.error('Failed to update sort order:', err)
    }
  }

  // ===== Drag-and-drop reorder =====

  const handleDragStart = (id: string) => setDragId(id)
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const fromIdx = sorted.findIndex(c => c.id === dragId)
    const toIdx = sorted.findIndex(c => c.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setCategories(reordered.map((c, i) => ({ ...c, sortOrder: i })))
  }
  const handleDragEnd = async () => {
    setDragId(null)
    for (const cat of categories) {
      await api.updateCategory(STORE_ID, cat.id, { sortOrder: cat.sortOrder })
    }
  }

  // ===== Render =====

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold font-display">{t.categories.title}</h1>
            <p className="text-sm text-muted-foreground">{categories.length} {t.categories.catCount}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => openDialog()}>{t.categories.addCategory}</Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {sorted.map((cat, idx) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDragEnd={handleDragEnd}
              className={cn('p-3 rounded-lg border bg-card flex items-center justify-between gap-2', dragId === cat.id && 'opacity-30', cat.active === false && 'opacity-50')}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMove(cat.id, 'up')}
                  disabled={idx === 0}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >▲</button>
                <button
                  onClick={() => handleMove(cat.id, 'down')}
                  disabled={idx === sorted.length - 1}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >▼</button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{localized(cat, lang)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.categories.sortOrder}: {cat.sortOrder}
                  {' · '}
                  {t.categories.itemCount}: {itemCountForCategory(cat.id)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div onPointerDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
                  <Switch
                    checked={cat.active !== false}
                    onCheckedChange={async (checked) => {
                      try {
                        await api.updateCategory(STORE_ID, cat.id, { active: checked })
                        await fetchData()
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Failed to update')
                      }
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => openDialog(cat)}>
                  {t.common.edit}
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px] text-red-600" onClick={() => handleDelete(cat)}>
                  {t.common.delete}
                </Button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t.categories.emptyPrompt}</p>
          )}
        </div>

        <div className="hidden md:block bg-card rounded-2xl shadow-card border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-[60px] text-center">{t.categories.sortOrder}</TableHead>
                <TableHead>{t.categories.categoryName}</TableHead>
                <TableHead className="w-[100px] text-center">{t.categories.itemCount}</TableHead>
                <TableHead className="w-[80px]">{t.categories.active}</TableHead>
                <TableHead className="w-[200px] text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t.categories.emptyPrompt}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((cat, idx) => (
                  <TableRow
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragStart(cat.id)}
                    onDragOver={(e) => handleDragOver(e, cat.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      cat.active === false && 'opacity-50',
                      dragId === cat.id && 'opacity-30'
                    )}
                  >
                    <TableCell className="w-10 cursor-grab active:cursor-grabbing">
                      <GripVertical className="size-4 text-gray-300" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button onClick={() => handleMove(cat.id, 'up')} disabled={idx === 0}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
                        {sortEditId === cat.id ? (
                          <input ref={sortRef} type="number" value={sortEditValue}
                            onChange={e => setSortEditValue(e.target.value)} onBlur={commitSortEdit}
                            onKeyDown={e => { if (e.key === 'Enter') commitSortEdit(); if (e.key === 'Escape') setSortEditId(null) }}
                            className="w-10 text-center text-xs border rounded py-0.5 outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                        ) : (
                          <span onClick={() => startSortEdit(cat)} title={t.categories.clickToRename}
                            className="text-xs text-muted-foreground cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 rounded transition-colors">{cat.sortOrder}</span>
                        )}
                        <button onClick={() => handleMove(cat.id, 'down')} disabled={idx === sorted.length - 1}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inlineEditId === cat.id ? (
                        <input ref={inlineRef} value={inlineEditValue} onChange={e => setInlineEditValue(e.target.value)}
                          onBlur={commitInlineEdit} onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEditId(null) }}
                          className="border rounded px-2 py-1 text-sm w-full max-w-[200px] outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                      ) : (
                        <span onClick={() => startInlineEdit(cat)} title={t.menu.clickToEdit}
                          className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 -mx-1 rounded transition-colors font-medium">{localized(cat, lang)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center w-[80px]">
                      <span className="text-sm text-muted-foreground tabular-nums">{itemCountForCategory(cat.id)}</span>
                    </TableCell>
                    <TableCell onPointerDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5" draggable={false}>
                        <Switch
                          checked={cat.active !== false}
                          onCheckedChange={async (checked) => {
                            try {
                              await api.updateCategory(STORE_ID, cat.id, { active: checked })
                              await fetchData()
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to update')
                            }
                          }}
                        />
                        <div className="min-w-[60px]">
                          <span className="text-xs font-medium">
                            {cat.active !== false ? t.categories.active : t.categories.hidden}
                          </span>
                          {cat.active === false && (
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {t.categories.hiddenDesc}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => openDialog(cat)}>{t.common.edit}</Button>
                        <Button variant="outline" size="sm" className="min-h-[44px] text-red-600 hover:text-red-700" onClick={() => handleDelete(cat)}>{t.common.delete}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <GripVertical className="size-3" /> {t.categories.dragHint}
        </p>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{editingId ? t.categories.editTitle : t.categories.addTitle}</DialogTitle>
          </DialogHeader>
          {editingCat && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t.categories.nameLabel}</label>
                <Input
                  className="text-base"
                  value={editingCat.name}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  placeholder={t.categories.namePlaceholder}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.categories.nameEnLabel}</label>
                <Input
                  className="text-base"
                  value={editingCat.nameEn ?? ''}
                  onChange={e => setEditingCat({ ...editingCat, nameEn: e.target.value })}
                  placeholder={t.categories.nameEnPlaceholder}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.categories.sortLabel}</label>
                <Input
                  className="text-base"
                  type="number"
                  value={editingCat.sortOrder}
                  onChange={e => setEditingCat({ ...editingCat, sortOrder: parseInt(e.target.value || '0') })}
                />
                <p className="text-xs text-muted-foreground mt-1">{t.categories.sortHint}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
                <Button onClick={handleSave} disabled={saving || !editingCat.name.trim()}>
                  {saving ? t.common.saving : t.common.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
