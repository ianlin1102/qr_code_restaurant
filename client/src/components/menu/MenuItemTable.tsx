import { useState, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { formatPriceUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MenuItem, Category } from '@qr-order/shared'

interface GroupedCategory extends Category {
  items: MenuItem[]
}

interface MenuItemTableProps {
  items: MenuItem[]
  categories: Category[]
  viewMode?: string
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
  onToggleAvailable: (item: MenuItem) => void
  onInlineEdit: (id: string, field: string, value: unknown) => void
  onAddToOrder?: (item: MenuItem) => void
}

export default function MenuItemTable({
  items,
  categories,
  onEdit,
  onDelete,
  onToggleAvailable,
  onInlineEdit,
  onAddToOrder,
}: MenuItemTableProps) {
  const grouped: GroupedCategory[] = categories
    .map(cat => ({
      ...cat,
      items: items.filter(i => i.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter(cat => cat.items.length > 0)

  return (
    <>
      <DesktopTable
        grouped={grouped}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleAvailable={onToggleAvailable}
        onInlineEdit={onInlineEdit}
        onAddToOrder={onAddToOrder}
      />
      <MobileCards
        grouped={grouped}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleAvailable={onToggleAvailable}
        onAddToOrder={onAddToOrder}
      />
    </>
  )
}

/* ---------- Inline editable text ---------- */

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
        title="click to edit"
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

/* ---------- Desktop table ---------- */

function DesktopTable({
  grouped,
  onEdit,
  onDelete,
  onToggleAvailable,
  onInlineEdit,
  onAddToOrder,
}: {
  grouped: GroupedCategory[]
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
  onToggleAvailable: (item: MenuItem) => void
  onInlineEdit: (id: string, field: string, value: unknown) => void
  onAddToOrder?: (item: MenuItem) => void
}) {
  const { t, lang } = useT()
  return (
    <div className="hidden md:block space-y-6">
      {grouped.map(cat => (
        <div key={cat.id}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{localized(cat, lang)}</h2>
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t.menu.dishName}</TableHead>
                  <TableHead className="w-[100px]">{t.common.price}</TableHead>
                  <TableHead className="w-[120px]">{t.menu.specs}</TableHead>
                  <TableHead className="w-[80px]">{t.common.status}</TableHead>
                  <TableHead className="w-[140px] text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cat.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                      {t.menu.noItems}
                    </TableCell>
                  </TableRow>
                ) : (
                  cat.items.map(item => (
                    <TableRow key={item.id} className={cn(
                      !item.available && 'opacity-50'
                    )}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 shrink-0" />
                          )}
                          <div>
                            <InlineEdit
                              value={localized(item, lang)}
                              onSave={val => onInlineEdit(item.id, lang === 'en' ? 'nameEn' : 'name', val)}
                              className="font-medium"
                            />
                            {localizedDesc(item, lang) && (
                              <span className="text-xs text-muted-foreground ml-2">{localizedDesc(item, lang)}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <InlineEdit
                          value={(item.price / 100).toFixed(2)}
                          type="price"
                          onSave={val => onInlineEdit(item.id, 'price', Math.round(parseFloat(val || '0') * 100))}
                          className="font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => onEdit(item)}
                          className="flex flex-wrap gap-1 hover:opacity-70 transition-opacity cursor-pointer text-left">
                          {item.options && item.options.length > 0 ? (
                            item.options.map(opt => (
                              <Badge key={opt.id} variant="secondary" className="text-xs">
                                {localized(opt, lang)}({opt.choices.length})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Switch checked={item.available} onCheckedChange={() => onToggleAvailable(item)} />
                          {item.staffOnly && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Staff</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {onAddToOrder && item.available && (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={() => onAddToOrder(item)}>
                              +
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                            {t.common.edit}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(item.id)}>
                            {t.common.delete}
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
  )
}

/* ---------- Mobile cards ---------- */

function MobileCards({
  grouped,
  onEdit,
  onDelete,
  onToggleAvailable,
  onAddToOrder,
}: {
  grouped: GroupedCategory[]
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
  onToggleAvailable: (item: MenuItem) => void
  onAddToOrder?: (item: MenuItem) => void
}) {
  const { t, lang } = useT()
  return (
    <div className="md:hidden space-y-4">
      {grouped.map(cat => (
        <div key={cat.id}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{localized(cat, lang)}</h2>
          <div className="space-y-2">
            {cat.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.menu.noItems}</p>
            ) : (
              cat.items.map(item => (
                <div key={item.id} className={cn(
                  'p-3 rounded-lg border bg-card',
                  !item.available && 'opacity-50'
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{localized(item, lang)}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold shrink-0">{formatPriceUSD(item.price)}</span>
                  </div>
                  {item.options && item.options.length > 0 && (
                    <button type="button" onClick={() => onEdit(item)}
                      className="flex flex-wrap gap-1 mt-1 hover:opacity-70 transition-opacity">
                      {item.options.map(opt => (
                        <Badge key={opt.id} variant="secondary" className="text-xs">{localized(opt, lang)}({opt.choices.length})</Badge>
                      ))}
                    </button>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Switch checked={item.available} onCheckedChange={() => onToggleAvailable(item)} />
                    <div className="flex gap-2">
                      {onAddToOrder && item.available && (
                        <Button size="sm" className="min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => onAddToOrder(item)}>+</Button>
                      )}
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => onEdit(item)}>{t.common.edit}</Button>
                      <Button variant="outline" size="sm" className="min-h-[44px] text-red-600" onClick={() => onDelete(item.id)}>{t.common.delete}</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
