# Design System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the UI from generic shadcn defaults to the "Digital Maître D'" design language — navy primary, tonal layering, no borders, ambient shadows, Plus Jakarta Sans + Inter.

**Architecture:** Three layers executed in order: (1) CSS foundation that auto-propagates to all components, (2) shadcn component de-bordering, (3) per-page targeted fixes. Bulk search-replace handles ~120 hardcoded color references.

**Tech Stack:** Tailwind CSS v4, @fontsource/plus-jakarta-sans, @fontsource/inter, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-21-design-system-overhaul.md`

---

### Task 1: Install Fonts

**Files:**
- Modify: `client/package.json` (via pnpm add)

- [ ] **Step 1: Install @fontsource packages**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm add @fontsource/plus-jakarta-sans @fontsource/inter --filter client
```

- [ ] **Step 2: Verify installation**

```bash
ls client/node_modules/@fontsource/plus-jakarta-sans/400.css
ls client/node_modules/@fontsource/inter/400.css
```

Expected: Both files exist.

---

### Task 2: Edit index.css — Foundation

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add font imports at the top of the file**

Insert BEFORE `@import "tailwindcss"`:

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

- [ ] **Step 2: Add font-family and shadow tokens to @theme inline block**

Inside the existing `@theme inline { }` block, add at the end (after `--color-sidebar-ring`):

```css
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
  --shadow-ambient: 0 20px 40px rgba(26, 27, 33, 0.06);
  --shadow-card: 0 1px 3px rgba(26, 27, 33, 0.04);
```

- [ ] **Step 3: Replace :root color variables**

Replace the entire `:root { }` block with:

```css
:root {
    --radius: 0.625rem;
    --background: #faf8ff;
    --foreground: #1a1b21;
    --card: #ffffff;
    --card-foreground: #1a1b21;
    --popover: #ffffff;
    --popover-foreground: #1a1b21;
    --primary: #1a3c8f;
    --primary-foreground: #ffffff;
    --secondary: #f4f3fb;
    --secondary-foreground: #1a1b21;
    --muted: #f4f3fb;
    --muted-foreground: #444651;
    --accent: #f4f3fb;
    --accent-foreground: #1a1b21;
    --destructive: oklch(0.577 0.245 27.325);
    --border: #e8e7ef;
    --input: #e8e7ef;
    --ring: #3c5aad;
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --sidebar: #f4f3fb;
    --sidebar-foreground: #1a1b21;
    --sidebar-primary: #1a3c8f;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent: #f4f3fb;
    --sidebar-accent-foreground: #1a1b21;
    --sidebar-border: #e8e7ef;
    --sidebar-ring: #3c5aad;
}
```

- [ ] **Step 4: Add dark mode comment**

Before the `.dark { }` block, add:

```css
/* Dark mode: not aligned with design system — future work */
```

- [ ] **Step 5: Add glass utility and safe-area utilities**

After the `@layer base { }` block, replace existing `@utility` blocks and add glass:

```css
@utility glass {
  background: rgba(250, 248, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

@utility pt-safe {
  padding-top: env(safe-area-inset-top);
}
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 6: Verify build**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && ./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

---

### Task 3: Bulk Search-Replace Hardcoded Colors

**Files:** 25 `.tsx` files across `client/src/`

This task uses scripted replacements. Run each replacement as a single command.

- [ ] **Step 1: Replace bg-[#faf8ff] → bg-background**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
grep -rl 'bg-\[#faf8ff\]' client/src --include="*.tsx" | xargs sed -i '' 's/bg-\[#faf8ff\]/bg-background/g'
```

