# QR Code Restaurant Ordering System — Complete UI/UX Interaction Map

> Generated: 2026-03-20 | Covers all 17 pages + 12 key components

---

## CUSTOMER PAGES

---

### 1. ScanPage — `/scan/:storeId/:tableId`

**Layout:** Full-screen centered loading/error state

**Interactive Elements:**
- Button "Retry" → `window.location.reload()` (shown on error only)

**Behavior:**
- Fetches table via `api.getTable(storeId, tableId)`
- If no language in localStorage → redirect to `/lang-select/:storeId/:tableId`
- If language exists → set session (storeId, tableId, tableName) → redirect to `/menu/:storeId`
- Clears cart if switching tables

---

### 2. LangSelectPage — `/lang-select/:storeId/:tableId`

**Layout:** Centered full-screen with bilingual heading

**Interactive Elements:**
- Button (large, primary) "中文" → sets language zh, saves to localStorage, redirects to `/scan/:storeId/:tableId`
- Button (large, outline) "English" → sets language en, same flow

---

### 3. MenuPage — `/menu/:storeId`

**Layout:**
- Header: store name + language toggle + search input
- Left sidebar: category navigation (hidden during search)
- Main: menu items grouped by category
- Floating bottom bar (when cart has items): total + "Go Order" button

**Interactive Elements — Header:**
- Button "中文/English" → toggles language
- Input "Search menu..." → filters items by name/nameEn/description (bilingual, also matches category names)

**Interactive Elements — Category Sidebar:**
- Button (per category) → scrolls to category section

**Interactive Elements — Per Menu Item:**
- Button "+" (circular, 44px) → opens MenuItemDetailSheet
- Items with `originalPrice > price` show ~~$original~~ **$discounted** + "X% OFF" badge
- Unavailable items: red "SOLD OUT" diagonal banner, grayscale image, pointer-events-none

**Interactive Elements — Bottom Bar:**
- Shows: total price + item count badge
- Button "Go Order" → navigates to `/cart`

**Dialogs/Sheets:**
- **MenuItemDetailSheet** → triggered by "+" button on any item
- **Announcement Dialog** → auto-opens once per session if store has announcement

**Real-time:** Polls menu every 30s. Removes sold-out items from cart with alert.

---

### 4. MenuItemDetailSheet (Component)

**Layout:** Bottom sheet (max-h 85vh, scrollable)

**Interactive Elements:**
- Quick Tags row: "No Onions" / "Less Spicy" / "Extra Sauce" / "No MSG" / "Less Salt" / "Less Oil" → toggle selection (bilingual labels)
- Option group buttons (per option, per choice) → select choice (required options have "Required" badge)
- Textarea "Special instructions" → custom remark
- Button "-" / "+" (quantity) → adjust quantity (min 1)
- Button "Add to Cart $XX.XX" → adds item with all selections to cart, closes sheet

**Data Displayed:**
- Full image (or gradient placeholder)
- Name + description (localized)
- Price with original/discount if applicable
- Selected options + price adjustments
- Calculated total: (base + options) × quantity

**Validation:** "Add to Cart" disabled until all required options selected

---

### 5. CartPage — `/cart`

**Layout:** Header + scrollable item list + fixed bottom bar

**Interactive Elements — Per Item:**
- Button "-" → decrease quantity (trash icon at qty=1 to delete)
- Button "+" → increase quantity
- Input "Add a note" → updates remark

**Interactive Elements — Bottom:**
- Displays: subtotal, tax (8%), total
- Button "Submit Order" (44px min-h) → creates Stripe PaymentIntent → navigates to `/store/:storeId/checkout`

**Data Displayed:** Item name, selected options + price adjustments, quantity, line total, remark

---

### 6. CheckoutPage — `/store/:storeId/checkout`

**Layout:** Centered card with Stripe payment form

**Interactive Elements:**
- Stripe PaymentElement (card input, managed by Stripe)
- Button "Pay $XX.XX" → `stripe.confirmPayment()` → redirects to `/order/confirm`

**Data Displayed:** Amount due, loading spinner while Stripe initializes, error messages

---

### 7. OrderConfirmPage — `/order/confirm`

**Layout:** Centered success/failure state

**Interactive Elements:**
- Button "Continue Ordering" → navigates to `/menu/:storeId`

**Data Displayed:**
- Success: green checkmark, order number, total price
- Failure: red X, "Payment Failed" message

---

## ADMIN PAGES

---

### 8. LoginPage — `/admin/login`

**Interactive Elements:**
- Input "Store ID" (pre-filled from `?store=` query param)
- Input "Username" (autoFocus)
- Input "Password"
- Button "Login" → `api.login()` → saves auth → navigates to `/admin/dashboard`

---

### 9. AdminLayout (Sidebar — wraps all admin pages)

**Desktop Sidebar (collapsible w-56 / w-16):**
- NavLinks: Orders 📋, Floor Plan 🗺️, Menu 🍜, Categories 📂, Tables 🪑, Coupons 🎟️ (owner), Staff 👥 (owner), Analytics 📊 (owner), Settings ⚙️
- Button (chevron) → collapse/expand sidebar
- Button "中文/English" → toggle language
- Button "Logout" → clears auth, redirects to login

