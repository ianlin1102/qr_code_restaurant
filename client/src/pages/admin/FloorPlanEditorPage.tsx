import { useState, useEffect, useCallback } from 'react'
import { Plus, Save, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/i18n/useT'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FloorCanvas } from '@/components/floor/FloorCanvas'
import type { Table } from '@qr-order/shared'

const DEFAULT_W = 100, DEFAULT_H = 80
const DEFAULT_ZONES: string[] = []
const SHAPES = ['square', 'round', 'long'] as const
const SHAPE_LABELS: Record<string, string> = { square: '■ Square', round: '● Round', long: '▬ Long' }

function autoArrange(tables: Table[]): Table[] {
  return tables.map((t, i) => ({
    ...t,
    x: t.x ?? (i % 5) * 140 + 20,
    y: t.y ?? Math.floor(i / 5) * 120 + 20,
    width: t.width ?? DEFAULT_W,
    height: t.height ?? DEFAULT_H,
  }))
}

type UpdateTableFn = (s: string, t: string, d: Partial<Table>) => Promise<Table>

export default function FloorPlanEditorPage() {
  const navigate = useNavigate()
  const storeId = useAuthStore(s => s.user?.storeId)
  const { t } = useT()
  const [tables, setTables] = useState<Table[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [zones, setZones] = useState<string[]>(DEFAULT_ZONES)
  const [activeZone, setActiveZone] = useState<string>('__base__')
  const selected = tables.find(tb => tb.id === selectedId) ?? null

  useEffect(() => {
    if (!storeId) return
    api.getTables(storeId)
      .then(data => {
        setTables(autoArrange(data))
        // Collect existing zones from table data
        const existingZones = new Set(data.map(t => t.zone).filter(Boolean) as string[])
        setZones(prev => [...new Set([...prev, ...existingZones])])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [storeId])

  const handleTableMove = useCallback((tableId: string, x: number, y: number) => {
    setTables(prev => prev.map(tb => (tb.id === tableId ? { ...tb, x, y } : tb)))
    setDirty(true)
  }, [])

  const handleTableClick = useCallback((table: Table) => {
    setSelectedId(table.id)
  }, [])

  const addTable = useCallback(async () => {
    if (!storeId) return
    const { number } = await api.getNextTableNumber(storeId)
    const created = await api.enableTable(storeId, number, `Table ${tables.length + 1}`)
    const zone = activeZone !== '__base__' ? activeZone : zones[0] || undefined
    setTables(prev => [...prev, { ...created, x: 20, y: 20, width: DEFAULT_W, height: DEFAULT_H, zone }])
    setSelectedId(created.id)
  }, [storeId, tables.length, activeZone, zones])

  const updateField = useCallback((field: keyof Table, value: string | number) => {
    setTables(prev => prev.map(tb => {
      if (tb.id !== selectedId) return tb
      const updated = { ...tb, [field]: value }
      // Enforce minimum 2×2 grid cells (40×40px) for all shapes
      if (field === 'width' || field === 'shape') updated.width = Math.max(40, updated.width ?? 80)
      if (field === 'height' || field === 'shape') updated.height = Math.max(40, updated.height ?? 80)
      return updated
    }))
    setDirty(true)
  }, [selectedId])

  const deleteSelected = useCallback(async () => {
    if (!storeId || !selectedId) return
    await api.disableTable(storeId, selectedId)
    setTables(prev => prev.filter(tb => tb.id !== selectedId))
    setSelectedId(null)
  }, [storeId, selectedId])

  const saveLayout = useCallback(async () => {
    if (!storeId) return
    setSaving(true)
    try {
      const fn = api.updateTable as UpdateTableFn
      await Promise.all(tables.map(tb => fn(storeId, tb.id, {
        name: tb.name, nameEn: tb.nameEn, zone: tb.zone, shape: tb.shape,
        capacity: tb.capacity, x: tb.x, y: tb.y, width: tb.width, height: tb.height,
      })))
      setDirty(false)
      navigate('/admin/floor-plan')
    } finally { setSaving(false) }
  }, [storeId, tables])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (!storeId) return <p className="p-8 text-muted-foreground">{t.floorPlan.notAuth}</p>
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{t.floorPlan.loading}</span>
    </div>
  )

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <EditorToolbar addTable={addTable} saveLayout={saveLayout} saving={saving} dirty={dirty} t={t}
          onBack={() => navigate('/admin/floor-plan')}
          zones={zones} activeZone={activeZone} setActiveZone={setActiveZone}
          onAddZone={() => {
            const name = prompt('New zone/floor name:')
            if (name?.trim()) setZones(prev => [...new Set([...prev, name.trim()])])
          }}
          onDeleteZone={(z) => {
            const assigned = tables.filter(tb => tb.zone === z)
            if (assigned.length > 0) {
              alert(`Cannot delete "${z}" — ${assigned.length} table(s) still assigned. Move them first.`)
              return
            }
            setZones(prev => prev.filter(x => x !== z))
            if (activeZone === z) setActiveZone('__base__')
          }}
          onRenameZone={(oldName) => {
            const newName = prompt(`Rename "${oldName}" to:`, oldName)
            if (!newName?.trim() || newName.trim() === oldName) return
            const trimmed = newName.trim()
            setZones(prev => prev.map(z => z === oldName ? trimmed : z))
            setTables(prev => prev.map(tb => tb.zone === oldName ? { ...tb, zone: trimmed } : tb))
            if (activeZone === oldName) setActiveZone(trimmed)
            setDirty(true)
          }} />
        <div className="flex-1 overflow-auto p-2">
          <FloorCanvas
            tables={activeZone === '__base__' ? tables.filter(tb => !tb.zone) : tables.filter(tb => tb.zone === activeZone)}
            editable
            selectedTableId={selectedId}
            onTableClick={handleTableClick}
            onTableMove={handleTableMove}
          />
        </div>
      </div>

      {/* Properties Panel — desktop only */}
      <div className="hidden md:block">
        <PropertiesPanel
          selected={selected}
          updateField={updateField}
          deleteSelected={deleteSelected}
          t={t}
          zones={zones}
        />
      </div>

      {/* Mobile bottom bar — shown only when a table is selected */}
      {selected && (
        <MobileBottomBar
          selected={selected}
          updateField={updateField}
          deleteSelected={deleteSelected}
          zones={zones}
        />
      )}
    </div>
  )
}

/* ---- Editor Toolbar ---- */
function EditorToolbar({ addTable, saveLayout, saving, dirty, t, zones, activeZone, setActiveZone, onAddZone, onDeleteZone, onRenameZone, onBack }: {
  addTable: () => void; saveLayout: () => void; saving: boolean; dirty: boolean
  t: ReturnType<typeof useT>['t']
  zones: string[]; activeZone: string; setActiveZone: (z: string) => void
  onAddZone: () => void; onDeleteZone: (z: string) => void; onRenameZone: (z: string) => void; onBack: () => void
}) {
  return (
    <div className="border-b">
      <div className="flex items-center gap-2 p-3 flex-wrap">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-bold mr-auto">{t.nav.floorPlan}</h1>
        <Button size="sm" variant="outline" onClick={addTable}>
          <Plus className="h-4 w-4 mr-1" />{t.tables.addTable}
        </Button>
        <Button size="sm" onClick={saveLayout} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />{saving ? t.common.saving : t.common.save}
          {dirty && <span className="ml-1 w-2 h-2 rounded-full bg-orange-400" />}
        </Button>
      </div>
      <div className="flex items-center gap-1 px-3 pb-2 flex-wrap">
        <Button size="sm" variant={activeZone === '__base__' ? 'default' : 'outline'} onClick={() => setActiveZone('__base__')}>
          {t.floorPlan.allZone}
        </Button>
        {zones.map(z => (
          <div key={z} className="relative group inline-flex">
            <Button size="sm" variant={activeZone === z ? 'default' : 'outline'}
              onClick={() => setActiveZone(z)}
              onDoubleClick={() => onRenameZone(z)}>
              {z}
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteZone(z) }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title={`Delete ${z}`}
            >
              ✕
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onAddZone}>
          <Plus className="h-3 w-3 mr-1" />Zone
        </Button>
      </div>
    </div>
  )
}

/* ---- Properties Panel (desktop sidebar) ---- */
function PropertiesPanel({ selected, updateField, deleteSelected, t, zones }: {
  selected: Table | null
  updateField: (field: keyof Table, value: string | number) => void
  deleteSelected: () => void
  t: ReturnType<typeof useT>['t']
  zones: string[]
}) {
  return (
    <div className="w-64 shrink-0 bg-muted p-4 space-y-4 overflow-y-auto">
      <h2 className="font-semibold text-sm">{t.common.edit}</h2>
      {selected ? (<>
        <div>
          <label className="text-xs text-muted-foreground">{t.common.name}</label>
          <Input value={selected.name} onChange={e => updateField('name', e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Zone</label>
          <Select value={selected.zone ?? 'Main'} onValueChange={v => updateField('zone', v)}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t.tables.guests}</label>
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">W (grids)</label>
            <Input type="number" min={2} step={1}
              value={Math.round((selected.width ?? 80) / 20)}
              onChange={e => updateField('width', Math.max(40, Number(e.target.value) * 20))}
              className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">H (grids)</label>
            <Input type="number" min={2} step={1}
              value={Math.round((selected.height ?? 80) / 20)}
              onChange={e => updateField('height', Math.max(40, Number(e.target.value) * 20))}
              className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>x: {selected.x}</span><span>y: {selected.y}</span>
        </div>
        <Button size="sm" variant="destructive" className="w-full" onClick={deleteSelected}>
          <Trash2 className="h-4 w-4 mr-1" />{t.common.delete}
        </Button>
      </>) : (
        <p className="text-sm text-muted-foreground">{t.tables.selectTableHint}</p>
      )}
    </div>
  )
}

/* ---- Mobile Bottom Bar (visible on small screens when a table is selected) ---- */
function MobileBottomBar({ selected, updateField, deleteSelected, zones }: {
  selected: Table
  updateField: (field: keyof Table, value: string | number) => void
  deleteSelected: () => void
  zones: string[]
}) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t shadow-lg px-3 py-2 z-50 space-y-2 pb-safe">
      {/* Row 1: name + zone + delete */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate min-w-0 flex-1">{selected.name}</span>
        <Select value={selected.zone ?? 'Main'} onValueChange={v => updateField('zone', v)}>
          <SelectTrigger className="w-28 min-h-[44px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="destructive" className="min-h-[44px] min-w-[44px]" onClick={deleteSelected}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {/* Row 2: shape + size */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {SHAPES.map(s => (
            <button key={s} onClick={() => updateField('shape', s)}
              className={cn(
                'min-h-[44px] min-w-[44px] text-xs rounded border transition-colors',
                (selected.shape ?? 'square') === s
                  ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                  : 'border-gray-200'
              )}>
              {SHAPE_LABELS[s].charAt(0)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs">
          <span className="text-muted-foreground">W</span>
          <Input type="number" min={2} step={1}
            value={Math.round((selected.width ?? 80) / 20)}
            onChange={e => updateField('width', Math.max(40, Number(e.target.value) * 20))}
            className="w-14 min-h-[44px] text-sm text-center px-1" />
          <span className="text-muted-foreground">×</span>
          <span className="text-muted-foreground">H</span>
          <Input type="number" min={2} step={1}
            value={Math.round((selected.height ?? 80) / 20)}
            onChange={e => updateField('height', Math.max(40, Number(e.target.value) * 20))}
            className="w-14 min-h-[44px] text-sm text-center px-1" />
        </div>
      </div>
    </div>
  )
}
