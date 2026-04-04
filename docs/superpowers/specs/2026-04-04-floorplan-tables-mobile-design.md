# Feature Spec: Mobile-Friendly Floor Plan + Tables Page Redesign

**Date:** 2026-04-04
**Status:** Draft

---

## Overview

Three related changes to make the admin floor plan and tables management work well on mobile:

1. **FloorCanvas** — Apple Maps-style pinch-to-zoom + single-finger pan
2. **FloorPlanPage** — strip sidebars, table click navigates to TablesPage
3. **Waitlist** — standalone page with sidebar nav entry
4. **TablesPage** — convert left sidebar to horizontal toolbar, single-column flow

---

## 1. FloorCanvas — Pinch-to-Zoom + Pan

### Current State

- `FloorCanvas.tsx` renders a 1200×900 SVG with `viewBox` adjusted by `zoom` state
- Zoom: Ctrl/Cmd+wheel only — unusable on mobile
- Pan: only in editor mode (drag moves tables, not the viewport)
- Touch events exist but only for dragging tables in edit mode

### Changes

**New state:**
```typescript
const [zoom, setZoom] = useState(1)
const [offset, setOffset] = useState({ x: 0, y: 0 })  // NEW: pan offset in SVG coords
```

**viewBox calculation:**
```
viewBox = `${offset.x} ${offset.y} ${CANVAS_W / zoom} ${CANVAS_H / zoom}`
```

**Wheel zoom (desktop):**
- Remove Ctrl/Cmd requirement — plain wheel zooms (like Google Maps)
- Zoom toward cursor position: adjust `offset` so the point under cursor stays fixed

**Pinch-to-zoom (mobile):**
- Track `touchstart` with 2+ fingers → record initial distance + initial zoom
- `touchmove` with 2 fingers → `newZoom = initialZoom * (currentDist / initialDist)`
- Clamp to [0.3, 3.0] range
- Zoom toward the midpoint between the two fingers (adjust offset)

**Single-finger pan (non-edit mode):**
- `touchstart` with 1 finger → record start position + current offset
- `touchmove` with 1 finger → `newOffset = startOffset - (delta / zoom)` (invert because dragging right should move viewport left)
- `touchend` → finalize offset
- Desktop: mouse drag (no modifier) pans the viewport

**Edit mode behavior (FloorPlanEditorPage):**
- Single finger/mouse drag → moves the selected table (existing behavior)
- Two-finger pinch → zooms (new)
- No single-finger pan in edit mode (conflicts with table drag)

**Offset clamping:**
- Prevent panning beyond canvas bounds: `offset.x` clamped to `[0, CANVAS_W - CANVAS_W/zoom]`, same for y
- Reset offset to (0,0) when zoom resets to 1.0

**Zoom controls (existing +/−/% buttons):**
- Keep as-is, but also reset offset to center when "%" (reset) is clicked

### Props Change

```typescript
interface FloorCanvasProps {
  tables: Table[]
  editable?: boolean           // existing
  selectedTableId?: string     // existing
  onTableClick?: (table: Table) => void  // existing
  onTableMove?: (id: string, x: number, y: number) => void  // existing
  className?: string           // existing
}
```

No new props needed — zoom/pan is internal state.

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/floor/FloorCanvas.tsx` | Add offset state, pinch-to-zoom, single-finger pan, wheel zoom without modifier |

---

## 2. FloorPlanPage — Simplified Layout

### Current State

- 3-column layout: floor canvas + right sidebar (ActiveOrdersSidebar / WaitlistPanel tabs)
- Mobile: panel toggle switches between "Map" and "Orders" view
- Table click → opens TableDetailPanel inline

### Changes

**Remove:**
- `ActiveOrdersSidebar` import and rendering (entire right sidebar)
- Mobile "Map/Orders" toggle buttons
- `TableDetailPanel` inline rendering
- `activeTab` state (was switching orders/waitlist)
- `selectedTable` state (no longer needed — we navigate away)

**Simplify to:**
- Full-width floor canvas with zone filter at top
- Table click → `navigate('/admin/tables?select=${table.id}')`
- No sidebars, no panels — just the map

**Layout:**
```
┌──────────────────────────────┐
│  Zone pills (horizontal)     │
├──────────────────────────────┤
│                              │
│       FloorCanvas            │
│   (full width, full height)  │
│   pinch-zoom + pan enabled   │
│                              │
└──────────────────────────────┘
```

**Zone filter:** Keep existing zone pills at top. On mobile, horizontal scroll if many zones.

### Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/admin/FloorPlanPage.tsx` | Remove sidebars, simplify to canvas + zone filter, table click → navigate |

### Files No Longer Imported by FloorPlanPage