**Mobile:** Hamburger menu → Sheet with same nav items

---

### 10. DashboardPage — `/admin/dashboard`

**Layout:** Sticky header + tab filter bar + scrollable OrderCard list

**Interactive Elements — Tabs:**
- Buttons: "All" / "Pending" / "Preparing" / "Completed" → filters orders by status

**Interactive Elements — Per OrderCard:**
- Card click → opens OrderDetailDialog
- Button "Edit" → opens OrderEditDialog
- Button "Reprint" (printer icon) → reprints to kitchen (shows "Printed!" 2s feedback)
- Status button: "Start" (pending→preparing) or "Done" (preparing→completed)

**Real-time:** Polls every 5 seconds

**Dialogs:** OrderDetailDialog, OrderEditDialog

---

### 11. MenuManagePage — `/admin/menu`

**Layout:** Horizontal category slider (top) + items grid/table (center) + order sidebar (right)

**Interactive Elements — Category Slider:**
- Pill buttons: "📋 All" + per-category with emoji icon + count badge
- ChevronLeft/Right arrows for scrolling
- Non-matching items shown as ghosted (20% opacity, non-interactive)

**Interactive Elements — Header:**
- Toggle Table/Grid view icons
- Button "New Item" → opens MenuItemForm (create mode)

**Interactive Elements — Per Item:**
- Edit/Delete/Toggle available (table mode)
- Card click → opens MenuItemEditSheet (preview mode)

**Interactive Elements — Right Sidebar (Order Counter):**
- Per cart item: -/+ quantity, ✕ remove
- "Send to Kitchen" button → creates order for "admin-counter" table
- "Clear Order" → empties cart
- Displays: subtotal, tax 8%, total

**Dialogs:** MenuItemForm (new), MenuItemEditSheet (edit)

---

### 12. MenuItemEditSheet (Component)

**Layout:** Right sheet (max-w-xl), single column with Separator dividers

**Sections:**
1. **Image + Availability:** Image upload (w-36) | Active on Menu switch
2. **Pricing:** Large editable price ($XX.XX) + discount buttons (-10% / -25% / -50% / FREE) + "X% OFF" badge + "Reset" link. Shows original price strikethrough when discounted. Green note: "Customers will see the discounted price."
3. **Quantity + Quick Tags:** -/+ stepper | Tag pills (No Onions / Extra Sauce / Medium Rare / Gluten Free)
4. **Custom Notes:** Textarea for preparation instructions
5. **Footer:** Blue info bar "Changes reflect immediately across all kiosks"

**Key behavior:** Saves `originalPrice` when discount applied → customers see ~~original~~ **discounted** + badge

---

### 13. TablesPage — `/admin/tables`

**Layout:** Left sidebar (table list) + center (table detail) + right (actions)

**Interactive Elements — Left Sidebar:**
- Per table row: name + status badge (AVAILABLE green / OCCUPIED red) → click selects table
- Button "New Order"

**Interactive Elements — Center (when table selected):**
- Toggle "Current Order" / "Order History"
- Per order item: image placeholder, name, remark (italic), quantity, price

**Interactive Elements — Right Sidebar:**
- Button "Add New Items" (navy, primary)
- Button "Print Bill" → reprints order
- Button "Transfer Table" → opens TransferTableDialog
- Button "Split Bill" → opens SplitBillDialog
- Button "Checkout" (green, large) → opens CloseTableDialog
- Summary: Service 10% + Tax 5% + Total

**Empty state:** Chair icon + "Select a table to view details"

**Dialogs:** CloseTableDialog, TransferTableDialog, SplitBillDialog

---

### 14. FloorPlanPage — `/admin/floor-plan`

**Layout:** Left sidebar (nav + stats) + center (zone tabs + table grid) + right (orders/waitlist tabs)

**Interactive Elements — Left Sidebar:**
- Nav: Overview / Active Tables (badge) / Waitlist / Analytics
- Stats: Occupancy % (yellow ≥80%, green <80%), Available tables, Active orders
- Button "Add to Waitlist" → switches right sidebar to waitlist tab

**Interactive Elements — Center:**
- Zone filter buttons: All / Main / Outdoor / Bar...
- Per table card → opens TableDetailPanel
- Polling indicator (green pulse if <5s, gray otherwise) + "Xs ago"

**Interactive Elements — Right Sidebar:**
- Tab "Active Orders" / "Waitlist" toggle
- ActiveOrdersSidebar: per order card click → selects matching table
- WaitlistPanel: add form + seat/remove per entry

**Real-time:** Polls every 10s with elapsed display

---

### 15. FloorPlanEditorPage — `/admin/floor-plan/editor`

**Layout:** Header + draggable canvas + right properties panel

**Interactive Elements — Canvas:**
- Drag table → moves (20px grid snap)
- Drag resize handle (bottom-right) → resizes
- Click table → selects (blue ring)
- Click empty → deselects

