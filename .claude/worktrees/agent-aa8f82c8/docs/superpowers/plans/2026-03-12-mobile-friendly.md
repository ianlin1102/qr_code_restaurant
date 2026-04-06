# Mobile-Friendly Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all pages responsive and touch-friendly for mobile (target: 390px iPhone 12 Pro), keeping desktop experience intact.

**Architecture:** CSS-only changes using Tailwind responsive prefixes (sm/md/lg). Admin sidebar becomes Sheet drawer on mobile. Tables become card lists on mobile. Safe-area padding for iPhone notch/home bar.

**Tech Stack:** Tailwind CSS v4, shadcn/ui (Sheet component), tailwind-merge cn()

---

## Chunk 1: Global Foundation + Customer Pages

### Task 1: Viewport meta + safe-area CSS utilities

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/index.css`

- [ ] **Step 1: Update viewport meta in index.html**

Change line 6 from:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
To:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- [ ] **Step 2: Add safe-area utilities in index.css**

After the closing `}` of `@layer base` (end of file), add:

```css
@utility pt-safe {
  padding-top: env(safe-area-inset-top);
}
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 3: Commit**

```bash
git add client/index.html client/src/index.css
git commit -m "feat: add viewport-fit=cover and safe-area CSS utilities"
```

---

### Task 2: Mobile-optimize MenuPage

**Files:**
- Modify: `client/src/pages/customer/MenuPage.tsx`

Current layout: `flex flex-col h-screen max-w-lg mx-auto` with category sidebar `w-24`, bottom bar `fixed bottom-0`.

- [ ] **Step 1: Add safe-area padding to bottom floating bar**

Find the bottom bar div (has `className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t shadow-lg"`).

Change to:
```
className="fixed bottom-0 left-0 right-0 p-3 pb-safe bg-background border-t shadow-lg"
```

- [ ] **Step 2: Make option sheet safe-area aware**

Find `SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto"`.

Change to:
```
className="max-h-[80vh] overflow-y-auto pb-safe"
```

- [ ] **Step 3: Ensure touch targets on + / - buttons**

The round `+` button (line ~302): change `className="h-8 w-8 p-0 rounded-full"` to `className="h-10 w-10 p-0 rounded-full"`.

The `-` and `+` quantity buttons (lines ~314, ~326): change `className="h-7 w-7 p-0 rounded-full text-xs"` to `className="h-9 w-9 p-0 rounded-full text-xs"`.

- [ ] **Step 4: Ensure search input is text-base to prevent iOS zoom**

Find the search `<Input` with `className="h-8 text-sm"`.

Change to:
```
className="h-10 text-base"
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/customer/MenuPage.tsx
git commit -m "feat: mobile-optimize MenuPage — safe area, touch targets, input size"
```

---

### Task 3: Mobile-optimize CartPage

**Files:**
- Modify: `client/src/pages/customer/CartPage.tsx`

- [ ] **Step 1: Add safe-area to both bottom bars**

Find the first bottom bar (has cart, `className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg"`).

Change to:
```
className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg pb-safe"
```

Find the second bottom bar (continue ordering, same base classes). Change similarly to add `pb-safe`.

- [ ] **Step 2: Increase quantity button touch targets**

Find `className="h-8 w-8"` on the quantity `-` and `+` Button components (2 occurrences).

Change both to `className="h-10 w-10"`.

- [ ] **Step 3: Make remark input text-base**

Find the remark `<Input` with `placeholder` containing remark text and `className="text-sm"`.

Change to:
```
className="text-base"
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/customer/CartPage.tsx
git commit -m "feat: mobile-optimize CartPage — safe area, touch targets, input size"
```

---

### Task 4: Mobile-optimize OrderConfirmPage + LangSelectPage

**Files:**
- Modify: `client/src/pages/customer/OrderConfirmPage.tsx`
- Modify: `client/src/pages/customer/LangSelectPage.tsx`