- [ ] **Step 2: Replace bg-[#1a3c8f] → bg-primary**

```bash
grep -rl 'bg-\[#1a3c8f\]' client/src --include="*.tsx" | xargs sed -i '' 's/bg-\[#1a3c8f\]/bg-primary/g'
```

- [ ] **Step 3: Replace hover:bg-[#1a3c8f]/90 → hover:bg-primary/90**

```bash
grep -rl 'hover:bg-\[#1a3c8f\]/90' client/src --include="*.tsx" | xargs sed -i '' 's/hover:bg-\[#1a3c8f\]\/90/hover:bg-primary\/90/g'
```

- [ ] **Step 4: Replace hover:bg-[#15326e] → hover:bg-primary/90**

```bash
grep -rl 'hover:bg-\[#15326e\]' client/src --include="*.tsx" | xargs sed -i '' 's/hover:bg-\[#15326e\]/hover:bg-primary\/90/g'
```

- [ ] **Step 5: Replace text-[#1a3c8f] → text-primary**

```bash
grep -rl 'text-\[#1a3c8f\]' client/src --include="*.tsx" | xargs sed -i '' 's/text-\[#1a3c8f\]/text-primary/g'
```

- [ ] **Step 6: Replace border-[#1a3c8f] → border-primary**

```bash
grep -rl 'border-\[#1a3c8f\]' client/src --include="*.tsx" | xargs sed -i '' 's/border-\[#1a3c8f\]/border-primary/g'
```

- [ ] **Step 7: Replace bg-white → bg-card**

```bash
grep -rl 'bg-white' client/src --include="*.tsx" | xargs sed -i '' 's/bg-white/bg-card/g'
```

- [ ] **Step 8: Replace bg-gray-50 → bg-background**

```bash
grep -rl 'bg-gray-50' client/src --include="*.tsx" | xargs sed -i '' 's/bg-gray-50/bg-background/g'
```

- [ ] **Step 9: Remove NAVY constants and inline styles**

For each file that has `const NAVY = '#1a3c8f'`, remove the line and replace all `style={{ backgroundColor: NAVY }}` with equivalent Tailwind class. Also replace `style={{ color: NAVY }}` with `className` additions.

Files to check: MenuManagePage.tsx, TablesPage.tsx, FloorPlanEditorPage.tsx (and any others found by grep).

This step requires manual Agent review since inline style→className is not a simple find-replace.

- [ ] **Step 10: Verify no hardcoded colors remain**

```bash
grep -rn 'bg-\[#1a3c8f\]\|text-\[#1a3c8f\]\|bg-white\|bg-gray-50\|bg-\[#faf8ff\]\|NAVY' client/src --include="*.tsx" | head -20
```

Expected: 0 results (or only intentional non-navy hex colors like `#00256f` in hero gradients).

- [ ] **Step 11: TypeScript check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && ./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

---

### Task 4: shadcn Component De-bordering

**Files:** 11 files in `client/src/components/ui/`

Each component gets a targeted className change. Read → Edit for each.

- [ ] **Step 1: card.tsx** — Remove `border` from Card className. Add `rounded-2xl shadow-card`.

- [ ] **Step 2: dialog.tsx** — Remove `border` from DialogContent. Add `rounded-2xl shadow-ambient`.

- [ ] **Step 3: sheet.tsx** — Remove `border` from SheetContent. Add `shadow-ambient`. Keep existing side border classes.

- [ ] **Step 4: input.tsx** — Change `border border-input` → `bg-muted border-0 rounded-xl`. Keep focus ring.

- [ ] **Step 5: textarea.tsx** — Same as input: `bg-muted border-0 rounded-xl`. Keep focus ring.

- [ ] **Step 6: select.tsx** — SelectTrigger: `bg-muted border-0 rounded-xl`. SelectContent: add `border-0 shadow-ambient`.

- [ ] **Step 7: badge.tsx** — Default variant: add `rounded-full`. Remove explicit `border`.

- [ ] **Step 8: separator.tsx** — Change `bg-border` → `bg-muted`.

- [ ] **Step 9: button.tsx** — Default variant: ensure it uses `bg-primary hover:bg-primary/90` (should already after CSS var change).

- [ ] **Step 10: switch.tsx** — Verify checked state uses `bg-primary` (should auto-update from CSS var).

- [ ] **Step 11: table.tsx** — TableRow: remove `border-b`, add `hover:bg-muted/50`. Keep `border-b` on TableHead for subtle header separation.

- [ ] **Step 12: TypeScript check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && ./node_modules/.bin/tsc --noEmit
```

---

### Task 5: AdminLayout Sidebar Tonal Styling

**Files:**
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1:** Sidebar container: change `bg-white border-r` → `bg-muted`. Remove `border-r`.

- [ ] **Step 2:** Nav items: hover state → `hover:bg-card`. Active state → `bg-card font-semibold text-primary`.

- [ ] **Step 3:** Page title/subtitle headings: add `font-display` class.

- [ ] **Step 4:** Verify build.

---

### Task 6: MenuPage Targeted Changes

**Files:**
- Modify: `client/src/pages/customer/MenuPage.tsx`

- [ ] **Step 1:** Category sidebar: change `bg-muted/30` → `bg-muted`. Remove `border-r`.

- [ ] **Step 2:** Bottom cart bar: add `glass` class (replace `bg-background border-t shadow-lg` with `glass shadow-lg`).

- [ ] **Step 3:** Store name heading: add `font-display`.

- [ ] **Step 4:** Verify build.

---

### Task 7: Admin Pages — Glass Headers + Tonal Rows

**Files:** DashboardPage, CategoryManagePage, TablesPage, FloorPlanPage, FloorPlanEditorPage, AnalyticsPage, CouponManagePage, StaffManagePage, StoreSettingsPage, MenuManagePage

All these can be done in parallel as they touch independent files.

- [ ] **Step 1: DashboardPage** — Header: add `glass` class. Tab active: `bg-primary text-primary-foreground`.

- [ ] **Step 2: CategoryManagePage** — Table wrapper: add `bg-card rounded-2xl shadow-card`.

- [ ] **Step 3: TablesPage** — Left sidebar: `bg-muted`, remove `border-r`.

- [ ] **Step 4: FloorPlanPage** — Top bar: add `glass`.

- [ ] **Step 5: FloorPlanEditorPage** — Properties panel: `bg-muted`, remove `border-l`.

- [ ] **Step 6: AnalyticsPage** — Header: add `glass`.

- [ ] **Step 7: MenuManagePage** — Verify NAVY removal. Stat cards: verify `shadow-card`.

- [ ] **Step 8: All page <h1> headings** — Add `font-display` to main page titles across all admin pages.

- [ ] **Step 9: TypeScript check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && ./node_modules/.bin/tsc --noEmit
```

---

### Task 8: Verification

- [ ] **Step 1: Full TypeScript build**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 2: Grep verification — no hardcoded colors**

```bash
grep -rn '#1a3c8f\|bg-white\|bg-gray-50\|NAVY' client/src --include="*.tsx" | grep -v node_modules
```

Expected: 0 results.

- [ ] **Step 3: Grep verification — no remaining border on Cards**

```bash
grep -n 'className.*border' client/src/components/ui/card.tsx
```

Expected: No `border` in Card/CardHeader/CardContent classNames (only CardFooter if applicable).

- [ ] **Step 4: Verify font loading**

Check that index.css has all 8 @fontsource imports and the `@theme` block has `--font-sans` and `--font-display`.