**Interactive Elements — Header:**
- Button "Add Table" → creates new table at (20,20)
- Button "Save Layout" → persists all positions via API

**Interactive Elements — Properties Panel (when selected):**
- Input "Name"
- Select "Zone" (Main/Outdoor/Bar/VIP)
- Input "Capacity" (number)
- Read-only: x, y, width, height
- Button "Delete Table" (red)

**Validation:** Owner-only access

---

### 16. AnalyticsPage — `/admin/analytics`

**Interactive Elements:**
- Date inputs: "From" / "To" → refetches analytics
- Button "Export CSV" → downloads CSV file

**Data Displayed:**
- Summary cards: Total Orders, Total Revenue, Avg Order Value
- Top Items table: Rank, Name, Qty Sold, Revenue
- Daily Breakdown table: Date, Orders, Revenue, Avg Value
- Staff Performance: Name, Role badge

**Validation:** Owner-only access

---

### 17. CouponManagePage — `/admin/coupons`

**Interactive Elements:**
- Button "Create Coupon" → opens dialog
- Per coupon: Switch toggle (active/inactive), Button "Delete" (with confirm)
- Dialog: Code input, Discount Type select (Percentage/Fixed/BOGO), Value input, Min Order, Max Uses, Expiry Date, Cancel/Create buttons

**Data Displayed:** Code, discount (10% / $5.00 / BOGO), min order, uses (current/max), status badge, expiry

**Validation:** Owner-only access

---

### 18. StaffManagePage — `/admin/staff`

**Interactive Elements:**
- Button "Add Staff" → opens dialog
- Per staff row: Role select (Owner/Staff) → inline change (disabled for self), Delete button (disabled for last owner / self)
- Dialog: Username, Password, Role select, Cancel/Create

**Validation:** Owner-only. Cannot delete last owner or self.

---

### 19. StoreSettingsPage — `/admin/settings`

**Interactive Elements:**
- Input "Store Name"
- Textarea "Description"
- Input "Opening Hours"
- Textarea "Announcement"
- Button "Save" → persists to API (shows success/error toast)

---

### 20. CategoryManagePage — `/admin/categories`

**Interactive Elements:**
- Button "Add Category" → dialog
- Per category: ▲/▼ sort buttons (44px), inline-editable name + sort order, Edit/Delete buttons
- Dialog: Name (zh), Name (en), Sort Order, Cancel/Save

---

## KEY COMPONENT INTERACTIONS

### TransferTableDialog
- Grid of available (idle) tables → select target → "Confirm Transfer" → moves order

### SplitBillDialog
- Tab "Split Equally" (input people count) / "Split by Item" (assign items to people)
- Button "Generate Payment Links" → creates split Stripe sessions

### CloseTableDialog
- Shows active orders summary + grand total → "Checkout" settles all

### ActiveOrdersSidebar
- Per order card click → callback to parent (selects table on FloorPlan)
- Color-coded time: green <15m, orange 15-30m, red >30m
- Auto-polls every 15s

### WaitlistPanel
- Form: Name + Party Size + Phone → "Add to Waitlist"
- Per entry: "Seat" button + "Remove" button
- Auto-polls every 30s

### OrderEditMode (inline in TableDetailPanel)
- Per item: -/+ quantity (44px buttons), trash delete, remark input
- "Add Item" → search menu dropdown
- Quick Discount: 10% / 25% / 50% / Free buttons
- Summary: subtotal, discount, total
- Cancel / Save buttons

---

## REAL-TIME POLLING SUMMARY

| Component | Interval | What it fetches |
|-----------|----------|----------------|
| DashboardPage | 5s | Orders (filtered by status) |
| FloorPlanPage | 10s | Tables + Orders |
| TablesPage | 10s | Tables + Orders |
| ActiveOrdersSidebar | 15s | Orders (active only) |
| WaitlistPanel | 30s | Waitlist entries |
| MenuPage (customer) | 30s | Menu (sold-out detection) |

---

## DESIGN TOKENS

| Token | Value | Usage |
|-------|-------|-------|
| Primary Navy | `#1a3c8f` | Buttons, active nav, price emphasis |
| Available | Green (`bg-green-50 text-green-600`) | Table status, badges |
| Occupied | Red/Orange (`bg-red-50 text-red-600`) | Table status, badges |
| Discount | Red (`bg-red-100 text-red-700`) | "X% OFF" badges |
| Checkout | `bg-green-500` | Checkout/settle buttons |
| Min touch target | 44px | All interactive elements |

---

## DATA FLOW

```
Customer scans QR → ScanPage → LangSelect → MenuPage → CartPage → CheckoutPage (Stripe) → OrderConfirmPage
                                                                         ↓ webhook
Admin: DashboardPage ← orders ← Stripe webhook creates order (isPaid: true)
Admin: FloorPlanPage → TableDetailPanel → OrderEditMode / TransferTable / SplitBill
Admin: MenuManagePage → MenuItemEditSheet (discount → originalPrice saved → customer sees "X% OFF")
Admin: TablesPage → CloseTableDialog (settle → table idle)
```
