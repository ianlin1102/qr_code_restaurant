# Mobile-Friendly Optimization Design Spec

## Goal

Make all frontend pages fully responsive and touch-friendly for mobile devices (target: iPhone 12 Pro, 390px), while preserving the desktop experience.

## Tech Stack

Tailwind CSS v4 + shadcn/ui + tailwind-merge (cn()). No new dependencies.

## 1. Global Foundation

### index.html

Update viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### index.css

Add safe-area utilities after the existing `@layer base`:
```css
@utility pt-safe {
  padding-top: env(safe-area-inset-top);
}
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
@utility pl-safe {
  padding-left: env(safe-area-inset-left);
}
@utility pr-safe {
  padding-right: env(safe-area-inset-right);
}
```

### Touch targets

All clickable elements: `min-h-[44px]` minimum. Button gaps: `gap-3`. Form inputs: `text-base` (16px) to prevent iOS auto-zoom.

## 2. Customer Pages

### MenuPage

- Header: `px-4` padding, store name + lang toggle in flex row
- Category sidebar: keep on mobile (it's already narrow at `w-24`)
- Menu item cards: already single-column, ensure `px-4` on container
- Bottom bar: add `pb-safe` for iPhone home bar
- Option sheet: already `SheetContent side="bottom"`, add `pb-safe`
- All buttons: ensure 44px touch targets

### CartPage

- Header: `px-4`, back button 44px
- Cards: `p-3 md:p-4` padding
- Quantity buttons: already `h-8 w-8`, increase to `h-10 w-10` on mobile
- Bottom bar: add `pb-safe`
- Remark input: `text-base` to prevent iOS zoom

### OrderConfirmPage

- Content: `px-4`, responsive spacing
- Buttons: full-width on mobile, `min-h-[44px]`

### LangSelectPage

- Buttons: already `py-6`, ensure 44px min-height

## 3. Admin Layout (Key Change)

### Desktop (md and up)

Keep current sidebar layout unchanged — collapsible sidebar on the left, content on the right.

### Mobile (below md)

- Hide sidebar entirely (`hidden md:flex`)
- Show top bar with hamburger button + page title
- Hamburger opens shadcn `Sheet` from left side, containing the same nav items
- Sheet includes: nav links, language toggle, user info, logout
- Sheet closes on nav link click

### Implementation

```
Desktop:                    Mobile:
┌──────┬──────────────┐    ┌──────────────────────┐
│      │              │    │ ☰  扫码点餐          │  ← top bar
│ Side │   Content    │    ├──────────────────────┤
│ bar  │              │    │                      │
│      │              │    │      Content          │
│      │              │    │                      │
└──────┴──────────────┘    └──────────────────────┘
```

## 4. Admin Pages

### DashboardPage

- Order cards: `grid-cols-1 md:grid-cols-2` layout
- Filter tabs: horizontal scroll on mobile (`overflow-x-auto`)
- Action buttons on cards: keep inline but ensure 44px touch targets
- Page title: `text-xl md:text-2xl`

### MenuManagePage

- Desktop: keep existing table view
- Mobile: hide table (`hidden md:block`), show card list (`md:hidden`)
- Each card shows: name, price, category badge, available toggle, edit/delete buttons
- Edit dialog: `max-w-[calc(100vw-2rem)]` on mobile
- Header buttons: stack vertically on mobile if needed

### CategoryManagePage

- Desktop: keep table
- Mobile: card list with inline edit
- Edit dialog: responsive width

### TablesPage

- Grid: already `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — good
- QR code cards: ensure padding `p-3 md:p-4`
- Base URL input: full width on mobile
- Action buttons: `gap-2`, 44px touch targets

### StoreSettingsPage

- Form: `max-w-lg` on desktop, full width on mobile
- Inputs: `text-base` to prevent iOS zoom
- Save button: full width on mobile

### LoginPage

- Already centered, ensure `px-4` padding and `text-base` inputs

## 5. Components

### OrderDetailDialog / OrderReceipt

- Dialog: responsive max-width
- Content: responsive padding `p-3 md:p-6`

## Files to Change

| File | Change |
|------|--------|
| `client/index.html` | viewport-fit=cover |
| `client/src/index.css` | safe-area utilities |
| `client/src/components/AdminLayout.tsx` | Mobile Sheet nav + top bar |
| `client/src/pages/customer/MenuPage.tsx` | Safe area, touch targets, padding |
| `client/src/pages/customer/CartPage.tsx` | Safe area, touch targets, input sizes |
| `client/src/pages/customer/OrderConfirmPage.tsx` | Responsive spacing |
| `client/src/pages/customer/LangSelectPage.tsx` | Touch targets |
| `client/src/pages/admin/DashboardPage.tsx` | Responsive grid, touch targets |
| `client/src/pages/admin/MenuManagePage.tsx` | Table→card on mobile, dialog width |
| `client/src/pages/admin/CategoryManagePage.tsx` | Table→card on mobile |
| `client/src/pages/admin/TablesPage.tsx` | Padding, touch targets |
| `client/src/pages/admin/StoreSettingsPage.tsx` | Full-width mobile form |
| `client/src/pages/admin/LoginPage.tsx` | Input text-base, padding |
| `client/src/components/OrderDetailDialog.tsx` | Responsive dialog width |
| `client/src/components/OrderReceipt.tsx` | Responsive padding |

## Out of Scope

- shadcn component internals
- Color tokens / theme variables
- API calls / business logic
- Dark mode
- PWA / service worker
