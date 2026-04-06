# Design System Overhaul — "The Digital Maître D'"

> Spec date: 2026-03-21
> Scope: Full visual redesign of all pages to match the culinary_core DESIGN.md
> Source design: `/Users/evergreen/Downloads/stitch_customer_menu_page/stitch_customer_menu_page/culinary_core/DESIGN.md` (external reference, not in repo)

---

## Goal

Transform the QR ordering system from generic shadcn defaults to the "Digital Maître D'" design language: navy primary, tonal surface layering, no 1px borders, ambient shadows, Plus Jakarta Sans + Inter typography.

---

## Layer 1: Foundation (CSS Variables + Fonts)

### 1.1 Font Installation

```bash
pnpm add @fontsource/plus-jakarta-sans @fontsource/inter --filter client
```

Import in `client/src/index.css`:
```css
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/500.css';
@import '@fontsource/plus-jakarta-sans/600.css';
@import '@fontsource/plus-jakarta-sans/700.css';
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
```

Tailwind `@theme` in `index.css`:
```css
@theme {
  --font-sans: 'Inter', sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;
}
```

Usage: `font-sans` (default body), `font-display` (headings/titles).

### 1.2 Color Remapping

Replace existing OKLch variables in `:root` with hex values. All values use hex for consistency.

| Variable | New Value | Source |
|----------|-----------|--------|
| `--primary` | `#1a3c8f` | Navy primary |
| `--primary-foreground` | `#ffffff` | — |
| `--secondary` | `#f4f3fb` | surface-container-low |
| `--secondary-foreground` | `#1a1b21` | on-surface |
| `--background` | `#faf8ff` | surface |
| `--foreground` | `#1a1b21` | on-surface (not pure black) |
| `--card` | `#ffffff` | surface-container-lowest |
| `--card-foreground` | `#1a1b21` | on-surface |
| `--popover` | `#ffffff` | same as card |
| `--popover-foreground` | `#1a1b21` | on-surface |
| `--muted` | `#f4f3fb` | surface-container-low |
| `--muted-foreground` | `#444651` | on-surface-variant |
| `--accent` | `#f4f3fb` | same as muted |
| `--accent-foreground` | `#1a1b21` | on-surface |
| `--border` | `#e8e7ef` | opaque subtle border (replaces ghost idea) |
| `--input` | `#e8e7ef` | matches border |
| `--ring` | `#3c5aad` | lighter navy for focus (accessible contrast) |
| `--destructive` | keep existing | — |
| `--destructive-foreground` | keep existing | — |

**Note on `--border`:** Using opaque `#e8e7ef` instead of semi-transparent `rgba()`. The global `* { @apply border-border }` rule stays — components will override with `border-0` where borders should not appear. This avoids the "disappearing border" risk of a transparent value.

**Dark mode:** Leave the `.dark` block unchanged. Dark mode is non-functional and out of scope. Add a comment: `/* Dark mode: not aligned with design system — future work */`

### 1.3 Shadow & Utility Presets

Add to `index.css`:
```css
@utility glass {
  background: rgba(250, 248, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

@theme {
  --shadow-ambient: 0 20px 40px rgba(26, 27, 33, 0.06);
  --shadow-card: 0 1px 3px rgba(26, 27, 33, 0.04);
}
```

### 1.4 Bulk Replace Directive

After CSS variable remapping, run a project-wide search-and-replace across all `.tsx` files:

| Search | Replace | Reason |
|--------|---------|--------|
| `bg-white` | `bg-card` | Uses surface-container-lowest token |
| `bg-gray-50` | `bg-background` | Uses surface token |
| `bg-[#faf8ff]` | `bg-background` | Redundant now that CSS var is set |
| `bg-[#1a3c8f]` | `bg-primary` | Uses navy via CSS var |
| `text-[#1a3c8f]` | `text-primary` | Uses navy via CSS var |
| `hover:bg-[#1a3c8f]/90` | `hover:bg-primary/90` | Semantic token |
| `style={{ backgroundColor: NAVY }}` | `className="bg-primary"` | Remove inline styles, use Tailwind |
| `style={{ color: NAVY }}` | `className="text-primary"` | Remove inline styles |

This eliminates ~100+ hardcoded color references and ensures future `--primary` changes propagate.

**Also remove `const NAVY = '#1a3c8f'` constants** from MenuManagePage, TablesPage, and any other files that define them.

---

## Layer 2: Components (Global De-bordering)

### 2.1 shadcn Component Overrides

All changes in `client/src/components/ui/`:

| File | Change |
|------|--------|
| `card.tsx` | Remove `border` from Card. Add `rounded-2xl shadow-card`. |
| `dialog.tsx` | Remove `border` from DialogContent. Add `rounded-2xl shadow-ambient`. |
| `sheet.tsx` | Remove `border` from SheetContent. Add `shadow-ambient`. Keep side border for functional separation. |
| `input.tsx` | Change `border border-input` → `bg-muted border-0 rounded-xl`. Keep `focus-visible:ring-1 focus-visible:ring-ring`. |
| `textarea.tsx` | Same as input: `bg-muted border-0 rounded-xl`. |
| `select.tsx` | SelectTrigger: `bg-muted border-0 rounded-xl`. SelectContent: `border-0 shadow-ambient`. |
| `badge.tsx` | Default variant: `rounded-full border-0`. |
| `separator.tsx` | Change `bg-border` → `bg-muted`. |
| `button.tsx` | Default variant: `bg-primary hover:bg-primary/90` (flat navy, NOT gradient — gradient only for hero CTAs). |
| `switch.tsx` | Checked color uses `bg-primary` (navy via CSS var). |
| `table.tsx` | TableRow: remove `border-b`, add `hover:bg-muted/50`. TableHead: `text-muted-foreground`. |

**Note on button gradient:** The default Button variant stays flat `bg-primary`. The gradient (`from-[#00256f] to-primary`) is applied only to specific hero CTAs in pages (e.g., "Submit Order", "Pay", "Login") via inline className, not globally. This prevents visual heaviness.

### 2.2 Principles

- **No 1px solid borders** for visual sections — use background color shifts
- **Exceptions:** Sheet side borders kept for functional separation; table headers may keep a subtle `border-b border-muted`
- **Separators** only when spacing alone is insufficient — prefer `space-y-*`
- **Floating elements** (sticky headers, bottom bars, modals) use `glass` utility
- **Cards** rely on `shadow-card` + white on `#faf8ff` background for depth

---

## Layer 3: Pages (Per-page Alignment)

### 3.1 Customer Pages

| Page | Changes |
|------|---------|
| **ScanPage** | Replace hardcoded `bg-[#1a3c8f]` → `bg-primary` (bulk replace covers this) |
| **LangSelectPage** | Same bulk replace |
| **MenuPage** | Category sidebar: `bg-muted` (was `bg-muted/30`), remove `border-r`. Bottom cart bar: `glass`. Page title: `font-display`. |
| **CartPage** | Bulk replace covers `bg-[#1a3c8f]` → `bg-primary`. Verify tonal cards after Layer 2. |
| **CheckoutPage** | Bulk replace. Verify tonal cards. |
| **OrderConfirmPage** | Bulk replace. Verify tonal cards. |
| **OrderHistoryPage** | Bulk replace. Verify tonal cards. |
| **LoginPage** | Bulk replace. Already has navy branding. |

### 3.2 Admin Pages

| Page | Changes |
|------|---------|
| **AdminLayout** | Sidebar: `bg-muted` remove `border-r`. Nav items: `hover:bg-card` (tonal). Active: `bg-card font-semibold text-primary`. |
| **DashboardPage** | Header: `glass`. Tab buttons: `bg-primary text-primary-foreground` when active. |
| **MenuManagePage** | Remove `NAVY` constant. Stat cards: verify `shadow-card`. |
| **CategoryManagePage** | Table wrapper: `bg-card rounded-2xl shadow-card`. Tonal row hover. |
| **TablesPage** | Left sidebar: `bg-muted` remove `border-r`. Remove `NAVY` constant. |
| **FloorPlanPage** | Top bar: `glass`. |
| **FloorPlanEditorPage** | Properties panel: `bg-muted` remove `border-l`. |
| **AnalyticsPage** | Header: `glass`. Cards: `shadow-card`. |
| **CouponManagePage** | Tonal rows. |
| **StaffManagePage** | Tonal rows. |
| **StoreSettingsPage** | Card: `shadow-card border-0`. |

### 3.3 Component Files (hardcoded color cleanup)

These component files contain hardcoded `#1a3c8f` or `NAVY` references that must be migrated to `bg-primary`/`text-primary`:

- `MenuItemForm.tsx` — discount buttons
- `MenuItemEditSheet.tsx` — navy constant
- `TableCrudDialog.tsx` — save button
- `WaitlistPanel.tsx` — add button
- `TipSelector.tsx` — active tip button
- `OrderCard.tsx` — no hardcoded navy (already uses semantic tokens)
- `TableDetailPanel.tsx` — check for hardcoded colors
- `TableGrid.tsx` — check for hardcoded colors
- `ActiveOrdersSidebar.tsx` — check for hardcoded colors

### 3.4 Typography Rules