- [ ] **Step 1: OrderConfirmPage — responsive spacing**

Find the outer container `className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12"`.

Change to:
```
className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe"
```

Ensure all buttons have `min-h-[44px]` — the existing `size="lg"` buttons should already be tall enough. Verify and add if needed.

- [ ] **Step 2: LangSelectPage — ensure touch-friendly**

Already has `py-6` on buttons and `p-4` on container — good. Add `pb-safe` to the outer container:

Change `className="flex flex-col items-center justify-center h-screen gap-8 p-4"` to:
```
className="flex flex-col items-center justify-center h-screen gap-8 p-4 pb-safe"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/customer/OrderConfirmPage.tsx client/src/pages/customer/LangSelectPage.tsx
git commit -m "feat: mobile-optimize OrderConfirmPage and LangSelectPage"
```

---

## Chunk 2: Admin Layout (Sheet Drawer)

### Task 5: AdminLayout — mobile Sheet navigation

**Files:**
- Modify: `client/src/components/AdminLayout.tsx`

This is the most significant change. Desktop keeps the sidebar. Mobile hides it and shows a top bar + Sheet drawer.

- [ ] **Step 1: Add Sheet imports**

Add to existing imports:
```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
```

- [ ] **Step 2: Add mobile sheet state**

Inside the component, add:
```typescript
const [mobileOpen, setMobileOpen] = useState(false)
```

- [ ] **Step 3: Add mobile top bar**

Before the existing `<aside>`, add a mobile-only top bar:

```tsx
{/* Mobile top bar */}
<div className="md:hidden sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-3">
  <button
    onClick={() => setMobileOpen(true)}
    className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
  >
    <Menu className="h-5 w-5" />
  </button>
  <div>
    <h1 className="text-base font-bold">{t('nav.title')}</h1>
  </div>
</div>
```

- [ ] **Step 4: Hide desktop sidebar on mobile**

Change the `<aside>` element's className from:
```
cn('shrink-0 border-r bg-gray-50 flex flex-col transition-all duration-200', collapsed ? 'w-16' : 'w-56')
```
To:
```
cn('shrink-0 border-r bg-gray-50 flex-col transition-all duration-200 hidden md:flex', collapsed ? 'w-16' : 'w-56')
```

- [ ] **Step 5: Add mobile Sheet drawer**

After the `<aside>` closing tag, add:

```tsx
{/* Mobile navigation sheet */}
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
  <SheetContent side="left" className="w-64 p-0">
    <SheetHeader className="px-4 py-5 border-b">
      <SheetTitle className="text-left">{t('nav.title')}</SheetTitle>
      <p className="text-xs text-muted-foreground">{t('nav.subtitle')}</p>
    </SheetHeader>
    <nav className="flex-1 py-2">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )
          }
        >
          <span className="text-base">{item.icon}</span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
    <div className="border-t">
      <button
        onClick={toggleLang}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
      >
        <Globe className="h-4 w-4" />
        {t('common:langSwitch')}
      </button>
      {user && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{user.username}</div>
            <div className="text-xs text-muted-foreground">
              {user.role === 'owner' ? t('nav.owner') : t('nav.staff')}
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600">
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  </SheetContent>
</Sheet>
```

- [ ] **Step 6: Make main content area responsive**

Change the `<main>` element:
```
className="flex-1 overflow-auto"
```
To:
```
className="flex-1 overflow-auto min-w-0"
```

- [ ] **Step 7: Update outer container**

The outer `<div>` has `className="flex h-screen overflow-hidden"`. Change to:
```
className="flex flex-col md:flex-row h-screen overflow-hidden"
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/AdminLayout.tsx
git commit -m "feat: admin sidebar → Sheet drawer on mobile with top bar"
```

---

## Chunk 3: Admin Pages Mobile Optimization

### Task 6: DashboardPage — responsive layout

