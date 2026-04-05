# Floor Plan + Tables Mobile Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin floor plan and tables management mobile-friendly with Apple Maps-style zoom/pan, simplified layout, and horizontal toolbar.

**Architecture:** FloorCanvas gets internal pinch-to-zoom + pan state. FloorPlanPage strips sidebars and navigates to TablesPage on table click. Waitlist becomes a standalone page. TablesPage converts from 3-column to single-column flow with horizontal toolbar + card grid.

**Tech Stack:** React, TypeScript, Tailwind CSS, SVG touch events

---

### Task 1: FloorCanvas — Pinch-to-Zoom + Single-Finger Pan

**Files:**
- Modify: `client/src/components/floor/FloorCanvas.tsx`

- [ ] **Step 1: Add offset state and update viewBox**

In `FloorCanvas.tsx`, add `offset` state and update the viewBox calculation:

```typescript
// After the existing zoom state (line 25):
const [offset, setOffset] = useState({ x: 0, y: 0 })

// Add pan ref for tracking drag state:
const panRef = useRef<{ startX: number; startY: number; origOx: number; origOy: number } | null>(null)
const pinchRef = useRef<{ startDist: number; startZoom: number; midX: number; midY: number } | null>(null)
```

Update the viewBox in the SVG (replace the existing `viewBox={...}` at line 146):

```tsx
viewBox={`${offset.x} ${offset.y} ${CANVAS_W / zoom} ${CANVAS_H / zoom}`}
```

Update constants at top:

```typescript
const ZOOM_MIN = 0.3
const ZOOM_MAX = 3.0
```

- [ ] **Step 2: Replace wheel zoom — remove Ctrl/Cmd requirement, zoom toward cursor**

Replace the existing `useEffect` for wheel zoom (lines 35-48) with:

```typescript
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = svg.getBoundingClientRect()
    const cursorFracX = (e.clientX - rect.left) / rect.width
    const cursorFracY = (e.clientY - rect.top) / rect.height

    setZoom(prevZoom => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom - e.deltaY * 0.002))
      // Adjust offset so point under cursor stays fixed
      setOffset(prev => {
        const oldVbW = CANVAS_W / prevZoom
        const newVbW = CANVAS_W / next
        const oldVbH = CANVAS_H / prevZoom
        const newVbH = CANVAS_H / next
        return {
          x: Math.max(0, Math.min(CANVAS_W - newVbW, prev.x + (oldVbW - newVbW) * cursorFracX)),
          y: Math.max(0, Math.min(CANVAS_H - newVbH, prev.y + (oldVbH - newVbH) * cursorFracY)),
        }
      })
      return +next.toFixed(2)
    })
  }
  svg.addEventListener('wheel', onWheel, { passive: false })
  return () => svg.removeEventListener('wheel', onWheel)
}, [])
```

- [ ] **Step 3: Update zoom button helpers to reset offset on reset click**

Replace zoomIn/zoomOut and add zoomReset:

```typescript
const clampOffset = (ox: number, oy: number, z: number) => ({
  x: Math.max(0, Math.min(CANVAS_W - CANVAS_W / z, ox)),
  y: Math.max(0, Math.min(CANVAS_H - CANVAS_H / z, oy)),
})
const zoomIn = useCallback(() => {
  setZoom(z => {
    const next = Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))
    setOffset(o => clampOffset(o.x, o.y, next))
    return next
  })
}, [])
const zoomOut = useCallback(() => {
  setZoom(z => {
    const next = Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))
    setOffset(o => clampOffset(o.x, o.y, next))
    return next
  })
}, [])
const zoomReset = useCallback(() => {
  setZoom(1)
  setOffset({ x: 0, y: 0 })
}, [])
```

Update the zoom % label to be clickable (replace the `<span>` in the zoom controls):

```tsx
<button onClick={zoomReset} className="text-xs font-mono w-10 text-center select-none hover:bg-gray-100 rounded" title="Reset zoom">
  {Math.round(zoom * 100)}%
</button>
```

- [ ] **Step 4: Add touch event handling for pinch-zoom and single-finger pan**

Replace the entire existing touch event `useEffect` (lines 98-109) and the `handleTouchStart`/`handleTouchEnd` functions (lines 91-95) with a single comprehensive `useEffect`:

```typescript
// Touch events: pinch-to-zoom (2 fingers) + single-finger pan (non-edit mode)
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return

  const getDist = (t1: Touch, t2: Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault()
      const d = getDist(e.touches[0], e.touches[1])
      pinchRef.current = { startDist: d, startZoom: zoom, midX: 0, midY: 0 }
      panRef.current = null // cancel any pan
    } else if (e.touches.length === 1 && !editable) {
      // Single-finger pan (only in non-edit mode)
      const t = e.touches[0]
      panRef.current = { startX: t.clientX, startY: t.clientY, origOx: offset.x, origOy: offset.y }
    } else if (e.touches.length === 1 && editable) {
      // Edit mode: existing table drag — handled by per-table onTouchStart
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const d = getDist(e.touches[0], e.touches[1])
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
        +(pinchRef.current.startZoom * (d / pinchRef.current.startDist)).toFixed(2)))
      setZoom(newZoom)
      setOffset(o => clampOffset(o.x, o.y, newZoom))
    } else if (e.touches.length === 1 && panRef.current) {
      e.preventDefault()
      const t = e.touches[0]
      const dx = (t.clientX - panRef.current.startX)
      const dy = (t.clientY - panRef.current.startY)
      const rect = svg.getBoundingClientRect()
      // Convert screen px delta to SVG coord delta
      const svgDx = dx * (CANVAS_W / zoom) / rect.width
      const svgDy = dy * (CANVAS_H / zoom) / rect.height
      const newO = clampOffset(
        panRef.current.origOx - svgDx,
        panRef.current.origOy - svgDy,
        zoom,
      )
      setOffset(newO)
    } else if (e.touches.length === 1 && editable && dragRef.current) {
      // Edit mode table drag
      e.preventDefault()
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) { panRef.current = null; endDrag() }
  }

  svg.addEventListener('touchstart', onTouchStart, { passive: false })
  svg.addEventListener('touchmove', onTouchMove, { passive: false })
  svg.addEventListener('touchend', onTouchEnd)
  svg.addEventListener('touchcancel', onTouchEnd)
  return () => {
    svg.removeEventListener('touchstart', onTouchStart)
    svg.removeEventListener('touchmove', onTouchMove)
    svg.removeEventListener('touchend', onTouchEnd)
    svg.removeEventListener('touchcancel', onTouchEnd)
  }
}, [editable, zoom, offset.x, offset.y])
```

- [ ] **Step 5: Add mouse pan for desktop (non-edit mode)**

Add mouse pan by updating the SVG's event handlers. Replace the existing mouse event handlers on the `<svg>` element:

```tsx
<svg
  ref={svgRef}
  viewBox={`${offset.x} ${offset.y} ${CANVAS_W / zoom} ${CANVAS_H / zoom}`}
  className={`w-full border rounded-lg bg-white touch-none ${className || ''}`}
  style={{ minHeight: 400 }}
  onMouseDown={e => {
    if (editable) return // edit mode handles its own mouse events per-table
    panRef.current = { startX: e.clientX, startY: e.clientY, origOx: offset.x, origOy: offset.y }
  }}
  onMouseMove={e => {
    if (editable) { handleMouseMove(e); return }
    if (!panRef.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const dx = (e.clientX - panRef.current.startX) * (CANVAS_W / zoom) / rect.width
    const dy = (e.clientY - panRef.current.startY) * (CANVAS_H / zoom) / rect.height
    setOffset(clampOffset(panRef.current.origOx - dx, panRef.current.origOy - dy, zoom))
  }}
  onMouseUp={() => { panRef.current = null; if (editable) handleMouseUp() }}
  onMouseLeave={() => { panRef.current = null; if (editable) handleMouseUp() }}
>
```

Add `touch-none` to the SVG className to prevent browser default touch gestures.

- [ ] **Step 6: Remove old per-table touch handlers from JSX**