- **Page titles** (`<h1>`, main page headings): `font-display` (Plus Jakarta Sans)
- **Everything else** (body, labels, inputs, badges): `font-sans` (Inter) — default, no class needed
- **No Chinese 105% scaling** — complexity too high for marginal benefit

### 3.5 Out of Scope (YAGNI)

- `surface_tint` 5% opacity warmth — imperceptible
- Asymmetric card layouts (image bleeding) — high effort, low return
- Dark mode alignment — no current requirement
- Mobile bottom tab bar — requires routing changes
- Custom font-size scale — Tailwind defaults sufficient
- Button gradient as global default — only for hero CTAs

---

## Files Modified

### Foundation (2 files)
1. `client/src/index.css` — font imports, CSS variable remapping, utility classes, shadow tokens

### Components (11 files)
2. `client/src/components/ui/card.tsx`
3. `client/src/components/ui/dialog.tsx`
4. `client/src/components/ui/sheet.tsx`
5. `client/src/components/ui/input.tsx`
6. `client/src/components/ui/textarea.tsx`
7. `client/src/components/ui/select.tsx`
8. `client/src/components/ui/badge.tsx`
9. `client/src/components/ui/separator.tsx`
10. `client/src/components/ui/button.tsx`
11. `client/src/components/ui/switch.tsx`
12. `client/src/components/ui/table.tsx`

### Pages (13 files — bulk replace + targeted changes)
13. `client/src/pages/customer/MenuPage.tsx`
14. `client/src/pages/customer/CartPage.tsx` (bulk replace only)
15. `client/src/pages/customer/CheckoutPage.tsx` (bulk replace only)
16. `client/src/pages/customer/ScanPage.tsx` (bulk replace only)
17. `client/src/pages/customer/LangSelectPage.tsx` (bulk replace only)
18. `client/src/pages/customer/OrderConfirmPage.tsx` (bulk replace only)
19. `client/src/pages/customer/OrderHistoryPage.tsx` (bulk replace only)
20. `client/src/pages/admin/LoginPage.tsx` (bulk replace only)
21. `client/src/components/AdminLayout.tsx`
22. `client/src/pages/admin/DashboardPage.tsx`
23. `client/src/pages/admin/CategoryManagePage.tsx`
24. `client/src/pages/admin/TablesPage.tsx`
25. `client/src/pages/admin/MenuManagePage.tsx`

### Component files (hardcoded color cleanup)
26. `client/src/pages/admin/FloorPlanPage.tsx`
27. `client/src/pages/admin/FloorPlanEditorPage.tsx`
28. `client/src/pages/admin/AnalyticsPage.tsx`
29. `client/src/pages/admin/CouponManagePage.tsx`
30. `client/src/pages/admin/StaffManagePage.tsx`
31. `client/src/pages/admin/StoreSettingsPage.tsx`
32. `client/src/components/MenuItemForm.tsx`
33. `client/src/components/MenuItemEditSheet.tsx`
34. `client/src/components/TableCrudDialog.tsx`
35. `client/src/components/WaitlistPanel.tsx`
36. `client/src/components/TipSelector.tsx`
37. `client/src/components/TableGrid.tsx`
38. `client/src/components/TableDetailPanel.tsx`
39. `client/src/components/ActiveOrdersSidebar.tsx`

**Total: ~39 files (many are bulk-replace only)**

---

## Implementation Order

1. **Install fonts** (`pnpm add`)
2. **Edit `index.css`** (CSS vars + fonts + utilities) — all pages auto-update
3. **Bulk search-replace** hardcoded colors across all `.tsx` files
4. **Edit 11 shadcn components** — global de-bordering
5. **Edit AdminLayout** — sidebar tonal styling
6. **Edit MenuPage** — category sidebar + bottom bar
7. **Edit remaining admin pages** — targeted changes (glass headers, tonal rows)
8. **Verify** — TypeScript build, visual spot-check each page

---

## Verification Checklist

After implementation, verify each criterion:

- [ ] No hardcoded `#1a3c8f`, `bg-white`, or `bg-gray-50` in any `.tsx` file
- [ ] No `const NAVY` definitions remain
- [ ] All cards render `rounded-2xl shadow-card border-0`
- [ ] Primary color is navy everywhere (buttons, active states, links)
- [ ] Background is `#faf8ff`, not pure white
- [ ] Floating elements use `glass` (backdrop-blur)
- [ ] Page titles use Plus Jakarta Sans (`font-display`)
- [ ] Body text uses Inter (default `font-sans`)
- [ ] TypeScript compiles with 0 errors
- [ ] All existing functionality preserved (order flow, payments, CRUD operations)
- [ ] No 1px solid borders for section separation (except Sheet sides and table headers)
