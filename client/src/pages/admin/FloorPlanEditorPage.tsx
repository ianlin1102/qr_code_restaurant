import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Table } from '@qr-order/shared'

const GRID = 20, DEFAULT_W = 100, DEFAULT_H = 80
const ZONES = ['Main', 'Outdoor', 'Bar', 'VIP']
const ZONE_CLS: Record<string, string> = { Main: 'bg-blue-100 border-blue-400', Outdoor: 'bg-green-100 border-green-400', Bar: 'bg-purple-100 border-purple-400', VIP: 'bg-amber-100 border-amber-400' }
const SHAPES = ['square', 'round', 'long'] as const
const SHAPE_LABELS: Record<string, string> = { square: '■ Square', round: '● Round', long: '▬ Long' }
const snap = (v: number) => Math.round(v / GRID) * GRID
const zoneCls = (z?: string) => ZONE_CLS[z ?? 'Main'] ?? 'bg-gray-100 border-gray-400'

function autoArrange(tables: Table[]): Table[] {
  return tables.map((t, i) => ({ ...t, x: t.x ?? (i % 5) * 140 + 20, y: t.y ?? Math.floor(i / 5) * 120 + 20, width: t.width ?? DEFAULT_W, height: t.height ?? DEFAULT_H }))
}

interface DragState { id: string; ox: number; oy: number; mode: 'move' | 'resize' }

type UpdateTableFn = (s: string, t: string, d: Partial<Table>) => Promise<Table>

export default function FloorPlanEditorPage() {
  const storeId = useAuthStore(s => s.user?.storeId)
  const isOwner = useAuthStore(s => s.isOwner)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const selected = tables.find(tb => tb.id === selectedId) ?? null

  useEffect(() => {
    if (!storeId) return
    api.getTables(storeId)
      .then(data => { setTables(autoArrange(data)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [storeId])

  const onPointerDown = useCallback((e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const tbl = tables.find(tb => tb.id === id)
    if (!tbl) return
    setSelectedId(id)
    if (mode === 'move') setDrag({ id, ox: e.clientX - (tbl.x ?? 0), oy: e.clientY - (tbl.y ?? 0), mode })
    else setDrag({ id, ox: e.clientX, oy: e.clientY, mode })
  }, [tables])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return
    setTables(prev => prev.map(tb => {
      if (tb.id !== drag.id) return tb
      if (drag.mode === 'move') return { ...tb, x: snap(e.clientX - drag.ox), y: snap(e.clientY - drag.oy) }
      return {
        ...tb,
        width: snap(Math.max(60, (tb.width ?? DEFAULT_W) + e.clientX - drag.ox)),
        height: snap(Math.max(40, (tb.height ?? DEFAULT_H) + e.clientY - drag.oy)),
      }
    }))
    if (drag.mode === 'resize') setDrag(p => p ? { ...p, ox: e.clientX, oy: e.clientY } : null)
  }, [drag])

  const onPointerUp = useCallback(() => setDrag(null), [])

  const addTable = async () => {
    if (!storeId) return
    const created = await api.createTable(storeId, `Table ${tables.length + 1}`)
    setTables(prev => [...prev, { ...created, x: 20, y: 20, width: DEFAULT_W, height: DEFAULT_H }])
    setSelectedId(created.id)
  }

  const updateField = (field: keyof Table, value: string | number) => {
    setTables(prev => prev.map(tb => (tb.id === selectedId ? { ...tb, [field]: value } : tb)))
  }

  const deleteSelected = async () => {
    if (!storeId || !selectedId) return
    await api.deleteTable(storeId, selectedId)
    setTables(prev => prev.filter(tb => tb.id !== selectedId))
    setSelectedId(null)
  }

  const saveLayout = async () => {
    if (!storeId) return
    setSaving(true)
    try {
      const fn = api.updateTable as UpdateTableFn
      await Promise.all(tables.map(tb => fn(storeId, tb.id, {
        name: tb.name, nameEn: tb.nameEn, zone: tb.zone, shape: tb.shape,
        capacity: tb.capacity, x: tb.x, y: tb.y, width: tb.width, height: tb.height,
      })))
    } finally { setSaving(false) }
  }

  if (!isOwner()) return (
    <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Access restricted to store owners</p></div>
  )
  if (!storeId) return <p className="p-8 text-muted-foreground">Not authenticated</p>
  if (loading) return <p className="p-8 text-muted-foreground">Loading...</p>

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 p-3 border-b flex-wrap">
          <h1 className="text-lg font-bold mr-auto">Floor Plan Editor</h1>
          <Button size="sm" variant="outline" onClick={addTable}>
            <Plus className="h-4 w-4 mr-1" />Add Table
          </Button>
          <Button size="sm" onClick={saveLayout} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-auto bg-muted/30"
          style={{ minHeight: 600, backgroundImage: 'radial-gradient(circle,#d1d5db 1px,transparent 1px)', backgroundSize: `${GRID}px ${GRID}px` }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          onClick={() => setSelectedId(null)}
        >
          {tables.map(tb => (
            <div
              key={tb.id}
              className={cn(
                'absolute border-2 flex flex-col items-center justify-center cursor-grab select-none',
                tb.shape === 'round' ? 'rounded-full' : 'rounded-lg',
                zoneCls(tb.zone), tb.id === selectedId && 'ring-2 ring-blue-500 border-blue-500 shadow-lg',
              )}
              style={{ left: tb.x, top: tb.y, width: tb.width ?? DEFAULT_W, height: tb.height ?? DEFAULT_H }}
              onPointerDown={e => onPointerDown(e, tb.id, 'move')}
              onClick={e => { e.stopPropagation(); setSelectedId(tb.id) }}
            >
              <span className="text-sm font-semibold truncate px-1">{tb.name}</span>
              {(tb.capacity ?? 0) > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">{tb.capacity} seats</Badge>
              )}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-gray-400/60 rounded-tl"
                onPointerDown={e => onPointerDown(e, tb.id, 'resize')}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-64 shrink-0 bg-muted p-4 space-y-4 overflow-y-auto">
        <h2 className="font-semibold text-sm">Properties</h2>
        {selected ? (<>
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={selected.name} onChange={e => updateField('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Zone</label>
            <Select value={selected.zone ?? 'Main'} onValueChange={v => updateField('zone', v)}>
              <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Capacity</label>
            <Input type="number" min={1} value={selected.capacity ?? ''} onChange={e => updateField('capacity', Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shape</label>
            <div className="flex gap-1.5 mt-1">
              {SHAPES.map(s => (
                <button key={s} onClick={() => updateField('shape', s)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded border text-center transition-colors',
                    (selected.shape ?? 'square') === s
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                      : 'border-gray-200 hover:bg-background'
                  )}>
                  {SHAPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>x: {selected.x}</span><span>y: {selected.y}</span>
            <span>w: {selected.width}</span><span>h: {selected.height}</span>
          </div>
          <Button size="sm" variant="destructive" className="w-full" onClick={deleteSelected}>
            <Trash2 className="h-4 w-4 mr-1" />Delete Table
          </Button>
        </>) : (
          <p className="text-sm text-muted-foreground">Click a table to edit its properties.</p>
        )}
      </div>
    </div>
  )
}