**Files:**
- Modify: `client/src/pages/admin/DashboardPage.tsx`

- [ ] **Step 1: Responsive page title**

Find `text-xl font-bold` on the page title. Change to `text-lg md:text-xl font-bold`.

- [ ] **Step 2: Responsive header padding**

Find header container `max-w-4xl mx-auto px-4 py-3`. Change to `max-w-4xl mx-auto px-3 md:px-4 py-3`.

- [ ] **Step 3: Responsive order list**

Find order list container `max-w-4xl mx-auto px-4 py-4 space-y-4`. Change to `max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4`.

- [ ] **Step 4: Responsive card padding**

For order cards, ensure `CardContent` uses `p-3 md:p-4` padding instead of fixed padding.

- [ ] **Step 5: Responsive dialog**

Find dialog `max-w-lg`. Change to `max-w-lg w-[calc(100vw-2rem)]`.

- [ ] **Step 6: Ensure action buttons are touch-friendly**

All `size="sm"` action buttons: add `min-h-[44px]` where they appear in card actions.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/admin/DashboardPage.tsx
git commit -m "feat: mobile-optimize admin dashboard — responsive spacing and touch targets"
```

---

### Task 7: MenuManagePage — table→card on mobile

**Files:**
- Modify: `client/src/pages/admin/MenuManagePage.tsx`

- [ ] **Step 1: Responsive header**

Change header title from `text-xl font-bold` to `text-lg md:text-xl font-bold`.

Change header buttons container from `flex gap-2` to `flex gap-2 flex-wrap`.

- [ ] **Step 2: Wrap table view with hidden md:block**

In the table view section (inside `viewMode === 'table'` branch), find the outer `<div className="space-y-6">` that maps over `grouped`.

Wrap it:
```tsx
<div className="hidden md:block space-y-6">
  {/* existing table code */}
