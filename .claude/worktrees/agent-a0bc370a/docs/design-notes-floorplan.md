# Floor Plan — Design Reference Notes

> Source: HTML mockup from external AI (2026-03-20)
> Status: Notes only — to be applied to `FloorPlanPage.tsx`

---

## Design Elements to Adopt (from mockup)

### Stat Cards (3-column grid, top)
- **Left color border** instead of badges:
  - Occupancy → yellow left border (`border-l-4 border-yellow-400`)
  - Available Tables → green left border (`border-l-4 border-green-500`)
  - Active Sessions → primary left border (`border-l-4 border-primary`)
- Each card: white bg, rounded-xl, shadow-sm
- Value: text-3xl font-bold
- Label: text-[10px] uppercase tracking-widest
- Occupancy shows context: "Near Capacity" in yellow when ≥80%

### Table Cards (grid)
- **Compact label** (T1, T2, V1 etc.) in a square badge instead of full name
- Status badge: pill shape, uppercase, 10px tracking-tighter
  - Occupied: `bg-red-100 text-red-700`
  - Available: `bg-green-50 text-green-600`
  - Bill Requested: `bg-error-container text-on-error-container` + `ring-2 ring-error/10` (alert glow)
  - Cleaning: opacity-60 + pulse animation on placeholder
- Occupied cards show: Order Total ($XX.XX) + elapsed time with clock icon
- Available cards show: dashed border box "Ready for seating" (italic)
- Grid: 2 cols mobile → 3 md → 4 lg → 5 xl

### Zone Filter Pills
- Contained in a single white pill group (`bg-surface-container-lowest p-1 rounded-xl shadow-sm`)
- Active zone: filled navy bg (`bg-primary-container text-white`)
- Inactive: transparent, hover effect

### Live Polling Indicator
- Green pulsing dot (double layer: `animate-ping` outer + solid inner)
- Text: "Live polling active • Last update: Just now"

### Right Sidebar
- Tab toggle: "Active Orders" / "Waitlist (3)" — white pill inside gray container
- Waitlist cards: rounded-xl, with "Seat Now" full-width button
- **NEW: Urgent Notifications section** (below waitlist):
  - Red alert card: icon + bold title + description
  - Info card: icon + title + description
- Bottom: "Add to Waitlist" button with dashed border style

### Top Nav Bar
- Fixed, backdrop-blur, shadow-sm
- Branding: "The Digital Maître D'" (or store name)
- Right side: search input + language icon + cart icon (with red dot badge)

### Mobile Bottom Nav
- Fixed bottom, rounded-t-3xl, backdrop-blur
- 4 items: Menu, Cart, Orders (active with scale-110), Profile

---

## Features NOT Yet Implemented (need to add)

### 1. Table Status: "Bill Requested"
- New status when customer requests bill (not in current `Table.status` type)
- Shows alert ring on card + red price color
- Should trigger urgent notification

### 2. Table Status: "Cleaning"
- Currently only `idle | occupied` in types
- Cleaning state: dimmed card + pulse animation
- Auto-transitions to idle after timeout or manual clear

### 3. Urgent Notifications Panel
- Right sidebar section below waitlist
- Auto-generated alerts:
  - Long service delay (order pending > X minutes)
  - Bill requested but not processed
  - Environment alerts (optional)

### 4. Order Total on Table Card
- Currently table cards show capacity + elapsed time
- Mockup shows order total directly on card ($142.50)
- Need to calculate sum of active orders per table

### 5. Top Navigation Bar
- Currently no top bar (AdminLayout sidebar only)
- Mockup has fixed top bar with search + branding
- Consider: add inside FloorPlanPage only, or global?

### 6. Mobile Bottom Tab Bar
- Currently: FAB button for active orders on mobile
- Mockup: full bottom tab bar (Menu/Cart/Orders/Profile)
- Consider: add to AdminLayout for all admin pages?

---

## What to Keep from Current Implementation

- Data fetching + 10s polling ✅
- TableDetailPanel (right sheet on table click) ✅
- WaitlistPanel component ✅
- ActiveOrdersSidebar component ✅
- Zone filtering logic ✅
- Occupancy calculation ✅
- TransferTable / SplitBill / OrderEdit integration ✅

---

## Implementation Priority

1. **Style update** — Apply mockup card/stat/filter design (pure CSS)
2. **Order total on cards** — Calculate from orders state (data already available)
3. **Table status expansion** — Add 'cleaning' | 'bill-requested' to type
4. **Urgent notifications** — Derive from order timestamps
5. **Top nav bar** — FloorPlan-specific header
6. **Mobile bottom nav** — Deferred (needs AdminLayout changes)