- `ActiveOrdersSidebar` — no longer used here (may still be used elsewhere; check before deleting)
- `TableDetailPanel` — no longer used here
- `WaitlistPanel` — no longer used here (moves to WaitlistPage)

---

## 3. Waitlist — Standalone Page

### New Route

`/admin/waitlist` → `WaitlistPage.tsx`

### WaitlistPage.tsx (NEW)

Thin wrapper around existing `WaitlistPanel`:

```tsx
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

### AdminLayout Sidebar

Add nav entry:
```typescript
{ to: '/admin/waitlist', navKey: 'waitlist', icon: '📋' }
```

Position: after "tables" (🪑), before "clock" (⏰).

### i18n

Add `nav.waitlist`:
- zh: `'候位管理'`
- en: `'Waitlist'`

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/pages/admin/WaitlistPage.tsx` | Wrapper page for WaitlistPanel |

### Files to Modify

| File | Change |
|------|--------|
| `client/src/App.tsx` | Add `/admin/waitlist` route |
| `client/src/components/layout/AdminLayout.tsx` | Add `'waitlist'` to NavKey, add nav item |
| `client/src/i18n/admin.ts` | Add `nav.waitlist` in zh + en |
| `client/src/i18n/en/admin.json` | Add `nav.waitlist` |
| `client/src/i18n/zh/admin.json` | Add `nav.waitlist` |

---

## 4. TablesPage — Horizontal Toolbar + Single-Column Flow

### Current State

- Desktop: 3-column (left sidebar 224px + center detail + right sidebar 256px)
- Left sidebar: base URL input, zone tabs, enable button, show disabled toggle, table list (vertical scroll)
- Mobile: dropdown selector replaces left sidebar, bottom action bar replaces right sidebar

### New Layout (both mobile and desktop)

```
┌──────────────────────────────────────────┐
│ Toolbar (sticky)                         │
│ [Zone pills...scroll] [+ Enable] [⚙]    │
│ [Show disabled toggle]                   │
├──────────────────────────────────────────┤
│ Table Grid                               │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │ T1   │ │ T2   │ │ T3   │ │ T4   │    │
│ │ idle │ │ occ  │ │ idle │ │ occ  │    │
│ └──────┘ └──────┘ └──────┘ └──────┘    │
│ ┌──────┐ ┌──────┐                       │
│ │ T5   │ │ T6   │                       │
│ └──────┘ └──────┘                       │
├──────────────────────────────────────────┤
│ Selected Table Detail (expands below)    │
│ [Current Orders tab] [History tab]       │
│ ... order list ...                       │
│ [Settle] [Close] [Transfer] [QR]        │
└──────────────────────────────────────────┘
```

**Toolbar (sticky top):**
- Row 1: Zone pills (horizontal scroll, `overflow-x-auto`) + "Enable New" button + settings gear (opens Base URL input in a popover/dialog)
- Row 2 (optional, can be inline): "Show disabled" toggle
- On mobile: same layout, zone pills scroll horizontally

**Table Grid:**
- `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3`
- Each card: table number, name, status color dot, occupied indicator
- Click card → selects it, detail panel expands below the grid
- Selected card gets highlighted border (ring-2 ring-primary)

**Table Card design:**
- Status color left border (4px) — green/red/yellow/orange/gray
- Table number (#) large, name below
- Small status text or icon
- Edit pencil icon on hover/press
- Min-height 80px, touch-friendly

**Detail Panel (below grid):**
- Only visible when a table is selected
- Smooth expand animation (or just conditional render)
- Contains everything from current center + right columns:
  - Two tabs: "Current Orders" / "History"
  - Order list
  - Action buttons: Settle, Close Table, Transfer, Print QR, Edit Table
- Action buttons in a horizontal flex wrap row
- On mobile: buttons stack 2-per-row

**Base URL:**
- Move to a gear icon button in toolbar → opens small dialog/popover
- Contains the input field + localhost warning
- Not permanently visible (rarely changed)

### Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/admin/TablesPage.tsx` | Complete layout rewrite: remove 3-column, add toolbar + grid + detail panel |

---

## Implementation Order

1. **FloorCanvas pinch-zoom + pan** — foundational, no layout dependencies
2. **WaitlistPage + sidebar nav** — small, independent
3. **FloorPlanPage simplification** — depends on waitlist being moved out
4. **TablesPage horizontal redesign** — largest scope, independent of 1-3

Items 1-2 can run in parallel. Item 3 depends on 2. Item 4 is independent.

---

## Out of Scope

- FloorPlanEditorPage changes (keep existing edit behavior)
- ActiveOrdersSidebar deletion (may be used by other pages — leave the component, just stop importing in FloorPlanPage)
- Data model changes (none needed)
- Server changes (none needed)
