import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/services/api'
import { formatPriceCNY } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MenuItem, Category, MenuItemOption, MenuItemOptionChoice } from '@qr-order/shared'
import { v4 as uuid } from 'uuid'
import { useAuthStore } from '@/stores/auth-store'

type ViewMode = 'table' | 'preview'

/** Inline editable text — click to edit, blur/Enter to save */
function InlineEdit({
  value,
  onSave,
  className = '',
  type = 'text',
}: {
  value: string
  onSave: (val: string) => void
  className?: string
  type?: 'text' | 'price'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (!editing) {
    return (
      <span
        onClick={startEdit}
        className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 -mx-1 rounded transition-colors ${className}`}
        title="点击编辑"
      >
        {value}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      type={type === 'price' ? 'number' : 'text'}
      step={type === 'price' ? '0.01' : undefined}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={`border rounded px-1 py-0.5 text-sm w-full outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      autoFocus
    />
  )
}

// Blank item template
function blankItem(categoryId: string): Omit<MenuItem, 'id' | 'storeId'> {
  return {
    categoryId,
    name: '',
    description: '',
    price: 0,
    available: true,
    sortOrder: 0,
    options: [],
  }
}

function blankOption(): MenuItemOption {
  return { id: uuid(), name: '', required: false, choices: [] }
}

function blankChoice(): MenuItemOptionChoice {
  return { id: uuid(), name: '', priceAdjust: 0 }
}

export default function MenuManagePage() {
  const STORE_ID = useAuthStore(s => s.user!.storeId)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [itemsData, catsData] = await Promise.all([
        api.getMenuItems(STORE_ID),
        api.getCategories(STORE_ID),
      ])
      setItems(itemsData)
      setCategories(catsData)
    } catch (err) {
      console.error('Failed to fetch menu data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getCategoryName = (catId: string) =>
    categories.find(c => c.id === catId)?.name ?? '未分类'

  // ===== CRUD handlers =====

  const handleAdd = () => {
    const firstCat = categories[0]?.id ?? ''
    setEditingItem(blankItem(firstCat))
    setIsNew(true)
    setDialogOpen(true)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem({ ...item, options: item.options ? JSON.parse(JSON.stringify(item.options)) : [] })
    setIsNew(false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingItem || !editingItem.name || editingItem.price == null) return
    setSaving(true)
    try {
      if (isNew) {
        await api.createMenuItem(STORE_ID, {
          categoryId: editingItem.categoryId!,
          name: editingItem.name,
          description: editingItem.description,
          price: editingItem.price,
          image: editingItem.image,
          available: editingItem.available ?? true,
          sortOrder: editingItem.sortOrder ?? 0,
          options: editingItem.options,
        })
      } else {
        await api.updateMenuItem(STORE_ID, editingItem.id!, editingItem)
      }
      setDialogOpen(false)
      setEditingItem(null)
      await fetchData()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这道菜？')) return
    try {
      await api.deleteMenuItem(STORE_ID, id)
      await fetchData()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await api.updateMenuItem(STORE_ID, item.id, { available: !item.available })
      await fetchData()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  /** Inline quick-save a single field */
  const handleInlineUpdate = async (itemId: string, updates: Partial<MenuItem>) => {
    try {
      await api.updateMenuItem(STORE_ID, itemId, updates)
      await fetchData()
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }

  // ===== Options editing helpers =====

  const updateEditingField = (field: string, value: unknown) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const addOption = () => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? []), blankOption()]
      return { ...prev, options }
    })
  }

  const updateOption = (optIdx: number, field: keyof MenuItemOption, value: unknown) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = { ...options[optIdx], [field]: value }
      return { ...prev, options }
    })
  }

  const removeOption = (optIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = (prev.options ?? []).filter((_, i) => i !== optIdx)
      return { ...prev, options }
    })
  }

  const addChoice = (optIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = {
        ...options[optIdx],
        choices: [...options[optIdx].choices, blankChoice()],
      }
      return { ...prev, options }
    })
  }

  const updateChoice = (optIdx: number, choiceIdx: number, field: keyof MenuItemOptionChoice, value: unknown) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      const choices = [...options[optIdx].choices]
      choices[choiceIdx] = { ...choices[choiceIdx], [field]: value }
      options[optIdx] = { ...options[optIdx], choices }
      return { ...prev, options }
    })
  }

  const removeChoice = (optIdx: number, choiceIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = {
        ...options[optIdx],
        choices: options[optIdx].choices.filter((_, i) => i !== choiceIdx),
      }
      return { ...prev, options }
    })
  }

  // ===== Render =====

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Group items by category for display
  const grouped = categories.map(cat => ({
    ...cat,
    items: items.filter(i => i.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">菜品管理</h1>
            <p className="text-sm text-muted-foreground">{items.length} 道菜品 · {categories.length} 个分类</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'preview' : 'table')}
            >
              {viewMode === 'table' ? '顾客预览' : '表格视图'}
            </Button>
            <Button size="sm" onClick={handleAdd}>
              + 添加菜品
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {viewMode === 'table' ? (
          /* ===== Table View ===== */
          <div className="space-y-6">
            {grouped.map(cat => (
              <div key={cat.id}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">{cat.name}</h2>
                <div className="bg-white rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">菜名</TableHead>
                        <TableHead className="w-[100px]">价格</TableHead>
                        <TableHead className="w-[120px]">规格</TableHead>
                        <TableHead className="w-[80px]">状态</TableHead>
                        <TableHead className="w-[140px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                            暂无菜品
                          </TableCell>
                        </TableRow>
                      ) : (
                        cat.items.map(item => (
                          <TableRow key={item.id} className={!item.available ? 'opacity-50' : ''}>
                            <TableCell>
                              <div>
                                <InlineEdit
                                  value={item.name}
                                  onSave={val => handleInlineUpdate(item.id, { name: val })}
                                  className="font-medium"
                                />
                                {item.description && (
                                  <span className="text-xs text-muted-foreground ml-2">{item.description}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <InlineEdit
                                value={(item.price / 100).toFixed(2)}
                                type="price"
                                onSave={val => handleInlineUpdate(item.id, { price: Math.round(parseFloat(val || '0') * 100) })}
                                className="font-mono"
                              />
                            </TableCell>
                            <TableCell>
                              {item.options && item.options.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.options.map(opt => (
                                    <Badge key={opt.id} variant="secondary" className="text-xs">
                                      {opt.name}({opt.choices.length})
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={item.available}
                                onCheckedChange={() => handleToggleAvailable(item)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                  编辑
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item.id)}>
                                  删除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== Preview View (customer style) ===== */
          <div className="space-y-6">
            {grouped.map(cat => (
              <div key={cat.id}>
                <h2 className="text-lg font-bold mb-3">{cat.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map(item => (
                    <Card key={item.id} className={!item.available ? 'opacity-40' : ''}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                            {item.options && item.options.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.options.map(opt => (
                                  <Badge key={opt.id} variant="outline" className="text-xs">
                                    {opt.name}: {opt.choices.map(c => c.name).join('/')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            {formatPriceCNY(item.price)}
                          </span>
                        </div>
                        {!item.available && (
                          <Badge variant="secondary" className="mt-2">已下架</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== Edit/Add Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? '添加菜品' : '编辑菜品'}</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">菜名 *</label>
                  <Input
                    value={editingItem.name ?? ''}
                    onChange={e => updateEditingField('name', e.target.value)}
                    placeholder="宫保鸡丁"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">价格（元）*</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={((editingItem.price ?? 0) / 100).toFixed(2)}
                      onChange={e => updateEditingField('price', Math.round(parseFloat(e.target.value || '0') * 100))}
                      placeholder="38.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">分类</label>
                    <Select
                      value={editingItem.categoryId ?? ''}
                      onValueChange={v => updateEditingField('categoryId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={editingItem.description ?? ''}
                    onChange={e => updateEditingField('description', e.target.value)}
                    placeholder="经典川菜，麻辣鲜香"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">排序</label>
                    <Input
                      type="number"
                      value={editingItem.sortOrder ?? 0}
                      onChange={e => updateEditingField('sortOrder', parseInt(e.target.value || '0'))}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch
                      checked={editingItem.available ?? true}
                      onCheckedChange={v => updateEditingField('available', v)}
                    />
                    <label className="text-sm">{editingItem.available ? '上架中' : '已下架'}</label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Options / 规格 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">规格选项</label>
                  <Button variant="outline" size="sm" onClick={addOption}>
                    + 添加规格
                  </Button>
                </div>

                {(editingItem.options ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">暂无规格，点击"添加规格"来设置辣度、口味等选项</p>
                )}

                <div className="space-y-4">
                  {(editingItem.options ?? []).map((opt, optIdx) => (
                    <div key={opt.id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Input
                          value={opt.name}
                          onChange={e => updateOption(optIdx, 'name', e.target.value)}
                          placeholder="规格名称（如：辣度）"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={opt.required}
                            onCheckedChange={v => updateOption(optIdx, 'required', v)}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">必选</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeOption(optIdx)}
                        >
                          删除
                        </Button>
                      </div>

                      {/* Choices */}
                      <div className="space-y-1 ml-2">
                        {opt.choices.map((choice, choiceIdx) => (
                          <div key={choice.id} className="flex items-center gap-2">
                            <Input
                              value={choice.name}
                              onChange={e => updateChoice(optIdx, choiceIdx, 'name', e.target.value)}
                              placeholder="选项名（如：微辣）"
                              className="flex-1"
                            />
                            <div className="flex items-center gap-1 w-[100px]">
                              <span className="text-xs text-muted-foreground">+¥</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={(choice.priceAdjust / 100).toFixed(2)}
                                onChange={e => updateChoice(optIdx, choiceIdx, 'priceAdjust', Math.round(parseFloat(e.target.value || '0') * 100))}
                                className="w-20"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 px-2"
                              onClick={() => removeChoice(optIdx, choiceIdx)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addChoice(optIdx)} className="text-xs">
                          + 添加选项
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving || !editingItem.name}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