Remove `onTouchStart` and `onTouchEnd`/`onTouchCancel` from the SVG element attributes (they're now handled in the useEffect). Keep the per-table `onMouseDown` for edit mode. The `<g>` wrapping each table should keep `onMouseDown` for edit mode only:

```tsx
{placedTables.map(table => (
  <g
    key={table.id}
    onMouseDown={editable ? (e) => handleMouseDown(table, e) : undefined}
    onTouchStart={editable ? (e) => {
      const touch = e.touches[0]
      startDrag(table, touch.clientX, touch.clientY)
    } : undefined}
  >
    <FloorTableShape
      table={table}
      selected={selectedTableId === table.id}
      editable={editable}
      onClick={() => onTableClick?.(table)}
    />
  </g>
))}
```

- [ ] **Step 7: Verify and commit**

Run: `cd client && ./node_modules/.bin/tsc --noEmit`
Expected: 0 errors

```bash
git add client/src/components/floor/FloorCanvas.tsx
git commit -m "feat: Apple Maps-style pinch-to-zoom + pan on FloorCanvas"
```

---

### Task 2: WaitlistPage + Sidebar Nav Entry

**Files:**
- Create: `client/src/pages/admin/WaitlistPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/AdminLayout.tsx`
- Modify: `client/src/i18n/admin.ts`
- Modify: `client/src/i18n/en/admin.json`
- Modify: `client/src/i18n/zh/admin.json`

- [ ] **Step 1: Create WaitlistPage.tsx**

```tsx
import { useAuthStore } from '@/stores/auth-store'
import WaitlistPanel from '@/components/floor/WaitlistPanel'

export default function WaitlistPage() {
  const storeId = useAuthStore(s => s.user?.storeId)
  if (!storeId) return null
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <WaitlistPanel storeId={storeId} />
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

After `import ClockPage`:

```typescript
import WaitlistPage from './pages/admin/WaitlistPage'
```

After the `<Route path="clock" .../>` line:

```tsx
<Route path="waitlist" element={<WaitlistPage />} />
```

- [ ] **Step 3: Add sidebar nav entry in AdminLayout.tsx**

Update NavKey type (line 9):

```typescript
type NavKey = 'orders' | 'floorPlan' | 'menu' | 'categories' | 'tables' | 'coupons' | 'staff' | 'analytics' | 'settings' | 'more' | 'clock' | 'waitlist'
```

Add nav item after tables (🪑), before clock (⏰):

```typescript
const NAV_ITEMS: { to: string; navKey: NavKey; icon: string; perm?: Permission }[] = [
  { to: '/admin/dashboard', navKey: 'orders', icon: '📋', perm: 'orders:read' },
  { to: '/admin/floor-plan', navKey: 'floorPlan', icon: '🗺️', perm: 'tables:read' },
  { to: '/admin/menu', navKey: 'menu', icon: '🍜', perm: 'menu:read' },
  { to: '/admin/tables', navKey: 'tables', icon: '🪑', perm: 'tables:read' },
  { to: '/admin/waitlist', navKey: 'waitlist', icon: '👥' },
  { to: '/admin/clock', navKey: 'clock', icon: '⏰' },
  { to: '/admin/more', navKey: 'more', icon: '📦' },
]
```

- [ ] **Step 4: Add i18n keys**

In `client/src/i18n/admin.ts` zh section, update nav line:

```typescript
// Find the line with: clock: '打卡', logout: '退出登录',
// Change to:
clock: '打卡', waitlist: '候位管理', logout: '退出登录',
```

In en section:

```typescript
// Find the line with: clock: 'Clock In/Out', logout: 'Logout',
// Change to:
clock: 'Clock In/Out', waitlist: 'Waitlist', logout: 'Logout',
```

In `client/src/i18n/en/admin.json`, inside "nav" object, add:

```json
"waitlist": "Waitlist",
```

In `client/src/i18n/zh/admin.json`, inside "nav" object, add:

```json
"waitlist": "候位管理",
```

- [ ] **Step 5: Verify and commit**

Run: `cd client && ./node_modules/.bin/tsc --noEmit`
Expected: 0 errors

```bash
git add client/src/pages/admin/WaitlistPage.tsx client/src/App.tsx \
  client/src/components/layout/AdminLayout.tsx client/src/i18n/
git commit -m "feat: waitlist as standalone page with sidebar nav entry"
```

---

### Task 3: Simplify FloorPlanPage — Remove Sidebars

**Files:**
- Modify: `client/src/pages/admin/FloorPlanPage.tsx`

- [ ] **Step 1: Rewrite FloorPlanPage.tsx**

Replace the entire file with:

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/i18n/useT'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FloorCanvas } from '@/components/floor/FloorCanvas'
import TableGrid from '@/components/table/TableGrid'
import type { Table, Order } from '@qr-order/shared'

const POLL_INTERVAL = 10_000

export default function FloorPlanPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''
  const isOwner = useAuthStore(s => s.isOwner)

  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activeZone, setActiveZone] = useState<string>('__base__')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [tbl, o] = await Promise.all([api.getTables(storeId), api.getOrders(storeId)])
      setTables(tbl); setOrders(o)
    } catch { /* silent retry */ } finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, POLL_INTERVAL); return () => clearInterval(id) }, [fetchData])

  const enabledTables = useMemo(() => tables.filter(tb => tb.enabled), [tables])
  const occupiedCount = useMemo(() => enabledTables.filter(tb => tb.status === 'occupied').length, [enabledTables])
  const idleCount = enabledTables.length - occupiedCount
  const occupancyPct = enabledTables.length ? Math.round(occupiedCount / enabledTables.length * 100) : 0

  const zones = useMemo(() => Array.from(new Set(enabledTables.map(tb => tb.zone).filter(Boolean))) as string[], [enabledTables])
  const filteredTables = useMemo(() => {
    if (activeZone === '__base__') return enabledTables.filter(tb => !tb.zone)
    return enabledTables.filter(tb => tb.zone === activeZone)
  }, [enabledTables, activeZone])

  const handleTableClick = (table: Table) => {
    navigate(`/admin/tables?select=${table.id}`)
  }

  const useSvgCanvas = filteredTables.some(t => t.x != null && t.y != null)

  if (!storeId) return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">{t.floorPlan.notAuth}</p></div>
  if (loading && !tables.length) return <div className="flex items-center justify-center h-full"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Stats + Zone filter bar */}
      <div className="glass">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.occupancy}</span>
              <span className={cn('text-sm font-bold', occupancyPct >= 80 ? 'text-yellow-600' : 'text-green-600')}>{occupancyPct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.floorPlan.availableTables}</span>
              <Badge className="bg-green-100 text-green-700 border-0">{idleCount}</Badge>
            </div>
          </div>
          {isOwner() && (
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/floor-plan/editor')}>
              <Pencil className="size-3 mr-1" />{t.common.edit}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <Button size="sm" variant={activeZone === '__base__' ? 'default' : 'outline'}
            onClick={() => setActiveZone('__base__')}>
            {t.floorPlan.allZone}
          </Button>
          {zones.map(z => (
            <Button key={z} size="sm" variant={activeZone === z ? 'default' : 'outline'}
              onClick={() => setActiveZone(z)}>
              {z}
            </Button>
          ))}
        </div>
      </div>

      {/* Floor canvas — full remaining height */}
      <div className="flex-1 overflow-hidden p-4">
        {useSvgCanvas ? (
          <FloorCanvas tables={filteredTables} onTableClick={handleTableClick} />
        ) : (
          <TableGrid tables={filteredTables} orders={orders} onTableClick={handleTableClick} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd client && ./node_modules/.bin/tsc --noEmit`
Expected: 0 errors

```bash
git add client/src/pages/admin/FloorPlanPage.tsx
git commit -m "feat: simplify FloorPlanPage — remove sidebars, table click navigates to TablesPage"
```

---

### Task 4: TablesPage — Horizontal Toolbar + Card Grid

**Files:**
- Modify: `client/src/pages/admin/TablesPage.tsx`

- [ ] **Step 1: Rewrite TablesPage layout**

This is a full rewrite of the JSX layout. Keep all existing state, handlers, and dialog logic. Replace only the return JSX (from `return (` to the closing `)`) and the mobile/desktop-specific sections.

The new layout structure:

```
<div className="flex flex-col h-full overflow-hidden bg-background">
  {/* Sticky Toolbar */}
  {/* Table Card Grid */}
  {/* Selected Table Detail Panel */}
  {/* Dialogs (unchanged) */}
</div>
```

Replace the entire `return (...)` block (lines 168-536) with the new single-column layout. This is a large change — the full replacement code follows in the next steps.

- [ ] **Step 2: Implement the toolbar section**

At the top of the return, replace the mobile zone tabs + desktop left sidebar with a unified toolbar:

```tsx
return (
  <div className="flex flex-col h-full overflow-hidden bg-background">
    {/* ── Sticky Toolbar ── */}
    <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 pb-0.5">
          <Button size="sm" variant={activeZone === '__base__' ? 'default' : 'outline'}
            className="shrink-0" onClick={() => setActiveZone('__base__')}>
            {t.floorPlan?.allZone || 'Base'}
          </Button>
          {zones.map(z => (
            <Button key={z} size="sm" variant={activeZone === z ? 'default' : 'outline'}
              className="shrink-0" onClick={() => setActiveZone(z)}>
              {z}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openAddTable} className="shrink-0">
          <Plus className="size-3.5 mr-1" />{t.tables.enableNew}
        </Button>
        <Button size="sm" variant="outline" className="shrink-0"
          onClick={handlePrintAllQr} title={t.tables.printAllQr}>
          <QrCode className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showDisabled}
            onChange={e => setShowDisabled(e.target.checked)} className="rounded" />
          {t.tables.showDisabled}
        </label>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
          onClick={() => {
            const url = prompt(t.tables.baseUrl, baseUrl)
            if (url) updateBaseUrl(url)
          }}>
          ⚙ {t.tables.baseUrl}
        </Button>
      </div>
    </div>
```

- [ ] **Step 3: Implement the table card grid**

After the toolbar, add the card grid:

```tsx
    {/* ── Table Card Grid ── */}
    <div className="flex-1 overflow-y-auto p-4">
      {zoneTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-gray-400 gap-3 py-20">
          <Armchair className="size-20 opacity-20" />
          <p className="text-lg">{t.tables.noTables || 'No tables'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
            {zoneTables.map(tb => {
              const isActive = selected?.id === tb.id
              const statusColor = tb.status === 'occupied' ? 'border-l-red-500'
                : tb.status === 'cleaning' ? 'border-l-yellow-500'
                : tb.status === 'bill-requested' ? 'border-l-orange-500'
                : !tb.enabled ? 'border-l-gray-300'
                : 'border-l-green-500'
              const { label, cls } = statusBadge(tb.status)
              return (
                <button key={tb.id} onClick={() => handleSelect(tb)}
                  className={cn(
                    'relative text-left rounded-lg border border-l-4 p-3 min-h-[80px] transition-all',
                    statusColor,
                    isActive ? 'ring-2 ring-primary bg-primary/5' : 'bg-card hover:bg-accent/50',
                    !tb.enabled && 'opacity-50',
                  )}>
                  <p className="text-lg font-bold">#{tb.number}</p>
                  <p className="text-xs text-muted-foreground truncate">{tb.name || ''}</p>
                  <span className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded', cls)}>{label}</span>
                  <Pencil className="absolute bottom-2 right-2 size-3 text-gray-300 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); openEditTable(tb) }} />
                </button>
              )
            })}
          </div>
```

- [ ] **Step 4: Implement the selected table detail panel (below grid)**

After the card grid, add the detail panel that appears when a table is selected:

```tsx
          {/* ── Selected Table Detail ── */}
          {selected && (
            <div className="border rounded-lg bg-card">
              {/* Header */}
              <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Armchair className="size-5 text-primary" />
                  <h2 className="text-lg font-bold">{selected.name} {t.tables.tableDetail}</h2>
                  <span className="text-sm text-muted-foreground font-mono">{elapsed(elapsedMs)}</span>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex flex-wrap gap-2 px-4 py-3 border-b">
                <Button size="sm" onClick={() => setOrderingOpen(true)}>
                  <Plus className="size-4 mr-1" />{t.tables.addItems}
                </Button>
                <Button size="sm" variant="outline" disabled={!currentOrder}
                  onClick={() => currentOrder && api.reprintOrder(storeId, currentOrder.id)}>
                  <Printer className="size-4 mr-1" />{t.tables.printBill}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                  <ArrowLeftRight className="size-4 mr-1" />{t.tables.transfer}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrintQr}>
                  <QrCode className="size-4 mr-1" />{t.tables.printQr}
                </Button>
                {selected?.status !== 'occupied' && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm('Regenerate QR code? The old QR code will stop working.')) return
                    try { const updated = await api.regenerateQr(storeId!, selected!.id); fetchData(); setSelected(updated) } catch (e) { console.error(e) }
                  }}>
                    🔄 {lang === 'zh' ? '重新生成 QR' : 'New QR'}
                  </Button>
                )}
                {selected?.enabled && selected.status !== 'occupied' && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={async () => {
                    if (!confirm(t.tables.confirmDisable)) return
                    try { await api.disableTable(storeId!, selected.id); fetchData(); setSelected(null) } catch (e) { console.error(e) }
                  }}>
                    {t.tables.disable}
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" className="bg-green-500 hover:bg-green-600"
                  disabled={!currentOrder}
                  onClick={() => selected?.currentSessionId ? setSessionDialogOpen(true) : setCloseOpen(true)}>
                  <CheckCircle2 className="size-4 mr-1" />{t.tables.checkout}
                </Button>
              </div>

              {/* Tabs: Current / History */}
              <div className="flex gap-1 border-b px-4">
                <button onClick={() => setViewTab('current')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${viewTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                  {lang === 'zh' ? '当前' : 'Current'} ({sessionOrders.length})
                </button>
                <button onClick={() => setViewTab('history')}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${viewTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                  {lang === 'zh' ? '历史' : 'History'} ({pastOrders.length})
                </button>
              </div>

              {/* Order list */}
              <div className="px-4 py-3 max-h-[50vh] overflow-y-auto">
                {displayOrders.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    {viewTab === 'history' ? t.tables.noPastOrders : t.tables.noActiveOrders}
                  </p>
                ) : viewTab === 'history' ? (
                  displayOrders.map(o => {
                    const oTax = Math.round(o.totalPrice * (store?.taxRate ?? 0) / 100)
                    const oFee = Math.round(o.totalPrice * (store?.serviceFeeRate ?? 0) / 100)
                    return (
                      <div key={o.id} className="mb-3 border rounded-lg p-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span className="font-medium">#{o.orderNumber}</span>
                          <span>{new Date(o.createdAt).toLocaleDateString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-sm py-0.5">
                            <span>{it.quantity}x {localized(it, lang)}</span>
                            <span className="text-muted-foreground">{formatPriceUSD(itemPrice(it))}</span>
                          </div>
                        ))}
                        <div className="border-t mt-1 pt-1 space-y-0.5 text-xs text-muted-foreground">
                          {oTax > 0 && <div className="flex justify-between"><span>{t.tables.taxFee}</span><span>+{formatPriceUSD(oTax)}</span></div>}
                          {oFee > 0 && <div className="flex justify-between"><span>{t.tables.serviceFee}</span><span>+{formatPriceUSD(oFee)}</span></div>}
                          <div className="flex justify-between text-sm font-medium"><span>{t.common.total}</span><span>{formatPriceUSD(o.totalPrice + oTax + oFee)}</span></div>
                        </div>
                      </div>
                    )
                  })
                ) : displayOrders.flatMap(o => o.items.map((it, i) => {
                  const itemKey = `${o.id}:${i}`
                  const isPaid = paidItemSet.has(itemKey) || [...paidItemSet].some(k => k.startsWith(itemKey + ':'))
                  return (
                    <div key={`${o.id}-${i}`} className={`bg-background rounded-xl p-3 mb-2 shadow-sm flex gap-3 ${isPaid ? 'opacity-40' : ''}`}>
                      <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                        {menuItemMap[it.menuItemId] ? (
                          <img src={menuItemMap[it.menuItemId]} alt={localized(it, lang)} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-muted-foreground">{localized(it, lang).charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{localized(it, lang)}</p>
                          {isPaid && <span className="text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5">{lang === 'zh' ? '已付' : 'Paid'}</span>}
                        </div>
                        {it.selectedOptions && it.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {it.selectedOptions.map((opt, idx) => (
                              <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 rounded px-1.5 py-0.5">
                                {(opt.optionName || opt.optionNameEn || '')}{(opt.optionName || opt.optionNameEn) ? ': ' : ''}{(opt.choiceName || opt.choiceNameEn || '')}
                              </span>
                            ))}
                          </div>
                        )}
                        {it.remark && <p className="text-sm text-muted-foreground italic">{t.tables.note}: {it.remark}</p>}
                        <p className="text-xs text-gray-400 mt-1">{t.tables.qty}: {it.quantity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold ${isPaid ? 'text-green-600 line-through' : 'text-primary'}`}>{formatPriceUSD(itemPrice(it))}</p>
                      </div>
                    </div>
                  )
                }))}
              </div>

              {/* Payment summary footer */}
              {viewTab === 'current' && sessionOrders.length > 0 && (
                <div className="border-t px-4 py-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t.common.subtotal}</span><span>{formatPriceUSD(subtotal)}</span></div>
                  {serviceFee > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.tables.serviceFee}</span><span>+{formatPriceUSD(serviceFee)}</span></div>}
                  {tax > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.tables.taxFee}</span><span>+{formatPriceUSD(tax)}</span></div>}
                  {totalPaid > 0 && <div className="flex justify-between"><span className="text-green-600">{lang === 'zh' ? '已付' : 'Paid'}</span><span className="text-green-600">-{formatPriceUSD(totalPaid)}</span></div>}
                  <div className="flex justify-between text-lg font-bold pt-1 border-t">
                    <span>{totalPaid > 0 ? (lang === 'zh' ? '待付' : 'Remaining') : t.common.total}</span>
                    <span className="text-primary">{formatPriceUSD(remaining)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
```

- [ ] **Step 5: Close the layout and keep dialogs unchanged**

After the scrollable area, close the outer div and keep all existing dialogs:

```tsx
    {/* Dialogs (unchanged) */}
    <CloseTableDialog table={selected} storeId={storeId} open={closeOpen}
      onOpenChange={setCloseOpen} onClosed={() => { setSelected(null); refresh() }} />
    {currentOrder && (
      <TransferTableDialog open={transferOpen} onClose={() => setTransferOpen(false)}
        order={currentOrder} storeId={storeId} onTransferred={refresh} />
    )}
    {sessionDialogOpen && selected?.currentSessionId && storeId && (
      <BillSettleDialog open={sessionDialogOpen}
        onClose={() => { setSessionDialogOpen(false); fetchData() }}
        storeId={storeId} sessionId={selected.currentSessionId} t={t} lang={lang} />
    )}
    <TableCrudDialog table={editingTable} storeId={storeId} open={crudOpen}
      onClose={() => setCrudOpen(false)} onSaved={() => { fetchData(); setCrudOpen(false) }}
      activeZone={activeZone} zones={zones} />
    {selected && (
      <OrderingSheet open={orderingOpen} onClose={() => setOrderingOpen(false)}
        storeId={storeId} tableId={selected.id} tableName={selected.name}
        onOrderCreated={refresh} />
    )}
  </div>
)
```

- [ ] **Step 6: Remove unused imports and the ActionBtn component**

Remove from imports: `ChevronDown` (no longer used — dropdown removed).

Remove the `ActionBtn` component at the bottom of the file (lines 540-551) — no longer needed since action buttons are inline.

Also remove `mobileDropdown` state and `setMobileDropdown` since the mobile dropdown selector is gone.

- [ ] **Step 7: Verify and commit**

Run: `cd client && ./node_modules/.bin/tsc --noEmit`
Expected: 0 errors

```bash
git add client/src/pages/admin/TablesPage.tsx
git commit -m "feat: TablesPage horizontal toolbar + card grid, single-column responsive layout"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 2: Verify no broken imports**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
grep -r "ActiveOrdersSidebar\|TableDetailPanel\|WaitlistPanel" client/src/pages/admin/FloorPlanPage.tsx
```

Expected: no output (all removed from FloorPlanPage)

- [ ] **Step 3: Commit everything and push**

```bash
git add -A
git commit -m "feat: mobile-friendly floor plan + tables redesign

- FloorCanvas: Apple Maps pinch-to-zoom + single-finger pan
- FloorPlanPage: stripped sidebars, table click navigates to TablesPage
- Waitlist: standalone page with sidebar nav entry
- TablesPage: horizontal toolbar + card grid, single-column flow"
git push origin main
```