</div>
```

- [ ] **Step 3: Add mobile card list**

Right after the hidden table div, add a mobile-only card list:

```tsx
{/* Mobile card list */}
<div className="md:hidden space-y-4">
  {grouped.map(cat => (
    <div key={cat.id}>
      <h2 className="text-sm font-semibold text-muted-foreground mb-2">{cat.name}</h2>
      <div className="space-y-2">
        {cat.items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('menuManage.noItems')}</p>
        ) : (
          cat.items.map(item => (
            <div key={item.id} className={cn('p-3 rounded-lg border bg-card', !item.available && 'opacity-50')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.nameEn && <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>}
                </div>
                <span className="font-mono text-sm font-semibold shrink-0">{formatPriceCNY(item.price)}</span>
              </div>
              {item.options && item.options.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.options.map(opt => (
                    <Badge key={opt.id} variant="secondary" className="text-xs">{opt.name}({opt.choices.length})</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <Switch checked={item.available} onCheckedChange={() => handleToggleAvailable(item)} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => handleEdit(item)}>{t('common:edit')}</Button>
                  <Button variant="outline" size="sm" className="min-h-[44px] text-red-600" onClick={() => handleDelete(item.id)}>{t('common:delete')}</Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Responsive dialog width**

Find `<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">`.

Change to:
```
className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto"
```

- [ ] **Step 5: Make dialog inputs text-base for iOS**

Add `className="text-base"` to all `<Input>` and `<Textarea>` elements in the edit dialog (the ones that currently don't have text-base).

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/MenuManagePage.tsx
git commit -m "feat: mobile-optimize MenuManagePage — card list on mobile, responsive dialog"
```

---

### Task 8: CategoryManagePage — table→card on mobile

**Files:**
- Modify: `client/src/pages/admin/CategoryManagePage.tsx`

- [ ] **Step 1: Hide table on mobile, add card list**

Same pattern as MenuManagePage: wrap existing table with `hidden md:block`, add mobile card list with `md:hidden`.

Each mobile card shows:
- Category name (with edit click)
- nameEn if present
- Item count badge
- Sort order
- Edit / Delete buttons (min-h-[44px])

- [ ] **Step 2: Responsive dialog**

Add `w-[calc(100vw-2rem)]` to dialog. Ensure inputs are `text-base`.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/CategoryManagePage.tsx
git commit -m "feat: mobile-optimize CategoryManagePage — card list on mobile"
```

---

### Task 9: TablesPage + StoreSettingsPage + LoginPage

**Files:**
- Modify: `client/src/pages/admin/TablesPage.tsx`
- Modify: `client/src/pages/admin/StoreSettingsPage.tsx`
- Modify: `client/src/pages/admin/LoginPage.tsx`

- [ ] **Step 1: TablesPage — responsive padding + touch targets**

- Header buttons: add `flex-wrap` to allow wrapping on narrow screens
- Action buttons in cards: add `min-h-[44px]`
- Base URL input: add `text-base`
- Dialog inputs: add `text-base`
- Dialog: add `w-[calc(100vw-2rem)]`

- [ ] **Step 2: StoreSettingsPage — responsive form**

- Change container from `max-w-2xl mx-auto p-6` to `max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6`
- All inputs and textareas: add `text-base`
- Save button: ensure `min-h-[44px] w-full md:w-auto`

- [ ] **Step 3: LoginPage — mobile-friendly form**

- All inputs: change from `text-sm` to `text-base`
- Submit button: ensure `min-h-[44px]`
- Container: ensure `px-4` for mobile edge spacing

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/TablesPage.tsx client/src/pages/admin/StoreSettingsPage.tsx client/src/pages/admin/LoginPage.tsx
git commit -m "feat: mobile-optimize TablesPage, StoreSettingsPage, LoginPage"
```

---

### Task 10: OrderDetailDialog + OrderReceipt

**Files:**
- Modify: `client/src/components/OrderDetailDialog.tsx`
- Modify: `client/src/components/OrderReceipt.tsx`

- [ ] **Step 1: OrderDetailDialog — responsive width**

Find `max-w-md`. Change to `max-w-md w-[calc(100vw-2rem)]`.

Ensure action buttons have `min-h-[44px]`.

- [ ] **Step 2: OrderReceipt — responsive padding**

Add `p-3 md:p-4` where content uses fixed padding.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/OrderDetailDialog.tsx client/src/components/OrderReceipt.tsx
git commit -m "feat: mobile-optimize OrderDetailDialog and OrderReceipt"
```

---

## Chunk 4: Verification

### Task 11: Build + visual verification

- [ ] **Step 1: Build to check for errors**

```bash
pnpm --filter client build
```
Expected: zero errors

- [ ] **Step 2: Visual test checklist (Chrome DevTools → iPhone 12 Pro 390px)**

Customer pages:
- [ ] LangSelectPage: buttons full-width, vertically centered
- [ ] MenuPage: category sidebar visible, items don't overflow, bottom bar has safe area gap
- [ ] CartPage: quantity buttons are 40px, bottom bar has safe area, remark input doesn't zoom
- [ ] OrderConfirmPage: content centered, buttons full-width

Admin pages:
- [ ] Login: form centered, inputs don't trigger zoom
- [ ] AdminLayout: sidebar hidden, hamburger menu visible, Sheet opens with nav
- [ ] Dashboard: cards single-column, touch-friendly buttons
- [ ] Menu manage: card list instead of table, edit dialog fits screen
- [ ] Category manage: card list on mobile
- [ ] Tables: grid responsive, QR cards fit
- [ ] Settings: form full-width, inputs readable

- [ ] **Step 3: Desktop regression check (1280px+)**

- [ ] AdminLayout sidebar works as before (collapse/expand)
- [ ] MenuManagePage shows table view
- [ ] CategoryManagePage shows table view
- [ ] All pages look unchanged on desktop

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete mobile-friendly optimization for all pages"
```
